-- BeProud · Fase 5 — búsqueda de perfiles insensible a acentos.
-- Excluye al caller, bloqueos bidireccionales. Devuelve follow_status.
-- Match: prefix sobre username + substring sobre display_name. Orden:
-- prefix-match primero, luego total_points desc.

create or replace function public.search_profiles(q text)
returns table (
  id            uuid,
  username      text,
  display_name  text,
  avatar_url    text,
  is_private    boolean,
  total_points  integer,
  follow_status text
) language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_user_id uuid := auth.uid();
  v_q       text := lower(extensions.unaccent(coalesce(q, '')));
begin
  if v_q = '' then
    return;
  end if;

  return query
  select
    pr.id,
    pr.username::text       as username,
    pr.display_name         as display_name,
    pr.avatar_url           as avatar_url,
    pr.is_private           as is_private,
    pr.total_points         as total_points,
    f.status                as follow_status
  from public.profiles pr
  left join public.follows f
    on f.follower_id = v_user_id
   and f.followed_id = pr.id
  where pr.id <> coalesce(v_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = v_user_id and b.blocked_id = pr.id)
         or (b.blocker_id = pr.id and b.blocked_id = v_user_id)
    )
    and (
      lower(extensions.unaccent(pr.username::text)) like v_q || '%'
      or lower(extensions.unaccent(pr.display_name)) like '%' || v_q || '%'
    )
  order by
    case when lower(extensions.unaccent(pr.username::text)) like v_q || '%'
         then 0 else 1 end,
    pr.total_points desc
  limit 20;
end;
$$;

grant execute on function public.search_profiles(text) to authenticated;
