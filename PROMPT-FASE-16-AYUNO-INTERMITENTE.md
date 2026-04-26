# Fase 16 · Submódulo de Ayuno Intermitente

> Lee `CLAUDE.md` y `PROMPTS.md` antes de tocar nada. Esta fase **no añade IA generativa** ni cambia las puntuaciones de las tareas.
> Modelo recomendado: **Claude Sonnet 4.6**.
> Rama: `feat/fase-16-fasting`. Un PR. Conventional Commits.
> Pre-requisitos: Fases 13 (hub modular), 14 (nutrición) y 15 (wizard de rutina) ya merged.

---

## 1. Objetivo

Construir el submódulo de Ayuno Intermitente integrado dentro de Nutrición pero con su propia entrada visible en el hub de Rutina. Permite al usuario:

- Elegir un protocolo (16:8, 14:10, 18:6, 20:4, OMAD, 5:2, personalizado).
- Definir la ventana horaria de comidas.
- Ver en vivo cuánto lleva ayunando o cuánto le queda de ventana.
- Romper el ayuno explícitamente (con o sin completarlo).
- Recibir notificaciones programadas (cierre próximo de ventana, ayuno completado).
- Ver histórico y stats básicas (ayunos completados, más largo, racha, total acumulado).
- Conectar con el wizard de rutina (Fase 15): si el user contestó "ayuno intermitente" en mañana o noche, llega aquí precompletado.
- Avisar suavemente cuando intente registrar comida fuera de ventana.

Esta fase **no implementa** Healthkit/GoogleFit ni recordatorios externos por SMS; tampoco modifica el sistema de puntos del juego.

---

## 2. Plan de archivos

```
supabase/migrations/
├── <ts>_fasting_protocols_table.sql
├── <ts>_fasting_logs_table.sql
├── <ts>_fasting_close_yesterday_rpc.sql
└── <ts>_seed_fasting_achievements.sql

packages/
├── validation/src/index.ts               # +FastingProtocolSchema, etc.
└── api/src/
    ├── index.ts
    └── fasting.ts                        # NUEVO

apps/mobile/
├── lib/
│   ├── fasting/
│   │   ├── presets.ts                    # protocolos predefinidos
│   │   ├── computeState.ts               # estado actual desde protocolo + hora
│   │   ├── format.ts                     # helpers HH:MM:SS, etc.
│   │   └── notifications.ts              # programar locales
│   └── modules.ts                        # registrar fasting adapter
├── components/fasting/
│   ├── FastingRing.tsx                   # anillo grande con timer
│   ├── ProtocolCard.tsx                  # selector visual
│   ├── WindowEditor.tsx                  # editor eat_start/eat_end
│   └── FastingHistoryRow.tsx
├── features/fasting/
│   └── adapters/getTodayFastingSummary.ts
└── app/
    └── fasting/
        ├── _layout.tsx
        ├── index.tsx                     # vista principal
        ├── setup.tsx                     # primera config / cambio de protocolo
        ├── history.tsx                   # listado y stats
        └── break.tsx                     # confirmación de romper ayuno
```

---

## 3. Modelo de datos

### 3.1 `fasting_protocols`

Una fila por user. Es la configuración personal.

```sql
do $$
begin
  if not exists (select 1 from pg_type where typname = 'fasting_protocol') then
    create type public.fasting_protocol as enum
      ('16_8','14_10','18_6','20_4','omad','5_2','custom');
  end if;
end $$;

create table if not exists public.fasting_protocols (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  protocol             public.fasting_protocol not null,
  -- Para protocolos por horas: ventana de comidas en hora local del usuario.
  eat_start            time,
  eat_end              time,
  -- Para protocolo 5:2: días de la semana en bajo calórico.
  low_cal_days         text[] check (
                         low_cal_days is null or
                         low_cal_days <@ array['MON','TUE','WED','THU','FRI','SAT','SUN']
                       ),
  -- Coherencia: protocolos por horas requieren eat_start/eat_end.
  constraint fasting_protocols_window_chk check (
    (protocol in ('16_8','14_10','18_6','20_4','omad','custom')
     and eat_start is not null and eat_end is not null)
    or
    (protocol = '5_2' and low_cal_days is not null)
  ),
  notify_before_close  boolean not null default true,
  notify_on_complete   boolean not null default true,
  enabled              boolean not null default true,
  timezone             text not null default 'Europe/Madrid',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.fasting_protocols enable row level security;
create policy "fasting_protocols_own" on public.fasting_protocols
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 3.2 `fasting_logs`

Histórico de ayunos. Cada fila es un ayuno terminado (completado o roto).

```sql
do $$
begin
  if not exists (select 1 from pg_type where typname = 'fasting_status') then
    create type public.fasting_status as enum ('completed','broken_early');
  end if;
end $$;

create table if not exists public.fasting_logs (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  protocol              public.fasting_protocol not null,
  started_at            timestamptz not null,
  ended_at              timestamptz not null,
  planned_duration_min  int not null check (planned_duration_min > 0),
  actual_duration_min   int not null check (actual_duration_min  >= 0),
  status                public.fasting_status not null,
  notes                 text,
  created_at            timestamptz not null default now(),
  -- Evita duplicados del mismo ayuno (mismo started_at por user).
  unique (user_id, started_at)
);

create index idx_fasting_logs_user_started on public.fasting_logs(user_id, started_at desc);
create index idx_fasting_logs_user_status  on public.fasting_logs(user_id, status);

alter table public.fasting_logs enable row level security;
create policy "fasting_logs_own" on public.fasting_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 3.3 RPC para cerrar el ayuno de ayer

Idempotente, lo llama el cliente al abrir la app o al cargar la pantalla de Ayuno.

```sql
create or replace function public.close_completed_fasts()
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  p record;
  v_now timestamptz := now();
  v_today date;
  v_eat_start_today timestamptz;
  v_eat_end_yesterday timestamptz;
  v_planned_min int;
  v_inserted int := 0;
begin
  select * into p from public.fasting_protocols
   where user_id = auth.uid() and enabled
     and protocol in ('16_8','14_10','18_6','20_4','omad','custom');
  if p.user_id is null then return 0; end if;

  v_today := (v_now at time zone p.timezone)::date;
  v_eat_start_today  := (v_today::text     || ' ' || p.eat_start::text)::timestamp at time zone p.timezone;
  v_eat_end_yesterday := ((v_today - 1)::text || ' ' || p.eat_end::text)::timestamp at time zone p.timezone;

  -- Si todavía no hemos llegado a hoy eat_start, no hay nada que cerrar.
  if v_now < v_eat_start_today then return 0; end if;

  v_planned_min := extract(epoch from (v_eat_start_today - v_eat_end_yesterday))::int / 60;

  insert into public.fasting_logs
    (user_id, protocol, started_at, ended_at, planned_duration_min, actual_duration_min, status)
  values
    (auth.uid(), p.protocol, v_eat_end_yesterday, v_eat_start_today, v_planned_min, v_planned_min, 'completed')
  on conflict (user_id, started_at) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end $$;
```

### 3.4 Seed de logros

Reaprovecha la tabla `achievements` existente (Fase 8). Inserta 4 logros nuevos:

```sql
insert into public.achievements (key, name, description, category, icon, points_reward)
values
  ('fasting_first',     'Primer ayuno',          'Completa tu primer ayuno',                      'fasting','⏱️',  20),
  ('fasting_week',      'Semana completa',       'Completa 7 ayunos seguidos sin romper antes',   'fasting','📅',  50),
  ('fasting_30',        'Ayunador habitual',     'Completa 30 ayunos en total',                   'fasting','🌙',  100),
  ('fasting_100h',      'Centenario',            '100 horas acumuladas en ayuno',                 'fasting','💯',  150)
on conflict (key) do nothing;
```

> Si la tabla `achievements` requiere otra forma (por ejemplo `category` enum), adaptar a la realidad actual. Si la tabla no tiene los campos que pongo, ajustar en consecuencia. **Antes de aplicar la migración, leer la definición real de `achievements` en `list_tables` o las migraciones previas**.

Trigger para auto-unlock al insertar en `fasting_logs`:

```sql
create or replace function public.evaluate_fasting_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_streak int;
  v_total_hours numeric;
begin
  if new.status <> 'completed' then return new; end if;

  select count(*) into v_total
    from public.fasting_logs
   where user_id = new.user_id and status = 'completed';

  if v_total = 1  then perform public.unlock_achievement(new.user_id, 'fasting_first');     end if;
  if v_total = 30 then perform public.unlock_achievement(new.user_id, 'fasting_30');         end if;

  -- Racha de 7 ayunos completados consecutivos (sin "broken_early" entre medias).
  with ordered as (
    select status, row_number() over (order by started_at desc) as rn
      from public.fasting_logs
     where user_id = new.user_id
     order by started_at desc
     limit 7
  )
  select count(*) filter (where status = 'completed') into v_streak from ordered;
  if v_streak = 7 then perform public.unlock_achievement(new.user_id, 'fasting_week'); end if;

  -- Total de horas acumuladas.
  select sum(actual_duration_min) / 60.0 into v_total_hours
    from public.fasting_logs where user_id = new.user_id and status = 'completed';
  if v_total_hours >= 100 then perform public.unlock_achievement(new.user_id, 'fasting_100h'); end if;

  return new;
end $$;

create trigger trg_evaluate_fasting_achievements
after insert on public.fasting_logs
for each row execute function public.evaluate_fasting_achievements();
```

> Si `unlock_achievement` ya existe (Fase 8) usar la firma real. Si tiene otro nombre (`grant_achievement`, `award_achievement`...), adaptar.

---

## 4. Validación compartida

`packages/validation/src/index.ts`:

```ts
export const FASTING_PROTOCOLS = ['16_8','14_10','18_6','20_4','omad','5_2','custom'] as const;
export const FastingProtocolSchema = z.enum(FASTING_PROTOCOLS);
export type FastingProtocol = z.infer<typeof FastingProtocolSchema>;

export const FASTING_PROTOCOL_LABELS: Record<FastingProtocol, string> = {
  '16_8':  '16:8 — 16h ayuno · 8h ventana',
  '14_10': '14:10 — más suave',
  '18_6':  '18:6 — más estricto',
  '20_4':  '20:4 — Warrior',
  'omad':  'OMAD — una comida al día',
  '5_2':   '5:2 — 5 días normal · 2 bajos',
  'custom':'Personalizado',
};

export const FASTING_PRESET_HOURS: Record<
  Exclude<FastingProtocol,'5_2'|'custom'>,
  { fast: number; eat: number }
> = {
  '16_8':  { fast: 16, eat: 8 },
  '14_10': { fast: 14, eat: 10 },
  '18_6':  { fast: 18, eat: 6 },
  '20_4':  { fast: 20, eat: 4 },
  'omad':  { fast: 23, eat: 1 },
};

export const FastingStatusSchema = z.enum(['completed','broken_early']);
export type FastingStatus = z.infer<typeof FastingStatusSchema>;

export const FastingProtocolInputSchema = z.object({
  protocol: FastingProtocolSchema,
  eat_start: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM
  eat_end:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  low_cal_days: z.array(z.enum(['MON','TUE','WED','THU','FRI','SAT','SUN'])).optional(),
  notify_before_close: z.boolean().default(true),
  notify_on_complete:  z.boolean().default(true),
  timezone: z.string().default('Europe/Madrid'),
});
```

---

## 5. API cliente · `packages/api/src/fasting.ts`

```ts
export type FastingProtocolRow = {
  user_id: string;
  protocol: FastingProtocol;
  eat_start: string | null;          // 'HH:MM:SS'
  eat_end:   string | null;
  low_cal_days: string[] | null;
  notify_before_close: boolean;
  notify_on_complete:  boolean;
  enabled:  boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type FastingLog = { /* columnas de fasting_logs */ };

export async function fetchMyProtocol(): Promise<FastingProtocolRow | null>;
export async function upsertMyProtocol(input: FastingProtocolInput): Promise<FastingProtocolRow>;
export async function disableMyProtocol(): Promise<void>;

export async function logBreakEarly(input: {
  startedAt: string;
  endedAt:   string;
  protocol:  FastingProtocol;
  plannedMin: number;
  actualMin:  number;
  notes?: string;
}): Promise<FastingLog>;

export async function closeCompletedFasts(): Promise<number>;     // RPC

export async function fetchFastingHistory(limit?: number): Promise<FastingLog[]>;
export async function fetchFastingStats(): Promise<{
  totalCompleted: number;
  totalBroken:    number;
  longestMin:     number;
  totalMin:       number;
  currentStreak:  number;        // ayunos completados consecutivos
}>;
```

Re-exportar en `packages/api/src/index.ts`.

---

## 6. Lógica de estado actual

`apps/mobile/lib/fasting/computeState.ts`:

```ts
export type FastingState =
  | { phase: 'idle';   reason: 'no_protocol' | 'disabled' | '5_2_off_day' }
  | {
      phase: 'fasting';
      windowOpensAt: Date;             // próximo eat_start
      elapsedMs: number;               // desde último eat_end
      remainingMs: number;             // hasta próximo eat_start
      plannedMs: number;
      progressRatio: number;           // 0..1
    }
  | {
      phase: 'eating';
      windowClosesAt: Date;            // próximo eat_end
      remainingMs: number;             // hasta cerrar ventana
      windowDurationMs: number;
      progressRatio: number;           // 0..1 (qué % de la ventana ya ha pasado)
    };

export function computeFastingState(
  proto: FastingProtocolRow,
  now: Date = new Date(),
): FastingState;
```

Reglas:
- Si `!proto.enabled` o proto null → `idle:no_protocol|disabled`.
- Si `protocol === '5_2'` y hoy no es low_cal_day → `idle:5_2_off_day`.
- Si protocolo por horas:
  - Calcular `eatStartToday` y `eatEndToday` aplicando `proto.timezone`.
  - Si `now` ∈ [eatStartToday, eatEndToday] → `eating`.
  - Si no → `fasting`. `windowOpensAt` = eatStartToday si `now < eatStartToday`, si no eatStartTomorrow. `elapsed` = now − eatEndYesterday (o eatEndToday si ya pasó).
- Cap `progressRatio` a [0, 1].

Cuidado con timezone: usar `Intl.DateTimeFormat` o `dayjs/timezone` (ya en deps si existe — si no, **no instalar** y usar `Intl`). La zona horaria del user puede diferir de la del dispositivo si lo configura distinto.

---

## 7. Notificaciones locales

`apps/mobile/lib/fasting/notifications.ts`:

```ts
export async function rescheduleFastingNotifications(
  proto: FastingProtocolRow
): Promise<void>;
export async function cancelAllFastingNotifications(): Promise<void>;
```

Lógica:

- Cancelar todas las notificaciones del canal `fasting`.
- Si `enabled === false` → return.
- Programar para hoy y mañana (next 48h):
  - Si `notify_before_close`: 30 min antes de `eat_end`.
  - Si `notify_on_complete`: en el momento de `eat_start` con título "¡Has completado X horas de ayuno!".
- Reaprovechar `expo-notifications` ya configurado en Fase 10.
- Llamar a `rescheduleFastingNotifications` en:
  1. `upsertMyProtocol` (después del éxito).
  2. Mount inicial de `app/fasting/index.tsx`.
  3. Login del usuario (al hidratar `useSession`).

---

## 8. Module Registry · adapter

`apps/mobile/features/fasting/adapters/getTodayFastingSummary.ts`:

```ts
const proto = await fetchMyProtocol();
if (!proto || !proto.enabled) return null;

const state = computeFastingState(proto);

if (state.phase === 'idle') return null;

const subtitle = state.phase === 'fasting'
  ? `Ayunando · ${formatDuration(state.elapsedMs)} de ${formatDuration(state.plannedMs)}`
  : `Ventana abierta · queda ${formatDuration(state.remainingMs)}`;

return {
  id: 'fasting',
  icon: '⏱️',
  title: 'Ayuno',
  subtitle,
  badge: FASTING_PROTOCOL_LABELS[proto.protocol].split(' ')[0], // '16:8'
  route: '/fasting',
  enabled: true,
};
```

Registrar en `MODULE_REGISTRY` de `lib/modules.ts` después del adapter de Nutrición.

---

## 9. UI · Pantallas

### 9.1 `app/fasting/index.tsx`

Layout:

- En mount: llamar `closeCompletedFasts()` (idempotente, devuelve nº de inserts).
- Header con label del protocolo y botón "⚙️" → `/fasting/setup`.
- `FastingRing`: anillo grande SVG con progreso `state.progressRatio`. Color `bg-violet-400` si fasting, `bg-emerald-400` si eating.
- Texto central:
  - Si fasting: tiempo elapsed `12:34:21` grande, debajo "de 16h" o "de 14h" según protocolo.
  - Si eating: "Ventana abierta", debajo `2h 18m restantes`.
  - Si idle: "No tienes protocolo activo", botón `[ Configurar ]`.
- Datos pequeños debajo: `Ventana 13:00 – 21:00`.
- Botón primario:
  - Si fasting: `Romper ayuno` → `/fasting/break`.
  - Si eating: `Cerrar ventana antes` (opcional, raro, abre confirmación que crea log con status='broken_early' invertido — implementar solo si trivial; si añade complejidad, omitir y dejar la ventana cerrarse sola).
- Stats mini abajo: `🔥 racha · ⏱️ más largo · ✅ total`. Tap → `/fasting/history`.

### 9.2 `app/fasting/setup.tsx`

Recibe `?protocol=16_8` opcional para llegar precompletado desde el wizard.

- Cards de selección de protocolo (1 por opción, scroll vertical). La card seleccionada destaca con borde.
- Si el protocolo es por horas: dos `WindowEditor` (eat_start y eat_end). Sliders o pickers de hora. Computar fast_hours y mostrar en vivo "Ayuno de 16h, ventana 8h".
- Si el protocolo es 5:2: chips multi-select para días low-cal (default Mar y Vie).
- Toggles: `Avisarme 30 min antes de cerrar`, `Avisarme cuando complete el ayuno`.
- Botón `Guardar` → `upsertMyProtocol` → `rescheduleFastingNotifications` → `router.replace('/fasting')`.
- Botón secundario `Desactivar ayuno` (solo si ya hay protocolo activo): `disableMyProtocol` + cancela notificaciones + back.

### 9.3 `app/fasting/history.tsx`

Lista vertical de los últimos 30 ayunos:

```
✅ 25 abr · 16h 02m · 16:8 · completado
⚠️ 24 abr · 11h 14m · 16:8 · roto antes
✅ 23 abr · 16h 00m · 16:8 · completado
...
```

Header con stats:

- "12 ayunos completados"
- "Ayuno más largo: 18h 34m"
- "Total acumulado: 192h"
- "Racha actual: 5 ayunos"

### 9.4 `app/fasting/break.tsx`

Confirmación de romper ayuno:

```
¿Seguro que quieres romper tu ayuno?

Llevas 12h 34m de un objetivo de 16h.
Te quedan 3h 26m.

[ Romper igualmente ]   [ Volver ]
```

`Romper igualmente` → llama `logBreakEarly({...})` con `actualMin = elapsedMs / 60_000`. Cancela notificaciones. Toast "Ayuno cerrado". `router.back()`.

---

## 10. Integración con Nutrición

En `app/nutrition/meal/[mealType].tsx` cuando el user va a añadir el primer item de una comida:

- Llamar `computeFastingState(proto)` (cache en memoria, no nueva query).
- Si `phase === 'fasting'`:
  - Mostrar bottom sheet de aviso:
    ```
    Estás en ayuno (12h 34m de 16h).
    
    [ Romper ayuno y registrar ]
    [ Cancelar ]
    ```
  - "Romper ayuno y registrar" → `logBreakEarly(...)` → continúa con add food normal.
  - "Cancelar" → vuelve atrás.
- Si `phase === 'eating'` o `idle`: flujo normal sin fricción.

---

## 11. Integración con Wizard de rutina (Fase 15)

En `app/routine-design/preview/[slot].tsx`, después de `Aceptar y crear`, comprobar las respuestas:

- Si slot es `morning` y answer `breakfast === 'fasting'`: navegar tras crear a `/fasting/setup?protocol=16_8&from=wizard`.
- Si slot es `evening` y answer `fasting_close` empieza por `yes_`: navegar a `/fasting/setup?protocol={mapped}&from=wizard` con el protocolo correspondiente.
- En `setup.tsx`, si `from === 'wizard'`, después de guardar mostrar toast "Tu ayuno está configurado" y `router.replace('/routine-design')` para que el user vuelva al hub a configurar otros bloques.
- Si ya tiene un `fasting_protocols` activo, no abrir `setup` automáticamente — solo si no existe.

---

## 12. Criterios de aceptación

1. Migraciones aplican limpias en remoto. RLS en `fasting_protocols` y `fasting_logs` correcta.
2. `closeCompletedFasts` RPC es idempotente. Llamarla 5 veces en el mismo día no genera duplicados.
3. `computeFastingState` da resultados correctos para los 6 protocolos por horas y para 5:2 (off day vs on day).
4. Manejo de timezone: si el dispositivo está en `Europe/Madrid` y el protocolo en `Europe/Madrid`, todo coincide; si difieren, se respeta la del protocolo. Tests unitarios para esto.
5. Anillo de progreso en `/fasting` se actualiza cada segundo sin parpadeos visibles.
6. Notificaciones programadas correctamente: 30 min antes de cerrar ventana y al completar el ayuno. Se cancelan al desactivar.
7. Botón "Romper ayuno" crea entrada en `fasting_logs` con `status='broken_early'` y duración real.
8. Card "Ayuno" aparece en el carrusel "Hoy" de Rutina si y solo si `enabled=true` y no es `idle:5_2_off_day`.
9. Aviso al registrar comida fuera de ventana funciona y permite seguir o cancelar.
10. Wizard mañana / noche con respuesta de ayuno deep-linkea a `/fasting/setup?protocol=...` precompletado.
11. Trigger de logros desbloquea correctamente cada uno (validar manualmente con `select * from user_achievements`).
12. `pnpm lint`, `pnpm typecheck`, `pnpm test` pasan. Sin `any`, sin `console.log`.

---

## 13. Plan de testing manual

1. Crear cuenta nueva. Pasar onboarding y wizard de mañana (Fase 15) eligiendo `breakfast = fasting`. Verificar que aterriza en `/fasting/setup?protocol=16_8` automáticamente.
2. Configurar protocolo 16:8 con eat_start 13:00 y eat_end 21:00. Activar ambas notificaciones. Guardar.
3. Volver a `/(tabs)/routine`: la card "Ayuno" aparece en el carrusel con el estado correcto según la hora.
4. Tap en la card → `/fasting`. Comprobar anillo y números.
5. Cambiar la hora del dispositivo manualmente para simular distintos momentos: 12:00 (fasting, casi acaba), 13:00 (apertura ventana), 18:00 (eating), 21:00 (cierre ventana), 03:00 (fasting profundo). Verificar coherencia.
6. Pulsar `Romper ayuno` durante fasting → confirmar → verifica que se crea `fasting_logs` con `broken_early`.
7. Volver a `/fasting`: ahora en estado fasting (todavía no llega eat_start de mañana). El anillo debería estar reseteado al siguiente ciclo.
8. Esperar (o adelantar reloj) hasta que pase eat_start del día siguiente. Abrir la app: la RPC `closeCompletedFasts` debería crear el log automáticamente.
9. Ir a `/fasting/history`: se ve el listado correcto con stats.
10. Ir a `/nutrition/meal/breakfast` durante fasting: aparece bottom sheet de aviso. Seleccionar `Romper ayuno y registrar` → registra comida + crea log de roto.
11. Probar cambio a protocolo 5:2 con días MAR y VIE: el adapter de módulo solo muestra card en esos días.
12. Probar desactivar protocolo: card desaparece del hub, no llegan notificaciones.
13. Verificar que el primer ayuno completado dispara el logro `fasting_first` (`select * from user_achievements where achievement_key='fasting_first'`).

---

## 14. Qué NO hacer

- No conectar con HealthKit / Google Fit. Fase futura.
- No instalar libs nuevas. Si necesitas timezone math, usa `Intl.DateTimeFormat`. **No** añadas `dayjs` ni `date-fns-tz`.
- No introducir IA generativa para sugerir protocolos.
- No tocar el sistema de puntos de tareas (los puntos del juego no cambian con el ayuno).
- No mostrar la card "Ayuno" en perfil público — el ayuno es **privado**, igual que la nutrición. No publicar nada en feed.
- No bloquear el registro de comidas fuera de ventana. Solo avisar.

---

## 15. Entregables

1. Migraciones aplicadas en remoto (las aplico yo desde MCP cuando termines).
2. Tipos regenerados con `pnpm supabase:types`.
3. PR mergeado a `main` verde.
4. Capturas: `/fasting` en estado fasting, en estado eating, setup, history, aviso al registrar comida fuera de ventana, card en carrusel.
5. Resumen breve en el PR de cambios y decisiones (especialmente cómo manejaste timezone y la idempotencia de `closeCompletedFasts`).

---

## 16. Notas para fases siguientes

- **Fase 17** (catálogo rewrite): no afecta a esta fase.
- **Fase 18** (HealthKit / Google Fit): permitirá importar peso al cerrar un ayuno y correlacionar.
- **Fase 19** (coaching by rules): se puede correlacionar racha de ayunos con energía/sueño cuando llegue la mini-encuesta nocturna.
