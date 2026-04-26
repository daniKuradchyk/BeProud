-- BeProud · Fase 11B — generate_routine v3.
-- Cambios respecto v2:
-- - Filtros equipment_required ⊆ profile.equipment (con 'gym_full' como
--   meta-equipo) y contraindications ∩ profile.restrictions = ∅ se aplican
--   SIEMPRE.
-- - Subcategoría preferida según primary_goal dentro del bucket fitness.
-- - Si tras los filtros un bucket no llega a su cuota, RELAJA por orden:
--     1) quita filtro de subcategory
--     2) quita filtro de level (max_points = 200)
--   NUNCA relaja equipment ni restrictions (seguridad).

create or replace function public.generate_routine(answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid             uuid := auth.uid();
  v_routine_id      uuid;
  v_availability    text := coalesce(answers->>'availability', 'medium');
  v_level           text := coalesce(answers->>'level', 'beginner');
  v_categories      text[];
  v_max_points      integer;
  v_target_count    integer;

  v_primary_goal    text;
  v_weekly_days     integer;
  v_daily_minutes   integer;
  v_equipment       text[];
  v_equipment_full  text[];
  v_restrictions    text[];

  v_q_fitness       integer := 0;
  v_q_nutrition     integer := 0;
  v_q_wellbeing     integer := 0;
  v_q_study         integer := 0;
  v_q_other         integer := 0;
  v_picked_count    integer;
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select primary_goal, weekly_days, daily_minutes,
         coalesce(equipment,    '{}'::text[]),
         coalesce(restrictions, '{}'::text[])
    into v_primary_goal, v_weekly_days, v_daily_minutes, v_equipment, v_restrictions
    from public.profiles
   where id = v_uid;

  v_equipment_full := v_equipment;
  if 'gym_full' = any (v_equipment) then
    v_equipment_full := v_equipment_full
      || array['none','dumbbells','kettlebell','resistance_bands','pullup_bar','mat'];
  end if;

  if v_daily_minutes is not null then
    v_target_count := greatest(3, least(8, floor(v_daily_minutes::numeric / 12.0)::int));
  else
    v_target_count := case v_availability
      when 'low'  then 3
      when 'high' then 7
      else 5
    end;
  end if;

  v_max_points := case v_level
    when 'beginner'     then 25
    when 'intermediate' then 45
    else 200
  end;

  v_categories := coalesce(
    array(select jsonb_array_elements_text(answers->'preferences'->'categories')),
    array(select jsonb_array_elements_text(answers->'goals'))
  );
  if v_categories is null or array_length(v_categories, 1) is null then
    v_categories := array['fitness','study','nutrition','wellbeing','productivity','social'];
  end if;

  case coalesce(v_primary_goal, 'general_health')
    when 'lose_weight' then
      v_q_fitness   := round(v_target_count * 0.50)::int;
      v_q_nutrition := round(v_target_count * 0.25)::int;
      v_q_wellbeing := round(v_target_count * 0.25)::int;
    when 'gain_muscle' then
      v_q_fitness   := round(v_target_count * 0.60)::int;
      v_q_nutrition := round(v_target_count * 0.25)::int;
      v_q_wellbeing := round(v_target_count * 0.15)::int;
    when 'performance' then
      v_q_fitness   := round(v_target_count * 0.50)::int;
      v_q_study     := round(v_target_count * 0.25)::int;
      v_q_wellbeing := round(v_target_count * 0.25)::int;
    when 'maintain' then
      if v_target_count > 3 then v_target_count := v_target_count - 1; end if;
      v_q_fitness   := ceil(v_target_count / 4.0)::int;
      v_q_nutrition := ceil(v_target_count / 4.0)::int;
      v_q_wellbeing := ceil(v_target_count / 4.0)::int;
      v_q_study     := v_target_count - v_q_fitness - v_q_nutrition - v_q_wellbeing;
      if v_q_study < 0 then v_q_study := 0; end if;
    else
      v_q_fitness   := ceil(v_target_count / 4.0)::int;
      v_q_nutrition := ceil(v_target_count / 4.0)::int;
      v_q_wellbeing := ceil(v_target_count / 4.0)::int;
      v_q_study     := v_target_count - v_q_fitness - v_q_nutrition - v_q_wellbeing;
      if v_q_study < 0 then v_q_study := 0; end if;
  end case;

  update public.routines set is_active = false
   where user_id = v_uid and is_active = true;

  insert into public.routines (user_id, horizon, is_active, answers)
  values (v_uid, 'daily', true, answers)
  returning id into v_routine_id;

  declare
    v_pos    integer := 0;
    v_bucket text;
    v_quota  integer;
    v_bucket_cats text[];
    v_pref_subcats text[];
    v_added integer;
  begin
    for v_bucket, v_quota in
      values ('fitness',   v_q_fitness),
             ('nutrition', v_q_nutrition),
             ('wellbeing', v_q_wellbeing),
             ('study',     v_q_study),
             ('other',     greatest(0,
               v_target_count - v_q_fitness - v_q_nutrition - v_q_wellbeing - v_q_study))
    loop
      if v_quota <= 0 then continue; end if;

      v_bucket_cats := case v_bucket
        when 'fitness'   then array['fitness']
        when 'nutrition' then array['nutrition']
        when 'wellbeing' then array['wellbeing','social']
        when 'study'     then array['study','productivity']
        else v_categories
      end;

      v_pref_subcats := null;
      if v_bucket = 'fitness' then
        v_pref_subcats := case coalesce(v_primary_goal,'general_health')
          when 'gain_muscle' then array['strength_compound','strength_isolation']
          when 'lose_weight' then array['cardio_liss','cardio_hiit']
          when 'performance' then array['strength_compound','cardio_hiit']
          else null
        end;
      end if;

      with picks as (
        select t.id
          from public.tasks_catalog t
         where t.is_active
           and t.base_points <= v_max_points
           and t.category = any (v_bucket_cats)
           and (v_pref_subcats is null or t.subcategory = any (v_pref_subcats))
           and coalesce(t.equipment_required, '{}'::text[]) <@ v_equipment_full
           and not (coalesce(t.contraindications, '{}'::text[]) && v_restrictions)
           and not exists (select 1 from public.routine_tasks rt
                            where rt.routine_id = v_routine_id and rt.task_id = t.id)
         order by random()
         limit v_quota
      )
      insert into public.routine_tasks (routine_id, task_id, target_frequency, position)
      select v_routine_id, p.id, 'daily', v_pos + row_number() over () - 1
        from picks p
      on conflict (routine_id, task_id) do nothing;
      get diagnostics v_added = row_count;
      v_pos := v_pos + v_added;

      if v_added < v_quota and v_pref_subcats is not null then
        with picks as (
          select t.id
            from public.tasks_catalog t
           where t.is_active
             and t.base_points <= v_max_points
             and t.category = any (v_bucket_cats)
             and coalesce(t.equipment_required, '{}'::text[]) <@ v_equipment_full
             and not (coalesce(t.contraindications, '{}'::text[]) && v_restrictions)
             and not exists (select 1 from public.routine_tasks rt
                              where rt.routine_id = v_routine_id and rt.task_id = t.id)
           order by random()
           limit (v_quota - v_added)
        )
        insert into public.routine_tasks (routine_id, task_id, target_frequency, position)
        select v_routine_id, p.id, 'daily', v_pos + row_number() over () - 1
          from picks p
        on conflict (routine_id, task_id) do nothing;
        get diagnostics v_picked_count = row_count;
        v_added := v_added + v_picked_count;
        v_pos   := v_pos   + v_picked_count;
      end if;

      if v_added < v_quota then
        with picks as (
          select t.id
            from public.tasks_catalog t
           where t.is_active
             and t.category = any (v_bucket_cats)
             and coalesce(t.equipment_required, '{}'::text[]) <@ v_equipment_full
             and not (coalesce(t.contraindications, '{}'::text[]) && v_restrictions)
             and not exists (select 1 from public.routine_tasks rt
                              where rt.routine_id = v_routine_id and rt.task_id = t.id)
           order by random()
           limit (v_quota - v_added)
        )
        insert into public.routine_tasks (routine_id, task_id, target_frequency, position)
        select v_routine_id, p.id, 'daily', v_pos + row_number() over () - 1
          from picks p
        on conflict (routine_id, task_id) do nothing;
        get diagnostics v_picked_count = row_count;
        v_added := v_added + v_picked_count;
        v_pos   := v_pos   + v_picked_count;
      end if;
    end loop;

    select count(*) into v_picked_count
      from public.routine_tasks where routine_id = v_routine_id;

    if v_picked_count < v_target_count then
      with picks as (
        select t.id
          from public.tasks_catalog t
         where t.is_active
           and coalesce(t.equipment_required, '{}'::text[]) <@ v_equipment_full
           and not (coalesce(t.contraindications, '{}'::text[]) && v_restrictions)
           and not exists (select 1 from public.routine_tasks rt
                            where rt.routine_id = v_routine_id and rt.task_id = t.id)
         order by random()
         limit (v_target_count - v_picked_count)
      )
      insert into public.routine_tasks (routine_id, task_id, target_frequency, position)
      select v_routine_id, p.id, 'daily', v_pos + row_number() over () - 1
        from picks p
      on conflict (routine_id, task_id) do nothing;
    end if;
  end;

  return v_routine_id;
end;
$$;
