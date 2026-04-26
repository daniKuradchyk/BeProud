-- BeProud · Bugfix Fase 4 — policy adicional de SELECT en storage.objects
-- para que cualquier authenticated pueda firmar URLs de fotos cuya
-- task_completion tenga ya un post asociado (es decir, is_public=true).
-- La policy "task-photos: select own" sigue vigente para fotos privadas.

drop policy if exists "task-photos: select public post" on storage.objects;

create policy "task-photos: select public post"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'task-photos'
    and exists (
      select 1
        from public.posts p
        join public.task_completions tc on tc.id = p.completion_id
       where tc.photo_path = storage.objects.name
    )
  );
