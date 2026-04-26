-- BeProud · Bugfix Fase 5 — FKs redundantes follows.{follower_id,followed_id}
-- → profiles(id) para que PostgREST pueda inferir los embeds
-- `follower:profiles(...)` y `followed:profiles(...)` en los list fetchers.
-- Las FKs originales a auth.users(id) se mantienen; profiles.id == auth.users.id
-- por construcción, así que ambas FKs son consistentes.

alter table public.follows
  drop constraint if exists follows_follower_id_profiles_fkey;
alter table public.follows
  add constraint follows_follower_id_profiles_fkey
  foreign key (follower_id) references public.profiles(id) on delete cascade;

alter table public.follows
  drop constraint if exists follows_followed_id_profiles_fkey;
alter table public.follows
  add constraint follows_followed_id_profiles_fkey
  foreign key (followed_id) references public.profiles(id) on delete cascade;
