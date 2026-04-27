# Fase 19 · Insights y Correlaciones

> Lee `CLAUDE.md` y `PROMPTS.md` antes de tocar nada. Esta fase **no introduce IA generativa**, **no añade nuevas mecánicas de juego**.
> Modelo recomendado: **Claude Sonnet 4.6**.
> Rama: `feat/fase-19-insights`. Un PR. Conventional Commits.
> Pre-requisitos: Fases 17 (visual) y 18 (wellness pulse) ya merged.

---

## 1. Objetivo

Construir el dashboard de Insights de BeProud: la pantalla donde el user ve **qué le funciona y qué no**, en clave personal y con datos reales. Cruzar las completions con los pulses (energía/sueño), con el ayuno, con el agua y con la hora del día, para mostrar correlaciones simples y accionables.

Sin IA generativa. Solo agregaciones SQL + visualizaciones. El value-prop es:

> "Las apps de hábitos te muestran lo que has hecho. BeProud te muestra **por qué importa**".

---

## 2. Diseño de la pantalla

Pantalla nueva accesible desde Perfil → "Mis insights" y desde un nuevo botón en el header de Rutina (icono `📊`).

Layout vertical scrollable, dividido en 6 cards. Cada card es independiente (carga su propia query, skeleton mientras carga, empty state si no hay datos suficientes).

```
┌──────────────────────────────────────┐
│  Mis insights                         │
│  Últimos 30 días                      │
├──────────────────────────────────────┤
│ Card 1 · Constancia diaria            │
│ Card 2 · Energía vs cumplimiento      │
│ Card 3 · Mejor hora del día           │
│ Card 4 · Sueño vs energía siguiente   │
│ Card 5 · Tareas que sí cumples        │
│ Card 6 · Tareas que abandonas         │
└──────────────────────────────────────┘
```

Periodo configurable arriba: chips `7d / 30d / 90d / Todo`. Default `30d`.

---

## 3. Plan de archivos

```
supabase/migrations/
├── <ts>_insights_views.sql        # vistas materializadas o normales
└── <ts>_insights_rpcs.sql

packages/
├── api/src/
│   ├── insights.ts                # NUEVO
│   └── index.ts

apps/mobile/
├── lib/insights/
│   ├── format.ts                  # helpers (días de la semana, %, etc.)
│   └── correlate.ts               # cálculo de Pearson en cliente para casos
├── components/insights/
│   ├── ConstancyCalendar.tsx      # heatmap 30d
│   ├── BarChart.tsx               # barras horizontales/verticales, SVG
│   ├── ScatterChart.tsx           # x/y simple
│   ├── DayOfWeekChart.tsx
│   ├── HourOfDayChart.tsx
│   ├── InsightCard.tsx            # contenedor común con título/skeleton/empty
│   └── TaskRankRow.tsx
└── app/
    └── insights/
        ├── _layout.tsx
        └── index.tsx              # las 6 cards
```

> **Sin libs de gráficos**. Charts simples implementados con SVG + Reanimated. La complejidad visual es baja (barras, scatter, heatmap), no necesitamos Victory ni Recharts.

---

## 4. Modelo de datos

No tablas nuevas. Solo **vistas SQL** que el cliente consulta directamente, o RPCs si la query es muy parametrizada (period).

### 4.1 Vista `v_completions_by_day`

```sql
create or replace view public.v_completions_by_day as
select
  user_id,
  (created_at at time zone 'Europe/Madrid')::date as day,
  count(*)                                   as completions,
  sum(points_awarded)                        as points
from public.task_completions
where ai_validation_status in ('valid','auto_validated')
group by user_id, (created_at at time zone 'Europe/Madrid')::date;
```

> Si los users tienen distintas timezones, considerar guardar la timezone en `profiles.timezone` y usar `at time zone p.timezone` con join. Para esta fase, asume Europe/Madrid uniforme y deja TODO marcado para fase futura de soporte multi-timezone.

### 4.2 Vista `v_completions_by_hour`

```sql
create or replace view public.v_completions_by_hour as
select
  user_id,
  extract(hour from created_at at time zone 'Europe/Madrid')::int as hour_of_day,
  count(*) as completions
from public.task_completions
where ai_validation_status in ('valid','auto_validated')
group by user_id, extract(hour from created_at at time zone 'Europe/Madrid');
```

### 4.3 Vista `v_completions_by_dow`

```sql
create or replace view public.v_completions_by_dow as
select
  user_id,
  extract(isodow from created_at at time zone 'Europe/Madrid')::int as iso_dow,  -- 1=Lun..7=Dom
  count(*) as completions
from public.task_completions
where ai_validation_status in ('valid','auto_validated')
group by user_id, extract(isodow from created_at at time zone 'Europe/Madrid');
```

### 4.4 Vista `v_task_rank`

Tareas más completadas y más abandonadas. Aproximación: por cada `routine_task`, contar completions y dividir entre días desde su creación. Las que tienen "completion rate alto" son las que cumples; las de rate < 25% en periodo, las que abandonas.

```sql
create or replace view public.v_task_rank as
with rt as (
  select
    rt.id as routine_task_id,
    rt.routine_id,
    r.user_id,
    coalesce(tc.name, ut.name) as task_name,
    coalesce(tc.category, ut.category) as category,
    rt.created_at as added_at
  from public.routine_tasks rt
  join public.routines r on r.id = rt.routine_id
  left join public.tasks_catalog tc on tc.id = rt.task_id
  left join public.user_tasks    ut on ut.id = rt.user_task_id
), comps as (
  select routine_task_id, count(*) as completions
  from public.task_completions
  where ai_validation_status in ('valid','auto_validated')
  group by routine_task_id
)
select
  rt.user_id,
  rt.routine_task_id,
  rt.task_name,
  rt.category,
  rt.added_at,
  coalesce(c.completions, 0) as completions,
  greatest(1, (current_date - rt.added_at::date)) as days_since_added,
  round(coalesce(c.completions, 0)::numeric
        / greatest(1, (current_date - rt.added_at::date)), 2) as rate_per_day
from rt
left join comps c on c.routine_task_id = rt.routine_task_id;
```

### 4.5 RPC `insights_summary` (period-aware)

Devuelve un objeto JSON con todos los datos del periodo solicitado. Reduce trips. Solo el RPC respeta la timezone.

```sql
create or replace function public.insights_summary(p_days int default 30)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_from date := current_date - p_days;
  v_result jsonb;
begin
  with by_day as (
    select day, completions, points
      from public.v_completions_by_day
     where user_id = v_user and day >= v_from
     order by day
  ),
  by_hour as (
    select hour_of_day, completions
      from public.v_completions_by_hour
     where user_id = v_user
     order by hour_of_day
  ),
  by_dow as (
    select iso_dow, completions
      from public.v_completions_by_dow
     where user_id = v_user
     order by iso_dow
  ),
  pulses as (
    select pulse_date, energy_1_5, sleep_1_5
      from public.daily_pulses
     where user_id = v_user and pulse_date >= v_from
     order by pulse_date
  ),
  task_top as (
    select task_name, category, completions, rate_per_day
      from public.v_task_rank
     where user_id = v_user and rate_per_day >= 0.5
     order by rate_per_day desc nulls last
     limit 5
  ),
  task_bottom as (
    select task_name, category, completions, rate_per_day, added_at, days_since_added
      from public.v_task_rank
     where user_id = v_user and days_since_added >= 14 and rate_per_day < 0.25
     order by rate_per_day asc nulls last
     limit 5
  )
  select jsonb_build_object(
    'period_days',  p_days,
    'by_day',       coalesce((select jsonb_agg(by_day.*) from by_day), '[]'::jsonb),
    'by_hour',      coalesce((select jsonb_agg(by_hour.*) from by_hour), '[]'::jsonb),
    'by_dow',       coalesce((select jsonb_agg(by_dow.*) from by_dow), '[]'::jsonb),
    'pulses',       coalesce((select jsonb_agg(pulses.*) from pulses), '[]'::jsonb),
    'top_tasks',    coalesce((select jsonb_agg(task_top.*) from task_top), '[]'::jsonb),
    'bottom_tasks', coalesce((select jsonb_agg(task_bottom.*) from task_bottom), '[]'::jsonb)
  ) into v_result;

  return v_result;
end $$;
```

---

## 5. API cliente

### 5.1 `packages/api/src/insights.ts`

```ts
export type InsightsSummary = {
  period_days: number;
  by_day:  { day: string; completions: number; points: number }[];
  by_hour: { hour_of_day: number; completions: number }[];
  by_dow:  { iso_dow: number; completions: number }[];
  pulses:  { pulse_date: string; energy_1_5: number; sleep_1_5: number }[];
  top_tasks: { task_name: string; category: string; completions: number; rate_per_day: number }[];
  bottom_tasks: { task_name: string; category: string; completions: number; rate_per_day: number; added_at: string; days_since_added: number }[];
};

export async function fetchInsightsSummary(periodDays: 7 | 30 | 90 | 365): Promise<InsightsSummary>;
```

Re-exportar en `index.ts`.

---

## 6. Cálculo de correlación en cliente

`apps/mobile/lib/insights/correlate.ts`:

```ts
/**
 * Pearson correlation entre dos arrays de igual longitud.
 * Devuelve null si n<3 o varianza nula.
 */
export function pearson(a: number[], b: number[]): number | null;

/**
 * Junta pulses con completions del mismo día.
 * Devuelve { energy[], completions[] } alineados.
 */
export function alignPulsesAndCompletions(
  pulses: { pulse_date: string; energy_1_5: number; sleep_1_5: number }[],
  byDay:  { day: string; completions: number }[],
): { energy: number[]; sleep: number[]; completions: number[] };

/**
 * Sleep "previo" → energía del día. Para card 4.
 * Devuelve { sleep_t_minus_1[], energy[] } alineados.
 */
export function alignSleepLagged(
  pulses: { pulse_date: string; energy_1_5: number; sleep_1_5: number }[],
): { sleep_lag1: number[]; energy: number[] };
```

Tests unitarios para los 3.

---

## 7. UI · Las 6 cards

Patrón común en `InsightCard`:

```tsx
<InsightCard title="Constancia diaria" subtitle="30 días">
  {loading ? <Skeleton.Card /> :
   data.length < 7 ? <EmptyHint text="Necesitamos 7 días de datos" /> :
   <ConstancyCalendar data={data} />}
</InsightCard>
```

### 7.1 Card 1 · Constancia diaria

Heatmap tipo GitHub: una caja por día durante 30 días, intensidad del color según `completions`. 5 niveles (0, 1-2, 3-4, 5-6, 7+). Color base `bp-500`, transparencia escalada.

Layout: 5 filas × 6 columnas (30 cuadritos). Día actual destacado con borde `amber-400`.

Texto debajo: "**X días** con al menos 1 tarea · Racha actual: **Y**".

Implementar en SVG, una `<rect>` por día. Tap en una caja → tooltip con fecha y nº completions.

### 7.2 Card 2 · Energía vs cumplimiento

Scatter chart: eje X = `completions` del día (0–N), eje Y = `energía` del día (1–5). Puntos `bp-300`. Si N < 5 días con ambos datos, mostrar empty hint.

Calcular `pearson(energy, completions)`:

- `> 0.4`: "Tu energía sube cuando cumples más. Sigue así."
- `< -0.4`: "Curioso: cumples más cuando tu energía es baja. Quizá te activa la rutina aunque empieces apático."
- entre: "No hay correlación clara aún. Sigue registrando."

Mostrar el coeficiente `r` pequeño en una esquina.

### 7.3 Card 3 · Mejor hora del día

Bar chart vertical, una barra por hora (0–23) o agrupado en franjas: 5–9, 9–12, 12–15, 15–18, 18–21, 21–24, 0–5. Default agrupado (más legible).

Color barras: `bp-500`, la más alta resaltada `amber-400`.

Texto: "Tu mejor franja: **18:00–21:00** con un 35% de tus tareas".

### 7.4 Card 4 · Sueño previo vs energía

Scatter chart: X = sueño del día anterior, Y = energía del día actual. Calcular `pearson(sleep_lag1, energy)`.

Texto: "Cuando duermes 4+ has tenido en promedio energía 4.1, vs 2.6 cuando duermes 1-2".

### 7.5 Card 5 · Tareas que sí cumples

Lista vertical de las 5 tareas con mejor `rate_per_day`. Por cada una:

```
🏋️ Entreno completo                    87%
   12 completions en 14 días
```

Color barra de fondo en gradient `bp-500/30` proporcional al `rate_per_day`.

Si menos de 3 tareas con datos, mostrar empty hint.

### 7.6 Card 6 · Tareas que abandonas

Lista de las 5 tareas con peor `rate_per_day` (entre las que llevan más de 14 días en la rutina). Por cada una:

```
📚 Leer 1 capítulo                      8%
   3 completions en 30 días
   [ Eliminar de mi rutina ]   [ Ajustar ]
```

CTAs activos:
- `Eliminar de mi rutina`: confirma con bottom sheet → `removeRoutineTask`.
- `Ajustar`: navega a editar la tarea (cambiar slot, frecuencia, etc.).

> **Esta es la card más accionable de las 6 y debería ser la que más valor le aporte al user**. Polishearla bien.

---

## 8. Selector de periodo

Chips arriba de la pantalla:

```
[ 7d ]  [ 30d ]  [ 90d ]  [ Todo ]
```

Al cambiar, refetch `fetchInsightsSummary(N)`. Cache TanStack Query por periodo. Loading skeletons en cada card mientras refresca.

---

## 9. Acceso a Insights

- **Desde Perfil**: nueva entrada "Mis insights" con icono `📊`. Va a `/insights`.
- **Desde Rutina**: en el header (a la altura de la racha), icono pequeño `📊` que abre `/insights`.
- **Desde Weekly review**: tras enviar el review, en la pantalla de confirmación, CTA secundaria "Ver mis insights".

---

## 10. Criterios de aceptación

1. Migraciones de vistas y RPC aplican limpias.
2. RLS implícita: las vistas heredan RLS de las tablas base.
3. `fetchInsightsSummary(30)` devuelve los 7 campos. Estructura JSON estable.
4. Las 6 cards renderizan en menos de 200ms tras llegar la data (sin librerías de chart pesadas).
5. Empty hints en cards con datos insuficientes (<3 puntos).
6. Tests unitarios para `pearson`, `alignPulsesAndCompletions`, `alignSleepLagged`.
7. Selector de periodo cambia los datos en todas las cards a la vez.
8. Las CTAs de la card 6 ("Eliminar / Ajustar") funcionan end-to-end.
9. `pnpm lint`, `pnpm typecheck`, `pnpm test` pasan. Sin `any`, sin `console.log`.
10. Build web funciona sin errores SVG.

---

## 11. Plan de testing manual

1. Crear cuenta y generar datos sintéticos manualmente (30 completions repartidas + 14 pulses) vía MCP. Yo te lo paso si lo necesitas.
2. Ir a `/insights` desde Perfil. Comprobar que las 6 cards renderizan con datos.
3. Cambiar periodo de 30d a 7d a 90d. Verificar refetch y skeletons.
4. Pulsar tap en una caja del heatmap → tooltip con fecha y completions.
5. Verificar texto de correlación tiene sentido con los datos sintéticos.
6. En card 6, eliminar una tarea con bajo cumplimiento → comprobar que desaparece de la rutina.
7. Probar con cuenta sin datos: cada card debería mostrar su empty hint.
8. Web build: pantalla carga sin errores.

---

## 12. Qué NO hacer

- No instalar Victory Native, Recharts, react-native-chart-kit ni ningún chart lib. SVG nativo + Reanimated es suficiente.
- No introducir IA generativa para "explicar tus insights". Mensajes deterministas basados en `r` y promedios.
- No mostrar insights de otros users. Todo es privado.
- No anticipar predicciones (Fase futura). Esta fase solo describe el pasado.
- No tocar la lógica de puntos.

---

## 13. Entregables

1. Migraciones aplicadas en remoto.
2. PR mergeado a `main` verde.
3. Capturas de las 6 cards con datos reales o sintéticos.
4. Resumen breve en el PR.

---

## 14. Notas para fases futuras

- **Fase 20 · Predictive coaching (con IA)**: usar Claude Haiku para sugerir cambios concretos basados en los insights. "Has fallado el 80% de las veces que pones 'Leer' a las 22:00. ¿Probamos a las 12:00?". Requiere Edge Function. Activar cuando estemos en producción real.
- **Fase 21 · Insights por categoría**: separar la analítica en Fitness, Estudio, Nutrición, etc., con cards específicas.
- **Fase 22 · Comparación social**: si el user tiene amigos, comparar tu cumplimiento medio con el de tu grupo (anonimizado).
