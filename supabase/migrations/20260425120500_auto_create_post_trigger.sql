-- BeProud · Fase 4 — trigger que crea/borra posts según task_completions.is_public.

create or replace function public.auto_create_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.is_public then
      insert into public.posts (completion_id, user_id, caption)
      values (new.id, new.user_id, null)
      on conflict (completion_id) do nothing;
    end if;
    return new;

  elsif tg_op = 'UPDATE' then
    -- privado → público: aparece en el feed.
    if new.is_public and not old.is_public then
      insert into public.posts (completion_id, user_id, caption)
      values (new.id, new.user_id, null)
      on conflict (completion_id) do nothing;
    -- público → privado: desaparece del feed (cascada borra likes/comments).
    elsif old.is_public and not new.is_public then
      delete from public.posts where completion_id = new.id;
    end if;
    return new;
  end if;

  return null;
end;
$$;

drop trigger if exists task_completions_auto_post_ins on public.task_completions;
drop trigger if exists task_completions_auto_post_upd on public.task_completions;

create trigger task_completions_auto_post_ins
  after insert on public.task_completions
  for each row execute function public.auto_create_post();

create trigger task_completions_auto_post_upd
  after update of is_public on public.task_completions
  for each row execute function public.auto_create_post();
