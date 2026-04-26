-- BeProud · Fase 6 — thread_members con RLS por membresía + FK redundante
-- a profiles para que PostgREST pueda inferir el embed `member:profiles(...)`.

create table if not exists public.thread_members (
  thread_id    uuid not null references public.threads(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  joined_at    timestamptz not null default now(),
  primary key (thread_id, user_id)
);

-- FK redundante a profiles para los embeds desde PostgREST.
alter table public.thread_members
  drop constraint if exists thread_members_user_id_profiles_fkey;
alter table public.thread_members
  add constraint thread_members_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

create index if not exists idx_thread_members_user
  on public.thread_members (user_id);

alter table public.thread_members enable row level security;

drop policy if exists "thread_members: select cohabitants" on public.thread_members;
drop policy if exists "thread_members: update self"       on public.thread_members;

-- Veo mis membresías + las membresías de los threads donde participo
-- (necesario para listar al "otro" miembro de un DM).
create policy "thread_members: select cohabitants"
  on public.thread_members for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.thread_members tm
      where tm.thread_id = thread_members.thread_id
        and tm.user_id = auth.uid()
    )
  );

-- El propio usuario puede actualizar su last_read_at (la RPC mark_thread_read
-- también lo hace por seguridad).
create policy "thread_members: update self"
  on public.thread_members for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
