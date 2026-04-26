# Fase 15 · Diseño guiado de rutina por bloques temporales

> Lee `CLAUDE.md` y `PROMPTS.md` antes de tocar nada. Esta fase **no añade IA generativa** ni cambia la lógica de puntos. **Sí cambia el final del onboarding**: deja de auto-generar rutina.
> Modelo recomendado: **Claude Sonnet 4.6**.
> Rama: `feat/fase-15-routine-design-wizard`. Un PR. Conventional Commits.
> Pre-requisitos: Fases 11A, 12, 13, 14 ya merged.

---

## 1. Objetivo y problema

Hoy el wizard de onboarding termina llamando a `generate_routine(...)` que crea ~5-10 `routine_tasks` automáticas desde el catálogo. Resultado: el usuario llega a su pantalla Rutina con tareas que él no eligió, muchas genéricas y poco accionables, y no siente propiedad de su rutina.

Esta fase reemplaza ese final por un flujo de **diseño guiado por bloques temporales** donde el usuario decide explícitamente qué quiere hacer en su Mañana, Tarde y Noche. Cada bloque ofrece dos modos:

- **Asistente**: 5-6 preguntas contextuales del momento del día → propone una rutina concreta → usuario acepta o ajusta.
- **Manual**: explora el catálogo y elige tareas él mismo.

El usuario también puede saltar y configurar luego desde la pantalla Rutina.

Esta fase **no toca el catálogo existente** (la reescritura del catálogo es Fase 17). Las tareas que propone el asistente se crean como **tareas personales del usuario** (`user_tasks`), no como elementos del catálogo. Eso desacopla la calidad del wizard de la calidad del catálogo y permite iterar contenidos rápido.

---

## 2. Plan de archivos

```
supabase/migrations/
├── <ts>_user_tasks_table.sql
├── <ts>_routine_tasks_user_task_fk.sql
└── <ts>_routine_tasks_resolved_view.sql

packages/
├── validation/src/index.ts
└── api/src/
    ├── index.ts
    ├── routines.ts                  # update: soporte user_tasks + view
    └── userTasks.ts                 # NUEVO

apps/mobile/
├── lib/
│   └── routineWizard/
│       ├── morning.ts               # rules + Q&A
│       ├── afternoon.ts
│       ├── evening.ts
│       ├── types.ts
│       └── runWizard.ts             # ejecutor común
├── components/
│   └── routine-design/
│       ├── BlockHubCard.tsx
│       ├── ModePicker.tsx
│       ├── WizardQuestion.tsx       # render polimórfico (slider, multi-select, etc.)
│       ├── WizardProgressBar.tsx
│       └── ProposedTaskRow.tsx
├── features/onboarding/
│   └── (eliminar llamada a generateRoutine en step final)
└── app/
    ├── (onboarding)/
    │   └── step-9-finish.tsx        # update: navega a /routine-design
    ├── routine-design/
    │   ├── _layout.tsx
    │   ├── index.tsx                # hub "Diseña tu día"
    │   ├── block/[slot].tsx         # mode picker
    │   ├── wizard/[slot].tsx        # cuestionario
    │   ├── preview/[slot].tsx       # propuesta + edición
    │   └── manual/[slot].tsx        # exploración catálogo
    └── (tabs)/routine.tsx           # update: empty state si no hay bloques
```

---

## 3. Modelo de datos

### 3.1 Migración: `user_tasks`

```sql
create table if not exists public.user_tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null check (char_length(name) between 2 and 80),
  description     text,
  category        text not null,                    -- usar el mismo enum/values que tasks_catalog
  module          text not null default 'generic'
                    check (module in ('generic','gym','study','nutrition')),
  default_points  int  not null default 5  check (default_points between 1 and 30),
  base_difficulty int  not null default 1  check (base_difficulty between 1 and 5),
  source          text not null default 'wizard'
                    check (source in ('wizard','manual','custom')),
  created_at      timestamptz not null default now()
);

create index idx_user_tasks_user on public.user_tasks(user_id);

alter table public.user_tasks enable row level security;
create policy "user_tasks_own" on public.user_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

> Si `tasks_catalog.category` usa un enum `task_category`, replicarlo aquí. Si usa `text` con CHECK, replicar el CHECK con los mismos valores.

### 3.2 Migración: `routine_tasks` admite ambos orígenes

```sql
alter table public.routine_tasks
  add column if not exists user_task_id uuid references public.user_tasks(id) on delete restrict;

alter table public.routine_tasks
  alter column task_id drop not null;

alter table public.routine_tasks
  drop constraint if exists routine_tasks_one_source_chk;
alter table public.routine_tasks
  add constraint routine_tasks_one_source_chk
    check ((task_id is not null)::int + (user_task_id is not null)::int = 1);

create index if not exists idx_routine_tasks_user_task on public.routine_tasks(user_task_id);
```

### 3.3 Migración: vista resolutora

```sql
create or replace view public.routine_tasks_resolved as
select
  rt.id,
  rt.routine_id,
  rt.position,
  rt.target_frequency,
  rt.time_slot,
  rt.created_at,
  rt.task_id,
  rt.user_task_id,
  coalesce(tc.name,            ut.name)            as name,
  coalesce(tc.description,     ut.description)     as description,
  coalesce(tc.category::text,  ut.category::text)  as category,
  coalesce(tc.module,          ut.module)          as module,
  coalesce(tc.default_points,  ut.default_points)  as default_points,
  coalesce(tc.base_difficulty, ut.base_difficulty) as base_difficulty,
  case when tc.id is not null then 'catalog' else 'user' end as task_source
from public.routine_tasks rt
left join public.tasks_catalog tc on tc.id = rt.task_id
left join public.user_tasks    ut on ut.id = rt.user_task_id;

-- La vista hereda RLS de las tablas base. No requiere policy propia.
grant select on public.routine_tasks_resolved to authenticated;
```

### 3.4 RPC opcional para inserción atómica de propuestas del wizard

```sql
create or replace function public.apply_wizard_proposal(
  p_slot text,                                          -- 'morning'|'afternoon'|'evening'|'anytime'
  p_proposals jsonb                                     -- array de {name, description, category, module, default_points}
) returns int                                           -- número de tareas insertadas
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_routine_id uuid;
  v_count int := 0;
  v_position int;
  v_proposal jsonb;
  v_user_task_id uuid;
begin
  -- Asegura que existe una rutina activa.
  select id into v_routine_id from public.routines
   where user_id = auth.uid() and is_active limit 1;

  if v_routine_id is null then
    insert into public.routines(user_id, is_active) values (auth.uid(), true)
      returning id into v_routine_id;
  end if;

  select coalesce(max(position), -1) + 1
    into v_position
    from public.routine_tasks where routine_id = v_routine_id;

  for v_proposal in select * from jsonb_array_elements(p_proposals) loop
    insert into public.user_tasks (user_id, name, description, category, module, default_points)
    values (
      auth.uid(),
      v_proposal->>'name',
      v_proposal->>'description',
      v_proposal->>'category',
      coalesce(v_proposal->>'module', 'generic'),
      coalesce((v_proposal->>'default_points')::int, 5)
    )
    returning id into v_user_task_id;

    insert into public.routine_tasks (routine_id, user_task_id, position, target_frequency, time_slot)
    values (
      v_routine_id, v_user_task_id, v_position,
      coalesce(v_proposal->>'target_frequency', 'daily'),
      p_slot
    );

    v_position := v_position + 1;
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;
```

---

## 4. Validación

`packages/validation/src/index.ts` añade:

```ts
export const TaskSourceSchema = z.enum(['catalog','user']);
export const UserTaskSourceSchema = z.enum(['wizard','manual','custom']);

export const ProposedTaskSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(280).optional(),
  category: TaskCategorySchema,
  module: ModuleSchema.default('generic'),
  default_points: z.number().int().min(1).max(30).default(5),
  target_frequency: TargetFrequencySchema.default('daily'),
});
export type ProposedTask = z.infer<typeof ProposedTaskSchema>;

export const WizardSlotSchema = z.enum(['morning','afternoon','evening']);
export type WizardSlot = z.infer<typeof WizardSlotSchema>;
```

---

## 5. API cliente

### 5.1 `packages/api/src/userTasks.ts`

```ts
export type UserTask = { /* columnas de user_tasks */ };

export async function createUserTask(input: ProposedTask): Promise<UserTask>;
export async function fetchMyUserTasks(): Promise<UserTask[]>;
export async function deleteUserTask(id: string): Promise<void>;
```

### 5.2 Actualizar `packages/api/src/routines.ts`

- `fetchActiveRoutine` ahora lee desde `routine_tasks_resolved` (vista). El tipo `RoutineTaskWithCatalog` se renombra a `RoutineTaskResolved` con campos `name, description, category, module, default_points, task_source`. Mantener export type alias para no romper imports.
- `addRoutineTask` admite parámetro `userTaskId` además de `taskId`. Exactamente uno debe ser non-null.
- Nueva función `applyWizardProposal(slot, proposals[])` que llama a la RPC del 3.4.
- `removeRoutineTask` no cambia.
- `needsRoutineSetup`: hoy devuelve true si no hay rutina activa. Cambiar a "true si no hay rutina activa **o** si la rutina activa no tiene ninguna `routine_task` asociada".

Re-exportar todo en `packages/api/src/index.ts`.

---

## 6. Lógica de los wizards

### 6.1 Tipos comunes (`apps/mobile/lib/routineWizard/types.ts`)

```ts
export type QuestionId = string;

export type Question =
  | { id: QuestionId; kind: 'time'; label: string; defaultValue: string }
  | { id: QuestionId; kind: 'duration_min'; label: string; options: number[]; defaultValue: number }
  | { id: QuestionId; kind: 'single'; label: string; options: { value: string; label: string }[] }
  | { id: QuestionId; kind: 'multi'; label: string; options: { value: string; label: string }[]; max?: number }
  | { id: QuestionId; kind: 'free_text'; label: string; placeholder: string };

export type Answer = string | number | string[];
export type Answers = Record<QuestionId, Answer>;

export type WizardRule = {
  when: (a: Answers) => boolean;
  propose: (a: Answers) => ProposedTask | ProposedTask[];
};

export type Wizard = {
  slot: WizardSlot;
  questions: Question[];
  rules: WizardRule[];
  postProcess?: (proposals: ProposedTask[], a: Answers) => ProposedTask[]; // dedupe, cap, sort
};
```

### 6.2 Wizard de mañana (`morning.ts`) — especificación completa

**Preguntas**:

1. `wake_time` · time · "¿A qué hora te levantas?" · default `07:30`
2. `available_min` · duration_min · "¿De cuánto tiempo dispones antes de empezar el día?" · options `[15, 30, 45, 60, 90, 120]` · default `45`
3. `movement` · single · "¿Quieres mover el cuerpo por la mañana?"
   - `none` "Por ahora no"
   - `stretch` "Estirar 5–10 min"
   - `short_workout` "Entreno corto 15–25 min"
   - `full_workout` "Entreno completo"
4. `mind` · single · "¿Quieres incluir un momento de mente clara?"
   - `none`
   - `meditate_5` "Meditar 5 min"
   - `journal_3` "Journaling: 3 prioridades del día"
   - `read_10` "Leer 10 min"
   - `coffee_focus` "Café consciente sin móvil 5 min"
5. `breakfast` · single · "¿Cómo es tu desayuno?"
   - `none` "No desayuno"
   - `light` "Fruta y café"
   - `full` "Desayuno completo"
   - `fasting` "Estoy en ayuno intermitente"
6. `wins` · multi · max 3 · "Primera victoria del día (elige hasta 3)"
   - `make_bed` "Hacer la cama"
   - `pushups_10` "10 flexiones"
   - `water_lemon` "Vaso de agua con limón"
   - `priorities` "Escribir 3 prioridades del día"
   - `cold_face` "Lavarse la cara con agua fría"
   - `gratitude` "Anotar 1 cosa por la que estoy agradecido"

**Reglas** (ejemplos textuales — implementarlas como objetos en código):

- Si `movement = stretch`: propone `Estirar 5 min al levantarme` (categoría wellbeing, 5 pts).
- Si `movement = short_workout`: propone `Movimiento mañanero 15 min` (fitness, 10 pts, module='generic'). Si Fase 11D (gym) está activa y la rutina del gym tiene plantilla "mañana", proponer en su lugar `Entreno mañana (módulo Gym)` con `module='gym'`.
- Si `movement = full_workout`: propone `Entreno completo` con `module='gym'` y `target_frequency='days:MON,WED,FRI'` por defecto.
- Si `mind = meditate_5`: propone `Meditar 5 min al despertar` (wellbeing, 5 pts).
- Si `mind = journal_3`: propone `Escribir 3 prioridades del día` (productivity, 5 pts).
- Si `mind = read_10`: propone `Leer 10 min con el café` (study, 5 pts).
- Si `mind = coffee_focus`: propone `Café consciente sin móvil 5 min` (wellbeing, 3 pts).
- Si `breakfast = none`: propone `Vaso de agua nada más despertar` (nutrition, 3 pts, module='generic').
- Si `breakfast = light`: propone `Desayuno ligero (fruta + café)` (nutrition, 5 pts, module='nutrition').
- Si `breakfast = full`: propone `Desayuno completo en mesa` (nutrition, 5 pts, module='nutrition').
- Si `breakfast = fasting`: propone `Comprobar ventana de ayuno` (nutrition, 3 pts, module='nutrition'). Nota: en Fase 16 enlazará al módulo de ayuno.
- Para cada elemento de `wins`: propone tarea con nombre del label (3-5 pts según item).

**Post-process**:

- Dedupe por `name` exacto (case-insensitive).
- Si `available_min < 30`: cap a máximo 3 tareas, eliminando los `wins` extra primero, después `mind`, conservando siempre movimiento (si lo eligió) y desayuno.
- Si `available_min in [30, 45]`: cap a 4 tareas.
- Si `available_min >= 60`: sin cap.
- Orden propuesto: hidratación → movimiento → mente → desayuno → wins. Esto se traduce en `position` ascendente al persistir.

### 6.3 Wizard de tarde (`afternoon.ts`)

**Preguntas**:

1. `work_mode` · single · "¿Trabajas o estudias por la tarde?"
   - `presencial` / `remote` / `none` / `variable`
2. `lunch_time` · time · "¿A qué hora comes?" · default `14:00`
3. `lunch_duration` · duration_min · "Duración aproximada de la comida" · options `[15, 30, 45, 60, 90]` · default `45`
4. `post_lunch_dip` · single · "¿Tienes bajón energético después de comer?"
   - `yes_strong` "Sí, fuerte"
   - `yes_mild` "Algo, depende del día"
   - `no` "No"
5. `afternoon_workout` · single · "¿Entrenas por la tarde?"
   - `no`
   - `yes_2_3` "2-3 días por semana"
   - `yes_4plus` "4+ días por semana"
6. `pomodoro` · single · "¿Quieres incluir bloques de foco con Pomodoro?"
   - `none` / `one_session` / `two_or_more`

**Reglas** (resumen):

- `lunch_*`: siempre propone `Almuerzo saludable` (nutrition, 5 pts, module='nutrition').
- `post_lunch_dip = yes_strong`: propone `Paseo 10 min después de comer` (wellbeing, 5 pts) **y** `Siesta 15 min` (wellbeing, 3 pts).
- `post_lunch_dip = yes_mild`: propone `Paseo 5 min después de comer` (wellbeing, 3 pts).
- `afternoon_workout = yes_2_3`: propone `Entreno tarde` con `target_frequency='weekly_3'` y `module='gym'`.
- `afternoon_workout = yes_4plus`: propone `Entreno tarde` con `target_frequency='days:MON,TUE,WED,THU,FRI'` y `module='gym'`.
- `pomodoro = one_session`: propone `Sesión Pomodoro 25/5` (productivity, 8 pts, `module='study'`).
- `pomodoro = two_or_more`: propone dos tareas — `Sesión Pomodoro mañana foco` (8 pts) y `Sesión Pomodoro repaso` (5 pts), ambas `module='study'`.
- Si `work_mode = none`: omite la propuesta de Pomodoro aunque haya pulsado, mostrando aviso suave en el preview "Has elegido Pomodoros aunque has indicado que no estudias por la tarde — ¿seguro?". No bloquear, solo avisar.

### 6.4 Wizard de noche (`evening.ts`)

**Preguntas**:

1. `dinner_time` · time · "¿A qué hora cenas?" · default `21:00`
2. `bed_time` · time · "¿A qué hora te acuestas?" · default `23:30`
3. `screen_off` · single · "¿Quieres apagar pantallas antes de dormir?"
   - `none` / `min_30` / `min_60`
4. `closing` · multi · max 3 · "Cierre del día"
   - `journal_good` "Escribir 3 cosas que han ido bien"
   - `read_15` "Leer 15 min antes de dormir"
   - `meditate_5` "Meditar 5 min antes de dormir"
   - `prep_morning` "Preparar ropa / mochila para mañana"
   - `gratitude_3` "3 gratitudes"
5. `fasting_close` · single · "¿Estás haciendo ayuno intermitente?"
   - `no`
   - `yes_16_8` "16:8"
   - `yes_18_6` "18:6"
   - `yes_other` "Otro / personalizado"

**Reglas**:

- Siempre propone `Cena` (nutrition, 5 pts, module='nutrition').
- `screen_off = min_30`: `Sin pantallas 30 min antes de dormir` (wellbeing, 5 pts).
- `screen_off = min_60`: `Sin pantallas 60 min antes de dormir` (wellbeing, 8 pts).
- Para cada item de `closing`: propone su tarea correspondiente (todas wellbeing/study, 3-5 pts).
- `fasting_close != no`: propone `Cerrar ventana de comidas` (nutrition, 3 pts, module='nutrition'). En Fase 16 esto enlazará al módulo de Ayuno y configurará automáticamente el protocolo elegido.

**Post-process**: cap a 5 tareas máximo. Orden: cena → screen_off → closing items → ayuno.

### 6.5 `runWizard.ts`

Función pura que toma `(wizard, answers)` y devuelve `ProposedTask[]` ya deduplicada y ordenada. Sin efectos secundarios.

```ts
export function runWizard(w: Wizard, answers: Answers): ProposedTask[] {
  const proposals = w.rules
    .filter(r => r.when(answers))
    .flatMap(r => {
      const out = r.propose(answers);
      return Array.isArray(out) ? out : [out];
    });
  return w.postProcess ? w.postProcess(proposals, answers) : proposals;
}
```

---

## 7. UI · pantallas

### 7.1 Cambios en onboarding

`step-9-finish.tsx` (último paso del wizard de onboarding existente):
- **Eliminar** la llamada a `generateRoutine`. Mantener llamada a `updateBiometrics` u otras necesarias.
- En el botón `Empezar` (o como se llame), `router.replace('/routine-design')` en lugar de a `/(tabs)/routine`.
- Si Claude Code detecta que la llamada a `generateRoutine` se hace en `step-1-welcome.tsx` (por el dev-skip), conservar el dev-skip pero apuntando a `/routine-design`. No conservar el comportamiento de auto-rutina ni siquiera en dev.

### 7.2 `app/routine-design/index.tsx` — Hub "Diseña tu día"

```tsx
<Screen scroll>
  <Heading>Diseña tu día</Heading>
  <Subheading>
    Te ayudamos a montar una rutina que de verdad puedas seguir.
    Empieza por la mañana, después la tarde y por último la noche.
    Puedes hacerlas todas hoy o ir poco a poco.
  </Subheading>

  <BlockHubCard slot="morning" />
  <BlockHubCard slot="afternoon" />
  <BlockHubCard slot="evening" />

  <Pressable className="mt-8 self-center">
    <Text className="text-brand-300 underline">
      Saltar por ahora
    </Text>
  </Pressable>
</Screen>
```

`BlockHubCard` muestra:
- Emoji del slot + label.
- Subtítulo: "Sin configurar" / `${count} tareas configuradas` según haya o no tareas en la rutina activa con ese `time_slot`.
- Botón principal: `Diseñar →` si está vacío, `Editar →` si ya hay tareas.
- Si está configurado: pequeño chip "✓ Configurado" arriba.

Si pulsa "Saltar por ahora": `router.replace('/(tabs)/routine')`.

### 7.3 `app/routine-design/block/[slot].tsx` — Mode picker

Dos cards grandes:

```
🧠 Asistente
"Te hago algunas preguntas y te propongo tareas basadas
en tus respuestas. ~2 min."
[ Empezar ]

🛠️ Manual
"Eliges tareas del catálogo tú mismo."
[ Empezar ]
```

`Asistente` → `/routine-design/wizard/${slot}`.
`Manual` → `/routine-design/manual/${slot}`.

Botón secundario: `← Volver` al hub.

### 7.4 `app/routine-design/wizard/[slot].tsx` — Cuestionario

Componente que itera las preguntas del wizard correspondiente. Una pregunta por pantalla con animación slide.

Cabecera: `WizardProgressBar` (segmentos por pregunta, segmento actual lleno).

Cada `Question`:
- `time` → time picker iOS/Android nativo (`@react-native-community/datetimepicker`, ya en deps).
- `duration_min` → grid de chips con las opciones, default seleccionada.
- `single` → radio cards a pantalla.
- `multi` → checkbox cards, contador "x/3 elegidas", botón siguiente habilitado siempre.
- `free_text` → TextInput con maxLength.

Botón `Siguiente` avanza, `Atrás` retrocede. En la última pregunta el botón es `Ver mi propuesta →` y navega a preview.

### 7.5 `app/routine-design/preview/[slot].tsx` — Propuesta + edición

Ejecuta `runWizard(WIZARD_FOR_SLOT, answers)` y muestra:

```
Tu mañana propuesta
─────────────────────────
[ icon ] Vaso de agua con limón al despertar     [ × ]
[ icon ] Estirar 5 min al levantarme              [ × ]
[ icon ] Escribir 3 prioridades del día           [ × ]
[ icon ] Desayuno ligero (fruta + café)           [ × ]
[ + Añadir tarea del catálogo ]
─────────────────────────
[ Aceptar y crear ]    [ Empezar de nuevo ]
```

Cada fila permite eliminar (×). El botón "Añadir tarea del catálogo" abre un picker tipo bottom sheet con las tareas del catálogo (filtrables por categoría). La tarea elegida del catálogo se añade a la propuesta como item con `task_source='catalog'`.

`Aceptar y crear`:
- Para tareas con `task_source='user'` (originadas del wizard): llamar `applyWizardProposal(slot, proposals)` que crea las `user_tasks` + `routine_tasks` atómicamente.
- Para las añadidas del catálogo: llamar `addRoutineTask({ taskId, timeSlot: slot })` por cada una.
- Toast "Tu mañana está lista" → `router.replace('/routine-design')`.

`Empezar de nuevo`: `router.replace('/routine-design/wizard/${slot}')` y limpia answers en estado.

### 7.6 `app/routine-design/manual/[slot].tsx`

Lista del catálogo con buscador y chips por categoría. Multi-select. Botón inferior `Añadir N a {bloque}` que crea las `routine_tasks` con `time_slot=slot` y vuelve al hub.

### 7.7 `app/(tabs)/routine.tsx` — empty state

Si la rutina activa no tiene ninguna `routine_task`, mostrar empty state:

```
🎯 Aún no has diseñado tu rutina.

Te llevamos a diseñarla por bloques. Empieza
por la mañana, sigue por la tarde y termina
con la noche.

[ Diseñar mi rutina ]
```

Botón → `/routine-design`.

Si tiene algunas `routine_tasks` pero no de un slot concreto, en el `DayBlock` correspondiente (Fase 12), añadir botón pequeño al final del bloque vacío: `+ Diseñar este bloque →` que va directo al mode picker de ese slot.

### 7.8 Punto de entrada permanente

Añadir en `app/settings/index.tsx` una entrada "Rediseñar mi rutina" que abre `/routine-design`. Permite al usuario rehacer cualquier bloque cuando quiera. Si selecciona un slot ya configurado, el mode picker advierte:

```
Este bloque ya tiene 4 tareas. Continuar reemplazará
estas tareas por las nuevas que diseñes.

[ Cancelar ]   [ Continuar y reemplazar ]
```

Si confirma, antes de aplicar la nueva propuesta hay que **borrar las `routine_tasks` previas con ese `time_slot`** (con sus `user_tasks` asociadas si `task_source='user'`).

---

## 8. RouteGuard

`apps/mobile/lib/session.ts` ya gestiona estados loading / unauth / needs_onboarding / needs_routine_setup / authenticated.

- `needs_routine_setup` ya redirige hoy (Fase 2) a algún sitio. Cambiar la redirección para que vaya a `/routine-design` en lugar de a `/(onboarding)/...` o donde fuera.
- Después de aceptar el primer bloque (incluso aunque queden 2 sin diseñar), `needsRoutineSetup` debe devolver `false` y permitir navegación libre. El user puede volver a `/routine-design` cuando quiera.

---

## 9. Criterios de aceptación

1. Migraciones aplican limpias (yo las aplico desde MCP). Constraints CHECK válidos.
2. La vista `routine_tasks_resolved` devuelve datos correctos para tareas tanto de catálogo como de user.
3. Onboarding ya no genera rutina automáticamente. Tras finalizarlo, el user aterriza en `/routine-design` con los 3 bloques en estado "Sin configurar".
4. Wizard de mañana, tarde y noche son ejecutables end-to-end. Las propuestas son distintas según las respuestas.
5. Aceptar una propuesta crea las `user_tasks` y `routine_tasks` correctamente, con `time_slot` correcto y `position` ascendente.
6. La pantalla Rutina muestra esas tareas en el bloque correcto, con la NowCard funcionando.
7. Modo Manual funciona: el user navega catálogo, selecciona varias y se añaden con `time_slot` correcto.
8. Empty state en pantalla Rutina aparece cuando no hay `routine_tasks`. Botón lleva al hub de diseño.
9. "Rediseñar mi rutina" en settings funciona y reemplaza correctamente bloques previos cuando el user confirma.
10. RouteGuard nuevo redirige a `/routine-design` cuando `needs_routine_setup`.
11. `pnpm lint`, `pnpm typecheck` y `pnpm test` pasan. Sin `any`, sin `console.log`.

---

## 10. Plan de testing manual

1. Crear cuenta nueva (la BBDD está vacía tras el wipe). Confirmar email.
2. Pasar el onboarding completo. Al final, comprobar que NO se ha auto-creado rutina y que se aterriza en `/routine-design`.
3. Pulsar "Diseñar mañana" → "Asistente". Responder las 6 preguntas (probar combos: hora 7:00, 30 min, entreno corto, journaling, ayuno, victorias hacer cama + 10 flexiones).
4. Verificar que la propuesta tiene 4–5 tareas concretas y razonables.
5. Eliminar una con el ×, añadir una del catálogo, aceptar.
6. Volver al hub: card de Mañana muestra "✓ Configurado · 5 tareas".
7. Ir a `/(tabs)/routine`: las 5 tareas aparecen en el bloque Mañana con `time_slot='morning'`. La NowCard muestra la primera.
8. Diseñar Tarde con modo Manual, elegir 3 tareas del catálogo, aceptar. Volver al hub, comprobar Tarde configurada.
9. Saltar configuración de Noche con "Saltar por ahora". Llegar a Rutina. Bloque Noche oculto (Fase 12 ya esconde bloques sin tareas).
10. Ir a Settings → Rediseñar mi rutina → Mañana → Asistente → confirmar reemplazo. Tras aceptar, en `/(tabs)/routine` solo deben aparecer las nuevas tareas de Mañana, las antiguas borradas.
11. Probar accesibilidad: VoiceOver lee las preguntas y opciones correctamente.
12. Probar offline: el wizard funciona en cliente sin red, pero `Aceptar y crear` debe avisar de error de red sin perder las respuestas.
13. Verificar en BBDD: `select * from user_tasks where user_id=...` muestra las tareas creadas. `select * from routine_tasks_resolved where routine_id=...` muestra las 5+3 tareas con sus categorías y `task_source`.

---

## 11. Qué NO hacer

- No reescribir el catálogo (eso es Fase 17). Las propuestas del wizard se crean como `user_tasks` aunque su nombre coincida con un item del catálogo. No intentar matchear/dedupear con catálogo en esta fase.
- No tocar la lógica de puntos ni los achievements.
- No instalar libs nuevas. `@react-native-community/datetimepicker` ya está en el package.json.
- No eliminar la RPC `generate_routine` — puede seguir existiendo como método alternativo. Solo no se llama desde el flujo principal.
- No anticipar Fase 16 (Ayuno). Las preguntas del wizard que mencionan ayuno son **strings**, no enlaces funcionales — esas integraciones se conectarán en Fase 16.

---

## 12. Entregables

1. Migraciones aplicadas en remoto (las aplico yo desde MCP cuando termines).
2. Tipos regenerados con `pnpm supabase:types`.
3. PR mergeado a `main` verde.
4. Capturas: hub "Diseña tu día", una pregunta del wizard, preview con propuestas, modo manual, empty state de Rutina, settings con "Rediseñar mi rutina".
5. Resumen breve en el PR de cambios y decisiones (especialmente la del comportamiento `needs_routine_setup`).

---

## 13. Notas para Fases siguientes

- **Fase 16 · Ayuno**: implementará el módulo de ayuno intermitente. Cuando esté listo, las respuestas `breakfast=fasting` y `fasting_close != 'no'` se conectarán al setup automático del protocolo elegido.
- **Fase 17 · Reescritura del catálogo**: cuando llegue, las `user_tasks` que coincidan con elementos buenos del catálogo podrán migrarse opcionalmente, pero no es obligatorio. La migración opcional sería un nice-to-have.
- **Fase 18 · Wizard incremental**: en el futuro, en lugar de las 5-6 preguntas iniciales, el wizard podría aprender del comportamiento del user (qué tareas completa, cuáles abandona) y proponer ajustes.
