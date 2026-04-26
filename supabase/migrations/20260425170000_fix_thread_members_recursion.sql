-- BeProud · Bugfix Fase 6 — recursión infinita en RLS de thread_members.
-- La policy original consultaba thread_members dentro de su propio USING, lo
-- que generaba recursión cuando otra policy (messages, message-media, threads)
-- evaluaba un EXISTS sobre thread_members.
--
-- Solución: función helper SECURITY DEFINER que bypassa la RLS al chequear
-- la membresía, y reescribir las 6 policies afectadas para usarla.

create or replace function public.is_thread_member(p_thread_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.thread_members
     where thread_id = p_thread_id
       and user_id = auth.uid()
  );
$$;

grant execute on function public.is_thread_member(uuid) to authenticated;

-- ── threads ────────────────────────────────────────────────────────────────
drop policy if exists "threads: select members" on public.threads;
create policy "threads: select members"
  on public.threads for select to authenticated
  using (public.is_thread_member(threads.id));

-- ── thread_members ─────────────────────────────────────────────────────────
-- La rama `auth.uid() = user_id` cubre "ver mi propia fila" sin invocar la
-- función; la rama is_thread_member cubre "ver al cohabitante".
drop policy if exists "thread_members: select cohabitants" on public.thread_members;
create policy "thread_members: select cohabitants"
  on public.thread_members for select to authenticated
  using (
    auth.uid() = user_id
    or public.is_thread_member(thread_members.thread_id)
  );

-- ── messages ───────────────────────────────────────────────────────────────
drop policy if exists "messages: select members" on public.messages;
create policy "messages: select members"
  on public.messages for select to authenticated
  using (public.is_thread_member(messages.thread_id));

drop policy if exists "messages: insert member" on public.messages;
create policy "messages: insert member"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and public.is_thread_member(messages.thread_id)
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

-- ── storage: message-media (select/insert) ─────────────────────────────────
-- Las policies update/delete consultan public.messages (que ya queda saneado
-- arriba al usar is_thread_member en su select); no necesitan reescritura.
drop policy if exists "message-media: select member" on storage.objects;
create policy "message-media: select member"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-media'
    and public.is_thread_member( ((storage.foldername(name))[1])::uuid )
  );

drop policy if exists "message-media: insert member" on storage.objects;
create policy "message-media: insert member"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-media'
    and public.is_thread_member( ((storage.foldername(name))[1])::uuid )
  );
