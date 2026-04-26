-- BeProud · Fase 4 — tabla blocks (uno-a-uno, simétrico para feed visibility).

create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists idx_blocks_blocked on public.blocks (blocked_id);

alter table public.blocks enable row level security;

drop policy if exists "blocks: select own"  on public.blocks;
drop policy if exists "blocks: insert own"  on public.blocks;
drop policy if exists "blocks: delete own"  on public.blocks;

create policy "blocks: select own"
  on public.blocks for select to authenticated
  using (blocker_id = auth.uid());

create policy "blocks: insert own"
  on public.blocks for insert to authenticated
  with check (blocker_id = auth.uid());

create policy "blocks: delete own"
  on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());
