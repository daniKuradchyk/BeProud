-- BeProud · Fase 8 — user_achievements + RLS.
-- Activación de Realtime: el usuario ejecutará manualmente
--   alter publication supabase_realtime add table public.user_achievements;
--   alter publication supabase_realtime add table public.weekly_leaderboards;

create table if not exists public.user_achievements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id integer not null references public.achievements(id) on delete restrict,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists user_achievements_user_idx
  on public.user_achievements (user_id, unlocked_at desc);

alter table public.user_achievements enable row level security;

drop policy if exists "user_achievements: read own"    on public.user_achievements;
drop policy if exists "user_achievements: read public" on public.user_achievements;

-- Lectura propia siempre.
create policy "user_achievements: read own"
  on public.user_achievements for select to authenticated
  using (auth.uid() = user_id);

-- Lectura de logros ajenos: solo si el dueño no es privado y no hay block mutuo.
create policy "user_achievements: read public"
  on public.user_achievements for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = user_achievements.user_id
         and p.is_private = false
    )
    and not exists (
      select 1 from public.blocks b
       where (b.blocker_id = auth.uid()                    and b.blocked_id = user_achievements.user_id)
          or (b.blocker_id = user_achievements.user_id     and b.blocked_id = auth.uid())
    )
  );

-- Sin INSERT/UPDATE/DELETE policies → solo via unlock_achievement (SECURITY DEFINER).
