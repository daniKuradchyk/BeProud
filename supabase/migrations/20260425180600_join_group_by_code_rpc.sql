-- BeProud · Fase 7 — join_group_by_code: idempotente. Insertar también
-- el thread_member para que el nuevo miembro vea el chat.

create or replace function public.join_group_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id   uuid := auth.uid();
  v_group_id  uuid;
  v_thread_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if p_code is null or p_code = '' then
    raise exception 'Código vacío.' using errcode = '22023';
  end if;

  select id into v_group_id
    from public.groups
   where lower(invite_code) = lower(p_code)
   limit 1;
  if v_group_id is null then
    raise exception 'Grupo no encontrado.' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.group_members
     where group_id = v_group_id and user_id = v_user_id
  ) then
    return jsonb_build_object('group_id', v_group_id, 'action', 'already_member');
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'member');

  select id into v_thread_id
    from public.threads
   where group_id = v_group_id and type = 'group'
   limit 1;
  if v_thread_id is not null then
    insert into public.thread_members (thread_id, user_id)
    values (v_thread_id, v_user_id)
    on conflict do nothing;
  end if;

  return jsonb_build_object('group_id', v_group_id, 'action', 'joined');
end;
$$;

grant execute on function public.join_group_by_code(text) to authenticated;
