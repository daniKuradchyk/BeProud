-- BeProud · Fase 6 — trigger que mantiene threads.last_message_at al insertar
-- un message. Se ejecuta con security definer porque actualiza un thread del
-- que el usuario es miembro pero no tiene UPDATE policy.

create or replace function public.bump_thread_last_message_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.threads
     set last_message_at = new.created_at
   where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists messages_bump_thread_last on public.messages;
create trigger messages_bump_thread_last
  after insert on public.messages
  for each row execute function public.bump_thread_last_message_at();
