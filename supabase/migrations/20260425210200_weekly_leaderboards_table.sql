-- BeProud · Fase 8 — weekly_leaderboards: ranking persistente por semana.
-- group_id null = ranking GLOBAL; group_id no nulo = ranking del grupo.
-- La unicidad incluye coalesce(group_id, sentinel) porque PK no admite null.

create table if not exists public.weekly_leaderboards (
  week       date    not null,
  user_id    uuid    not null references auth.users(id) on delete cascade,
  group_id   uuid             references public.groups(id) on delete cascade,
  points     integer not null default 0,
  rank       integer not null default 0,
  league_id  integer          references public.leagues(id),
  updated_at timestamptz not null default now()
);

create unique index if not exists weekly_leaderboards_unique_idx
  on public.weekly_leaderboards (
    week,
    user_id,
    coalesce(group_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists weekly_leaderboards_group_rank_idx
  on public.weekly_leaderboards (week, group_id, rank)
  where group_id is not null;

create index if not exists weekly_leaderboards_global_league_rank_idx
  on public.weekly_leaderboards (week, league_id, rank)
  where group_id is null;

create index if not exists weekly_leaderboards_user_history_idx
  on public.weekly_leaderboards (user_id, week desc);

alter table public.weekly_leaderboards enable row level security;

drop policy if exists "weekly_leaderboards: read global"        on public.weekly_leaderboards;
drop policy if exists "weekly_leaderboards: read group member"  on public.weekly_leaderboards;

create policy "weekly_leaderboards: read global"
  on public.weekly_leaderboards for select to authenticated
  using (group_id is null);

create policy "weekly_leaderboards: read group member"
  on public.weekly_leaderboards for select to authenticated
  using (group_id is not null and public.is_group_member(group_id));

-- Sin policies de INSERT/UPDATE/DELETE → solo via SECURITY DEFINER.
