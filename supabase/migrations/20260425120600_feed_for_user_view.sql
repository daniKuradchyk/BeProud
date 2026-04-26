-- BeProud · Fase 4 — vista feed_for_user con security_invoker.
-- Aplica RLS de las tablas base + filtro adicional por bloqueos bidireccionales.
-- Si A bloquea a B, ninguno verá los posts del otro.

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
where (pr.is_private = false or p.user_id = auth.uid())
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = p.user_id)
       or (b.blocker_id = p.user_id  and b.blocked_id = auth.uid())
  );

grant select on public.feed_for_user to authenticated;
