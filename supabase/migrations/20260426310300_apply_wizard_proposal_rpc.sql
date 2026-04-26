-- BeProud · Fase 15 — aplica la propuesta del wizard de diseño de rutina.
-- Acepta proposals heterogéneas:
--   - Si proposal.catalog_slug está definido y existe en tasks_catalog,
--     se inserta en routine_tasks con task_id = catalog.id (NO crea user_task).
--     Esto preserva integraciones de Fase 14 (auto-completion de comidas
--     por slug) y módulos study/gym.
--   - Si no, se crea una user_task y se enlaza vía user_task_id.
-- Devuelve el número de routine_tasks insertadas.

create or replace function public.apply_wizard_proposal(
  p_slot      text,
  p_proposals jsonb
) returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_routine_id   uuid;
  v_count        int := 0;
  v_position     int;
  v_proposal     jsonb;
  v_user_task_id uuid;
  v_catalog_id   uuid;
  v_slug         text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_slot not in ('morning','afternoon','evening','anytime') then
    raise exception 'invalid_slot';
  end if;

  -- Asegura rutina activa.
  select id into v_routine_id
    from public.routines
   where user_id = auth.uid() and is_active
   limit 1;

  if v_routine_id is null then
    insert into public.routines(user_id, is_active)
      values (auth.uid(), true)
      returning id into v_routine_id;
  end if;

  select coalesce(max(position), -1) + 1
    into v_position
    from public.routine_tasks where routine_id = v_routine_id;

  for v_proposal in select * from jsonb_array_elements(p_proposals) loop
    v_catalog_id := null;
    v_user_task_id := null;
    v_slug := v_proposal->>'catalog_slug';

    if v_slug is not null and v_slug <> '' then
      select id into v_catalog_id
        from public.tasks_catalog
       where slug = v_slug
       limit 1;
    end if;

    if v_catalog_id is not null then
      -- Enlazar a catálogo (preserva integraciones de Fase 14 y módulos).
      insert into public.routine_tasks
        (routine_id, task_id, position, target_frequency, time_slot)
      values (
        v_routine_id, v_catalog_id, v_position,
        coalesce(v_proposal->>'target_frequency', 'daily'),
        p_slot
      );
    else
      -- Crear user_task y enlazarla.
      insert into public.user_tasks
        (user_id, title, description, category, module, base_points, source)
      values (
        auth.uid(),
        v_proposal->>'title',
        v_proposal->>'description',
        v_proposal->>'category',
        coalesce(v_proposal->>'module', 'generic'),
        coalesce((v_proposal->>'base_points')::int, 5),
        'wizard'
      )
      returning id into v_user_task_id;

      insert into public.routine_tasks
        (routine_id, user_task_id, position, target_frequency, time_slot)
      values (
        v_routine_id, v_user_task_id, v_position,
        coalesce(v_proposal->>'target_frequency', 'daily'),
        p_slot
      );
    end if;

    v_position := v_position + 1;
    v_count    := v_count + 1;
  end loop;

  return v_count;
end $$;

revoke all on function public.apply_wizard_proposal(text, jsonb) from public;
grant execute on function public.apply_wizard_proposal(text, jsonb) to authenticated;
