-- BeProud · Fase 13 — workout_sessions + workout_sets.
-- workout_sets.user_id es denormalizado y se rellena via trigger before-insert
-- para indexar histórico por exercise sin join.

create table if not exists public.workout_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  gym_routine_day_id  uuid references public.gym_routine_days(id) on delete set null,
  started_at          timestamptz not null default now(),
  ended_at            timestamptz,
  total_volume        numeric(10,2) not null default 0,
  notes               text,
  check (ended_at is null or ended_at >= started_at)
);

create index if not exists workout_sessions_user_idx
  on public.workout_sessions (user_id, started_at desc);

create table if not exists public.workout_sets (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.workout_sessions(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  exercise_id   uuid not null references public.exercises(id) on delete restrict,
  set_index     integer not null check (set_index between 1 and 30),
  reps          integer not null check (reps between 0 and 100),
  weight_kg     numeric(6,2) not null default 0 check (weight_kg between 0 and 999.99),
  rpe           numeric(3,1) check (rpe is null or rpe between 1 and 10),
  completed_at  timestamptz not null default now()
);

create index if not exists workout_sets_session_idx  on public.workout_sets (session_id, exercise_id, set_index);
create index if not exists workout_sets_history_idx  on public.workout_sets (user_id, exercise_id, completed_at desc);

create or replace function public.workout_sets_fill_user_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null then
    select user_id into new.user_id
      from public.workout_sessions where id = new.session_id;
  end if;
  return new;
end;
$$;

drop trigger if exists workout_sets_fill_user_id_ins on public.workout_sets;
create trigger workout_sets_fill_user_id_ins
  before insert on public.workout_sets
  for each row execute function public.workout_sets_fill_user_id();

alter table public.workout_sessions enable row level security;
alter table public.workout_sets     enable row level security;

drop policy if exists "workout_sessions: own all" on public.workout_sessions;
create policy "workout_sessions: own all"
  on public.workout_sessions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workout_sets: own all" on public.workout_sets;
create policy "workout_sets: own all"
  on public.workout_sets for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
