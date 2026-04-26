-- BeProud · Fase 7 — find_group_by_code: devuelve metadata pública mínima
-- de un grupo a partir de su código. NO requiere ser miembro (security
-- definer). Sirve para la pantalla de preview de invitación.

create or replace function public.find_group_by_code(p_code text)
returns table (
  id              uuid,
  name            text,
  description     text,
  cover_url       text,
  is_private      boolean,
  member_count    integer,
  owner_username  text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    g.id,
    g.name,
    g.description,
    g.cover_url,
    g.is_private,
    (select count(*) from public.group_members gm where gm.group_id = g.id)::integer as member_count,
    pr.username::text as owner_username
  from public.groups g
  join public.profiles pr on pr.id = g.owner_id
  where lower(g.invite_code) = lower(p_code)
  limit 1;
$$;

grant execute on function public.find_group_by_code(text) to authenticated;
