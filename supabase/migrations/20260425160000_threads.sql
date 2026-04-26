-- BeProud · Fase 6 — tabla threads. Solo permite SELECT desde el cliente;
-- INSERT lo hace la RPC get_or_create_dm con security definer.
-- group_id queda preparada para Fase 7 (la FK a public.groups se añade allí).

create table if not exists public.threads (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('dm','group')),
  group_id        uuid,                          -- FK a public.groups en Fase 7
  last_message_at timestamptz,
  created_at      timestamptz not null default now()
);

comment on column public.threads.group_id is
  'Nullable en Fase 6. La FK a public.groups se añadirá en Fase 7.';

create index if not exists idx_threads_type_lastmsg
  on public.threads (type, last_message_at desc nulls last);

alter table public.threads enable row level security;

drop policy if exists "threads: select members" on public.threads;

-- Solo veo threads donde soy miembro. Nada de insert/update/delete desde
-- cliente: las mutaciones van por RPCs.
create policy "threads: select members"
  on public.threads for select to authenticated
  using (
    exists (
      select 1 from public.thread_members tm
      where tm.thread_id = threads.id
        and tm.user_id = auth.uid()
    )
  );
