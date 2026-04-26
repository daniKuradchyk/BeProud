-- BeProud · Fase 8 — programa refresh_weekly_leaderboards cada hora en :00.
-- Idempotente: si ya existe un job con el mismo nombre, no se duplica.

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'refresh_weekly_leaderboards_hourly') then
    perform cron.schedule(
      'refresh_weekly_leaderboards_hourly',
      '0 * * * *',
      $cron$select public.refresh_weekly_leaderboards();$cron$
    );
  end if;
end;
$$;
