-- BeProud · Fase 10 — al insertar una notification, dispara la Edge Function
-- send-push vía pg_net.http_post con la URL del proyecto.
-- Las credenciales y URL viven en una tabla privada `app_config` (no en RLS).

create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;
-- Sin policies → solo accesible por service_role / SECURITY DEFINER.

insert into public.app_config (key, value) values
  ('supabase_url',          'https://hupgxfrijdnphltpbcnd.supabase.co'),
  ('send_push_invoke_token','REPLACE_ME')
on conflict (key) do nothing;

create or replace function public.dispatch_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url   text;
  v_token text;
begin
  begin
    select value into v_url   from public.app_config where key = 'supabase_url';
    select value into v_token from public.app_config where key = 'send_push_invoke_token';

    if v_url is null or v_token is null or v_token = 'REPLACE_ME' then
      -- Edge function no configurada todavía. No fallamos el INSERT.
      update public.notifications
         set push_error = 'send_push_unconfigured'
       where id = new.id;
      return new;
    end if;

    perform net.http_post(
      url     := v_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_token),
      body    := jsonb_build_object('notification_id', new.id),
      timeout_milliseconds := 10000
    );
  exception when others then
    -- Cualquier error de pg_net no rompe el INSERT. Marca push_error.
    update public.notifications
       set push_error = 'dispatch_failed: ' || sqlerrm
     where id = new.id;
  end;

  return new;
end;
$$;

revoke all on function public.dispatch_push() from public, anon, authenticated;

drop trigger if exists dispatch_push_ins on public.notifications;
create trigger dispatch_push_ins
  after insert on public.notifications
  for each row execute function public.dispatch_push();
