-- BeProud · Fase 7 — create_group: crea el grupo, añade owner como miembro,
-- crea el thread tipo 'group' asociado y mete al owner como thread_member.
-- Atómica.

create or replace function public.create_group(
  p_name        text,
  p_description text,
  p_cover_url   text,
  p_is_private  boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user_id   uuid := auth.uid();
  v_group_id  uuid;
  v_thread_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  insert into public.groups (owner_id, name, description, cover_url, is_private)
  values (v_user_id, p_name, p_description, p_cover_url, coalesce(p_is_private, false))
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'owner');

  insert into public.threads (type, group_id) values ('group', v_group_id)
  returning id into v_thread_id;

  insert into public.thread_members (thread_id, user_id) values
    (v_thread_id, v_user_id);

  return v_group_id;
end;
$$;

grant execute on function public.create_group(text, text, text, boolean)
  to authenticated;
