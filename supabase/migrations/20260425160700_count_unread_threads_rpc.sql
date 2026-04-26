-- BeProud · Fase 6 — count_unread_threads: número de threads donde el
-- caller tiene mensajes sin leer (de otro sender) tras su last_read_at.

create or replace function public.count_unread_threads()
returns integer language sql security definer set search_path = public as $$
  select count(distinct m.thread_id)::integer
    from public.messages m
    join public.thread_members tm
      on tm.thread_id = m.thread_id
     and tm.user_id   = auth.uid()
   where m.sender_id <> auth.uid()
     and (tm.last_read_at is null or m.created_at > tm.last_read_at);
$$;

grant execute on function public.count_unread_threads() to authenticated;
