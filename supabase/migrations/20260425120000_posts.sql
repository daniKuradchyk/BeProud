-- BeProud · Fase 4 — tabla posts: una fila por task_completion público.
-- El INSERT/DELETE se automatiza vía trigger sobre task_completions
-- (ver migración auto_create_post_trigger).

create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  completion_id   uuid unique not null references public.task_completions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  caption         text check (caption is null or char_length(caption) <= 500),
  likes_count     integer not null default 0 check (likes_count >= 0),
  comments_count  integer not null default 0 check (comments_count >= 0),
  created_at      timestamptz not null default now()
);

comment on table public.posts is
  'Post visible en el feed. Creado automáticamente desde task_completions.is_public=true.';

create index if not exists idx_posts_user_created
  on public.posts (user_id, created_at desc);

create index if not exists idx_posts_created
  on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "posts: select visible"   on public.posts;
drop policy if exists "posts: insert own"       on public.posts;
drop policy if exists "posts: update own"       on public.posts;
drop policy if exists "posts: delete own"       on public.posts;

-- Visible si autor no es privado, o si el post es propio. Los bloqueos se
-- aplican en la vista feed_for_user, no aquí, para no penalizar consultas
-- directas legítimas (p.ej. abrir un post por enlace directo).
create policy "posts: select visible"
  on public.posts for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles pr
      where pr.id = posts.user_id and pr.is_private = false
    )
  );

create policy "posts: insert own"
  on public.posts for insert to authenticated
  with check (auth.uid() = user_id);

create policy "posts: update own"
  on public.posts for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "posts: delete own"
  on public.posts for delete to authenticated
  using (auth.uid() = user_id);
