-- BeProud · Fase 10 — purga física de cuentas marcadas con deleted_at
-- hace ≥ 30 días. Se programa con pg_cron (diario 03:00 UTC).

create or replace function public.purge_deleted_accounts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  -- Si era owner de algún grupo, lo borramos antes (groups tiene
  -- on delete restrict en owner_id → bloquearía el cascade).
  delete from public.groups
   where owner_id in (
     select id from public.profiles
      where deleted_at is not null
        and deleted_at < now() - interval '30 days'
   );

  -- Borrado físico desde auth.users; cascade limpia el resto.
  with purged as (
    delete from auth.users
     where id in (
       select id from public.profiles
        where deleted_at is not null
          and deleted_at < now() - interval '30 days'
     )
    returning id
  )
  select count(*) into v_count from purged;

  return v_count;
end;
$$;

revoke all on function public.purge_deleted_accounts() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'purge_deleted_accounts_daily') then
    perform cron.schedule(
      'purge_deleted_accounts_daily',
      '0 3 * * *',
      $cron$select public.purge_deleted_accounts();$cron$
    );
  end if;
end;
$$;
