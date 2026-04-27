-- BeProud · Fix Fase 17 — soporta task_completions de user_tasks (Fase 15).
-- Antes: task_id NOT NULL → FK a tasks_catalog. Las routine_tasks que el
-- wizard creó como user_tasks no podían generar completions sin violar el FK.
--
-- Ahora: task_id es nullable y existe user_task_id alternativo. Exactamente
-- uno de los dos debe estar presente (idéntico patrón a routine_tasks).

alter table public.task_completions
  add column if not exists user_task_id uuid references public.user_tasks(id) on delete set null;

alter table public.task_completions
  alter column task_id drop not null;

alter table public.task_completions
  drop constraint if exists task_completions_one_source_chk;
alter table public.task_completions
  add constraint task_completions_one_source_chk
    check ((task_id is not null)::int + (user_task_id is not null)::int = 1);

create index if not exists idx_task_completions_user_task
  on public.task_completions(user_task_id);
