-- BeProud · Fase 14 — al añadir un alimento a un meal_log, si el user tiene
-- una routine_task del catálogo nutrition correspondiente (matching por slug),
-- crea su task_completion auto_validated. Idempotente por (routine_task_id, día).

create or replace function public.auto_complete_meal_routine_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meal          public.meal_logs%rowtype;
  v_target_slug   text;
  v_routine_task  uuid;
  v_task_id       uuid;
  v_points        integer;
begin
  select * into v_meal from public.meal_logs where id = new.meal_log_id;
  if v_meal.id is null then return new; end if;

  v_target_slug := case v_meal.meal_type
    when 'breakfast' then 'healthy_breakfast'
    when 'lunch'     then 'healthy_lunch'
    when 'snack'     then 'healthy_snack'
    when 'dinner'    then 'healthy_dinner'
  end;

  select rt.id, tc.id, coalesce(rt.points_override, tc.base_points)
    into v_routine_task, v_task_id, v_points
    from public.routine_tasks rt
    join public.routines      r  on r.id = rt.routine_id
                                and r.user_id = v_meal.user_id
                                and r.is_active
    join public.tasks_catalog tc on tc.id = rt.task_id
   where tc.slug = v_target_slug
   limit 1;

  if v_routine_task is null then return new; end if;

  -- Dedupe por día: task_completions no tiene unique de (routine_task_id, fecha),
  -- así que comprobamos manualmente para no duplicar la completion del día.
  if exists (
    select 1 from public.task_completions
     where routine_task_id = v_routine_task
       and (created_at)::date = v_meal.log_date
  ) then
    return new;
  end if;

  insert into public.task_completions
    (user_id, routine_task_id, task_id, photo_path, ai_validation_status,
     ai_confidence, ai_reason, points_awarded, is_public)
  values
    (v_meal.user_id, v_routine_task, v_task_id, null, 'auto_validated',
     1.0, 'meal_logged', v_points, false);

  return new;
end $$;

drop trigger if exists trg_auto_complete_meal on public.meal_log_items;
create trigger trg_auto_complete_meal
  after insert on public.meal_log_items
  for each row execute function public.auto_complete_meal_routine_task();
