-- BeProud · Fase 15 fix — start_study_session cierra cualquier sesión
-- in_progress anterior del mismo user para garantizar que solo haya una activa.
-- Esto evita que el carrusel de Rutina muestre como "Reanudar" una sesión
-- vieja cuyo deriveInitialPhase salta directamente a 'break' (cuando ha
-- pasado más tiempo que la primera fase de focus).

create or replace function public.start_study_session(
  p_technique        text,
  p_focus_minutes    int,
  p_break_minutes    int,
  p_cycles_planned   int,
  p_routine_task_id  uuid default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id      uuid;
  v_planned int := p_focus_minutes * p_cycles_planned;
  v_user    uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  update public.study_sessions
     set status   = 'abandoned',
         ended_at = now()
   where user_id = v_user
     and status  = 'in_progress';

  insert into public.study_sessions
    (user_id, routine_task_id, technique, planned_minutes,
     focus_minutes, break_minutes, cycles_planned)
  values
    (v_user, p_routine_task_id, p_technique, v_planned,
     p_focus_minutes, p_break_minutes, p_cycles_planned)
  returning id into v_id;
  return v_id;
end $$;
