-- BeProud · Fase 6 — bucket privado message-media para imágenes adjuntas.
-- Path canónico: {thread_id}/{uuid}.{ext}.
-- Las policies cruzan storage.objects con thread_members y messages.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-media',
  'message-media',
  false,
  10485760, -- 10 MB
  array['image/webp','image/jpeg','image/png']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "message-media: select member" on storage.objects;
drop policy if exists "message-media: insert member" on storage.objects;
drop policy if exists "message-media: update sender" on storage.objects;
drop policy if exists "message-media: delete sender" on storage.objects;

-- Selecciono si soy miembro del thread cuyo id es la primera carpeta del path.
create policy "message-media: select member"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1 from public.thread_members tm
      where tm.user_id = auth.uid()
        and tm.thread_id::text = (storage.foldername(name))[1]
    )
  );

create policy "message-media: insert member"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-media'
    and exists (
      select 1 from public.thread_members tm
      where tm.user_id = auth.uid()
        and tm.thread_id::text = (storage.foldername(name))[1]
    )
  );

-- Update/delete: solo el sender del mensaje cuyo media_url == name.
create policy "message-media: update sender"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1 from public.messages m
      where m.media_url = storage.objects.name
        and m.sender_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'message-media'
    and exists (
      select 1 from public.messages m
      where m.media_url = storage.objects.name
        and m.sender_id = auth.uid()
    )
  );

create policy "message-media: delete sender"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1 from public.messages m
      where m.media_url = storage.objects.name
        and m.sender_id = auth.uid()
    )
  );
