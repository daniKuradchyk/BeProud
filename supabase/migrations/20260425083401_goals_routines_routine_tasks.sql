-- BeProud · Fase 2 — Goals, routines y routine_tasks (RLS owner-only).
-- Aplicada vía MCP el 2026-04-25.

-- 1) goals
create table if not exists public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 80),
  horizon        text not null default 'short'
                   check (horizon in ('short','medium','long')),
  target_points  integer check (target_points is null or target_points > 0),
  created_at     timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals (user_id);

alter table public.goals enable row level security;

drop policy if exists "goals: select own" on public.goals;
create policy "goals: select own" on public.goals for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "goals: insert own" on public.goals;
create policy "goals: insert own" on public.goals for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "goals: update own" on public.goals;
create policy "goals: update own" on public.goals for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "goals: delete own" on public.goals;
create policy "goals: delete own" on public.goals for delete to authenticated
  using (auth.uid() = user_id);


-- 2) routines
create table if not exists public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  horizon     text not null default 'daily'
                check (horizon in ('daily','weekly')),
  starts_at   date not null default (now() at time zone 'utc')::date,
  ends_at     date,
  is_active   boolean not null default true,
  answers     jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint routines_dates_check check (ends_at is null or ends_at >= starts_at)
);

create unique index if not exists routines_one_active_per_user
  on public.routines (user_id) where is_active = true;

create index if not exists routines_user_idx on public.routines (user_id);

drop trigger if exists routines_set_updated_at on public.routines;
create trigger routines_set_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

alter table public.routines enable row level security;

drop policy if exists "routines: select own" on public.routines;
create policy "routines: select own" on public.routines for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "routines: insert own" on public.routines;
create policy "routines: insert own" on public.routines for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "routines: update own" on public.routines;
create policy "routines: update own" on public.routines for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "routines: delete own" on public.routines;
create policy "routines: delete own" on public.routines for delete to authenticated
  using (auth.uid() = user_id);


-- 3) routine_tasks
create table if not exists public.routine_tasks (
  id                 uuid primary key default gen_random_uuid(),
  routine_id         uuid not null references public.routines(id) on delete cascade,
  task_id            uuid not null references public.tasks_catalog(id) on delete restrict,
  target_frequency   text not null default 'daily',
  points_override    integer check (points_override is null or points_override between 1 and 200),
  position           integer not null default 0,
  created_at         timestamptz not null default now(),
  constraint frequency_format check (
    target_frequency = 'daily'
    or target_frequency ~ '^weekly_[1-7]$'
    or target_frequency ~ '^days:(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*$'
  ),
  constraint routine_task_unique unique (routine_id, task_id)
);

create index if not exists routine_tasks_routine_idx on public.routine_tasks (routine_id, position);

alter table public.routine_tasks enable row level security;

drop policy if exists "routine_tasks: select own" on public.routine_tasks;
create policy "routine_tasks: select own" on public.routine_tasks for select to authenticated
  using (
    exists (select 1 from public.routines r
            where r.id = routine_tasks.routine_id and r.user_id = auth.uid())
  );

drop policy if exists "routine_tasks: insert own" on public.routine_tasks;
create policy "routine_tasks: insert own" on public.routine_tasks for insert to authenticated
  with check (
    exists (select 1 from public.routines r
            where r.id = routine_tasks.routine_id and r.user_id = auth.uid())
  );

drop policy if exists "routine_tasks: update own" on public.routine_tasks;
create policy "routine_tasks: update own" on public.routine_tasks for update to authenticated
  using (
    exists (select 1 from public.routines r
            where r.id = routine_tasks.routine_id and r.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.routines r
            where r.id = routine_tasks.routine_id and r.user_id = auth.uid())
  );

drop policy if exists "routine_tasks: delete own" on public.routine_tasks;
create policy "routine_tasks: delete own" on public.routine_tasks for delete to authenticated
  using (
    exists (select 1 from public.routines r
            where r.id = routine_tasks.routine_id and r.user_id = auth.uid())
  );
