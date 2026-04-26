-- BeProud · Fase 7 (extra) — RPC para que owner/admin añadan a un usuario
-- directamente al grupo desde un buscador, sin pasar por el código.
-- Atómica: inserta group_members + thread_members.

create or replace function public.add_group_member(
  p_group_id uuid,
  p_user_id  uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_role   text;
  v_thread uuid;
begin
  if v_caller is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if v_caller = p_user_id then
    raise exception 'No puedes añadirte a ti mismo.' using errcode = '22023';
  end if;

  -- Verifica que el caller sea owner/admin del grupo.
  select role into v_role
    from public.group_members
   where group_id = p_group_id and user_id = v_caller;
  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Solo owner/admin pueden añadir miembros.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'El usuario no existe.' using errcode = 'P0002';
  end if;

  -- Bloqueos bidireccionales con el caller o con cualquier miembro existente.
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_caller and b.blocked_id = p_user_id)
       or (b.blocker_id = p_user_id and b.blocked_id = v_caller)
  ) then
    raise exception 'No disponible (bloqueado).' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.group_members
     where group_id = p_group_id and user_id = p_user_id
  ) then
    return jsonb_build_object('group_id', p_group_id, 'action', 'already_member');
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (p_group_id, p_user_id, 'member');

  select id into v_thread
    from public.threads
   where group_id = p_group_id and type = 'group'
   limit 1;
  if v_thread is not null then
    insert into public.thread_members (thread_id, user_id)
    values (v_thread, p_user_id)
    on conflict do nothing;
  end if;

  return jsonb_build_object('group_id', p_group_id, 'action', 'added');
end;
$$;

grant execute on function public.add_group_member(uuid, uuid) to authenticated;
