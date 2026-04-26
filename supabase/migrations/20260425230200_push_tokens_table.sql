-- BeProud · Fase 10 — push_tokens del cliente Expo Push.

create table if not exists public.push_tokens (
  user_id    uuid not null references auth.users(id) on delete cascade,
  token      text not null,
  platform   text not null check (platform in ('ios','android','web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

create index if not exists push_tokens_user_idx  on public.push_tokens (user_id);
create index if not exists push_tokens_token_idx on public.push_tokens (token);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens: own select" on public.push_tokens;
drop policy if exists "push_tokens: own insert" on public.push_tokens;
drop policy if exists "push_tokens: own update" on public.push_tokens;
drop policy if exists "push_tokens: own delete" on public.push_tokens;

create policy "push_tokens: own select" on public.push_tokens for select to authenticated using (auth.uid() = user_id);
create policy "push_tokens: own insert" on public.push_tokens for insert to authenticated with check (auth.uid() = user_id);
create policy "push_tokens: own update" on public.push_tokens for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_tokens: own delete" on public.push_tokens for delete to authenticated using (auth.uid() = user_id);
