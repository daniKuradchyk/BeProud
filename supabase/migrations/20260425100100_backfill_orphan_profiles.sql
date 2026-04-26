-- BeProud · Bugfix Fase 2 — Crea profiles para usuarios huérfanos en auth.users.
-- Defensivo e idempotente: replica lo que haría handle_new_user para usuarios
-- que se registraron antes del trigger o cuyo profile fue borrado a mano.

insert into public.profiles (id, username, display_name)
select
  u.id,
  ('user_' || substr(replace(u.id::text, '-', ''), 1, 8))::citext as username,
  'Nuevo usuario' as display_name
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
