-- BeProud · Fase 8 — fix: refresh borra primero las filas de la semana
-- en curso para evitar rangos huérfanos cuando un user/grupo deja de
-- aportar puntos esta semana. Sigue siendo idempotente.

create or replace function public.refresh_weekly_leaderboards()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week date := date_trunc('week', current_date)::date;
begin
  -- Limpieza previa de la semana en curso. Las semanas anteriores quedan
  -- intactas (histórico). Esto es seguro porque inmediatamente después
  -- recalculamos todos los rangos con el estado actual.
  delete from public.weekly_leaderboards where week = v_week;

  -- ── 1) GLOBAL ───────────────────────────────────────────────────────────
  with weekly_points as (
    select tc.user_id,
           sum(tc.points_awarded)::int as points
      from public.task_completions tc
     where tc.ai_validation_status in ('valid','skipped')
       and tc.created_at >= v_week
       and tc.created_at <  v_week + interval '7 days'
     group by tc.user_id
  ),
  ranked as (
    select wp.user_id,
           wp.points,
           dense_rank() over (order by wp.points desc)::int as rank,
           (select l.id
              from public.leagues l
             where wp.points >= l.min_points_week
               and (l.max_points_week is null or wp.points <= l.max_points_week)
             order by l.tier desc
             limit 1) as league_id
      from weekly_points wp
  )
  insert into public.weekly_leaderboards (week, user_id, group_id, points, rank, league_id, updated_at)
  select v_week, user_id, null, points, rank, league_id, now()
    from ranked;

  -- ── 2) POR GRUPO ────────────────────────────────────────────────────────
  with weekly_group_points as (
    select gm.group_id, gm.user_id,
           coalesce(sum(tc.points_awarded), 0)::int as points
      from public.group_members gm
      left join public.task_completions tc
             on tc.user_id = gm.user_id
            and tc.ai_validation_status in ('valid','skipped')
            and tc.created_at >= v_week
            and tc.created_at <  v_week + interval '7 days'
     group by gm.group_id, gm.user_id
  ),
  ranked_g as (
    select group_id, user_id, points,
           dense_rank() over (partition by group_id order by points desc)::int as rank
      from weekly_group_points
  )
  insert into public.weekly_leaderboards (week, user_id, group_id, points, rank, league_id, updated_at)
  select v_week, user_id, group_id, points, rank, null, now()
    from ranked_g;

  -- ── 3) Logro group_top_week ─────────────────────────────────────────────
  perform public.unlock_achievement(user_id, 'group_top_week')
     from public.weekly_leaderboards
    where week = v_week
      and group_id is not null
      and rank = 1
      and points > 0;
end;
$$;

revoke all on function public.refresh_weekly_leaderboards() from public, anon, authenticated;
