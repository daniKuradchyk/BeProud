-- BeProud · Fase 10 — triggers que crean filas en notifications.
-- Cada trigger consulta profiles.notification_prefs->>type del receptor
-- y silencia si vale "false" (regla de oro: bloquear el evento, no la push).

-- Helper: ¿el user X tiene activada la pref Y?
create or replace function public.notif_pref_enabled(p_user_id uuid, p_type text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((p.notification_prefs ->> p_type)::boolean, true)
    from public.profiles p
   where p.id = p_user_id
     and p.deleted_at is null;
$$;

revoke all on function public.notif_pref_enabled(uuid, text) from public, anon, authenticated;

-- ── 1) new_like ────────────────────────────────────────────────────────────
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient   uuid;
  v_username    text;
begin
  select user_id into v_recipient from public.posts where id = new.post_id;
  if v_recipient is null or v_recipient = new.user_id then
    return new;
  end if;
  if not public.notif_pref_enabled(v_recipient, 'new_like') then
    return new;
  end if;
  select username::text into v_username from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, type, payload)
  values (v_recipient, 'new_like',
    jsonb_build_object(
      'post_id', new.post_id,
      'liker_id', new.user_id,
      'liker_username', v_username));

  return new;
end;
$$;

drop trigger if exists notify_on_like_ins on public.likes;
create trigger notify_on_like_ins
  after insert on public.likes
  for each row execute function public.notify_on_like();

-- ── 2) new_comment ─────────────────────────────────────────────────────────
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_username  text;
begin
  select user_id into v_recipient from public.posts where id = new.post_id;
  if v_recipient is null or v_recipient = new.user_id then
    return new;
  end if;
  if not public.notif_pref_enabled(v_recipient, 'new_comment') then
    return new;
  end if;
  select username::text into v_username from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, type, payload)
  values (v_recipient, 'new_comment',
    jsonb_build_object(
      'post_id', new.post_id,
      'comment_id', new.id,
      'commenter_id', new.user_id,
      'commenter_username', v_username));

  return new;
end;
$$;

drop trigger if exists notify_on_comment_ins on public.comments;
create trigger notify_on_comment_ins
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ── 3) new_follower (status='accepted') + 4) follow_request (status='pending')
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_type     text;
begin
  if (tg_op = 'INSERT' and new.status = 'accepted')
     or (tg_op = 'UPDATE' and new.status = 'accepted'
         and (old.status is distinct from 'accepted')) then
    v_type := 'new_follower';
  elsif (tg_op = 'INSERT' and new.status = 'pending') then
    v_type := 'follow_request';
  else
    return new;
  end if;

  if not public.notif_pref_enabled(new.followed_id, v_type) then
    return new;
  end if;
  select username::text into v_username from public.profiles where id = new.follower_id;

  insert into public.notifications (user_id, type, payload)
  values (new.followed_id, v_type,
    jsonb_build_object(
      'follower_id', new.follower_id,
      'follower_username', v_username));

  return new;
end;
$$;

drop trigger if exists notify_on_follow_ins on public.follows;
drop trigger if exists notify_on_follow_upd on public.follows;
create trigger notify_on_follow_ins
  after insert on public.follows
  for each row execute function public.notify_on_follow();
create trigger notify_on_follow_upd
  after update of status on public.follows
  for each row execute function public.notify_on_follow();

-- ── 5) new_dm ──────────────────────────────────────────────────────────────
create or replace function public.notify_on_dm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_preview  text;
begin
  select username::text into v_username from public.profiles where id = new.sender_id;
  v_preview := case
    when coalesce(trim(new.content), '') = '' and new.media_url is not null then '📷 Imagen'
    else left(coalesce(new.content, ''), 60)
  end;

  insert into public.notifications (user_id, type, payload)
  select tm.user_id, 'new_dm',
         jsonb_build_object(
           'thread_id', new.thread_id,
           'sender_id', new.sender_id,
           'sender_username', v_username,
           'preview', v_preview)
    from public.thread_members tm
   where tm.thread_id = new.thread_id
     and tm.user_id <> new.sender_id
     and public.notif_pref_enabled(tm.user_id, 'new_dm');

  return new;
end;
$$;

drop trigger if exists notify_on_dm_ins on public.messages;
create trigger notify_on_dm_ins
  after insert on public.messages
  for each row execute function public.notify_on_dm();

-- ── 6) league_promotion (sobre weekly_leaderboards globales) ───────────────
create or replace function public.notify_on_league_promotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.group_id is not null then
    return new;
  end if;
  if new.league_id is null then
    return new;
  end if;
  if (tg_op = 'UPDATE' and (old.league_id is null or new.league_id <= old.league_id)) then
    return new;
  end if;
  if not public.notif_pref_enabled(new.user_id, 'league_promotion') then
    return new;
  end if;

  insert into public.notifications (user_id, type, payload)
  values (new.user_id, 'league_promotion',
    jsonb_build_object(
      'from_league_id', case when tg_op='UPDATE' then old.league_id else null end,
      'to_league_id',   new.league_id,
      'week',           new.week));

  return new;
end;
$$;

drop trigger if exists notify_on_league_ins on public.weekly_leaderboards;
drop trigger if exists notify_on_league_upd on public.weekly_leaderboards;
create trigger notify_on_league_ins
  after insert on public.weekly_leaderboards
  for each row execute function public.notify_on_league_promotion();
create trigger notify_on_league_upd
  after update of league_id on public.weekly_leaderboards
  for each row execute function public.notify_on_league_promotion();

-- ── 7) achievement_unlocked ────────────────────────────────────────────────
create or replace function public.notify_on_achievement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a record;
begin
  if not public.notif_pref_enabled(new.user_id, 'achievement_unlocked') then
    return new;
  end if;
  select id, slug, title, icon into v_a from public.achievements where id = new.achievement_id;

  insert into public.notifications (user_id, type, payload)
  values (new.user_id, 'achievement_unlocked',
    jsonb_build_object(
      'achievement_id', v_a.id,
      'slug', v_a.slug,
      'title', v_a.title,
      'icon', v_a.icon));

  return new;
end;
$$;

drop trigger if exists notify_on_achievement_ins on public.user_achievements;
create trigger notify_on_achievement_ins
  after insert on public.user_achievements
  for each row execute function public.notify_on_achievement();
