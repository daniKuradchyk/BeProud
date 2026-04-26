-- BeProud · Fase 7 — group_leaderboard: suma de points_awarded por miembro
-- en una ventana day/week/month, ordenado desc. Solo miembros pueden invocar.

create or replace function public.group_leaderboard(
  p_group_id uuid,
  p_period   text
) returns table (
  user_id      uuid,
  username     text,
  display_name text,
  avatar_url   text,
  points       integer,
  rank         integer
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_start timestamptz;
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'Solo los miembros del grupo pueden ver el ranking.'
      using errcode = '42501';
  end if;

  v_start := case p_period
    when 'day'   then current_date::timestamptz
    when 'week'  then date_trunc('week',  current_date)::timestamptz
    when 'month' then date_trunc('month', current_date)::timestamptz
    else null
  end;
  if v_start is null then
    raise exception 'Periodo inválido (usa day, week o month).'
      using errcode = '22023';
  end if;

  return query
  select
    pr.id           as user_id,
    pr.username::text as username,
    pr.display_name as display_name,
    pr.avatar_url   as avatar_url,
    coalesce(sum(tc.points_awarded), 0)::integer as points,
    row_number() over (order by coalesce(sum(tc.points_awarded), 0) desc)::integer as rank
  from public.group_members gm
  join public.profiles pr on pr.id = gm.user_id
  left join public.task_completions tc
    on tc.user_id = gm.user_id
   and tc.created_at >= v_start
   and tc.ai_validation_status in ('valid','skipped')
  where gm.group_id = p_group_id
  group by pr.id, pr.username, pr.display_name, pr.avatar_url
  order by points desc
  limit 50;
end;
$$;

grant execute on function public.group_leaderboard(uuid, text) to authenticated;
