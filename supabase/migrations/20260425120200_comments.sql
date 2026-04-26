-- BeProud · Fase 4 — tabla comments (1 nivel de anidación) + trigger
-- comments_count_sync. Decisión: el contador del post solo cuenta
-- comentarios top-level (parent_id is null), para que represente
-- "conversaciones" y no líneas individuales.

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  parent_id  uuid references public.comments(id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_post_created
  on public.comments (post_id, created_at);

create index if not exists idx_comments_parent
  on public.comments (parent_id);

alter table public.comments enable row level security;

drop policy if exists "comments: select all"  on public.comments;
drop policy if exists "comments: insert own"  on public.comments;
drop policy if exists "comments: update own"  on public.comments;
drop policy if exists "comments: delete own"  on public.comments;

create policy "comments: select all"
  on public.comments for select to authenticated using (true);

create policy "comments: insert own"
  on public.comments for insert to authenticated
  with check (auth.uid() = user_id);

create policy "comments: update own"
  on public.comments for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "comments: delete own"
  on public.comments for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.comments_count_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.parent_id is null then
      update public.posts
         set comments_count = comments_count + 1
       where id = new.post_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.parent_id is null then
      update public.posts
         set comments_count = greatest(0, comments_count - 1)
       where id = old.post_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_count_sync_ins on public.comments;
drop trigger if exists comments_count_sync_del on public.comments;

create trigger comments_count_sync_ins
  after insert on public.comments
  for each row execute function public.comments_count_sync();

create trigger comments_count_sync_del
  after delete on public.comments
  for each row execute function public.comments_count_sync();
