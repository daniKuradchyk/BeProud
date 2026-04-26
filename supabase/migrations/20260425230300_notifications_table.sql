-- BeProud · Fase 10 — notifications.
-- Activación de Realtime: el usuario ejecuta manualmente
--   alter publication supabase_realtime add table public.notifications;

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null check (type in (
    'new_like','new_comment','new_follower','follow_request',
    'new_dm','league_promotion','achievement_unlocked','daily_reminder')),
  payload      jsonb not null default '{}'::jsonb,
  read_at      timestamptz,
  sent_push_at timestamptz,
  push_error   text,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx  on public.notifications (user_id, read_at);
create index if not exists notifications_pending_push_idx on public.notifications (sent_push_at) where sent_push_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications: own select" on public.notifications;
drop policy if exists "notifications: own update" on public.notifications;
drop policy if exists "notifications: own delete" on public.notifications;

create policy "notifications: own select"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);

create policy "notifications: own update"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notifications: own delete"
  on public.notifications for delete to authenticated
  using (auth.uid() = user_id);
-- Sin INSERT policy → solo via triggers SECURITY DEFINER o service_role.
