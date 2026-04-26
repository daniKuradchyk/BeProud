-- BeProud · Fase 16 — protocolo de ayuno por user.
-- Una fila por user. Configuración personal del módulo de Ayuno.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fasting_protocol') then
    create type public.fasting_protocol as enum
      ('16_8','14_10','18_6','20_4','omad','5_2','custom');
  end if;
end $$;

create table if not exists public.fasting_protocols (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  protocol             public.fasting_protocol not null,
  -- Para protocolos por horas: ventana de comidas en hora local del usuario.
  eat_start            time,
  eat_end              time,
  -- Para protocolo 5:2: días de la semana en bajo calórico.
  low_cal_days         text[] check (
                         low_cal_days is null or
                         low_cal_days <@ array['MON','TUE','WED','THU','FRI','SAT','SUN']
                       ),
  notify_before_close  boolean not null default true,
  notify_on_complete   boolean not null default true,
  enabled              boolean not null default true,
  timezone             text not null default 'Europe/Madrid',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- Coherencia: protocolos por horas requieren eat_start/eat_end; 5:2 requiere días.
  constraint fasting_protocols_window_chk check (
    (protocol in ('16_8','14_10','18_6','20_4','omad','custom')
     and eat_start is not null and eat_end is not null)
    or
    (protocol = '5_2' and low_cal_days is not null)
  )
);

drop trigger if exists fasting_protocols_set_updated_at on public.fasting_protocols;
create trigger fasting_protocols_set_updated_at
  before update on public.fasting_protocols
  for each row execute function public.set_updated_at();

alter table public.fasting_protocols enable row level security;

drop policy if exists "fasting_protocols_own" on public.fasting_protocols;
create policy "fasting_protocols_own" on public.fasting_protocols
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
