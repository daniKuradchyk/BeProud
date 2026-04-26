-- BeProud · Fase 3 — task_completions + trigger de puntos + current_streak.
-- Bucket task-photos y sus policies van en una migración aparte para mantener
-- una migración = un concepto.

create table if not exists public.task_completions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  routine_task_id      uuid references public.routine_tasks(id) on delete set null,
  task_id              uuid not null references public.tasks_catalog(id) on delete restrict,
  photo_path           text not null,
  points_awarded       integer not null default 0 check (points_awarded >= 0),
  ai_validation_status text not null default 'skipped'
    check (ai_validation_status in ('pending','valid','invalid','skipped')),
  ai_confidence        numeric(3,2)
    check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)),
  ai_reason            text,
  is_public            boolean not null default true,
  created_at           timestamptz not null default now()
);

comment on table public.task_completions is
  'Cada vez que un usuario completa una tarea con foto. La validación IA llega en Fase 9.';

create index if not exists idx_task_completions_user_created
  on public.task_completions (user_id, created_at desc);

create index if not exists idx_task_completions_task_created
  on public.task_completions (task_id, created_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.task_completions enable row level security;

drop policy if exists "task_completions: select own"     on public.task_completions;
drop policy if exists "task_completions: select public"  on public.task_completions;
drop policy if exists "task_completions: insert own"     on public.task_completions;
drop policy if exists "task_completions: update own"     on public.task_completions;
drop policy if exists "task_completions: delete own"     on public.task_completions;

create policy "task_completions: select own"
  on public.task_completions for select to authenticated
  using (auth.uid() = user_id);

create policy "task_completions: select public"
  on public.task_completions for select to authenticated
  using (is_public = true);

create policy "task_completions: insert own"
  on public.task_completions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "task_completions: update own"
  on public.task_completions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "task_completions: delete own"
  on public.task_completions for delete to authenticated
  using (auth.uid() = user_id);

-- ── Trigger de puntos ──────────────────────────────────────────────────────
-- Mantiene profiles.total_points consistente con la suma de points_awarded
-- de las task_completions del usuario. Clamp a 0 para no devolver negativos
-- si por alguna razón el delta restara más de lo que hay.
create or replace function public.bump_user_points()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_delta integer;
begin
  if tg_op = 'INSERT' then
    update public.profiles
       set total_points = greatest(0, total_points + new.points_awarded)
     where id = new.user_id;
    return new;

  elsif tg_op = 'UPDATE' then
    v_delta := coalesce(new.points_awarded, 0) - coalesce(old.points_awarded, 0);
    if v_delta <> 0 then
      update public.profiles
         set total_points = greatest(0, total_points + v_delta)
       where id = new.user_id;
    end if;
    return new;

  elsif tg_op = 'DELETE' then
    update public.profiles
       set total_points = greatest(0, total_points - old.points_awarded)
     where id = old.user_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists task_completions_bump_points     on public.task_completions;
drop trigger if exists task_completions_bump_points_upd on public.task_completions;

create trigger task_completions_bump_points
  after insert or delete on public.task_completions
  for each row execute function public.bump_user_points();

create trigger task_completions_bump_points_upd
  after update of points_awarded on public.task_completions
  for each row execute function public.bump_user_points();

-- ── Función current_streak ─────────────────────────────────────────────────
-- Días consecutivos hasta hoy con al menos una completion 'valid' o 'skipped'.
-- Si no hay completion hoy, la racha empieza desde ayer (no se rompe por el
-- hecho de no haber completado aún hoy). Timezone: UTC del servidor; en
-- Fase 8 se ajustará al timezone del usuario.
create or replace function public.current_streak(p_user_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_streak  integer := 0;
  v_check   date;
  v_today   date := current_date;
  v_done_today boolean;
begin
  select exists (
    select 1 from public.task_completions
     where user_id = p_user_id
       and ai_validation_status in ('valid','skipped')
       and (created_at)::date = v_today
  ) into v_done_today;

  v_check := case when v_done_today then v_today else v_today - 1 end;

  loop
    if not exists (
      select 1 from public.task_completions
       where user_id = p_user_id
         and ai_validation_status in ('valid','skipped')
         and (created_at)::date = v_check
    ) then
      exit;
    end if;
    v_streak := v_streak + 1;
    v_check  := v_check - 1;
  end loop;

  return v_streak;
end;
$$;

grant execute on function public.current_streak(uuid) to authenticated;
