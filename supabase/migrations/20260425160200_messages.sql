-- BeProud · Fase 6 — messages + RLS por membresía. Insert exige también
-- que NO haya block bidireccional con ningún otro miembro del thread.

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.threads(id) on delete cascade,
  sender_id  uuid not null references auth.users(id) on delete cascade,
  content    text check (content is null or char_length(content) <= 2000),
  media_url  text,
  created_at timestamptz not null default now(),
  check (content is not null or media_url is not null)
);

-- FK redundante a profiles para el embed `sender:profiles(...)` futuro.
alter table public.messages
  drop constraint if exists messages_sender_id_profiles_fkey;
alter table public.messages
  add constraint messages_sender_id_profiles_fkey
  foreign key (sender_id) references public.profiles(id) on delete cascade;

create index if not exists idx_messages_thread_created
  on public.messages (thread_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "messages: select members" on public.messages;
drop policy if exists "messages: insert member"  on public.messages;
drop policy if exists "messages: update sender"  on public.messages;
drop policy if exists "messages: delete sender"  on public.messages;

create policy "messages: select members"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.thread_members tm
      where tm.thread_id = messages.thread_id
        and tm.user_id = auth.uid()
    )
  );

-- Insert: soy el sender, soy miembro del thread, y no hay block bidireccional
-- con ningún otro miembro del thread.
create policy "messages: insert member"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.thread_members tm
      where tm.thread_id = messages.thread_id
        and tm.user_id = auth.uid()
    )
    and not exists (
      select 1
        from public.thread_members tm
        join public.blocks b
          on (b.blocker_id = auth.uid() and b.blocked_id = tm.user_id)
          or (b.blocker_id = tm.user_id and b.blocked_id = auth.uid())
       where tm.thread_id = messages.thread_id
         and tm.user_id <> auth.uid()
    )
  );

create policy "messages: update sender"
  on public.messages for update to authenticated
  using (auth.uid() = sender_id) with check (auth.uid() = sender_id);

create policy "messages: delete sender"
  on public.messages for delete to authenticated
  using (auth.uid() = sender_id);
