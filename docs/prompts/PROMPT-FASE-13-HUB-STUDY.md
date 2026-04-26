# Fase 13 · Hub modular en Rutina + Módulo Estudio (Pomodoro)

> Lee `CLAUDE.md` y `PROMPTS.md` antes de tocar nada. Esta fase **no** introduce IA generativa ni cambia la lógica de puntos / validación de fotos. **No** toca el módulo de gimnasio (Fase 11D) salvo para crear un adaptador de lectura.
> Modelo recomendado: **Claude Sonnet 4.6**.
> Rama: `feat/fase-13-routine-hub-and-study`. Un PR. Conventional Commits.

---

## 1. Objetivo y problema

Hoy la pantalla `app/(tabs)/routine.tsx` muestra solo `routine_tasks`. Para ver el entreno hay que ir a Perfil → Gimnasio. Esto no escala: van a llegar Estudio (esta fase) y Nutrición (siguiente). Hay que convertir Rutina en el **hub diario** sin dinamitar lo que ya funciona.

Esta fase tiene tres partes:

- **A.** Hub modular: carrusel de "módulos activos hoy" en lo alto de Rutina, después de la Now Card y antes de los bloques temporales.
- **B.** Adaptador del módulo Gym: card "Entrenamiento de hoy" que enlaza al módulo gym existente (Fase 11D).
- **C.** Módulo Estudio nuevo: timer Pomodoro, sesiones persistentes, integración con `routine_tasks` para que completar una sesión cree el `task_completion` automáticamente.

La integración tipada de tareas (saber que una tarea de tipo `study` lanza el Pomodoro en vez de la cámara) se hace mínimo: una columna `module` en `tasks_catalog`. Sin migración invasiva.

---

## 2. Plan de archivos

```
supabase/
└── migrations/
    ├── <ts>_tasks_catalog_module.sql
    ├── <ts>_study_sessions_table.sql
    └── <ts>_study_rpcs.sql

packages/
├── validation/src/index.ts          # +ModuleSchema, +StudyTechniqueSchema
└── api/
    └── src/
        ├── index.ts
        ├── tasks.ts                  # incluir 'module' en select y tipo
        ├── routines.ts               # incluir 'module' del catalog en joins
        └── study.ts                  # NUEVO

apps/mobile/
├── lib/
│   └── modules.ts                    # NUEVO · registry de módulos
├── components/
│   └── routine/
│       ├── RoutineModulesCarousel.tsx   # NUEVO
│       ├── ModuleCard.tsx               # NUEVO
│       └── RoutineTaskRow.tsx           # actualizar (handler tipado)
├── features/
│   ├── gym/
│   │   └── adapters/getTodayWorkoutSummary.ts   # NUEVO
│   └── study/
│       ├── components/
│       │   ├── PomodoroRing.tsx
│       │   └── PomodoroControls.tsx
│       ├── lib/
│       │   ├── pomodoroStore.ts        # zustand
│       │   └── techniques.ts
│       └── adapters/getTodayStudySummary.ts
├── app/
│   ├── (tabs)/routine.tsx              # insertar carrusel
│   └── study/
│       ├── _layout.tsx
│       ├── start.tsx                   # pre-pantalla (técnica + minutos)
│       └── session/[id].tsx            # timer activo
```

---

## 3. Modelo de datos

### 3.1 Migración: `tasks_catalog.module`

```sql
-- Añade el módulo al que pertenece cada tarea del catálogo.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='tasks_catalog' and column_name='module'
  ) then
    alter table public.tasks_catalog
      add column module text not null default 'generic';
    alter table public.tasks_catalog
      add constraint tasks_catalog_module_check
      check (module in ('generic','gym','study','nutrition'));
  end if;
end $$;

-- Backfill conservador: solo lo obvio.
update public.tasks_catalog set module = 'study'
  where category = 'study' and module = 'generic';
```

> No marcamos automáticamente `gym` porque la Fase 11D lo gestiona aparte. Si ya añadió otra señal, no la pisamos.

### 3.2 Migración: `study_sessions`

```sql
create table if not exists public.study_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  routine_task_id   uuid references public.routine_tasks(id) on delete set null,
  technique         text not null default 'pomodoro_25_5'
                       check (technique in ('pomodoro_25_5','pomodoro_50_10','custom')),
  planned_minutes   int  not null check (planned_minutes between 5 and 240),
  focus_minutes     int  not null check (focus_minutes between 5 and 90),
  break_minutes     int  not null check (break_minutes between 1 and 30),
  cycles_planned    int  not null check (cycles_planned between 1 and 12),
  cycles_completed  int  not null default 0 check (cycles_completed >= 0),
  status            text not null default 'in_progress'
                       check (status in ('in_progress','completed','abandoned')),
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  notes             text,
  created_at        timestamptz not null default now()
);

create index idx_study_sessions_user_started on public.study_sessions(user_id, started_at desc);
create index idx_study_sessions_user_status  on public.study_sessions(user_id, status);

alter table public.study_sessions enable row level security;

create policy "study_sessions_select_own" on public.study_sessions
  for select using (auth.uid() = user_id);
create policy "study_sessions_insert_own" on public.study_sessions
  for insert with check (auth.uid() = user_id);
create policy "study_sessions_update_own" on public.study_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "study_sessions_delete_own" on public.study_sessions
  for delete using (auth.uid() = user_id);
```

### 3.3 Migración: RPCs de Estudio

```sql
-- Inicia una sesión y devuelve su id.
create or replace function public.start_study_session(
  p_technique        text,
  p_focus_minutes    int,
  p_break_minutes    int,
  p_cycles_planned   int,
  p_routine_task_id  uuid default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_planned int := p_focus_minutes * p_cycles_planned;
begin
  insert into public.study_sessions
    (user_id, routine_task_id, technique, planned_minutes,
     focus_minutes, break_minutes, cycles_planned)
  values
    (auth.uid(), p_routine_task_id, p_technique, v_planned,
     p_focus_minutes, p_break_minutes, p_cycles_planned)
  returning id into v_id;
  return v_id;
end $$;

-- Marca un ciclo completado (focus terminado).
create or replace function public.complete_study_cycle(p_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.study_sessions
     set cycles_completed = cycles_completed + 1
   where id = p_session_id and user_id = auth.uid() and status = 'in_progress';
end $$;

-- Finaliza la sesión. status: 'completed' | 'abandoned'.
-- Si está enlazada a routine_task y status='completed', crea task_completion automática.
create or replace function public.finish_study_session(
  p_session_id uuid,
  p_status     text,
  p_notes      text default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_routine_task uuid;
  v_user uuid := auth.uid();
begin
  if p_status not in ('completed','abandoned') then
    raise exception 'invalid status';
  end if;

  update public.study_sessions
     set status = p_status,
         ended_at = now(),
         notes = coalesce(p_notes, notes)
   where id = p_session_id and user_id = v_user and status = 'in_progress'
   returning routine_task_id into v_routine_task;

  if v_routine_task is not null and p_status = 'completed' then
    insert into public.task_completions
      (user_id, routine_task_id, photo_path, ai_validation_status,
       ai_confidence, ai_reason, points_awarded, is_public)
    values
      (v_user, v_routine_task, null, 'auto_validated',
       1.0, 'pomodoro_completed', 10, false)
    on conflict do nothing;
  end if;
end $$;
```

> **Importante**: si `task_completions.photo_path` tiene NOT NULL en BBDD, hay que relajarlo a NULL para sesiones de estudio. Si no, ajusta el INSERT para usar un placeholder y un campo nuevo `evidence_type text` ('photo' | 'timer'). **Verifica el schema actual antes** y elige la opción menos invasiva. Documenta la decisión en el PR.

> Mismo aviso para `ai_validation_status`: si el CHECK constraint no acepta `'auto_validated'`, añadirlo en una micro-migración. No toques los demás estados.

---

## 4. Tipos compartidos

En `packages/validation/src/index.ts`:

```ts
export const MODULES = ['generic','gym','study','nutrition'] as const;
export const ModuleSchema = z.enum(MODULES);
export type Module = z.infer<typeof ModuleSchema>;

export const STUDY_TECHNIQUES = ['pomodoro_25_5','pomodoro_50_10','custom'] as const;
export const StudyTechniqueSchema = z.enum(STUDY_TECHNIQUES);
export type StudyTechnique = z.infer<typeof StudyTechniqueSchema>;

export const STUDY_TECHNIQUE_PRESETS: Record<
  Exclude<StudyTechnique,'custom'>,
  { focus: number; break: number; cycles: number; label: string }
> = {
  pomodoro_25_5:  { focus: 25, break: 5,  cycles: 4, label: 'Pomodoro 25/5' },
  pomodoro_50_10: { focus: 50, break: 10, cycles: 2, label: 'Bloque 50/10' },
};
```

---

## 5. API cliente

### 5.1 `packages/api/src/study.ts` (NUEVO)

```ts
export type StudySession = {
  id: string;
  user_id: string;
  routine_task_id: string | null;
  technique: StudyTechnique;
  planned_minutes: number;
  focus_minutes: number;
  break_minutes: number;
  cycles_planned: number;
  cycles_completed: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  ended_at: string | null;
  notes: string | null;
};

export async function startStudySession(input: {
  technique: StudyTechnique;
  focusMinutes: number;
  breakMinutes: number;
  cyclesPlanned: number;
  routineTaskId?: string | null;
}): Promise<string>;

export async function completeStudyCycle(sessionId: string): Promise<void>;
export async function finishStudySession(
  sessionId: string,
  status: 'completed' | 'abandoned',
  notes?: string,
): Promise<void>;

export async function fetchActiveStudySession(): Promise<StudySession | null>;
export async function fetchTodayStudyStats(): Promise<{
  cyclesToday: number;
  minutesToday: number;
  sessionsToday: number;
}>;
```

Re-exportar todo en `packages/api/src/index.ts`.

### 5.2 Actualizar `packages/api/src/tasks.ts`

Incluir `module` en el `select` y en `TaskCatalogItem`. Sin breaking changes para llamantes existentes (campo nuevo, default `'generic'`).

### 5.3 Actualizar `packages/api/src/routines.ts`

En `fetchActiveRoutine` y `addRoutineTask`, traer `tasks_catalog(module)` en los joins. `RoutineTaskWithCatalog` añade `module`.

---

## 6. Module Registry (cliente)

`apps/mobile/lib/modules.ts`:

```ts
export type ModuleSummary = {
  id: 'gym' | 'study' | 'nutrition';
  icon: string;          // emoji
  title: string;         // ES
  subtitle: string;      // ES, corto
  badge?: string;        // ej "1/2", "60'"
  route: string;         // path para router.push
  enabled: boolean;
};

export type ModuleAdapter = {
  id: ModuleSummary['id'];
  getTodaySummary: () => Promise<ModuleSummary | null>; // null si no aplica hoy
};

export const MODULE_REGISTRY: ModuleAdapter[] = [
  /* gymAdapter, studyAdapter — nutritionAdapter llega en Fase 14 */
];
```

Cada adapter expone `getTodaySummary` que el carrusel pinta. Si devuelve `null`, su card no aparece. Eso permite a futuros módulos (nutrición) plugarse añadiendo una entrada al registry sin tocar la pantalla Rutina.

---

## 7. Adaptador Gym (lectura)

`apps/mobile/features/gym/adapters/getTodayWorkoutSummary.ts`.

Debe leer del módulo Fase 11D **sin modificarlo**. Si Fase 11D expone una función tipo `fetchTodayWorkout()` o equivalente, llámala. Si no, hacer una query directa a las tablas que ya usa (consulta los archivos de la fase 11D antes de codear).

Devuelve un `ModuleSummary`:

```ts
{
  id: 'gym',
  icon: '🏋️',
  title: 'Entrenamiento de hoy',
  subtitle: workout?.template_name ?? 'Sin plantilla',
  badge: workout ? `${workout.exercise_count} ej · ${workout.estimated_minutes}'` : undefined,
  route: '/gym',  // o el path real del módulo
  enabled: true,
}
```

Si no hay entreno hoy: devolver `null` y la card no se renderiza.

---

## 8. Adaptador Estudio

`apps/mobile/features/study/adapters/getTodayStudySummary.ts`:

```ts
const stats = await fetchTodayStudyStats();
const active = await fetchActiveStudySession();
return {
  id: 'study',
  icon: '📚',
  title: active ? 'Sesión en curso' : 'Estudio',
  subtitle: active
    ? `Pomodoro ${active.cycles_completed}/${active.cycles_planned}`
    : `${stats.minutesToday}' hoy`,
  badge: active ? 'Reanudar' : undefined,
  route: active ? `/study/session/${active.id}` : '/study/start',
  enabled: true,
};
```

---

## 9. UI · Hub modular en Rutina

### 9.1 `RoutineModulesCarousel.tsx`

Carrusel horizontal con scroll snap (FlashList o ScrollView horizontal). Itera `MODULE_REGISTRY`, llama `getTodaySummary`, descarta nulls, renderiza una `ModuleCard` por cada uno.

Layout:
- Title: "Hoy" (si hay al menos una card)
- ScrollView horizontal con `pagingEnabled`, `snapToInterval` ~ 220px, `showsHorizontalScrollIndicator={false}`
- Margen lateral 16px

### 9.2 `ModuleCard.tsx`

`Pressable` con `bg-brand-700`, `border-brand-600`, `rounded-2xl`, `p-4`, `w-52`, `mr-3`.
Contenido: emoji grande, title (font-bold), subtitle (text-sm text-brand-200), badge opcional abajo derecha.
`onPress`: `router.push(card.route)`.
`accessibilityLabel: "{title}, {subtitle}"`.

### 9.3 Insertar en `app/(tabs)/routine.tsx`

```tsx
<RoutineHeader />
<NowCard />
<RoutineModulesCarousel />     {/* NUEVO */}
<DayBlock slot="morning" />
<DayBlock slot="afternoon" />
<DayBlock slot="evening" />
<DayBlock slot="anytime" />
```

### 9.4 Routing tipado en `RoutineTaskRow`

Cuando el user pulsa "Completar" en una fila:
- Si `module === 'study'` → `router.push('/study/start?routineTaskId=' + id)`
- Si `module === 'gym'`   → `router.push('/gym?routineTaskId=' + id)` (o el path real del módulo)
- Si `module === 'nutrition'` → placeholder por ahora: navegar a `/nutrition` que muestra "Próximamente". (La pantalla `nutrition` la creamos en Fase 14, esta fase deja **solo el stub** para que el routing tipado quede en su sitio. Si te incomoda crear la stub, deja el flujo genérico de foto para `nutrition` por ahora y lo cambiamos en F14.)
- Si `module === 'generic'` (default) → flujo actual de foto.

---

## 10. UI · Módulo Estudio

### 10.1 Pre-pantalla `app/study/start.tsx`

Recibe `routineTaskId?` por query param.

Contenido:
- Título "Sesión de estudio".
- Toggle de técnica: cards "Pomodoro 25/5" y "Bloque 50/10" + "Personalizado".
- Si "Personalizado": tres steppers con presets — minutos foco (5-90), descanso (1-30), ciclos (1-8). Validación con Zod en el botón "Empezar".
- Botón primario "Empezar" → llama `startStudySession(...)` → `router.replace('/study/session/' + id)`.

### 10.2 Pantalla activa `app/study/session/[id].tsx`

State management con `pomodoroStore` (zustand), reducer en cliente:

```
phase: 'focus' | 'break'
remainingSeconds: number
isPaused: boolean
cyclesCompleted: number
```

Tick: `setInterval` 1s mientras `!isPaused`. Cuando `remainingSeconds <= 0`:
- Si `phase === 'focus'` → llamar `completeStudyCycle()`, reproducir vibración + notificación local "Ciclo completado", incrementar `cyclesCompleted`, pasar a `break` con `breakMinutes*60`.
- Si `phase === 'break'` → si `cyclesCompleted >= cyclesPlanned` → `finishStudySession(id, 'completed')` → navegar de vuelta a Rutina con toast. Si no → siguiente `focus`.

Layout:
- Anillo grande SVG/Reanimated mostrando progreso del ciclo actual.
- Texto central: tiempo `mm:ss`.
- Subtítulo: `Foco · Ciclo 1 de 4` / `Descanso · 5 min`.
- Botones: `Pausar/Reanudar`, `Saltar a descanso` (solo en focus), `Terminar` (con confirmación → `finishStudySession(id, 'abandoned')` si quedan ciclos).
- Mantener pantalla encendida con `expo-keep-awake` si está disponible (es opcional, no instalar nuevas deps si no lo está; en su lugar mostrar un mensaje "Mantén la app abierta").

### 10.3 Reanudar sesión activa

Si el user vuelve a `/(tabs)/routine.tsx` y hay una `study_sessions` con `status='in_progress'` suya, la card del carrusel muestra "Sesión en curso · Reanudar". Tap → `router.push('/study/session/'+id)`. La pantalla recomputa `remainingSeconds` desde `started_at + cycles_completed * (focus + break)` para resistir cierres de app.

### 10.4 Notificaciones locales

Usar `expo-notifications` ya disponible. Programar:
- Notificación al final de cada `focus` ("Ciclo terminado, descansa {n} min").
- Notificación al final del `break` ("A volver al lío").
- Cancelar todas al `finish` o `abandon`.

No requiere registro de push token. Solo locales con permisos ya solicitados en Fase 10.

---

## 11. Interacción con `task_completions`

Confirmar antes de tocar:

1. Schema actual de `task_completions.photo_path` y constraint de `ai_validation_status`.
2. Si `photo_path` es NOT NULL → relajar a NULL en una micro-migración separada `_relax_task_completions_photo_path.sql`.
3. Si `ai_validation_status` no incluye `'auto_validated'` → añadirlo al CHECK.
4. Si la tabla tiene una FK / trigger que asume `photo_path`, ajustarlo o crear ruta alterna.

Documenta lo que decidas en el PR.

---

## 12. Estilos

- Reusar paleta `brand-*`.
- Anillo Pomodoro: stroke `text-brand-300`, progreso `text-emerald-400` (foco) / `text-amber-400` (break).
- ModuleCard: si la card es "Sesión en curso", añadir borde `border-emerald-400` para destacar.

---

## 13. Accesibilidad

- Anillo con `accessibilityLabel="{phase}, {remaining} restantes, ciclo {n} de {total}"`.
- Botones de control con labels claros.
- Carrusel con `accessibilityRole="list"` y cards con `accessibilityRole="button"`.

---

## 14. Criterios de aceptación

1. Migraciones aplican limpias, RLS correcto, advisor sin warnings nuevos.
2. `tasks_catalog` tiene columna `module`. Tareas de categoría `study` quedan marcadas como `module='study'`.
3. La pantalla Rutina muestra entre Now Card y bloques temporales un carrusel "Hoy" con cards de módulos activos.
4. Si no hay entreno ni sesión de estudio hoy, el carrusel se oculta (no aparece sección vacía).
5. Tap en card "Entrenamiento de hoy" navega al módulo gym sin errores.
6. Tap en card "Estudio" sin sesión activa abre `/study/start`. Con sesión activa abre la sesión existente.
7. Crear sesión Pomodoro 25/5 con 4 ciclos funciona end-to-end: cuenta atrás, transición foco↔break, notificaciones, persistencia tras cerrar y abrir la app.
8. Sesión completada enlazada a una `routine_task` crea automáticamente un `task_completion` con `ai_validation_status='auto_validated'` y la fila aparece tickada en Rutina.
9. Sesión abandonada NO crea `task_completion`.
10. `RoutineTaskRow` enruta correctamente según `module` (study al Pomodoro, gym al módulo gym, generic a la cámara, nutrition a stub).
11. `pnpm lint`, `pnpm typecheck` y `pnpm test` pasan.
12. Sin `console.log`, sin `any`, sin libs nuevas (excepto `expo-keep-awake` si lo justificas).

---

## 15. Plan de testing manual

1. Login con user dani.
2. Abrir Rutina — ver carrusel "Hoy" con card de Estudio (siempre visible si hay tareas study en rutina) y, si Fase 11D tiene entreno hoy, card de Entrenamiento.
3. Tap card Estudio → seleccionar Pomodoro 25/5 → empezar → comprobar que el anillo decrece, el reloj baja segundo a segundo.
4. Cambiar minutos focus a 1 (modo dev) para validar transiciones rápido. Comprobar que al terminar focus salta vibración + notificación, pasa a break, al terminar break vuelve a focus, hasta cumplir ciclos.
5. Cerrar app a mitad de ciclo, volver a abrirla, navegar a /(tabs)/routine — la card del carrusel dice "Sesión en curso". Tap → la sesión recomputa el tiempo restante y sigue.
6. Terminar manualmente con "Terminar" → confirmación → `finishStudySession(id,'abandoned')` → no se crea completion.
7. Crear nueva sesión enlazada a una `routine_task` de estudio (desde el RoutineTaskRow de una tarea con `module='study'`). Completar todos los ciclos → comprobar que la fila de la tarea queda tickada en la rutina y que aparece en `task_completions`.
8. Tap card Entrenamiento → navega al módulo gym sin errores y con el contexto correcto.
9. Validar accesibilidad: VoiceOver / TalkBack lee correctamente las cards y el anillo.
10. Tirar el avión, hacer `pnpm dev:web`, comprobar que en web también funciona el timer (notificaciones pueden no estar disponibles en web — degradar a `alert` o solo a vibración móvil).

---

## 16. Qué NO hacer en esta fase

- No construir el módulo de Nutrición (Fase 14). Solo dejar el routing tipado preparado.
- No tocar la lógica del módulo Gym más allá de leer su estado (un solo adapter de lectura).
- No instalar librerías nuevas a no ser que justifiques (`expo-keep-awake` aceptable, todo lo demás pregunta).
- No cambiar el modelo de puntos. Sesión completada otorga 10 puntos como placeholder; ya lo tunearemos.
- No introducir IA generativa en el flujo de estudio.

---

## 17. Entregables al final

1. Migraciones aplicadas en remoto (las aplico yo desde el MCP de Supabase).
2. `pnpm supabase:types` ejecutado, tipos versionados.
3. PR mergeado a `main` verde.
4. Capturas: Rutina con carrusel, pre-pantalla estudio, sesión activa, sesión reanudada tras reapertura.
5. Resumen breve en el PR de qué cambió y cómo probarlo.

---

## 18. Vista al futuro (Fase 14 · Nutrición — solo para que tengas en mente la extensibilidad)

La Fase 14 que viene añadirá:
- Tabla `meal_logs` con `meal_type` enum (breakfast, lunch, snack, dinner) y `eaten_at`.
- Tabla `food_items` con macros (calorías, proteína, carbos, grasas) cacheada.
- Búsqueda por API externa (Open Food Facts es gratis y no requiere key — buena candidata) y escaneo de código de barras con `expo-barcode-scanner`.
- Adapter `getTodayNutritionSummary` que se enchufa al `MODULE_REGISTRY` sin tocar la pantalla Rutina.

Esta fase 13 deja el suelo limpio para que Fase 14 sea solo añadir el adapter al registry y construir el módulo. **No anticipes nada de Fase 14 en este PR.**
