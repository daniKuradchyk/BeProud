-- BeProud · Fase 16 — histórico de ayunos. Cada fila es un ayuno terminado
-- (completado por la RPC closeCompletedFasts o roto explícitamente por el user).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fasting_status') then
    create type public.fasting_status as enum ('completed','broken_early');
  end if;
end $$;

create table if not exists public.fasting_logs (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  protocol              public.fasting_protocol not null,
  started_at            timestamptz not null,
  ended_at              timestamptz not null,
  planned_duration_min  int not null check (planned_duration_min > 0),
  actual_duration_min   int not null check (actual_duration_min  >= 0),
  status                public.fasting_status not null,
  notes                 text,
  created_at            timestamptz not null default now(),
  -- Idempotencia de closeCompletedFasts: un mismo started_at no puede repetirse.
  unique (user_id, started_at)
);

create index if not exists idx_fasting_logs_user_started
  on public.fasting_logs(user_id, started_at desc);
create index if not exists idx_fasting_logs_user_status
  on public.fasting_logs(user_id, status);

alter table public.fasting_logs enable row level security;

drop policy if exists "fasting_logs_own" on public.fasting_logs;
create policy "fasting_logs_own" on public.fasting_logs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
