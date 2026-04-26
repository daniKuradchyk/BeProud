-- BeProud · Fase 10 — borrado de cuenta GDPR: anonimiza y marca para purga.
-- El usuario sigue existiendo en auth.users; purge_deleted_accounts borra
-- físicamente tras 30 días.

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No hay sesión.' using errcode = '42501';
  end if;

  -- Anonimiza el profile.
  update public.profiles
     set username      = ('deleted_' || substr(replace(v_uid::text,'-',''),1,8))::citext,
         display_name  = 'Cuenta eliminada',
         avatar_url    = null,
         bio           = null,
         is_private    = true,
         deleted_at    = now(),
         updated_at    = now()
   where id = v_uid;

  -- Limpieza inmediata de relaciones iniciadas por el user.
  delete from public.push_tokens where user_id     = v_uid;
  delete from public.follows     where follower_id = v_uid;
  delete from public.blocks      where blocker_id  = v_uid;
end;
$$;

revoke all on function public.delete_user_account() from public, anon;
grant execute on function public.delete_user_account() to authenticated;
