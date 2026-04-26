-- BeProud · Fase 15 — sesiones Pomodoro / técnicas de estudio.

create table if not exists public.study_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  routine_task_id   uuid references public.routine_tasks(id) on delete set null,
  technique         text not null default 'pomodoro_25_5'
                       check (technique in ('pomodoro_25_5','pomodoro_50_10','custom')),
  planned_minutes   int  not null check (planned_minutes between 5 and 720),
  focus_minutes     int  not null check (focus_minutes between 5 and 90),
  break_minutes     int  not null check (break_minutes between 1 and 30),
  cycles_planned    int  not null check (cycles_planned between 1 and 12),
  cycles_completed  int  not null default 0 check (cycles_completed >= 0),
  status            text not null default 'in_progress'
                       check (status in ('in_progress','completed','abandoned')),
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  notes             text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_study_sessions_user_started
  on public.study_sessions (user_id, started_at desc);
create index if not exists idx_study_sessions_user_status
  on public.study_sessions (user_id, status);

alter table public.study_sessions enable row level security;

drop policy if exists "study_sessions_select_own" on public.study_sessions;
drop policy if exists "study_sessions_insert_own" on public.study_sessions;
drop policy if exists "study_sessions_update_own" on public.study_sessions;
drop policy if exists "study_sessions_delete_own" on public.study_sessions;

create policy "study_sessions_select_own" on public.study_sessions
  for select to authenticated using (auth.uid() = user_id);
create policy "study_sessions_insert_own" on public.study_sessions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "study_sessions_update_own" on public.study_sessions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "study_sessions_delete_own" on public.study_sessions
  for delete to authenticated using (auth.uid() = user_id);
