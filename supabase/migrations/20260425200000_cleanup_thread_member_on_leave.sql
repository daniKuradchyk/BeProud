-- BeProud · Bugfix Fase 7 — sincroniza thread_members al salir/ser expulsado
-- de un grupo. Sin este trigger quedaba estado zombie: usuario fuera de
-- group_members pero seguía siendo thread_member del chat del grupo.
--
-- A) Trigger AFTER DELETE on group_members → borra el thread_member del
--    thread asociado al grupo.
-- B) Cleanup retroactivo de zombies existentes.

-- ── A) trigger ─────────────────────────────────────────────────────────────
create or replace function public.cleanup_thread_member_on_leave()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_thread_id uuid;
begin
  select id into v_thread_id
    from public.threads
   where group_id = old.group_id
     and type = 'group'
   limit 1;
  if v_thread_id is not null then
    delete from public.thread_members
     where thread_id = v_thread_id
       and user_id   = old.user_id;
  end if;
  return old;
end;
$$;

drop trigger if exists group_members_cleanup_thread on public.group_members;
create trigger group_members_cleanup_thread
  after delete on public.group_members
  for each row execute function public.cleanup_thread_member_on_leave();

-- ── B) cleanup retroactivo ─────────────────────────────────────────────────
-- Borra thread_members huérfanos (thread de grupo cuyo user_id ya no está
-- en group_members del grupo correspondiente).
delete from public.thread_members tm
 using public.threads t
 where tm.thread_id = t.id
   and t.type = 'group'
   and not exists (
     select 1 from public.group_members gm
      where gm.group_id = t.group_id
        and gm.user_id  = tm.user_id
   );
