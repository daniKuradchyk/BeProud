# Fase 12 · Rediseño pantalla Rutina (híbrido bloques + Now Card)

> Lee `CLAUDE.md` y `PROMPTS.md` antes de tocar nada. Esta fase **no** introduce IA generativa, **no** cambia el modelo de puntos ni de validación.
> Modelo recomendado: **Claude Sonnet 4.6**.
> Una rama: `feat/fase-12-routine-blocks-now-card`. Un PR. Commits Conventional.

---

## 1. Contexto y problema

`app/(tabs)/routine.tsx` actualmente muestra una lista plana de `routine_tasks`. El usuario no sabe **qué toca ahora** ni cómo se distribuye su día. Queremos transformar esa pantalla en un híbrido:

- **Bloques temporales del día**: Mañana, Tarde, Noche, Cualquier momento.
- **Now Card**: tarjeta destacada arriba con la siguiente tarea pendiente del bloque activo. Si el bloque activo está completo, sugiere la primera del siguiente. Si todo está hecho, estado celebratorio.

No usar horas exactas — solo bloques. Mantener la lógica de puntos, completions y reorder existente intacta.

---

## 2. Modelo de datos

### 2.1 Migración SQL nueva

Crear migración: `supabase/migrations/<timestamp>_routine_tasks_time_slot.sql`.

```sql
-- 1. Crear el enum de bloque temporal.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'time_slot') then
    create type public.time_slot as enum ('morning','afternoon','evening','anytime');
  end if;
end $$;

-- 2. Añadir columna a routine_tasks con default 'anytime'.
alter table public.routine_tasks
  add column if not exists time_slot public.time_slot not null default 'anytime';

-- 3. Backfill inteligente por categoría del catálogo.
update public.routine_tasks rt
set time_slot = case tc.category
  when 'fitness'      then 'afternoon'::public.time_slot
  when 'study'        then 'morning'::public.time_slot
  when 'productivity' then 'morning'::public.time_slot
  when 'wellbeing'    then 'evening'::public.time_slot
  when 'social'       then 'evening'::public.time_slot
  when 'nutrition'    then 'anytime'::public.time_slot
  else 'anytime'::public.time_slot
end
from public.tasks_catalog tc
where rt.task_id = tc.id
  and rt.time_slot = 'anytime';

-- 4. Índice opcional para agrupar rápido en cliente.
create index if not exists idx_routine_tasks_routine_slot
  on public.routine_tasks (routine_id, time_slot, position);
```

> **No olvides** correr `pnpm supabase:types` después de aplicar la migración para regenerar `packages/api/src/database.types.ts`.

### 2.2 Actualizar `generate_routine` RPC

La función SQL existente debe asignar `time_slot` al insertar las tareas. Aplicar el mismo mapping por categoría que el backfill. Crear migración separada `_update_generate_routine_with_time_slot.sql` que haga `create or replace function public.generate_routine(...)`.

---

## 3. Validación compartida

En `packages/validation/src/index.ts`:

```ts
export const TIME_SLOTS = ['morning','afternoon','evening','anytime'] as const;
export const TimeSlotSchema = z.enum(TIME_SLOTS);
export type TimeSlot = z.infer<typeof TimeSlotSchema>;

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning:   'Mañana',
  afternoon: 'Tarde',
  evening:   'Noche',
  anytime:   'Cualquier momento',
};

export const TIME_SLOT_ICONS: Record<TimeSlot, string> = {
  morning:   '🌅',
  afternoon: '☀️',
  evening:   '🌙',
  anytime:   '🕒',
};
```

---

## 4. Capa API (`packages/api/src/routines.ts`)

1. Incluir `time_slot` en todos los `select` de `routine_tasks` y en los tipos `RoutineTask` / `RoutineTaskWithCatalog`.
2. `addRoutineTask` ahora acepta `time_slot?: TimeSlot` (default `'anytime'`).
3. Nueva función:

```ts
export async function updateRoutineTaskTimeSlot(
  routineTaskId: string,
  timeSlot: TimeSlot,
): Promise<void>
```

4. Re-exportar todo en `packages/api/src/index.ts`.

---

## 5. Lógica de bloque activo

Crear `apps/mobile/lib/time.ts`:

```ts
import type { TimeSlot } from '@beproud/validation';

/** Devuelve el bloque temporal según la hora local del dispositivo. */
export function getActiveTimeSlot(now = new Date()): TimeSlot {
  const h = now.getHours();
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening'; // 18:00 → 04:59
}

/** Orden de "siguiente bloque" para fallback cuando el actual está completo. */
export const NEXT_SLOT_ORDER: Record<TimeSlot, TimeSlot[]> = {
  morning:   ['morning','afternoon','evening','anytime'],
  afternoon: ['afternoon','evening','anytime','morning'],
  evening:   ['evening','anytime','morning','afternoon'],
  anytime:   ['anytime','morning','afternoon','evening'],
};
```

Test mental: a las 09:00 devuelve `'morning'`; a las 14:30 `'afternoon'`; a las 23:00 o 03:00 `'evening'`.

---

## 6. UI

### 6.1 Estructura de archivos

```
apps/mobile/
├── components/
│   └── routine/
│       ├── RoutineHeader.tsx     # saludo + racha + progreso del día
│       ├── NowCard.tsx           # tarjeta destacada
│       ├── DayBlock.tsx          # sección colapsable por slot
│       └── RoutineTaskRow.tsx    # fila individual (extracción del actual)
└── app/(tabs)/routine.tsx        # rewrite
```

### 6.2 RoutineHeader

Muestra:
- Saludo `Hola, {profile.display_name}` con emoji según slot activo.
- Línea de progreso `{completedToday} de {totalToday} hoy`.
- Mini badges: `🔥 {streak}d`, `⭐ {pointsToday}`.

Datos: usar `useSession`, `getCurrentStreak`, `fetchMyRecentCompletions` filtrado a hoy.

### 6.3 NowCard

Lógica de selección:

```
1. Calcular activeSlot = getActiveTimeSlot()
2. tasks = routine.tasks ordenadas por position
3. Para cada slot en NEXT_SLOT_ORDER[activeSlot]:
     candidato = first(tasks where slot===slot && !completedToday)
     si candidato → renderCard(candidato, isCurrentSlot: slot===activeSlot)
4. Si no hay candidato → renderEmptyState()
```

Visual:
- Tarjeta `rounded-3xl bg-brand-700 p-5 mb-6` con sombra.
- Si la tarea es del slot activo → header `AHORA · {SlotLabel}` con dot pulsante.
- Si es de otro slot (todo el activo está hecho) → header `Siguiente · {SlotLabel}`.
- Icono grande de la categoría (48px), título, subtítulo `{categoría} · {duracion estimada}`.
- Botón primario `[ COMPLETAR ]` que abre el modal de captura de foto existente (`/(tabs)/create` con params).
- Acción secundaria pequeña: `Saltar →` que pasa a la siguiente.

EmptyState (todo hecho hoy):
- Icono 🎉, "Día completo", "Has hecho las {n} tareas de hoy. Mañana más.".

### 6.4 DayBlock

Sección colapsable por slot. Por defecto expandido el slot activo, los demás colapsados.

```
▼ Mañana (2/3)            ← header tappable
   [RoutineTaskRow]
   [RoutineTaskRow]
   [RoutineTaskRow]
```

Header: emoji del slot + label + contador `{done}/{total}`.

Si total === 0 ocultar el bloque entero.

### 6.5 RoutineTaskRow

Fila con:
- Checkmark/círculo izquierdo (lleno si completedToday).
- Icono categoría + título.
- Botón derecho compacto `→` que abre el modal de tarea con sheet de acciones (completar, cambiar slot, eliminar). El sheet de acciones añade botones para mover a `Mañana / Tarde / Noche / Cualquier momento` que llaman a `updateRoutineTaskTimeSlot`.

### 6.6 Pantalla principal `app/(tabs)/routine.tsx`

```tsx
<Screen scroll>
  <RoutineHeader />
  <NowCard />
  <DayBlock slot="morning" />
  <DayBlock slot="afternoon" />
  <DayBlock slot="evening" />
  <DayBlock slot="anytime" />
  <Button title="+ Añadir tarea" onPress={...} className="mt-6" />
</Screen>
```

Mantener el flujo `+ Añadir tarea` actual (catálogo → seleccionar → addRoutineTask). En el modal de añadir, ofrecer un selector de slot con default según categoría (mismo mapping que el backfill).

---

## 7. Onboarding

En la última pantalla del wizard donde se llama `generateRoutine`, no hace falta cambiar nada en cliente — la RPC ya asigna `time_slot` por categoría. Verificar que el RouteGuard sigue funcionando.

---

## 8. Estilos / NativeWind

- Paleta existente `brand-*`.
- Now Card: `bg-brand-700 border border-brand-600 rounded-3xl shadow-lg`.
- DayBlock header: `bg-brand-800/40 rounded-2xl px-4 py-3`.
- Slot activo: pequeño dot `w-2 h-2 rounded-full bg-emerald-400` con `animate-pulse`.
- Iconos por categoría: reutilizar `TASK_CATEGORY_LABELS` y un mapping de emojis ya existente si lo hay; si no, añadir `TASK_CATEGORY_ICONS` en `packages/validation`.

---

## 9. Accesibilidad

- Now Card: `accessibilityLabel="Tarea actual: {title}, {categoria}, en bloque {slot}"`.
- Botones de cambio de slot: `accessibilityLabel="Mover a {slot}"`.
- Headers de bloque: `accessibilityRole="button"` con label que indica si está expandido o colapsado.

---

## 10. Criterios de aceptación

1. Migración aplica limpia en local y remoto, todas las `routine_tasks` existentes tienen `time_slot` no nulo.
2. `generate_routine` produce tareas con `time_slot` asignado según categoría.
3. La pantalla Rutina muestra Now Card con la siguiente tarea pendiente del bloque activo.
4. A las 09:00 el bloque expandido por defecto es Mañana; a las 14:00, Tarde; a las 22:00, Noche.
5. Cuando todas las tareas del día están completadas, Now Card muestra estado celebratorio "Día completo".
6. Tap largo o botón → en una fila abre sheet con acciones de mover slot, completar, eliminar.
7. Cambiar de slot persiste en BBDD y se refleja sin recargar la pantalla (TanStack Query invalidación).
8. Reordenar dentro de un bloque sigue funcionando (preservar `position` por bloque o global — usar global pero filtrar al renderizar).
9. `pnpm lint`, `pnpm typecheck` y `pnpm test` pasan.
10. Sin `console.log` añadidos. Sin `any` añadidos.

---

## 11. Plan de testing manual

1. Login con user dani.
2. Si no hay rutina, completar onboarding hasta generar. Verificar que las tareas vienen con slot asignado por categoría.
3. Abrir Rutina:
   - Comprobar que el bloque correspondiente a la hora actual está expandido.
   - Comprobar que Now Card muestra una tarea del slot activo.
4. Completar la tarea de Now Card → la card debe avanzar a la siguiente pendiente.
5. Abrir el sheet de acciones de una tarea de Mañana, moverla a Noche → desaparece de Mañana, aparece en Noche al expandir.
6. Completar todas las tareas del día → Now Card muestra celebración.
7. Cerrar app, cambiar la hora del dispositivo manualmente a 23:00, abrir → bloque Noche expandido.
8. Crear nueva tarea desde el botón añadir → el selector de slot debe aparecer con default sensato.

---

## 12. Qué NO hacer en esta fase

- No introducir `start_time` ni `duration_min` exactos. Solo bloques.
- No cambiar el sistema de puntos ni la lógica de validación.
- No tocar el feed, los grupos ni los rankings.
- No instalar librerías nuevas. Reanimated 3 ya está disponible si quieres animaciones de pulse / collapse.
- No marcar como urgente la integración con calendarios externos — eso es fase posterior.

---

## 13. Entregables al final

1. Migración aplicada en remoto.
2. Tipos regenerados.
3. PR mergeado a main verde.
4. Captura de pantalla de la nueva Rutina con Now Card visible.
5. Resumen corto en el PR de qué cambió y cómo probarlo.
