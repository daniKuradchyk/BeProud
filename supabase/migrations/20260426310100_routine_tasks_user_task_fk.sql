-- BeProud · Fase 15 — routine_tasks puede apuntar a tasks_catalog O a user_tasks.
-- Exactamente uno de los dos debe ser non-null.

alter table public.routine_tasks
  add column if not exists user_task_id uuid references public.user_tasks(id) on delete restrict;

alter table public.routine_tasks
  alter column task_id drop not null;

alter table public.routine_tasks
  drop constraint if exists routine_tasks_one_source_chk;
alter table public.routine_tasks
  add constraint routine_tasks_one_source_chk
    check ((task_id is not null)::int + (user_task_id is not null)::int = 1);

create index if not exists idx_routine_tasks_user_task
  on public.routine_tasks(user_task_id);
