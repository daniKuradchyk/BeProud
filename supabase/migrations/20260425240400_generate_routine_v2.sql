-- BeProud · Fase 11A — generate_routine v2 con biometría.
-- - target_count basado en daily_minutes (12 min/tarea) si está; si no,
--   availability legacy.
-- - Distribución de tareas por primary_goal.
-- - Filtros equipment/restrictions: solo si las columnas existen en
--   tasks_catalog (Fase 11B las añadirá). Detección dinámica vía
--   information_schema.columns.
-- - Fallback al algoritmo legacy si el algoritmo nuevo eligió 0 tareas.

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

  -- Datos de profile (la Fase 11A guarda biometría en profiles antes
  -- de llamar a esta RPC).
  v_primary_goal    text;
  v_weekly_days     integer;
  v_daily_minutes   integer;
  v_equipment       text[];
  v_restrictions    text[];

  -- Soporte futuro Fase 11B.
  v_has_equipment_col      boolean;
  v_has_contra_col         boolean;

  -- Cuotas por bucket.
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

  -- 1) Lee biometría / objetivos del profile.
  select primary_goal, weekly_days, daily_minutes,
         coalesce(equipment,    '{}'::text[]),
         coalesce(restrictions, '{}'::text[])
    into v_primary_goal, v_weekly_days, v_daily_minutes, v_equipment, v_restrictions
    from public.profiles
   where id = v_uid;

  -- 2) target_count: prioriza daily_minutes (12 min/tarea), cap 3..8.
  --    Si no hay biometría, fallback a availability.
  if v_daily_minutes is not null then
    v_target_count := greatest(3, least(8, floor(v_daily_minutes::numeric / 12.0)::int));
  else
    v_target_count := case v_availability
      when 'low'  then 3
      when 'high' then 7
      else 5
    end;
  end if;

  -- 3) Tope de "dificultad" por nivel (proxy = base_points).
  v_max_points := case v_level
    when 'beginner'     then 25
    when 'intermediate' then 45
    else 200
  end;

  -- 4) Categorías solicitadas: preferences > goals > todas.
  v_categories := coalesce(
    array(select jsonb_array_elements_text(answers->'preferences'->'categories')),
    array(select jsonb_array_elements_text(answers->'goals'))
  );
  if v_categories is null or array_length(v_categories, 1) is null then
    v_categories := array['fitness','study','nutrition','wellbeing','productivity','social'];
  end if;

  -- 5) Detectar columnas opcionales del catálogo (Fase 11B). Si existen,
  --    las usaremos en los filtros; si no, las ignoramos silenciosamente.
  select exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='tasks_catalog'
       and column_name='equipment_required'
  ) into v_has_equipment_col;
  select exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='tasks_catalog'
       and column_name='contraindications'
  ) into v_has_contra_col;

  -- 6) Distribución por primary_goal.
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
    else  -- general_health o NULL
      v_q_fitness   := ceil(v_target_count / 4.0)::int;
      v_q_nutrition := ceil(v_target_count / 4.0)::int;
      v_q_wellbeing := ceil(v_target_count / 4.0)::int;
      v_q_study     := v_target_count - v_q_fitness - v_q_nutrition - v_q_wellbeing;
      if v_q_study < 0 then v_q_study := 0; end if;
  end case;

  -- 7) Desactiva rutina previa.
  update public.routines set is_active = false
   where user_id = v_uid and is_active = true;

  -- 8) Crea rutina nueva (recicla campo answers para guardar el JSON).
  insert into public.routines (user_id, horizon, is_active, answers)
  values (v_uid, 'daily', true, answers)
  returning id into v_routine_id;

  -- 9) Selección de tareas: SQL dinámico para incluir filtros opcionales
  --    de equipment/contraindications cuando existan en catálogo.
  declare
    v_extra_where text := '';
    v_sql         text;
    v_pos         integer := 0;
    v_bucket      text;
    v_quota       integer;
  begin
    if v_has_equipment_col then
      v_extra_where := v_extra_where ||
        ' and coalesce(t.equipment_required, ''{}''::text[]) <@ $4';
    end if;
    if v_has_contra_col then
      v_extra_where := v_extra_where ||
        ' and not (coalesce(t.contraindications, ''{}''::text[]) && $5)';
    end if;

    for v_bucket, v_quota in
      values ('fitness',   v_q_fitness),
             ('nutrition', v_q_nutrition),
             ('wellbeing', v_q_wellbeing),
             ('study',     v_q_study),
             ('other',     greatest(0,
               v_target_count - v_q_fitness - v_q_nutrition - v_q_wellbeing - v_q_study))
    loop
      if v_quota <= 0 then continue; end if;

      v_sql := format($q$
        with picks as (
          select t.id
            from public.tasks_catalog t
           where t.is_active
             and t.base_points <= $1
             and t.category = any ($2)
             %s
             %s
             and not exists (select 1 from public.routine_tasks rt
                              where rt.routine_id = $6 and rt.task_id = t.id)
           order by random()
           limit $3
        )
        insert into public.routine_tasks (routine_id, task_id, target_frequency, position)
        select $6, p.id, 'daily', $7 + row_number() over () - 1
          from picks p
        on conflict (routine_id, task_id) do nothing
        returning 1
      $q$,
      case v_bucket
        when 'fitness'   then 'and t.category in (''fitness'')'
        when 'nutrition' then 'and t.category in (''nutrition'')'
        when 'wellbeing' then 'and t.category in (''wellbeing'',''social'')'
        when 'study'     then 'and t.category in (''study'',''productivity'')'
        else ''
      end,
      v_extra_where
      );

      execute v_sql
        using v_max_points,
              v_categories,
              v_quota,
              v_equipment,
              v_restrictions,
              v_routine_id,
              v_pos;

      get diagnostics v_picked_count = row_count;
      v_pos := v_pos + v_picked_count;
    end loop;

    -- 10) Si tras todo el algoritmo nuevo no se eligió nada, fallback legacy.
    select count(*) into v_picked_count
      from public.routine_tasks where routine_id = v_routine_id;

    if v_picked_count = 0 then
      insert into public.routine_tasks (routine_id, task_id, target_frequency, position)
      select v_routine_id, t.id, 'daily',
             row_number() over (order by random()) - 1
        from public.tasks_catalog t
       where t.is_active
         and t.category = any (v_categories)
         and t.base_points <= v_max_points
       limit v_target_count
      on conflict (routine_id, task_id) do nothing;

      get diagnostics v_picked_count = row_count;

      if v_picked_count < v_target_count then
        insert into public.routine_tasks (routine_id, task_id, target_frequency, position)
        select v_routine_id, t.id, 'daily',
               v_picked_count + (row_number() over (order by random())) - 1
          from public.tasks_catalog t
         where t.is_active
           and t.id not in (select task_id from public.routine_tasks where routine_id = v_routine_id)
         limit (v_target_count - v_picked_count)
        on conflict (routine_id, task_id) do nothing;
      end if;
    end if;
  end;

  return v_routine_id;
end;
$$;
