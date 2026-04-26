-- BeProud · Bugfix Fase 4 — FK redundante comments.user_id → profiles.id
-- para que PostgREST pueda inferir el embed `author:profiles(...)` en
-- fetchPostComments y createComment. La FK existente a auth.users(id) se
-- mantiene; profiles.id == auth.users.id por construcción (handle_new_user),
-- así que ambas FKs son consistentes.

alter table public.comments
  drop constraint if exists comments_user_id_profiles_fkey;

alter table public.comments
  add constraint comments_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
