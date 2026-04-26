-- BeProud · Fase 3 — bucket privado task-photos y policies por carpeta usuario.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-photos',
  'task-photos',
  false,
  10485760, -- 10 MB
  array['image/webp','image/jpeg','image/png']
)
on conflict (id) do update set
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types= excluded.allowed_mime_types;

drop policy if exists "task-photos: select own"  on storage.objects;
drop policy if exists "task-photos: insert own"  on storage.objects;
drop policy if exists "task-photos: update own"  on storage.objects;
drop policy if exists "task-photos: delete own"  on storage.objects;

create policy "task-photos: select own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "task-photos: insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "task-photos: update own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "task-photos: delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
