-- BeProud · Fase 10 — añade timezone, notification_prefs y deleted_at
-- a profiles. Los defaults cubren a usuarios existentes sin migrar manual.

alter table public.profiles
  add column if not exists timezone           text not null default 'UTC',
  add column if not exists notification_prefs jsonb not null default
    '{"new_like":true,"new_comment":true,"new_follower":true,
      "follow_request":true,"new_dm":true,"league_promotion":true,
      "achievement_unlocked":true,"daily_reminder":false,
      "quiet_start":"23:00","quiet_end":"08:00"}'::jsonb,
  add column if not exists deleted_at         timestamptz;

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at)
 where deleted_at is not null;
