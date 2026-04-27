# Fase 18 · Wellness Pulse — daily check-in, weekly review, water, recordatorios contextuales

> Lee `CLAUDE.md` y `PROMPTS.md` antes de tocar nada. Esta fase **no introduce IA generativa** ni cambia las puntuaciones de las tareas existentes.
> Modelo recomendado: **Claude Sonnet 4.6**.
> Rama: `feat/fase-18-wellness-pulse`. Un PR. Conventional Commits.
> Pre-requisitos: Fases 10 (notifs), 13 (hub), 14 (nutrición), 16 (ayuno) y 17 (visual) ya merged.

---

## 1. Objetivo

Construir el "Wellness Pulse" de BeProud: una capa de auto-conocimiento que da al user razones reales para volver a la app cada día. Cuatro piezas conectadas:

- **Daily check-in nocturno**: 30 segundos al final del día. Energía + sueño + emoji de mood + 1 línea opcional de gratitud.
- **Weekly review automático**: domingos por la noche. Resumen + 1 pregunta abierta "¿qué te ha funcionado esta semana?".
- **Water tracking**: contador rápido en el hub de Rutina con quick-actions y objetivo derivado del peso.
- **Recordatorios contextuales**: nudges inteligentes basados en patrón. "No has completado nada de tu mañana, ¿te ayudo a empezar?".

Estas piezas alimentarán los Insights/Correlaciones de Fase 19. Esta fase **se centra en capturar datos y dar feedback inmediato**, no en analytics avanzados todavía.

---

## 2. Plan de archivos

```
supabase/migrations/
├── <ts>_daily_pulses_table.sql
├── <ts>_weekly_reviews_table.sql
├── <ts>_water_logs_table.sql
├── <ts>_water_target_compute_rpc.sql
├── <ts>_notification_rules_table.sql
└── <ts>_seed_wellness_achievements.sql

packages/
├── validation/src/index.ts                  # +DailyPulseSchema, etc.
└── api/src/
    ├── index.ts
    ├── pulses.ts                            # NUEVO
    ├── weeklyReviews.ts                     # NUEVO
    ├── water.ts                             # NUEVO
    └── notificationRules.ts                 # NUEVO

apps/mobile/
├── lib/
│   ├── wellness/
│   │   ├── computeWaterTarget.ts            # 35ml/kg + ajustes
│   │   ├── computeWeekStart.ts              # lunes 00:00 local
│   │   └── contextualRules.ts               # detección de patrones
│   └── modules.ts                           # registrar adapters water + pulse
├── components/wellness/
│   ├── PulseSlider.tsx                      # 1–5 con emojis
│   ├── MoodPicker.tsx                       # 6 emojis
│   ├── WaterDrop.tsx                        # SVG animado
│   ├── WaterQuickActions.tsx                # botones +250 / +500 / +1L
│   └── WeeklyReviewCard.tsx
├── features/
│   ├── pulses/adapters/getTodayPulseSummary.ts
│   └── water/adapters/getTodayWaterSummary.ts
└── app/
    ├── pulse/
    │   ├── _layout.tsx
    │   ├── index.tsx                        # check-in del día
    │   └── history.tsx                      # listado pasado
    ├── review/
    │   ├── _layout.tsx
    │   └── weekly.tsx                       # review del domingo
    └── water/
        ├── _layout.tsx
        ├── index.tsx                        # contador con anillo
        └── settings.tsx                     # objetivo manual
```

---

## 3. Modelo de datos

### 3.1 `daily_pulses`

```sql
create table if not exists public.daily_pulses (
  user_id        uuid not null references auth.users(id) on delete cascade,
  pulse_date     date not null,
  energy_1_5     int  not null check (energy_1_5 between 1 and 5),
  sleep_1_5      int  not null check (sleep_1_5 between 1 and 5),
  mood_emoji     text check (char_length(mood_emoji) <= 8),
  gratitude_text text check (char_length(gratitude_text) <= 240),
  created_at     timestamptz not null default now(),
  primary key (user_id, pulse_date)
);

create index idx_daily_pulses_user_date on public.daily_pulses(user_id, pulse_date desc);

alter table public.daily_pulses enable row level security;
create policy "daily_pulses_own" on public.daily_pulses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 3.2 `weekly_reviews`

```sql
create table if not exists public.weekly_reviews (
  user_id          uuid not null references auth.users(id) on delete cascade,
  week_start       date not null,           -- siempre lunes
  what_worked      text check (char_length(what_worked) <= 600),
  what_didnt       text check (char_length(what_didnt)  <= 600),
  next_week_focus  text check (char_length(next_week_focus) <= 240),
  -- Stats snapshotted al cerrar el review
  completions      int not null default 0,
  best_day_iso     int check (best_day_iso between 1 and 7),
  worst_day_iso    int check (worst_day_iso between 1 and 7),
  avg_energy       numeric,
  avg_sleep        numeric,
  created_at       timestamptz not null default now(),
  primary key (user_id, week_start)
);

create index idx_weekly_reviews_user on public.weekly_reviews(user_id, week_start desc);

alter table public.weekly_reviews enable row level security;
create policy "weekly_reviews_own" on public.weekly_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 3.3 `water_logs`

```sql
create table if not exists public.water_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  log_date    date not null default current_date,
  amount_ml   int  not null check (amount_ml between 50 and 3000),
  source      text not null default 'quick' check (source in ('quick','manual','custom')),
  logged_at   timestamptz not null default now()
);

create index idx_water_logs_user_date on public.water_logs(user_id, log_date desc);

alter table public.water_logs enable row level security;
create policy "water_logs_own" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 3.4 RPC `compute_water_target`

```sql
create or replace function public.compute_water_target()
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_weight numeric;
begin
  select weight_kg into v_weight from public.profiles where id = auth.uid();
  if v_weight is null then return 2000; end if;        -- default 2L
  return greatest(1500, least(4000, round(v_weight * 35)::int));
end $$;
```

### 3.5 `notification_rules`

```sql
create table if not exists public.notification_rules (
  user_id                       uuid primary key references auth.users(id) on delete cascade,
  morning_nudge_enabled         boolean not null default true,
  morning_nudge_at              time not null default '11:00',
  daily_pulse_reminder_enabled  boolean not null default true,
  daily_pulse_reminder_at       time not null default '22:00',
  weekly_review_reminder_enabled boolean not null default true,
  weekly_review_reminder_at     time not null default '19:00',  -- domingo
  encouragement_at_70pct_enabled boolean not null default true,
  water_reminder_enabled        boolean not null default false, -- opt-in, evitar spam
  water_reminder_interval_min   int not null default 120 check (water_reminder_interval_min between 30 and 240),
  timezone                      text not null default 'Europe/Madrid',
  updated_at                    timestamptz not null default now()
);

alter table public.notification_rules enable row level security;
create policy "notification_rules_own" on public.notification_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 3.6 Logros nuevos

```sql
insert into public.achievements (key, name, description, category, icon, points_reward) values
  ('pulse_first',    'Conoce tu pulso',        'Haz tu primer check-in nocturno',           'wellness','💗',  20),
  ('pulse_week_7',   'Pulso constante',        '7 check-ins seguidos',                       'wellness','📈',  50),
  ('review_first',   'Mirada atrás',           'Completa tu primer review semanal',          'wellness','📝',  30),
  ('water_first_day','Hidratación al día',     'Llega al objetivo de agua un día',           'wellness','💧',  20),
  ('water_streak_7', 'Hidratación constante',  '7 días seguidos llegando al objetivo',       'wellness','💦',  60)
on conflict (key) do nothing;
```

Triggers `evaluate_*_achievements` análogos a los de la Fase 16. Implementarlos con la firma de `unlock_achievement` real (consultar Fase 8).

---

## 4. Validación compartida

`packages/validation/src/index.ts`:

```ts
export const PulseScale = [1,2,3,4,5] as const;
export const DailyPulseSchema = z.object({
  energy_1_5: z.number().int().min(1).max(5),
  sleep_1_5:  z.number().int().min(1).max(5),
  mood_emoji: z.string().max(8).optional(),
  gratitude_text: z.string().max(240).optional(),
});
export type DailyPulseInput = z.infer<typeof DailyPulseSchema>;

export const WeeklyReviewSchema = z.object({
  what_worked:     z.string().max(600).optional(),
  what_didnt:      z.string().max(600).optional(),
  next_week_focus: z.string().max(240).optional(),
});
export type WeeklyReviewInput = z.infer<typeof WeeklyReviewSchema>;

export const WaterAmountSchema = z.number().int().min(50).max(3000);

export const MOOD_EMOJIS = ['😄','🙂','😐','😕','😩','😴'] as const;
export type MoodEmoji = (typeof MOOD_EMOJIS)[number];
```

---

## 5. API cliente

### 5.1 `pulses.ts`

```ts
export type DailyPulse = { /* columnas */ };
export async function fetchTodayPulse(): Promise<DailyPulse | null>;
export async function upsertTodayPulse(input: DailyPulseInput): Promise<DailyPulse>;
export async function fetchPulseHistory(days?: number): Promise<DailyPulse[]>;
export async function fetchPulseAverages(days?: number): Promise<{ avg_energy: number; avg_sleep: number; count: number }>;
```

### 5.2 `weeklyReviews.ts`

```ts
export type WeeklyReview = { /* columnas */ };
export async function fetchCurrentWeekReview(): Promise<WeeklyReview | null>;
export async function fetchPreviousWeekStats(): Promise<{
  completions: number;
  best_day_iso: number | null;
  worst_day_iso: number | null;
  avg_energy: number | null;
  avg_sleep: number | null;
} | null>;
export async function upsertCurrentWeekReview(input: WeeklyReviewInput): Promise<WeeklyReview>;
export async function fetchReviewHistory(limit?: number): Promise<WeeklyReview[]>;
```

> `fetchPreviousWeekStats` agrega completions de `task_completions`, mejor día (día con más completions), peor (con menos > 0; si todos 0, null), y promedios de `daily_pulses` de esa semana.

### 5.3 `water.ts`

```ts
export async function fetchTodayWater(): Promise<{ totalMl: number; targetMl: number; logs: WaterLog[] }>;
export async function logWater(amountMl: number, source?: 'quick'|'manual'): Promise<WaterLog>;
export async function deleteWaterLog(id: string): Promise<void>;
export async function fetchWaterTarget(): Promise<number>;     // RPC + cache
export async function setWaterTargetManual(ml: number): Promise<void>; // alterna a target manual en preferences
```

### 5.4 `notificationRules.ts`

```ts
export type NotificationRules = { /* columnas */ };
export async function fetchMyRules(): Promise<NotificationRules>;
export async function updateMyRules(patch: Partial<NotificationRules>): Promise<NotificationRules>;
```

Re-exportar todo en `packages/api/src/index.ts`.

---

## 6. Lógica de helpers

### 6.1 `lib/wellness/computeWeekStart.ts`

```ts
/** Devuelve la fecha del lunes 00:00 de la semana del `now`, en hora local. */
export function computeWeekStart(now: Date = new Date(), tz = 'Europe/Madrid'): Date;
```

Cuidado con timezone: usar `Intl.DateTimeFormat` con `tz` (igual que en Fase 16). No instalar libs de fecha.

### 6.2 `lib/wellness/computeWaterTarget.ts`

```ts
export function computeWaterTarget(weightKg?: number | null): number {
  if (!weightKg) return 2000;
  return Math.max(1500, Math.min(4000, Math.round(weightKg * 35)));
}
```

Mismo cálculo que la RPC para previews UI.

### 6.3 `lib/wellness/contextualRules.ts`

```ts
export type ContextualRule = {
  id: 'morning_nudge' | 'pulse_pending' | 'review_pending' | 'water_low';
  shouldFire: (ctx: WellnessContext) => boolean;
  message: { title: string; body: string };
  cta?: { label: string; route: string };
};

export type WellnessContext = {
  now: Date;
  morningTasksTotal: number;
  morningTasksCompleted: number;
  todayPulseDone: boolean;
  currentWeekReviewDone: boolean;
  isSundayEvening: boolean;
  todayWaterMl: number;
  waterTargetMl: number;
  routineCompletionPctToday: number;
};

export const RULES: ContextualRule[] = [
  // morning_nudge: si son >11:00 y morningTasksCompleted === 0 && morningTasksTotal > 0
  // pulse_pending: si son >22:00 y !todayPulseDone
  // review_pending: si isSundayEvening && !currentWeekReviewDone
  // water_low: si son >18:00 y todayWaterMl < waterTargetMl * 0.5
];
```

Estas reglas evalúa el cliente al abrir la app y al volver a foreground (`AppState` listener). Si una regla `shouldFire` y aún no se ha mostrado hoy, mostrar **un solo banner suave** en la pantalla actual (no notificación push) con su mensaje y CTA. Almacenar el id + fecha en AsyncStorage o Zustand persistido para no repetir.

Las notificaciones push de las mismas reglas se programan vía `notification_rules` (ver siguiente sección).

---

## 7. Programación de notificaciones locales

`apps/mobile/lib/notifications/scheduleWellnessReminders.ts`:

Cuando cambian las reglas o al login del user:

1. Cancelar todas las notifs del canal `wellness`.
2. Si `morning_nudge_enabled`: programar diaria a `morning_nudge_at`. Body: "¿Empezamos la mañana con una tarea?". CTA → `/(tabs)/routine`.
3. Si `daily_pulse_reminder_enabled`: programar diaria a `daily_pulse_reminder_at`. Body: "30 segundos: ¿cómo ha ido tu día?". CTA → `/pulse`.
4. Si `weekly_review_reminder_enabled`: programar semanal domingos a `weekly_review_reminder_at`. Body: "Cierra la semana con tu review". CTA → `/review/weekly`.
5. Si `water_reminder_enabled`: programar cada `water_reminder_interval_min` entre 09:00 y 21:00 hora local. Body rotatorio: "💧 Pequeño sorbo de agua", "Hidratación al día", etc.

Reaprovechar la infraestructura de Fase 10. Skip silencioso en web.

---

## 8. UI · Daily Pulse

### 8.1 `app/pulse/index.tsx`

Pantalla del check-in nocturno. Si `fetchTodayPulse()` ya devuelve algo, mostrar resumen "Ya hiciste tu check-in hoy" con botón "Editar" que reactiva el flujo.

Layout:

- Header con fecha y `Heading`: "¿Cómo ha ido el día?".
- `PulseSlider` para energía: emojis 😩 😕 😐 🙂 😄, slider con snap a 5 posiciones, valor actual destacado y emoji grande encima. Haptic `tap` al cambiar valor.
- Separador "Y la noche pasada…".
- `PulseSlider` para sueño: 😴 (mal) → 😌 (bien) — usa el mismo componente con prop `scale='sleep'`.
- `MoodPicker` opcional: 6 emojis, multi-select=false, deselectable. "¿Cómo te sientes?".
- Input multiline opcional: "Una cosa por la que estás agradecido (opcional)". Max 240 chars con contador.
- Botón primario `Guardar`. Tras éxito: haptic success + toast "Pulse guardado" + `router.back()` o `router.replace('/(tabs)/routine')`.

### 8.2 `app/pulse/history.tsx`

Lista vertical de últimos 30 check-ins:

```
Vie 25 abr · 😄 5  · 😌 4  · "Buen entreno"
Jue 24 abr · 🙂 4  · 😐 3
Mié 23 abr · — sin check-in
...
```

Stats arriba: "Promedio últimos 7 días · Energía 4.2 · Sueño 3.8".

---

## 9. UI · Weekly Review

### 9.1 `app/review/weekly.tsx`

Disponible siempre, pero la notificación lleva domingos. Si ya existe review para `computeWeekStart()`, mostrar el guardado con botón "Editar".

Layout:

- Header: `Heading` "Tu semana en BeProud" + rango de fechas.
- **Stats card** (no editable): completions totales, mejor día (con icono y nombre), peor día, promedio energía, promedio sueño. Datos desde `fetchPreviousWeekStats`. Si no hay datos suficientes (< 3 días con check-in), avisar.
- **Pregunta abierta 1**: "¿Qué te ha funcionado esta semana?" — input multiline, max 600 chars.
- **Pregunta abierta 2**: "¿Qué no te ha funcionado?" — input opcional, max 600 chars.
- **Pregunta abierta 3**: "Una cosa que quieres priorizar la semana que viene" — input corto, max 240 chars.
- Botón primario `Guardar review`. Tras éxito: animación de cierre + toast + `router.replace('/(tabs)/profile')` para que vea su histórico.

### 9.2 Acceso desde Profile

Añadir entrada "Mis reviews semanales" en la pantalla Perfil que abre `/review/history` (lista) y desde ahí cada uno editable / abrible. Alternativa: dejar solo el botón directo "Hacer mi review" si no hay para esta semana, "Ver mi review" si ya está. Decidir lo más limpio en el PR.

---

## 10. UI · Water tracking

### 10.1 `app/water/index.tsx`

Pantalla principal:

- Header con fecha y avatar + objetivo.
- `ProgressRing` (componente de Fase 17) grande, color `bp-300` o azul. Texto central: `${ml}ml / ${targetMl}ml` y porcentaje.
- `WaterQuickActions`: 3 botones grandes de tap: "+250ml" (vaso), "+500ml" (botella), "+1000ml" (botella grande). Tap → `logWater()` + haptic medium + animación: el anillo se rellena con efecto líquido (Reanimated).
- "Más" → bottom sheet con stepper 50–1000ml para cantidad custom.
- Lista de logs del día abajo: "12:45 · 250ml" con swipe-to-delete.
- Footer: link "Ajustar objetivo" → `/water/settings`.

### 10.2 `app/water/settings.tsx`

- Toggle "Calcular automáticamente desde mi peso (35ml/kg)".
- Si OFF, slider de 1500–4000ml manual.
- Al guardar: persistir en preferencias del user (puede ser una columna en `profiles` o un campo en `notification_rules` o una tabla nueva — decidir simple, sugerencia: añadir `water_target_ml int` en `notification_rules` o crear `water_targets` aparte).

### 10.3 Card en hub de Rutina

Adapter `getTodayWaterSummary` registrado en `MODULE_REGISTRY`:

```ts
{
  id: 'water',
  icon: '💧',
  title: 'Agua',
  subtitle: `${ml} / ${target} ml`,
  badge: ml >= target ? '✓' : `${pct}%`,
  route: '/water',
  enabled: true,
}
```

---

## 11. Banners contextuales en pantalla Rutina

Cuando alguna regla de `contextualRules.ts` se dispara, mostrar un banner sutil al inicio de la pantalla Rutina (encima de la NowCard):

```
┌────────────────────────────────────────┐
│ 💡 Aún no has empezado la mañana.      │
│    ¿Te animo con la primera tarea?     │
│                       [ Empezar → ]    │
└────────────────────────────────────────┘
```

Estilo: card `surface-2` con border-l `bp-500`, padding compacto, dismissable con × (que persiste el dismiss en estado local hasta el día siguiente). Una sola regla activa a la vez (la de mayor prioridad: `morning_nudge` > `pulse_pending` > `review_pending` > `water_low`).

---

## 12. Settings · panel de notificaciones

Añadir nueva pantalla `app/settings/notifications.tsx` (o ampliar la existente si ya hay una desde Fase 10). Toggles:

- Recordatorio de la mañana (con time picker).
- Recordatorio de pulse nocturno (time picker).
- Recordatorio de review semanal (domingo + time picker).
- Aliento al 70% de la rutina diaria (toggle).
- Recordatorio de hidratación cada N min (toggle + intervalo).

Cada toggle llama a `updateMyRules` y reprograma notifs automáticamente.

---

## 13. Criterios de aceptación

1. Migraciones aplican limpias en remoto. RLS correctas.
2. Daily check-in se puede crear y editar. `unique (user_id, pulse_date)` evita duplicados.
3. Weekly review carga correctamente las stats de la semana en curso (lunes-domingo en hora local).
4. Water logging suma correctamente, anillo se actualiza con animación líquida.
5. Card "Agua" aparece en el carrusel de Rutina con totales actualizados.
6. Banners contextuales se muestran según las 4 reglas y persisten dismiss hasta el siguiente día.
7. Notificaciones locales se programan y cancelan correctamente al cambiar las reglas.
8. Achievements de wellness se desbloquean correctamente con sus triggers.
9. `pnpm lint`, `pnpm typecheck`, `pnpm test` pasan. Sin `any`, sin `console.log`.
10. Ninguna pantalla nueva rompe el build web (haptics y notifs degradan en silencio en web).

---

## 14. Plan de testing manual

1. Login. Verificar que aparece banner contextual "pulse_pending" a partir de las 22:00 si no hay check-in hoy.
2. Hacer check-in (energía 4, sueño 3, mood 🙂, gratitud "buen día"). Volver a Rutina — banner desaparece.
3. Adelantar fecha del dispositivo al domingo. Banner "review_pending" debe aparecer. Hacer review.
4. Logging de agua: pulsar +500ml tres veces → 1500ml. Anillo crece. Llegar a target → toast + haptic success + achievement `water_first_day`.
5. Cambiar peso del perfil de 70 a 90 kg → reabrir `/water/index` → target sube a ~3150ml.
6. Settings → desactivar recordatorio de pulse → comprobar (con `expo-notifications` debug) que no hay notif programada.
7. Crear pulses 7 días seguidos manipulando fecha → achievement `pulse_week_7` desbloqueado.
8. Web build: cargar `/pulse`, `/review/weekly`, `/water` — todas funcionan, no errores.

---

## 15. Qué NO hacer

- No introducir IA generativa (ej: análisis automático del review).
- No instalar libs nuevas. Reanimated y expo-notifications cubren todo.
- No mostrar pulses ni reviews en feed público — son privados.
- No bloquear el uso de la app si el user no hace check-ins. Todo es opt-in.
- No spamear con más de 3 notifs locales al día. Si hay conflicto, prioridad: review > pulse > morning_nudge > water.
- No anticipar Fase 19 (insights/correlaciones). Esta fase **captura datos**; las correlaciones llegan después.

---

## 16. Entregables

1. Migraciones aplicadas en remoto.
2. Tipos regenerados.
3. PR mergeado a `main` verde.
4. Capturas: pulse check-in, weekly review, water con anillo, settings de notificaciones, banner contextual en Rutina.
5. Resumen en el PR de qué quedó listo y qué cuelga para Fase 19 (insights/correlaciones).
