-- BeProud · Fase 14 — bloques temporales en routine_tasks (Mañana/Tarde/Noche/Cualquiera).
-- Decisión: text + check (consistente con otros dominios del repo: category, force,
-- evidence_level). El cliente sigue exponiendo TimeSlotSchema con z.enum.

alter table public.routine_tasks
  add column if not exists time_slot text not null default 'anytime';

alter table public.routine_tasks
  drop constraint if exists routine_tasks_time_slot_chk;
alter table public.routine_tasks
  add constraint routine_tasks_time_slot_chk
  check (time_slot in ('morning','afternoon','evening','anytime'));

-- Backfill por categoría del catálogo. Solo afecta filas con el default.
update public.routine_tasks rt
   set time_slot = case tc.category
     when 'fitness'      then 'afternoon'
     when 'study'        then 'morning'
     when 'productivity' then 'morning'
     when 'wellbeing'    then 'evening'
     when 'social'       then 'evening'
     when 'nutrition'    then 'anytime'
     else 'anytime'
   end
  from public.tasks_catalog tc
 where rt.task_id = tc.id
   and rt.time_slot = 'anytime';

create index if not exists idx_routine_tasks_routine_slot
  on public.routine_tasks (routine_id, time_slot, position);
