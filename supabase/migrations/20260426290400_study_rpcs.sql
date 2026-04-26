-- BeProud · Fase 15 — RPCs del módulo estudio.

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
  v_id uuid;
  v_planned int := p_focus_minutes * p_cycles_planned;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  insert into public.study_sessions
    (user_id, routine_task_id, technique, planned_minutes,
     focus_minutes, break_minutes, cycles_planned)
  values
    (auth.uid(), p_routine_task_id, p_technique, v_planned,
     p_focus_minutes, p_break_minutes, p_cycles_planned)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.complete_study_cycle(p_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.study_sessions
     set cycles_completed = cycles_completed + 1
   where id = p_session_id
     and user_id = auth.uid()
     and status = 'in_progress';
end $$;

-- Si se cierra como 'completed' y está enlazada a routine_task, inserta
-- task_completions con auto_validated + 10 pts + is_public=false (no postea).
create or replace function public.finish_study_session(
  p_session_id uuid,
  p_status     text,
  p_notes      text default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_routine_task uuid;
  v_task_id      uuid;
  v_user         uuid := auth.uid();
begin
  if p_status not in ('completed','abandoned') then
    raise exception 'invalid status';
  end if;

  update public.study_sessions
     set status   = p_status,
         ended_at = now(),
         notes    = coalesce(p_notes, notes)
   where id = p_session_id
     and user_id = v_user
     and status  = 'in_progress'
   returning routine_task_id into v_routine_task;

  if v_routine_task is not null and p_status = 'completed' then
    select rt.task_id into v_task_id
      from public.routine_tasks rt
     where rt.id = v_routine_task
       and exists (
         select 1 from public.routines r
          where r.id = rt.routine_id and r.user_id = v_user
       );

    if v_task_id is not null then
      insert into public.task_completions
        (user_id, routine_task_id, task_id, photo_path, ai_validation_status,
         ai_confidence, ai_reason, points_awarded, is_public)
      values
        (v_user, v_routine_task, v_task_id, null, 'auto_validated',
         1.0, 'pomodoro_completed', 10, false)
      on conflict do nothing;
    end if;
  end if;
end $$;

revoke all on function public.start_study_session(text,int,int,int,uuid)  from public, anon;
revoke all on function public.complete_study_cycle(uuid)                  from public, anon;
revoke all on function public.finish_study_session(uuid,text,text)        from public, anon;
grant execute on function public.start_study_session(text,int,int,int,uuid)  to authenticated;
grant execute on function public.complete_study_cycle(uuid)                  to authenticated;
grant execute on function public.finish_study_session(uuid,text,text)        to authenticated;
