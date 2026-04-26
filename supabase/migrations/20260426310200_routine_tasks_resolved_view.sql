-- BeProud · Fase 15 — vista que unifica routine_tasks con su origen
-- (tasks_catalog o user_tasks). security_invoker=true → respeta RLS de
-- las tablas base.

create or replace view public.routine_tasks_resolved
with (security_invoker = true)
as
select
  rt.id,
  rt.routine_id,
  rt.position,
  rt.target_frequency,
  rt.points_override,
  rt.time_slot,
  rt.created_at,
  rt.task_id,
  rt.user_task_id,
  coalesce(tc.title,       ut.title)          as title,
  coalesce(tc.description, ut.description)    as description,
  coalesce(tc.category,    ut.category)       as category,
  coalesce(tc.module,      ut.module)         as module,
  coalesce(tc.base_points, ut.base_points)    as base_points,
  coalesce(tc.difficulty,  ut.difficulty)     as difficulty,
  coalesce(tc.icon,        ut.icon)           as icon,
  tc.slug                                      as slug,
  case when tc.id is not null then 'catalog' else 'user' end as task_source
from public.routine_tasks rt
left join public.tasks_catalog tc on tc.id = rt.task_id
left join public.user_tasks    ut on ut.id = rt.user_task_id;

grant select on public.routine_tasks_resolved to authenticated;
