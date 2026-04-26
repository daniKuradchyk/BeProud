-- BeProud · Fase 5 — conteo de solicitudes pending para el caller.
-- Lo usa el badge del icono de Perfil en la tab bar.

create or replace function public.count_pending_follow_requests()
returns integer language sql security definer set search_path = public as $$
  select count(*)::integer
    from public.follows
   where followed_id = auth.uid()
     and status = 'pending';
$$;

grant execute on function public.count_pending_follow_requests() to authenticated;
