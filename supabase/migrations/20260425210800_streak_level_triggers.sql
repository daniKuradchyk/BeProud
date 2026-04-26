-- BeProud · Fase 8 — calculate_level + triggers de streak y level + achievements de streak.

-- ── calculate_level ─────────────────────────────────────────────────────────
-- Fórmula raíz cuadrada: nivel = floor(sqrt(points/100)) + 1.
-- Umbrales: 0→1, 100→2, 400→3, 900→4, 1600→5, 2500→6, ...
create or replace function public.calculate_level(p_points integer)
returns integer
language sql
immutable
as $$
  select greatest(1, floor(sqrt(greatest(p_points, 0)::numeric / 100.0))::int + 1);
$$;

-- ── Trigger: actualiza profiles.level cuando cambia total_points ──────────
-- BEFORE para que el UPDATE escriba el level en la misma fila.
create or replace function public.set_level_from_points()
returns trigger
language plpgsql
as $$
begin
  new.level := public.calculate_level(new.total_points);
  return new;
end;
$$;

drop trigger if exists set_level_from_points_upd on public.profiles;
create trigger set_level_from_points_upd
  before update of total_points on public.profiles
  for each row execute function public.set_level_from_points();

-- También al crear el profile (handle_new_user inserta total_points=0 → level=1).
drop trigger if exists set_level_from_points_ins on public.profiles;
create trigger set_level_from_points_ins
  before insert on public.profiles
  for each row execute function public.set_level_from_points();

-- ── Trigger: streak_current/streak_best + achievements de racha ───────────
create or replace function public.update_streak_on_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak    integer;
  v_old_best  integer;
begin
  if new.ai_validation_status not in ('valid','skipped') then
    return new;
  end if;

  v_streak := public.current_streak(new.user_id);

  select streak_best into v_old_best from public.profiles where id = new.user_id;
  v_old_best := coalesce(v_old_best, 0);

  update public.profiles
     set streak_current = v_streak,
         streak_best    = greatest(v_old_best, v_streak),
         updated_at     = now()
   where id = new.user_id;

  -- Achievements
  if v_streak >= 3  then perform public.unlock_achievement(new.user_id, 'streak_3');  end if;
  if v_streak >= 7  then perform public.unlock_achievement(new.user_id, 'streak_7');  end if;
  if v_streak >= 30 then perform public.unlock_achievement(new.user_id, 'streak_30'); end if;

  -- streak_back: vuelves tras romper una racha decente.
  -- Heurística: streak_current = 1 (es el primer día tras un hueco) y
  -- streak_best ≥ 3 (en algún momento habías tenido al menos 3 días).
  if v_streak = 1 and v_old_best >= 3 then
    perform public.unlock_achievement(new.user_id, 'streak_back');
  end if;

  return new;
end;
$$;

drop trigger if exists update_streak_on_completion_ins on public.task_completions;
create trigger update_streak_on_completion_ins
  after insert on public.task_completions
  for each row execute function public.update_streak_on_completion();

-- Backfill defensivo: si hay perfiles con level distinto al calculado.
update public.profiles
   set level = public.calculate_level(total_points)
 where level <> public.calculate_level(total_points);
