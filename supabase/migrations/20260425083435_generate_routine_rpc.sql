-- BeProud · Fase 2 — RPC public.generate_routine(answers jsonb).
-- Aplicada vía MCP el 2026-04-25.
--
-- Contrato del JSON answers:
-- {
--   "goals":         ["fitness","study", ...],         (array de category slugs)
--   "availability":  "low" | "medium" | "high",
--   "level":         "beginner" | "intermediate" | "advanced",
--   "preferences":   { "categories": ["fitness", ...] } -- opcional, si vacío usa goals
-- }
--
-- Algoritmo:
--   1. Desactiva la rutina activa anterior del usuario (is_active = false).
--   2. Crea una nueva rutina activa con horizon='daily' y guarda answers.
--   3. Selecciona N tareas del catálogo según availability:
--        low -> 3, medium -> 5, high -> 7.
--      Filtra por categorías pedidas y por dificultad implicada por base_points
--      según level: beginner = points <= 25, intermediate <= 45, advanced sin tope.
--      Si no hay suficientes, completa con tareas más difíciles de la misma
--      categoría y, si aún faltan, con cualquier tarea aleatoria.
--   4. Inserta routine_tasks con position 0..N-1 y target_frequency='daily'.
--   5. Devuelve el id de la rutina nueva.

create or replace function public.generate_routine(answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid := auth.uid();
  v_routine_id     uuid;
  v_availability   text := coalesce(answers->>'availability', 'medium');
  v_level          text := coalesce(answers->>'level', 'beginner');
  v_target_count   integer;
  v_max_points     integer;
  v_categories     text[];
  v_picked_count   integer;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  v_target_count := case v_availability
    when 'low' then 3
    when 'high' then 7
    else 5
  end;

  v_max_points := case v_level
    when 'beginner' then 25
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

  update public.routines set is_active = false
   where user_id = v_user_id and is_active = true;

  insert into public.routines (user_id, horizon, is_active, answers)
  values (v_user_id, 'daily', true, answers)
  returning id into v_routine_id;

  with picks as (
    (
      select id, position
      from (
        select id,
               row_number() over (order by base_points desc, random()) - 1 as position
        from public.tasks_catalog
        where is_active
          and category = any (v_categories)
          and base_points <= v_max_points
        limit v_target_count
      ) inner_pick
    )
    union all
    (
      select id, position
      from (
        select t.id,
               (select count(*) from public.tasks_catalog
                  where is_active
                    and category = any (v_categories)
                    and base_points <= v_max_points
               ) + row_number() over (order by random()) - 1 as position
        from public.tasks_catalog t
        where t.is_active
          and t.category = any (v_categories)
          and t.base_points > v_max_points
        limit greatest(0, v_target_count - (
          select count(*) from public.tasks_catalog
          where is_active and category = any (v_categories) and base_points <= v_max_points
        ))
      ) fill_pick
    )
  )
  insert into public.routine_tasks (routine_id, task_id, target_frequency, position)
  select v_routine_id, p.id, 'daily', p.position
  from picks p
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

  return v_routine_id;
end;
$$;

grant execute on function public.generate_routine(jsonb) to authenticated;
