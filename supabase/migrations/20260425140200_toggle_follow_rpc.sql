-- BeProud · Fase 5 — RPC toggle_follow: idempotente, devuelve action+status.
-- Si el follow existe → DELETE; si no → INSERT (status lo pone el trigger).

create or replace function public.toggle_follow(p_followed_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_status  text;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if v_user_id = p_followed_id then
    raise exception 'No puedes seguirte a ti mismo.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_followed_id) then
    raise exception 'El usuario no existe.' using errcode = 'P0002';
  end if;

  -- Si ya existe, lo eliminamos (unfollow / cancelar solicitud).
  if exists (
    select 1 from public.follows
     where follower_id = v_user_id and followed_id = p_followed_id
  ) then
    delete from public.follows
     where follower_id = v_user_id and followed_id = p_followed_id;
    return jsonb_build_object('action', 'deleted', 'status', null);
  end if;

  -- INSERT: el trigger follows_set_status determina el status final.
  insert into public.follows (follower_id, followed_id)
  values (v_user_id, p_followed_id);

  select status into v_status
    from public.follows
   where follower_id = v_user_id and followed_id = p_followed_id;

  return jsonb_build_object('action', 'inserted', 'status', v_status);
end;
$$;

grant execute on function public.toggle_follow(uuid) to authenticated;
