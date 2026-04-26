-- BeProud · Fase 13 — gym_routines + days + exercises (con RLS owner-only).

create table if not exists public.gym_routines (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  template      text,
  days_per_week integer not null check (days_per_week between 1 and 7),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create unique index if not exists gym_routines_one_active_per_user
  on public.gym_routines (user_id) where is_active;

create index if not exists gym_routines_user_idx on public.gym_routines (user_id);

create table if not exists public.gym_routine_days (
  id              uuid primary key default gen_random_uuid(),
  gym_routine_id  uuid not null references public.gym_routines(id) on delete cascade,
  day_index       integer not null check (day_index between 0 and 6),
  name            text not null,
  unique (gym_routine_id, day_index)
);

create table if not exists public.gym_routine_exercises (
  id                  uuid primary key default gen_random_uuid(),
  gym_routine_day_id  uuid not null references public.gym_routine_days(id) on delete cascade,
  exercise_id         uuid not null references public.exercises(id) on delete restrict,
  sets                integer not null check (sets between 1 and 10),
  reps_min            integer not null check (reps_min between 1 and 50),
  reps_max            integer not null check (reps_max between 1 and 50),
  rest_seconds        integer not null default 90 check (rest_seconds between 0 and 600),
  notes               text,
  position            integer not null,
  unique (gym_routine_day_id, exercise_id)
);

alter table public.gym_routines           enable row level security;
alter table public.gym_routine_days       enable row level security;
alter table public.gym_routine_exercises  enable row level security;

drop policy if exists "gym_routines: own all" on public.gym_routines;
create policy "gym_routines: own all"
  on public.gym_routines for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "gym_routine_days: own all" on public.gym_routine_days;
create policy "gym_routine_days: own all"
  on public.gym_routine_days for all to authenticated
  using (exists (select 1 from public.gym_routines r
                  where r.id = gym_routine_days.gym_routine_id
                    and r.user_id = auth.uid()))
  with check (exists (select 1 from public.gym_routines r
                       where r.id = gym_routine_days.gym_routine_id
                         and r.user_id = auth.uid()));

drop policy if exists "gym_routine_exercises: own all" on public.gym_routine_exercises;
create policy "gym_routine_exercises: own all"
  on public.gym_routine_exercises for all to authenticated
  using (exists (
    select 1 from public.gym_routine_days d
      join public.gym_routines r on r.id = d.gym_routine_id
     where d.id = gym_routine_exercises.gym_routine_day_id
       and r.user_id = auth.uid()))
  with check (exists (
    select 1 from public.gym_routine_days d
      join public.gym_routines r on r.id = d.gym_routine_id
     where d.id = gym_routine_exercises.gym_routine_day_id
       and r.user_id = auth.uid()));
