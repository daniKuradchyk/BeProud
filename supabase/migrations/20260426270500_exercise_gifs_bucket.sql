-- BeProud · Fase 13 — bucket público para GIFs de ejercicios.
insert into storage.buckets (id, name, public)
values ('exercise-gifs', 'exercise-gifs', true)
on conflict (id) do nothing;

drop policy if exists "exercise_gifs_public_read" on storage.objects;
create policy "exercise_gifs_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'exercise-gifs');
-- Sin INSERT/UPDATE/DELETE policies → solo service_role.
