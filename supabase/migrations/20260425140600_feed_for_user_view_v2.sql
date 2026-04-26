-- BeProud · Fase 5 — feed_for_user v2.
-- Reglas (en orden de prioridad):
--   1) Si el autor es uno mismo → siempre visible.
--   2) Si hay bloqueo bidireccional → invisible.
--   3) Si autor no es privado → visible.
--   4) Si autor es privado y existe follow accepted del caller → visible.
--   5) En cualquier otro caso → invisible.
-- security_invoker = true para que las RLS de las tablas base se apliquen
-- con los permisos del caller real.

create or replace view public.feed_for_user
with (security_invoker = true)
as
select
  p.id,
  p.completion_id,
  p.user_id,
  p.caption,
  p.likes_count,
  p.comments_count,
  p.created_at,
  pr.username,
  pr.display_name,
  pr.avatar_url,
  pr.is_private,
  tc.photo_path,
  tc.points_awarded,
  c.title    as task_title,
  c.icon     as task_icon,
  c.category as task_category
from public.posts p
join public.profiles pr        on pr.id = p.user_id
join public.task_completions tc on tc.id = p.completion_id
join public.tasks_catalog c     on c.id  = tc.task_id
where (
  p.user_id = auth.uid()
  or (
    not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.user_id)
         or (b.blocker_id = p.user_id and b.blocked_id = auth.uid())
    )
    and (
      pr.is_private = false
      or exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid()
          and f.followed_id = p.user_id
          and f.status = 'accepted'
      )
    )
  )
);

grant select on public.feed_for_user to authenticated;
