-- BeProud · Bugfix Fase 2 — RPC para reordenar routine_tasks de forma atómica.
-- Sustituye el upsert desde el cliente, que fallaba por NOT NULL en routine_id/task_id
-- al intentar PostgREST un INSERT antes del ON CONFLICT.

create or replace function public.reorder_routine_tasks(
  p_routine_id uuid,
  p_ids uuid[]
) returns void
language plpgsql security definer set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  -- La rutina debe existir y pertenecer al llamante.
  if not exists (
    select 1 from public.routines
    where id = p_routine_id and user_id = v_user_id
  ) then
    raise exception 'Rutina no encontrada o no es tuya'
      using errcode = '42501';
  end if;

  -- Reescribimos position siguiendo el orden del array recibido.
  -- Solo afecta a routine_tasks de esa rutina; ids ajenos se ignoran.
  update public.routine_tasks rt
     set position = sub.new_pos
    from (
      select unnest(p_ids) as id,
             generate_series(0, array_length(p_ids, 1) - 1) as new_pos
    ) sub
   where rt.id = sub.id and rt.routine_id = p_routine_id;
end;
$$;

grant execute on function public.reorder_routine_tasks(uuid, uuid[])
  to authenticated;
