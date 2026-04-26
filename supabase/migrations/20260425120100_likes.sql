-- BeProud · Fase 4 — tabla likes + trigger likes_count_sync.

create table if not exists public.likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.likes enable row level security;

drop policy if exists "likes: select all"  on public.likes;
drop policy if exists "likes: insert own"  on public.likes;
drop policy if exists "likes: delete own"  on public.likes;

-- Cualquier authenticated puede ver los likes (para saber si yo ya lo di).
create policy "likes: select all"
  on public.likes for select to authenticated using (true);

create policy "likes: insert own"
  on public.likes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "likes: delete own"
  on public.likes for delete to authenticated
  using (auth.uid() = user_id);

-- Mantiene posts.likes_count consistente con +1/-1. Clamp a 0 por defensa.
create or replace function public.likes_count_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts
       set likes_count = likes_count + 1
     where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts
       set likes_count = greatest(0, likes_count - 1)
     where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists likes_count_sync_ins on public.likes;
drop trigger if exists likes_count_sync_del on public.likes;

create trigger likes_count_sync_ins
  after insert on public.likes
  for each row execute function public.likes_count_sync();

create trigger likes_count_sync_del
  after delete on public.likes
  for each row execute function public.likes_count_sync();
