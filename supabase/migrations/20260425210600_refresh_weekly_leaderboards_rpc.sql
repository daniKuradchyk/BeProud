-- BeProud · Fase 8 — recalcula weekly_leaderboards de la semana en curso.
-- Idempotente: re-ejecutar deja el mismo estado. La programa pg_cron cada hora.

create or replace function public.refresh_weekly_leaderboards()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week date := date_trunc('week', current_date)::date;
begin
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
    from ranked
  on conflict (week, user_id, coalesce(group_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set points     = excluded.points,
                rank       = excluded.rank,
                league_id  = excluded.league_id,
                updated_at = now();

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
    from ranked_g
  on conflict (week, user_id, coalesce(group_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set points     = excluded.points,
                rank       = excluded.rank,
                league_id  = null,
                updated_at = now();

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
