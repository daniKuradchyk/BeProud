-- BeProud · Fase 8 — triggers que desbloquean achievements automáticamente.
-- Todos AFTER + STATEMENT-level cuando hace falta agrupar; FOR EACH ROW si
-- la condición depende de la fila concreta. Idempotentes via unlock_achievement.

-- ── 1) Completion-based achievements ───────────────────────────────────────
create or replace function public.check_completion_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_today integer;
begin
  if new.ai_validation_status not in ('valid','skipped') then
    return new;
  end if;

  -- count total de completions válidas/skipped del user.
  select count(*) into v_total
    from public.task_completions
   where user_id = new.user_id
     and ai_validation_status in ('valid','skipped');

  if v_total = 1   then perform public.unlock_achievement(new.user_id, 'first_completion');    end if;
  if v_total = 10  then perform public.unlock_achievement(new.user_id, 'ten_completions');     end if;
  if v_total = 50  then perform public.unlock_achievement(new.user_id, 'fifty_completions');   end if;
  if v_total = 100 then perform public.unlock_achievement(new.user_id, 'hundred_completions'); end if;

  -- 5 en el mismo día (zona UTC; suficiente para MVP).
  select count(*) into v_today
    from public.task_completions
   where user_id = new.user_id
     and ai_validation_status in ('valid','skipped')
     and created_at >= date_trunc('day', new.created_at)
     and created_at <  date_trunc('day', new.created_at) + interval '1 day';
  if v_today >= 5 then
    perform public.unlock_achievement(new.user_id, 'five_in_a_day');
  end if;

  return new;
end;
$$;

drop trigger if exists check_completion_achievements_ins on public.task_completions;
create trigger check_completion_achievements_ins
  after insert on public.task_completions
  for each row execute function public.check_completion_achievements();

-- ── 2) Social — likes ──────────────────────────────────────────────────────
create or replace function public.check_likes_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_likes_received integer;
  v_likes_given integer;
begin
  -- Recipient = autor del post.
  select user_id into v_recipient from public.posts where id = new.post_id;

  -- helpful: 50 likes dados por liker.
  select count(*) into v_likes_given from public.likes where user_id = new.user_id;
  if v_likes_given = 50 then
    perform public.unlock_achievement(new.user_id, 'helpful');
  end if;

  -- first_like: el recipient (≠ liker) recibe su primer like total.
  if v_recipient is not null and v_recipient <> new.user_id then
    select count(*) into v_likes_received
      from public.likes l
      join public.posts p on p.id = l.post_id
     where p.user_id = v_recipient
       and l.user_id <> v_recipient;
    if v_likes_received = 1 then
      perform public.unlock_achievement(v_recipient, 'first_like');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists check_likes_achievements_ins on public.likes;
create trigger check_likes_achievements_ins
  after insert on public.likes
  for each row execute function public.check_likes_achievements();

-- ── 3) Social — comments ───────────────────────────────────────────────────
create or replace function public.check_comments_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_comments_received integer;
begin
  select user_id into v_recipient from public.posts where id = new.post_id;
  if v_recipient is null or v_recipient = new.user_id then
    return new;
  end if;

  select count(*) into v_comments_received
    from public.comments c
    join public.posts p on p.id = c.post_id
   where p.user_id = v_recipient
     and c.user_id <> v_recipient;
  if v_comments_received = 1 then
    perform public.unlock_achievement(v_recipient, 'first_comment_received');
  end if;

  return new;
end;
$$;

drop trigger if exists check_comments_achievements_ins on public.comments;
create trigger check_comments_achievements_ins
  after insert on public.comments
  for each row execute function public.check_comments_achievements();

-- ── 4) Social — follows accepted ───────────────────────────────────────────
create or replace function public.check_follows_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_followers integer;
begin
  if new.status <> 'accepted' then
    return new;
  end if;
  if (tg_op = 'UPDATE' and old.status = 'accepted') then
    return new;
  end if;

  select count(*) into v_followers
    from public.follows
   where followed_id = new.followed_id and status = 'accepted';
  if v_followers = 10 then
    perform public.unlock_achievement(new.followed_id, 'ten_followers');
  end if;

  return new;
end;
$$;

drop trigger if exists check_follows_achievements_ins on public.follows;
drop trigger if exists check_follows_achievements_upd on public.follows;
create trigger check_follows_achievements_ins
  after insert on public.follows
  for each row execute function public.check_follows_achievements();
create trigger check_follows_achievements_upd
  after update of status on public.follows
  for each row execute function public.check_follows_achievements();

-- ── 5) Social — first_post (al crear post) ─────────────────────────────────
create or replace function public.check_post_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  select count(*) into v_total from public.posts where user_id = new.user_id;
  if v_total = 1 then
    perform public.unlock_achievement(new.user_id, 'first_post');
  end if;
  return new;
end;
$$;

drop trigger if exists check_post_achievements_ins on public.posts;
create trigger check_post_achievements_ins
  after insert on public.posts
  for each row execute function public.check_post_achievements();

-- ── 6) Group — first_group y group_owner ───────────────────────────────────
create or replace function public.check_group_member_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  select count(*) into v_total from public.group_members where user_id = new.user_id;
  if v_total = 1 then
    perform public.unlock_achievement(new.user_id, 'first_group');
  end if;
  return new;
end;
$$;

drop trigger if exists check_group_member_achievements_ins on public.group_members;
create trigger check_group_member_achievements_ins
  after insert on public.group_members
  for each row execute function public.check_group_member_achievements();

create or replace function public.check_group_owner_achievement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  select count(*) into v_total from public.groups where owner_id = new.owner_id;
  if v_total = 1 then
    perform public.unlock_achievement(new.owner_id, 'group_owner');
  end if;
  return new;
end;
$$;

drop trigger if exists check_group_owner_achievement_ins on public.groups;
create trigger check_group_owner_achievement_ins
  after insert on public.groups
  for each row execute function public.check_group_owner_achievement();

-- ── 7) Points threshold ────────────────────────────────────────────────────
create or replace function public.check_points_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.total_points <  100   and new.total_points >=   100 then
    perform public.unlock_achievement(new.id, 'hundred_points');
  end if;
  if old.total_points <  1000  and new.total_points >=  1000 then
    perform public.unlock_achievement(new.id, 'thousand_points');
  end if;
  if old.total_points <  10000 and new.total_points >= 10000 then
    perform public.unlock_achievement(new.id, 'ten_thousand_points');
  end if;
  return new;
end;
$$;

drop trigger if exists check_points_achievements_upd on public.profiles;
create trigger check_points_achievements_upd
  after update of total_points on public.profiles
  for each row execute function public.check_points_achievements();
