-- BeProud · Fase 4 — tabla reports (stub). Los moderadores la leerán con
-- service_role; el reporter solo ve sus propios reports.

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','user')),
  target_id   uuid not null,
  reason      text check (reason is null or char_length(reason) <= 200),
  created_at  timestamptz not null default now()
);

create index if not exists idx_reports_target on public.reports (target_type, target_id);

alter table public.reports enable row level security;

drop policy if exists "reports: select own"  on public.reports;
drop policy if exists "reports: insert own"  on public.reports;

create policy "reports: select own"
  on public.reports for select to authenticated
  using (reporter_id = auth.uid());

create policy "reports: insert own"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
