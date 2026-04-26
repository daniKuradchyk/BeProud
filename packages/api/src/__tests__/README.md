# Plan de tests para `packages/api` (pendiente)

Estos tests se montarán cuando tengamos un Supabase local con Docker
(`pnpm supabase:start`) o un proyecto efímero de staging. El framework
elegido es **Vitest** (ver `CLAUDE.md` §5.3).

## Casos a cubrir

### `generate_routine(answers jsonb)`

- **Smoke test**: usuario autenticado con `answers` mínimas válidas
  → devuelve un uuid; existe una nueva fila en `routines` con
  `is_active = true` y N tareas en `routine_tasks` según `availability`.
- **Desactiva la anterior**: si ya hay una rutina activa, tras llamar
  la función queda con `is_active = false` y la nueva queda activa.
  Constraint de "una sola activa por usuario" se respeta.
- **Filtros de nivel**: `level=beginner` → ninguna tarea con
  `base_points > 25`. `intermediate` → ninguna con `> 45`.
  `advanced` → puede haber tareas de hasta 60.
- **Rellena cuando falta catálogo**: con `goals=['social']` y
  `availability=high` (pide 7) y solo hay 10 tareas sociales pero
  beginner solo permite ≤25, comprobar que se rellena con tareas de
  fuera del filtro de nivel pero respetando categoría.
- **Rechazo sin sesión**: llamar la función con `auth.uid() IS NULL`
  debe lanzar errcode `42501`.

### RLS

- Un usuario A no puede `select` una rutina de un usuario B.
- Un usuario A no puede insertar una `routine_task` apuntando a una
  routine de B.
- Cualquier usuario (incluido `anon`) puede leer `tasks_catalog` con
  `is_active = true`, pero no puede insertar/actualizar/borrar.

### Cliente

- `fetchTaskCatalog({ category })` filtra correctamente.
- `addRoutineTask` calcula `position` como `max + 1`.
- `addRoutineTask` con un `task_id` ya presente en la rutina lanza el
  error "Esa tarea ya está en tu rutina." (constraint unique).
- `reorderRoutineTasks(routineId, ['id3','id1','id2'])` deja `position` 0,1,2.
- `reorderRoutineTasks` con una `routine_id` ajena lanza error 42501 (RLS server-side).
- `generateRoutine` con `goals=[]` lanza error de validación Zod en
  cliente sin llegar al servidor.

## Cómo correrlos cuando se monten

```bash
pnpm supabase:start         # arranca Postgres local + servicios
pnpm supabase:reset         # aplica migraciones + seed
pnpm --filter @beproud/api test
```

Los tests usan un cliente Supabase apuntando a `http://localhost:54321`
con la `service_role` local (que viene fija en el dev environment de
Supabase, no es secreto).
