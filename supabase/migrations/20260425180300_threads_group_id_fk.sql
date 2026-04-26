-- BeProud · Fase 7 — completa la FK pendiente desde Fase 6:
-- threads.group_id → groups(id) on delete cascade. Idempotente.

alter table public.threads
  drop constraint if exists threads_group_id_fkey;

alter table public.threads
  add constraint threads_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete cascade;
