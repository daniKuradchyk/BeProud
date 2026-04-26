-- BeProud · Fase 6 — get_or_create_dm: idempotente. Busca el thread DM
-- entre auth.uid() y p_other_user_id; si no existe, lo crea con sus 2
-- thread_members en una sola transacción y devuelve el id.

create or replace function public.get_or_create_dm(p_other_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user_id   uuid := auth.uid();
  v_thread_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if v_user_id = p_other_user_id then
    raise exception 'No puedes hablarte a ti mismo.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'El usuario no existe.' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_user_id and b.blocked_id = p_other_user_id)
       or (b.blocker_id = p_other_user_id and b.blocked_id = v_user_id)
  ) then
    raise exception 'No disponible.' using errcode = '42501';
  end if;

  -- Busca el DM existente: thread tipo 'dm' con EXACTAMENTE 2 miembros
  -- y que ambos sean (v_user_id, p_other_user_id).
  select tm.thread_id
    into v_thread_id
    from public.thread_members tm
    join public.threads t on t.id = tm.thread_id
   where t.type = 'dm'
     and tm.user_id in (v_user_id, p_other_user_id)
   group by tm.thread_id
   having count(*) = 2
      and bool_and(tm.user_id in (v_user_id, p_other_user_id))
   limit 1;

  if v_thread_id is not null then
    return v_thread_id;
  end if;

  insert into public.threads (type) values ('dm') returning id into v_thread_id;
  insert into public.thread_members (thread_id, user_id) values
    (v_thread_id, v_user_id),
    (v_thread_id, p_other_user_id);

  return v_thread_id;
end;
$$;

grant execute on function public.get_or_create_dm(uuid) to authenticated;
