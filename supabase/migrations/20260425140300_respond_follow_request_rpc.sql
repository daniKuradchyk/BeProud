-- BeProud · Fase 5 — RPC respond_follow_request: el FOLLOWED acepta o
-- rechaza una solicitud pending. Idempotente (no falla si la fila ya
-- no está en pending).

create or replace function public.respond_follow_request(
  p_follower_id uuid,
  p_accept      boolean
) returns void language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if p_accept then
    update public.follows
       set status = 'accepted',
           accepted_at = now()
     where follower_id = p_follower_id
       and followed_id = v_user_id
       and status = 'pending';
  else
    delete from public.follows
     where follower_id = p_follower_id
       and followed_id = v_user_id
       and status = 'pending';
  end if;
end;
$$;

grant execute on function public.respond_follow_request(uuid, boolean) to authenticated;
