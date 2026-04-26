-- BeProud · Fase 8 — unlock_achievement helper. Idempotente.
-- No se expone a authenticated; solo se llama desde triggers/RPCs internos.

create or replace function public.unlock_achievement(p_user_id uuid, p_slug text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id integer;
  v_inserted integer;
begin
  if p_user_id is null then
    return false;
  end if;

  select id into v_id from public.achievements where slug = p_slug;
  if v_id is null then
    raise warning '[gamification] unlock_achievement: slug % no existe', p_slug;
    return false;
  end if;

  insert into public.user_achievements (user_id, achievement_id)
    values (p_user_id, v_id)
    on conflict (user_id, achievement_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted > 0;
end;
$$;

revoke all on function public.unlock_achievement(uuid, text) from public, anon, authenticated;
