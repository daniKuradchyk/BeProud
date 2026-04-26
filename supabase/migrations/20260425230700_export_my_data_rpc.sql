-- BeProud · Fase 10 — export GDPR: snapshot JSON. Las fotos quedan TODO
-- para una Edge Function futura que genere un .zip.

create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
        v_out jsonb;
begin
  if v_uid is null then
    raise exception 'No hay sesión.' using errcode = '42501';
  end if;

  v_out := jsonb_build_object(
    'exported_at', now(),
    'profile', (
      select to_jsonb(p) - 'notification_prefs' || jsonb_build_object('notification_prefs', p.notification_prefs)
        from public.profiles p where p.id = v_uid
    ),
    'task_completions', (
      select coalesce(jsonb_agg(to_jsonb(tc) order by tc.created_at desc), '[]'::jsonb)
        from public.task_completions tc where tc.user_id = v_uid
    ),
    'posts', (
      select coalesce(jsonb_agg(to_jsonb(po) order by po.created_at desc), '[]'::jsonb)
        from public.posts po where po.user_id = v_uid
    ),
    'comments', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc), '[]'::jsonb)
        from public.comments c where c.user_id = v_uid
    ),
    'follows_initiated', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc), '[]'::jsonb)
        from public.follows f where f.follower_id = v_uid
    ),
    'group_memberships', (
      select coalesce(jsonb_agg(to_jsonb(gm)), '[]'::jsonb)
        from public.group_members gm where gm.user_id = v_uid
    ),
    'achievements', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'slug', a.slug, 'title', a.title, 'unlocked_at', ua.unlocked_at)
        order by ua.unlocked_at desc), '[]'::jsonb)
        from public.user_achievements ua
        join public.achievements a on a.id = ua.achievement_id
       where ua.user_id = v_uid
    ),
    'notifications_recent', (
      select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc), '[]'::jsonb)
        from (select * from public.notifications
               where user_id = v_uid
               order by created_at desc limit 200) n
    )
  );
  return v_out;
end;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
