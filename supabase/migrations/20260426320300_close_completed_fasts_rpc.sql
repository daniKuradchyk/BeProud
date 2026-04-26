-- BeProud · Fase 16 — RPC idempotente que cierra el ayuno del día anterior.
-- Llamada por el cliente al abrir la app o al entrar en /fasting.
-- Inserta una fila en fasting_logs solo si no existe ya (unique started_at).

create or replace function public.close_completed_fasts()
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  p                    record;
  v_now                timestamptz := now();
  v_today              date;
  v_eat_start_today    timestamptz;
  v_eat_end_yesterday  timestamptz;
  v_planned_min        int;
  v_inserted           int := 0;
begin
  if auth.uid() is null then return 0; end if;

  select * into p from public.fasting_protocols
   where user_id = auth.uid() and enabled
     and protocol in ('16_8','14_10','18_6','20_4','omad','custom');
  if p.user_id is null then return 0; end if;

  v_today := (v_now at time zone p.timezone)::date;
  v_eat_start_today  := ((v_today::text     || ' ' || p.eat_start::text)::timestamp) at time zone p.timezone;
  v_eat_end_yesterday := (((v_today - 1)::text || ' ' || p.eat_end::text)::timestamp) at time zone p.timezone;

  -- Si todavía no hemos llegado a hoy eat_start, no hay nada que cerrar.
  if v_now < v_eat_start_today then return 0; end if;

  v_planned_min := extract(epoch from (v_eat_start_today - v_eat_end_yesterday))::int / 60;

  insert into public.fasting_logs
    (user_id, protocol, started_at, ended_at, planned_duration_min, actual_duration_min, status)
  values
    (auth.uid(), p.protocol, v_eat_end_yesterday, v_eat_start_today, v_planned_min, v_planned_min, 'completed')
  on conflict (user_id, started_at) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end $$;

revoke all on function public.close_completed_fasts() from public;
grant execute on function public.close_completed_fasts() to authenticated;
