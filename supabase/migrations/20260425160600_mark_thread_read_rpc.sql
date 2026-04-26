-- BeProud · Fase 6 — mark_thread_read: actualiza last_read_at del caller
-- para el thread dado. Idempotente, no rompe si no soy miembro.

create or replace function public.mark_thread_read(p_thread_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  update public.thread_members
     set last_read_at = now()
   where thread_id = p_thread_id
     and user_id   = v_user_id;
end;
$$;

grant execute on function public.mark_thread_read(uuid) to authenticated;
