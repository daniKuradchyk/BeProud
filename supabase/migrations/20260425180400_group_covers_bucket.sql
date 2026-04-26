-- BeProud · Fase 7 — bucket público group-covers. Path: {group_id}/cover.{ext}.
-- Solo owner/admin del grupo pueden insert/update/delete. SELECT es público
-- (bucket público).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-covers',
  'group-covers',
  true,
  5242880, -- 5 MB
  array['image/webp','image/jpeg','image/png']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "group-covers: insert mods" on storage.objects;
drop policy if exists "group-covers: update mods" on storage.objects;
drop policy if exists "group-covers: delete mods" on storage.objects;

create policy "group-covers: insert mods"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'group-covers'
    and exists (
      select 1 from public.group_members gm
      where gm.user_id = auth.uid()
        and gm.role in ('owner','admin')
        and gm.group_id::text = (storage.foldername(name))[1]
    )
  );

create policy "group-covers: update mods"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'group-covers'
    and exists (
      select 1 from public.group_members gm
      where gm.user_id = auth.uid()
        and gm.role in ('owner','admin')
        and gm.group_id::text = (storage.foldername(name))[1]
    )
  )
  with check (
    bucket_id = 'group-covers'
    and exists (
      select 1 from public.group_members gm
      where gm.user_id = auth.uid()
        and gm.role in ('owner','admin')
        and gm.group_id::text = (storage.foldername(name))[1]
    )
  );

create policy "group-covers: delete mods"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'group-covers'
    and exists (
      select 1 from public.group_members gm
      where gm.user_id = auth.uid()
        and gm.role in ('owner','admin')
        and gm.group_id::text = (storage.foldername(name))[1]
    )
  );
