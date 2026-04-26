-- BeProud · Fase 8 — fix: triggers con >= en vez de = para tolerar
-- bulk INSERT (donde AFTER ROW ve la cuenta final). unlock_achievement es
-- idempotente, así que llamar cuando count>=N es seguro.

create or replace function public.check_completion_achievements()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total integer;
  v_today integer;
begin
  if new.ai_validation_status not in ('valid','skipped') then
    return new;
  end if;

  select count(*) into v_total
    from public.task_completions
   where user_id = new.user_id
     and ai_validation_status in ('valid','skipped');

  if v_total >=   1 then perform public.unlock_achievement(new.user_id, 'first_completion');    end if;
  if v_total >=  10 then perform public.unlock_achievement(new.user_id, 'ten_completions');     end if;
  if v_total >=  50 then perform public.unlock_achievement(new.user_id, 'fifty_completions');   end if;
  if v_total >= 100 then perform public.unlock_achievement(new.user_id, 'hundred_completions'); end if;

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

create or replace function public.check_likes_achievements()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_recipient uuid;
  v_likes_received integer;
  v_likes_given integer;
begin
  select user_id into v_recipient from public.posts where id = new.post_id;

  select count(*) into v_likes_given from public.likes where user_id = new.user_id;
  if v_likes_given >= 50 then
    perform public.unlock_achievement(new.user_id, 'helpful');
  end if;

  if v_recipient is not null and v_recipient <> new.user_id then
    select count(*) into v_likes_received
      from public.likes l
      join public.posts p on p.id = l.post_id
     where p.user_id = v_recipient
       and l.user_id <> v_recipient;
    if v_likes_received >= 1 then
      perform public.unlock_achievement(v_recipient, 'first_like');
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.check_comments_achievements()
returns trigger language plpgsql security definer set search_path = public as $$
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
  if v_comments_received >= 1 then
    perform public.unlock_achievement(v_recipient, 'first_comment_received');
  end if;

  return new;
end;
$$;

create or replace function public.check_follows_achievements()
returns trigger language plpgsql security definer set search_path = public as $$
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
  if v_followers >= 10 then
    perform public.unlock_achievement(new.followed_id, 'ten_followers');
  end if;

  return new;
end;
$$;

create or replace function public.check_post_achievements()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total integer;
begin
  select count(*) into v_total from public.posts where user_id = new.user_id;
  if v_total >= 1 then
    perform public.unlock_achievement(new.user_id, 'first_post');
  end if;
  return new;
end;
$$;

create or replace function public.check_group_member_achievements()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total integer;
begin
  select count(*) into v_total from public.group_members where user_id = new.user_id;
  if v_total >= 1 then
    perform public.unlock_achievement(new.user_id, 'first_group');
  end if;
  return new;
end;
$$;

create or replace function public.check_group_owner_achievement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total integer;
begin
  select count(*) into v_total from public.groups where owner_id = new.owner_id;
  if v_total >= 1 then
    perform public.unlock_achievement(new.owner_id, 'group_owner');
  end if;
  return new;
end;
$$;
