# Fase 14 · Módulo Nutrición (alimentación, macros, scanner)

> Lee `CLAUDE.md` y `PROMPTS.md` antes de tocar nada. Esta fase **no** introduce IA generativa, **no** cambia las puntuaciones, **no** toca módulos previos salvo añadir el adapter al `MODULE_REGISTRY`.
> Modelo recomendado: **Claude Sonnet 4.6**.
> Rama: `feat/fase-14-nutrition`. Un PR. Conventional Commits.
> Fase previa requerida: 13 (hub modular + módulo Estudio) ya merged.

---

## 1. Objetivo y alcance

Construir el módulo de alimentación de BeProud:

- Registro de comidas por tipo: **desayuno, almuerzo, merienda, cena** (y `snack` extra opcional).
- Contador de calorías y macros (proteína, carbos, grasa) con totales del día y comparación contra objetivos.
- Buscador de productos vía **Open Food Facts** (gratis, abierto, sin API key) con caché local en `food_items`.
- Lector de **código de barras** del producto vía cámara (`expo-camera`).
- Posibilidad de crear "comida personalizada" (alimento custom con macros manuales) cuando el producto no aparezca en la API.
- **Objetivos diarios calculados automáticamente** desde la biometría del onboarding (Mifflin-St Jeor + factor actividad + ajuste por objetivo). Editables por el user.
- Integración con el `MODULE_REGISTRY` para que aparezca en el carrusel "Hoy" de la pantalla Rutina.
- Routing tipado: tareas de catálogo `module='nutrition'` lanzan `/nutrition` en lugar del flujo de foto.

Lo que NO entra en esta fase: análisis foto-de-plato con IA (futuro), recetas / templates de comida, planning semanal, tracking de agua, integración con Apple Health / Google Fit, exportación de datos.

---

## 2. Stack y dependencias

Solo se añade una librería nueva, justificada:

- `expo-camera@~16.0.x` (compatible con Expo SDK 52). Reemplaza al deprecado `expo-barcode-scanner`. Se usa para escanear códigos EAN-13 / UPC.
- Open Food Facts: integración HTTP plana desde cliente. **No hay edge function**. Llamadas directas con `fetch`. Header `User-Agent: BeProud/0.1 (mailto:hello@beproud.app)` por buena práctica de la API. Si en el futuro detectamos rate limits, montaremos proxy en edge function — no anticipar.

---

## 3. Plan de archivos

```
supabase/
└── migrations/
    ├── <ts>_food_items_table.sql
    ├── <ts>_meal_logs_tables.sql
    ├── <ts>_nutrition_targets_table.sql
    ├── <ts>_seed_nutrition_catalog_items.sql
    └── <ts>_compute_nutrition_targets_rpc.sql

packages/
├── validation/src/index.ts            # +MealTypeSchema, +FoodItemSourceSchema, +NutritionTarget*
└── api/
    └── src/
        ├── index.ts
        ├── nutrition.ts                # NUEVO (CRUD interno)
        └── foodSearch.ts               # NUEVO (cliente Open Food Facts)

apps/mobile/
├── lib/
│   ├── modules.ts                      # registrar nutrition adapter
│   └── nutrition/
│       ├── computeTargets.ts           # Mifflin-St Jeor + factor actividad + objetivo
│       └── format.ts                   # helpers (kcal, gramos, ratios)
├── components/nutrition/
│   ├── DailyRings.tsx                  # anillos kcal + 3 macros
│   ├── MealCard.tsx                    # card de cada comida con resumen
│   ├── FoodRow.tsx                     # fila de alimento dentro de comida
│   ├── MacroBar.tsx                    # barra horizontal kcal/macro
│   ├── QuantityStepper.tsx             # input de gramos
│   └── EmptyMeal.tsx
├── features/nutrition/
│   └── adapters/getTodayNutritionSummary.ts
└── app/
    └── nutrition/
        ├── _layout.tsx
        ├── index.tsx                   # dashboard del día
        ├── meal/[mealType].tsx         # detalle de comida + lista de alimentos
        ├── search.tsx                  # buscador (texto)
        ├── scan.tsx                    # scanner de código de barras
        ├── food/[foodId].tsx           # detalle de alimento + añadir a comida
        ├── custom-food.tsx             # crear alimento personalizado
        └── targets.tsx                 # ver/editar objetivos diarios
```

---

## 4. Modelo de datos

### 4.1 Migración: `food_items`

Caché compartida de alimentos, sea de Open Food Facts o creados por users. Las filas con `source='openfoodfacts'` son lectura para todos; las `source='user'` son solo del creador.

```sql
create table if not exists public.food_items (
  id                  uuid primary key default gen_random_uuid(),
  source              text not null check (source in ('openfoodfacts','user')),
  external_id         text,                          -- barcode o code OFF
  name                text not null,
  brand               text,
  image_url           text,
  serving_size_g      numeric,
  kcal_per_100g       numeric not null check (kcal_per_100g >= 0),
  protein_per_100g    numeric not null default 0 check (protein_per_100g >= 0),
  carbs_per_100g      numeric not null default 0 check (carbs_per_100g >= 0),
  fat_per_100g        numeric not null default 0 check (fat_per_100g >= 0),
  sugars_per_100g     numeric,
  fiber_per_100g      numeric,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (source, external_id)
);

create index idx_food_items_name_trgm
  on public.food_items using gin (name gin_trgm_ops);
create index idx_food_items_external_id on public.food_items (external_id);

alter table public.food_items enable row level security;

-- Lectura: cualquiera autenticado puede leer items de OFF; los user-creados solo el dueño.
create policy "food_items_select" on public.food_items
  for select using (
    auth.role() = 'authenticated'
    and (source = 'openfoodfacts' or created_by = auth.uid())
  );
create policy "food_items_insert_off" on public.food_items
  for insert with check (
    source = 'openfoodfacts' and auth.role() = 'authenticated'
  );
create policy "food_items_insert_user" on public.food_items
  for insert with check (
    source = 'user' and created_by = auth.uid()
  );
create policy "food_items_update_off" on public.food_items
  for update using (source = 'openfoodfacts' and auth.role() = 'authenticated')
  with check (source = 'openfoodfacts');
create policy "food_items_update_user" on public.food_items
  for update using (source = 'user' and created_by = auth.uid())
  with check (source = 'user' and created_by = auth.uid());
create policy "food_items_delete_user" on public.food_items
  for delete using (source = 'user' and created_by = auth.uid());
```

> Si la extensión `pg_trgm` no está activa, añadirla con `create extension if not exists pg_trgm;` al principio.

### 4.2 Migración: `meal_logs` + `meal_log_items`

```sql
do $$
begin
  if not exists (select 1 from pg_type where typname='meal_type') then
    create type public.meal_type as enum ('breakfast','lunch','snack','dinner');
  end if;
end $$;

create table if not exists public.meal_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  meal_type   public.meal_type not null,
  log_date    date not null default current_date,
  eaten_at    timestamptz not null default now(),
  notes       text,
  created_at  timestamptz not null default now(),
  unique (user_id, meal_type, log_date)
);

create index idx_meal_logs_user_date on public.meal_logs (user_id, log_date desc);

alter table public.meal_logs enable row level security;
create policy "meal_logs_own" on public.meal_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.meal_log_items (
  id              uuid primary key default gen_random_uuid(),
  meal_log_id     uuid not null references public.meal_logs(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  food_item_id    uuid not null references public.food_items(id) on delete restrict,
  quantity_g      numeric not null check (quantity_g > 0 and quantity_g <= 5000),
  -- macros denormalizados al momento del registro (resistente a cambios futuros del food_item)
  kcal            numeric not null check (kcal >= 0),
  protein_g       numeric not null default 0 check (protein_g >= 0),
  carbs_g         numeric not null default 0 check (carbs_g >= 0),
  fat_g           numeric not null default 0 check (fat_g >= 0),
  created_at      timestamptz not null default now()
);

create index idx_meal_log_items_meal on public.meal_log_items (meal_log_id);
create index idx_meal_log_items_user_date
  on public.meal_log_items (user_id, created_at desc);

alter table public.meal_log_items enable row level security;
create policy "meal_log_items_own" on public.meal_log_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

> La denormalización de macros (kcal/protein/carbs/fat en `meal_log_items`) es intencional: si el `food_item` se actualiza con macros corregidos en el futuro, no queremos que cambien retroactivamente los registros históricos del user.

### 4.3 Migración: `nutrition_targets`

```sql
create table if not exists public.nutrition_targets (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  daily_kcal         numeric not null check (daily_kcal >= 800 and daily_kcal <= 6000),
  daily_protein_g    numeric not null check (daily_protein_g >= 20),
  daily_carbs_g      numeric not null check (daily_carbs_g >= 20),
  daily_fat_g        numeric not null check (daily_fat_g >= 10),
  source             text not null default 'auto' check (source in ('auto','manual')),
  computed_at        timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.nutrition_targets enable row level security;
create policy "nutrition_targets_own" on public.nutrition_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 4.4 RPC `compute_nutrition_targets`

Calcula y upsertea los objetivos del user actual desde su perfil biométrico.

```sql
create or replace function public.compute_nutrition_targets()
returns public.nutrition_targets
language plpgsql
security invoker
set search_path = public
as $$
declare
  p record;
  v_age int;
  v_bmr numeric;
  v_factor numeric;
  v_tdee numeric;
  v_kcal numeric;
  v_protein numeric;
  v_fat numeric;
  v_carbs numeric;
  r public.nutrition_targets;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then raise exception 'no profile'; end if;

  if p.birth_date is null or p.height_cm is null or p.weight_kg is null then
    raise exception 'missing_biometrics';
  end if;

  v_age := extract(year from age(p.birth_date::date));

  -- Mifflin-St Jeor
  v_bmr := 10 * p.weight_kg + 6.25 * p.height_cm - 5 * v_age
           + case when p.biological_sex = 'female' then -161 else 5 end;

  -- Factor actividad por weekly_days (default 1.4 si null).
  v_factor := case
    when p.weekly_days is null     then 1.4
    when p.weekly_days <= 2        then 1.375
    when p.weekly_days <= 4        then 1.55
    when p.weekly_days <= 6        then 1.725
    else 1.9
  end;

  v_tdee := v_bmr * v_factor;

  v_kcal := v_tdee + case p.primary_goal
    when 'lose_weight'    then -500
    when 'gain_muscle'    then  300
    when 'performance'    then  200
    else                          0
  end;

  -- Macros: proteína por kg de peso, grasa 25% kcal, resto carbos.
  v_protein := case
    when p.primary_goal in ('gain_muscle','performance') then 1.8 * p.weight_kg
    when p.primary_goal = 'lose_weight'                  then 1.6 * p.weight_kg
    else 1.2 * p.weight_kg
  end;
  v_fat   := (v_kcal * 0.25) / 9;
  v_carbs := (v_kcal - (v_protein * 4) - (v_fat * 9)) / 4;

  -- Sanidad: redondeo y mínimos.
  v_kcal    := round(greatest(v_kcal, 1000));
  v_protein := round(greatest(v_protein, 30));
  v_fat     := round(greatest(v_fat, 20));
  v_carbs   := round(greatest(v_carbs, 50));

  insert into public.nutrition_targets
    (user_id, daily_kcal, daily_protein_g, daily_carbs_g, daily_fat_g, source, computed_at)
  values (auth.uid(), v_kcal, v_protein, v_carbs, v_fat, 'auto', now())
  on conflict (user_id) do update set
    daily_kcal      = excluded.daily_kcal,
    daily_protein_g = excluded.daily_protein_g,
    daily_carbs_g   = excluded.daily_carbs_g,
    daily_fat_g     = excluded.daily_fat_g,
    source          = 'auto',
    computed_at     = now(),
    updated_at      = now()
  returning * into r;

  return r;
end $$;
```

> Si los users editan manualmente sus targets, el `source` pasa a `'manual'` y `compute_nutrition_targets` no debe pisar — añadir guard en el upsert (no actualizar si `source='manual'` salvo que sea forzado por el cliente).

### 4.5 Seed de tareas de nutrición

```sql
insert into public.tasks_catalog (id, name, description, category, module, default_points, base_difficulty)
values
  (gen_random_uuid(), 'Desayuno saludable', 'Registra tu desayuno', 'nutrition', 'nutrition', 5, 1),
  (gen_random_uuid(), 'Almuerzo saludable', 'Registra tu almuerzo', 'nutrition', 'nutrition', 5, 1),
  (gen_random_uuid(), 'Merienda saludable', 'Registra tu merienda', 'nutrition', 'nutrition', 5, 1),
  (gen_random_uuid(), 'Cena saludable',     'Registra tu cena',     'nutrition', 'nutrition', 5, 1)
on conflict do nothing;
```

> Ajustar columnas según el schema real de `tasks_catalog`. Si tiene `icon`, `slot_default` u otros, añadirlos con valores razonables.

---

## 5. Tipos compartidos

`packages/validation/src/index.ts`:

```ts
export const MEAL_TYPES = ['breakfast','lunch','snack','dinner'] as const;
export const MealTypeSchema = z.enum(MEAL_TYPES);
export type MealType = z.infer<typeof MealTypeSchema>;

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch:     'Almuerzo',
  snack:     'Merienda',
  dinner:    'Cena',
};

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: '🥐',
  lunch:     '🍽️',
  snack:     '🍎',
  dinner:    '🍲',
};

export const FOOD_ITEM_SOURCES = ['openfoodfacts','user'] as const;
export const FoodItemSourceSchema = z.enum(FOOD_ITEM_SOURCES);

export const QuantityGramsSchema = z.number().positive().max(5000);

export const CustomFoodSchema = z.object({
  name:             z.string().min(2).max(80),
  brand:            z.string().max(80).optional(),
  kcal_per_100g:    z.number().min(0).max(900),
  protein_per_100g: z.number().min(0).max(100),
  carbs_per_100g:   z.number().min(0).max(100),
  fat_per_100g:     z.number().min(0).max(100),
});
```

---

## 6. API cliente

### 6.1 `packages/api/src/foodSearch.ts` — Open Food Facts

```ts
const OFF_BASE = 'https://world.openfoodfacts.org';
const UA = 'BeProud/0.1 (mailto:hello@beproud.app)';

export type OffProduct = {
  code: string;
  name: string;
  brand?: string;
  image_url?: string;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  sugars_per_100g?: number;
  fiber_per_100g?: number;
};

/** Búsqueda por texto. Devuelve hasta 20 productos, ordenados por relevancia OFF. */
export async function searchFoodByText(query: string): Promise<OffProduct[]>;

/** Lookup por código de barras. Null si no existe. */
export async function lookupFoodByBarcode(barcode: string): Promise<OffProduct | null>;

/** Mapea OffProduct → row de food_items y hace upsert (source='openfoodfacts'). Devuelve el id. */
export async function upsertOffProductAsFoodItem(p: OffProduct): Promise<string>;
```

Detalles de las llamadas:

- **Búsqueda**: `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,brands,image_thumb_url,nutriments`
- **Lookup**: `${OFF_BASE}/api/v2/product/${barcode}.json?fields=code,product_name,brands,image_url,nutriments`
- Headers: `'User-Agent': UA`.
- Mapping de nutriments: `energy-kcal_100g` → kcal, `proteins_100g`, `carbohydrates_100g`, `fat_100g`, `sugars_100g`, `fiber_100g`. Si falta el `kcal_per_100g`, calcular como `proteins*4 + carbs*4 + fat*9`. Si tras eso sigue siendo `0`, descartar el producto del listado.
- Filtrar resultados sin `product_name` o sin macros.
- Timeout 8s; si la promesa falla (offline / OFF caído), capturar y devolver array vacío + mostrar toast en UI.

### 6.2 `packages/api/src/nutrition.ts`

```ts
export type FoodItem = { /* campos columna a columna de food_items */ };
export type MealLog  = { /* idem */ };
export type MealLogItem = { /* idem */ };
export type MealLogWithItems = MealLog & { items: (MealLogItem & { food: FoodItem })[] };
export type NutritionTarget = { /* idem */ };

export async function fetchTargets(): Promise<NutritionTarget | null>;
export async function recomputeTargets(): Promise<NutritionTarget>;     // RPC
export async function updateTargetsManual(input: {
  daily_kcal: number; daily_protein_g: number; daily_carbs_g: number; daily_fat_g: number;
}): Promise<NutritionTarget>;

export async function fetchTodayMeals(date?: string): Promise<MealLogWithItems[]>;
export async function getOrCreateMealLog(mealType: MealType, date?: string): Promise<MealLog>;

export async function addFoodToMeal(input: {
  mealType: MealType;
  foodItemId: string;
  quantityG: number;
  date?: string;
}): Promise<MealLogItem>;

export async function removeMealLogItem(itemId: string): Promise<void>;
export async function updateMealLogItemQuantity(itemId: string, quantityG: number): Promise<MealLogItem>;

export async function searchLocalFoodItems(query: string): Promise<FoodItem[]>;
export async function createCustomFood(input: z.infer<typeof CustomFoodSchema>): Promise<FoodItem>;
export async function fetchRecentFoodsForUser(limit?: number): Promise<FoodItem[]>;

export async function fetchTodayTotals(date?: string): Promise<{
  kcal: number; protein_g: number; carbs_g: number; fat_g: number;
  per_meal: Record<MealType, { kcal: number; items: number }>;
}>;
```

Re-exportar todo en `packages/api/src/index.ts`.

### 6.3 Lógica de `addFoodToMeal`

1. Obtener o crear `meal_log` para `(user, mealType, date)`.
2. Calcular macros del item: `kcal = food.kcal_per_100g * quantityG / 100` (idem proteína, carbos, grasa).
3. Insertar en `meal_log_items` con macros denormalizados.
4. Devolver el item creado.

### 6.4 Búsqueda híbrida (UI lo coordina)

La pantalla de búsqueda debe consultar **primero** la BBDD local (`searchLocalFoodItems`) y **paralelamente** Open Food Facts (`searchFoodByText`). Mezcla los resultados quitando duplicados por `external_id`. Tap en un resultado de OFF dispara `upsertOffProductAsFoodItem` para cachearlo localmente y luego flujo normal.

---

## 7. Cálculo de objetivos en cliente

`apps/mobile/lib/nutrition/computeTargets.ts`:

```ts
export type ComputeInput = {
  weight_kg: number;
  height_cm: number;
  age_years: number;
  biological_sex: 'male' | 'female' | 'other';
  weekly_days?: number | null;
  primary_goal?: PrimaryGoal | null;
};

export function computeTargets(i: ComputeInput): {
  bmr: number; tdee: number;
  daily_kcal: number; daily_protein_g: number; daily_carbs_g: number; daily_fat_g: number;
};
```

Mismo algoritmo que la RPC SQL — duplicado intencional para mostrar previews en UI sin ida y vuelta a BBDD. La RPC es la fuente de verdad al persistir.

---

## 8. Module Registry — adapter de Nutrición

`apps/mobile/features/nutrition/adapters/getTodayNutritionSummary.ts`:

```ts
const target = await fetchTargets();
const totals = await fetchTodayTotals();

const mealsLogged = Object.values(totals.per_meal).filter(m => m.items > 0).length;

return {
  id: 'nutrition',
  icon: '🥗',
  title: 'Nutrición',
  subtitle: target
    ? `${Math.round(totals.kcal)} / ${Math.round(target.daily_kcal)} kcal`
    : 'Configurar objetivos',
  badge: `${mealsLogged}/4`,
  route: '/nutrition',
  enabled: true,
};
```

Añadirlo al `MODULE_REGISTRY` en `apps/mobile/lib/modules.ts` (después de gym y study).

---

## 9. UI · pantallas

### 9.1 `app/nutrition/index.tsx` — Dashboard del día

Layout vertical:

- Header: fecha (con flechas para navegar al día anterior/siguiente, máximo hoy).
- `DailyRings`: 4 anillos en fila — kcal, proteína, carbos, grasa. Cada uno con `consumed / target` y porcentaje.
- 4 `MealCard` en orden: Desayuno, Almuerzo, Merienda, Cena.
  - Cada card muestra: emoji + nombre comida + total kcal del meal + número de items + indicador "vacío" si no hay items.
  - Tap → `router.push('/nutrition/meal/{mealType}')`.
- Botón secundario abajo: "Ver objetivos" → `router.push('/nutrition/targets')`.
- Si el user no tiene `nutrition_targets` y tiene biometría completa: al primer mount llamar `recomputeTargets()` y refrescar.
- Si no tiene biometría: mostrar banner "Completa tu biometría para calcular objetivos" con botón a `settings/biometrics` (si existe; si no, link a profile).

### 9.2 `app/nutrition/meal/[mealType].tsx` — detalle de comida

- Header: emoji + nombre + total kcal del meal.
- Lista de items (`FoodRow`): nombre + brand + cantidad (g) + kcal del item.
- Swipe-to-delete (o long-press → menú con eliminar / cambiar cantidad).
- Footer: tres botones grandes apilados:
  - "Buscar alimento" → `/nutrition/search?meal={mealType}`
  - "Escanear código" → `/nutrition/scan?meal={mealType}`
  - "Crear personalizado" → `/nutrition/custom-food?meal={mealType}`

### 9.3 `app/nutrition/search.tsx` — buscador

- Recibe `meal` por query param.
- TextInput con debounce 300ms. A partir de 2 caracteres dispara búsqueda híbrida.
- Lista en dos secciones:
  - "Mis recientes" (resultados `searchLocalFoodItems` que tengan items pasados del user — top 10).
  - "Resultados" (mezcla local + OFF, dedup por `external_id`).
- Cada fila: thumbnail, nombre, brand, kcal/100g.
- Tap → `router.push('/nutrition/food/{id}?meal={mealType}')`. Si el resultado es de OFF, antes de navegar hacer `upsertOffProductAsFoodItem` y usar el `id` retornado.

### 9.4 `app/nutrition/scan.tsx` — escáner

- Permiso de cámara con `expo-camera`. Si no concedido, mostrar pantalla con botón "Conceder permiso".
- `CameraView` a pantalla completa con overlay (rectángulo central que indica zona de escaneo).
- `onBarcodeScanned`: filtrar por tipos `ean13`, `ean8`, `upc_a`, `upc_e`. Al detectar:
  1. Throttle (no procesar duplicados en 2s).
  2. Vibración corta (`Vibration.vibrate(50)`).
  3. Llamar `lookupFoodByBarcode(code)`.
  4. Si encontrado → `upsertOffProductAsFoodItem` → `router.replace('/nutrition/food/{id}?meal={mealType}')`.
  5. Si no encontrado → toast "Producto no encontrado, créalo manualmente" → `router.replace('/nutrition/custom-food?barcode={code}&meal={mealType}')`.
- Botón flotante para cerrar y volver al meal.
- En **web**: `expo-camera` no soporta scanner en RN web. Mostrar pantalla con mensaje "El escaneo solo está disponible en móvil. Usa la búsqueda por texto.".

### 9.5 `app/nutrition/food/[foodId].tsx` — detalle

- Header con imagen del producto (si hay), nombre, brand.
- Macros por 100g en grid (kcal, proteína, carbos, grasa, azúcares opcional, fibra opcional).
- `QuantityStepper`: input numérico en gramos con presets rápidos (50, 100, 150, 200). Default 100.
- Cálculo en vivo de macros para la cantidad introducida.
- Botón primario "Añadir a {Desayuno|Almuerzo|...}" → `addFoodToMeal` → toast "Añadido" → `router.back()` (volver al detalle del meal).

### 9.6 `app/nutrition/custom-food.tsx` — crear personalizado

- Formulario con `react-hook-form` + Zod (`CustomFoodSchema`).
- Campos: nombre (obligatorio), marca (opcional), kcal/100g, proteína/100g, carbos/100g, grasa/100g.
- Submit → `createCustomFood` → si query trae `meal`, navegar a `/nutrition/food/{id}?meal={mealType}` con el id recién creado para que el user introduzca cantidad. Si no, volver a la lista.

### 9.7 `app/nutrition/targets.tsx`

- Mostrar objetivos actuales y `source` (auto / manual).
- Botón "Recalcular desde mi biometría" (visible siempre) → `recomputeTargets()` → marca `source='auto'`.
- Formulario editable de los 4 valores. Al guardar → `updateTargetsManual` → marca `source='manual'`.
- Aviso: "Cambiar manualmente desactiva el recálculo automático cuando actualices tu peso".

---

## 10. Integración con `RoutineTaskRow`

Ya en Fase 13 dejamos el switch por `module`. Ahora cuando `module === 'nutrition'` en lugar del placeholder, hacer:

```tsx
router.push(`/nutrition/meal/${mapNameToMealType(catalogItem.name)}`);
```

donde el mapeo sencillo: nombre contiene "Desayuno" → breakfast, "Almuerzo" → lunch, "Merienda" → snack, "Cena" → dinner. Si no matchea, ir a `/nutrition`.

---

## 11. Permisos y configuración

En `apps/mobile/app.config.ts`:

- iOS: `NSCameraUsageDescription` = "Necesitamos la cámara para escanear códigos de barras de alimentos.".
- Android: permisos `CAMERA` (ya gestionado por `expo-camera`).

---

## 12. Consideraciones técnicas

### 12.1 Caché TanStack Query

- Keys sugeridas:
  - `['nutrition','targets']`
  - `['nutrition','meals', date]`
  - `['nutrition','totals', date]`
  - `['nutrition','search', query]` (staleTime 60s)
  - `['nutrition','barcode', code]` (staleTime 1d)
  - `['nutrition','recents']`
- Tras `addFoodToMeal` / `removeMealLogItem` / `updateMealLogItemQuantity`: invalidar `['nutrition','meals',date]` y `['nutrition','totals',date]`.

### 12.2 Performance

- `searchLocalFoodItems` con `ilike` o trigrams. Usar `pg_trgm` ya creada.
- Debounce 300ms en buscador para no saturar OFF.
- Lazy load de imágenes (`expo-image` si está disponible; si no, `<Image>` nativo).

### 12.3 Sin foto, sin Claude

Los `meal_log_items` no generan `task_completions` automáticas en esta fase. La completion de la tarea de catálogo `Desayuno saludable` se cierra en cuanto el meal_log para ese día tiene **al menos 1 item**. Implementar:

- Trigger after insert on `meal_log_items`: si existe una `routine_task` del user con catalog `module='nutrition'` y nombre matcheando el `mealType` (desayuno↔breakfast, etc.), insertar `task_completion` con `ai_validation_status='auto_validated'`, `photo_path=null`, `points_awarded` desde el catalog. `on conflict do nothing` por la unique de `(routine_task_id, log_date)`.

```sql
create or replace function public.auto_complete_meal_routine_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meal public.meal_logs%rowtype;
  v_routine_task uuid;
  v_points int;
begin
  select * into v_meal from public.meal_logs where id = new.meal_log_id;
  if v_meal.id is null then return new; end if;

  select rt.id, coalesce(tc.default_points, 5)
    into v_routine_task, v_points
    from public.routine_tasks rt
    join public.routines r on r.id = rt.routine_id and r.user_id = v_meal.user_id and r.is_active
    join public.tasks_catalog tc on tc.id = rt.task_id
   where tc.module = 'nutrition'
     and lower(tc.name) like case v_meal.meal_type
       when 'breakfast' then '%desayuno%'
       when 'lunch'     then '%almuerzo%'
       when 'snack'     then '%merienda%'
       when 'dinner'    then '%cena%'
     end
   limit 1;

  if v_routine_task is null then return new; end if;

  insert into public.task_completions
    (user_id, routine_task_id, photo_path, ai_validation_status,
     ai_confidence, ai_reason, points_awarded, is_public)
  values
    (v_meal.user_id, v_routine_task, null, 'auto_validated',
     1.0, 'meal_logged', v_points, false)
  on conflict do nothing;

  return new;
end $$;

create trigger trg_auto_complete_meal
after insert on public.meal_log_items
for each row execute function public.auto_complete_meal_routine_task();
```

Ajustar nombres de tablas / columnas a la realidad. Documentar en el PR.

---

## 13. Criterios de aceptación

1. Todas las migraciones aplican limpias en local y remoto. RLS correcto. Sin advisors nuevos.
2. `compute_nutrition_targets` calcula valores razonables para un user con biometría completa.
3. Pantalla `/nutrition` muestra anillos de macros, 4 cards de meals y botón a objetivos.
4. Buscar "manzana" devuelve resultados mezclados (locales + OFF) en menos de 2s.
5. Escanear un código de barras de un producto común (ej. una Coca-Cola, EAN 5449000000996) lo encuentra y permite añadirlo a una comida en menos de 5s.
6. Crear alimento personalizado funciona y queda asociado al user (RLS).
7. Añadir 200g de un alimento crea un `meal_log_items` con macros correctos (kcal/100g × 2).
8. Los anillos del dashboard se actualizan al volver de añadir.
9. Card de "Nutrición" aparece en el carrusel "Hoy" de Rutina con `kcal_consumidas / kcal_objetivo`.
10. Tap en card → navega a `/nutrition` correctamente.
11. Tarea `Desayuno saludable` en la rutina, al añadir 1 item al meal breakfast del día, queda marcada como completada (con puntos otorgados según catalog).
12. Eliminar el último item del meal NO desmarca la completion (decisión: una vez registrada, queda).
13. Escáner de barras pide permisos correctamente y degrada en web.
14. `pnpm lint`, `pnpm typecheck` y `pnpm test` pasan. Sin `console.log`. Sin `any`.

---

## 14. Plan de testing manual

1. Ejecutar `compute_nutrition_targets` desde SQL editor con el user dani logueado: verificar valores razonables.
2. Login y navegar a `/nutrition`. Verificar que los anillos se muestran y los 4 meals están vacíos.
3. Tap en Desayuno → tap "Buscar alimento" → escribir "yogur" → seleccionar uno → poner 150g → añadir.
4. Volver a `/nutrition`: el anillo de kcal debería haber subido.
5. Tap "Almuerzo" → "Escanear código" → escanear cualquier producto envasado → seleccionar 200g → añadir.
6. Si el producto no existe, debe ofrecer crear personalizado.
7. Crear personalizado: nombre "Tortilla casera", 150 kcal/100g, 12g/8g/8g → guardar → cantidad 250g → añadir a Cena.
8. En `/nutrition` verificar totales.
9. Ir a `/nutrition/targets` y editar manualmente kcal a 2500 → guardar → comprobar que `source='manual'`.
10. Volver a Rutina → comprobar carrusel: card Nutrición muestra "x/2500 kcal" y "3/4".
11. Tener una `routine_task` de "Desayuno saludable" en la rutina → añadir cualquier alimento al breakfast → la fila queda tickada al volver.
12. Cerrar app, abrirla, navegar al día anterior con la flecha del header → ver datos persistidos.
13. Modo avión: la búsqueda de OFF da error controlado, los items locales siguen funcionando.

---

## 15. Qué NO hacer

- No implementar fotos de plato con IA. Esto se queda para una fase futura, posiblemente cuando activemos Claude Haiku (Fase 9 latente).
- No añadir tracking de agua. Pequeña fase futura.
- No construir recetas / templates / planning semanal.
- No exponer una pantalla de feed con comidas. La nutrición es **privada por defecto**.
- No usar la API de USDA, Nutritionix u otras de pago en esta fase. Open Food Facts cubre el 90% de productos europeos.
- No instalar libs adicionales. Solo `expo-camera`.

---

## 16. Entregables al final

1. Migraciones aplicadas en remoto (las aplico yo desde el MCP de Supabase).
2. Tipos regenerados con `pnpm supabase:types`.
3. PR mergeado a `main` verde.
4. Capturas: dashboard `/nutrition`, búsqueda con resultados, escáner abierto, detalle de alimento, edición de objetivos.
5. Resumen breve en el PR de cambios y plan de QA.

---

## 17. Notas para fases futuras (no implementar ahora)

- **F15A · Tracking de agua**: tabla `water_logs`, contador rápido en card de Nutrición.
- **F15B · Foto de plato con IA**: edge function que llama a Claude Haiku con visión para estimar macros aproximados desde foto. Marcar como "estimado" para diferenciarlo del scan.
- **F15C · Recetas**: tabla `recipes` que combinan food_items con cantidades. Añadir receta entera a un meal en un tap.
- **F15D · Feed de comidas opt-in**: posibilidad de hacer públicas comidas concretas para inspiración entre amigos.
- **F15E · Integración HealthKit / Health Connect**: importar peso para recalcular targets automáticamente.
