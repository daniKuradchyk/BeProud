-- BeProud · Fase 12 — coach diario determinista (sin LLM).
-- Construye saludo + mensaje de coach + hasta 3 recomendaciones + progreso
-- del día. Toda la lógica está en SQL para ser idempotente y barata.

create or replace function public.daily_recommendations(p_user_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid             uuid := auth.uid();
  v_profile         record;
  v_tz              text;
  v_now_local       timestamp;
  v_today           date;
  v_yesterday       date;
  v_hour            integer;
  v_display         text;

  v_routine_id      uuid;
  v_total_routine   integer := 0;
  v_completed_today integer := 0;
  v_points_today    integer := 0;

  v_streak          integer := 0;
  v_last_completion date;
  v_days_since      integer;
  v_had_yesterday   boolean := false;

  v_pos             record;
  v_next_league     record;
  v_pts_to_next     integer;

  v_last_like       date;
  v_last_post       date;

  v_first_pending   record;
  v_compl_pending   record;

  v_greeting        text;
  v_coach           text;
  v_recs            jsonb := '[]'::jsonb;
  v_seed            text;
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if p_user_id is null or p_user_id <> v_uid then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  -- 1) Profile + zona horaria + hora local.
  select id, display_name, coalesce(timezone, 'UTC') as timezone,
         coalesce(streak_current, 0) as streak_current
    into v_profile
    from public.profiles
   where id = v_uid;

  v_tz        := v_profile.timezone;
  v_display   := v_profile.display_name;
  v_streak    := v_profile.streak_current;
  v_now_local := (now() at time zone v_tz);
  v_today     := v_now_local::date;
  v_yesterday := v_today - 1;
  v_hour      := extract(hour from v_now_local)::int;
  v_seed      := md5(v_uid::text || v_today::text);

  -- 2) Rutina activa + count.
  select id into v_routine_id
    from public.routines
   where user_id = v_uid and is_active = true
   order by created_at desc
   limit 1;

  if v_routine_id is not null then
    select count(*) into v_total_routine
      from public.routine_tasks where routine_id = v_routine_id;
  end if;

  -- 3) Completions del día (en zona del user).
  select count(*),
         coalesce(sum(points_awarded), 0)
    into v_completed_today, v_points_today
    from public.task_completions
   where user_id = v_uid
     and ai_validation_status in ('valid','skipped')
     and (created_at at time zone v_tz)::date = v_today;

  -- 4) Última completion del user → días sin actividad.
  select max((created_at at time zone v_tz)::date)
    into v_last_completion
    from public.task_completions
   where user_id = v_uid
     and ai_validation_status in ('valid','skipped');
  v_days_since := case
    when v_last_completion is null then 9999
    else (v_today - v_last_completion)
  end;

  -- ¿Completó ayer? (para detectar "racha rota ayer").
  select exists (
    select 1 from public.task_completions
     where user_id = v_uid
       and ai_validation_status in ('valid','skipped')
       and (created_at at time zone v_tz)::date = v_yesterday
  ) into v_had_yesterday;

  -- 5) Posición global semanal + siguiente liga.
  select wl.points, wl.rank, wl.league_id
    into v_pos
    from public.weekly_leaderboards wl
   where wl.user_id = v_uid
     and wl.group_id is null
     and wl.week = date_trunc('week', current_date)::date
   limit 1;

  if v_pos.league_id is not null then
    select * into v_next_league
      from public.leagues
     where tier = (select tier + 1 from public.leagues where id = v_pos.league_id)
     limit 1;

    if v_next_league.id is not null then
      v_pts_to_next := v_next_league.min_points_week - coalesce(v_pos.points, 0);
    end if;
  end if;

  -- 6) Inactividad social.
  select max((created_at at time zone v_tz)::date)
    into v_last_like
    from public.likes where user_id = v_uid;

  select max((created_at at time zone v_tz)::date)
    into v_last_post
    from public.posts where user_id = v_uid;

  -- 7) Tareas pendientes hoy.
  if v_routine_id is not null then
    select rt.id as routine_task_id, t.slug, t.title, t.duration_min,
           t.base_points, t.subcategory
      into v_first_pending
      from public.routine_tasks rt
      join public.tasks_catalog t on t.id = rt.task_id
     where rt.routine_id = v_routine_id
       and not exists (
         select 1 from public.task_completions tc
          where tc.user_id = v_uid
            and tc.routine_task_id = rt.id
            and tc.ai_validation_status in ('valid','skipped')
            and (tc.created_at at time zone v_tz)::date = v_today
       )
     order by (t.duration_min is null), t.duration_min, t.base_points
     limit 1;

    if v_first_pending.routine_task_id is not null then
      select rt.id as routine_task_id, t.slug, t.title, t.duration_min,
             t.subcategory
        into v_compl_pending
        from public.routine_tasks rt
        join public.tasks_catalog t on t.id = rt.task_id
       where rt.routine_id = v_routine_id
         and rt.id <> v_first_pending.routine_task_id
         and coalesce(t.subcategory,'') is distinct from coalesce(v_first_pending.subcategory,'')
         and not exists (
           select 1 from public.task_completions tc
            where tc.user_id = v_uid
              and tc.routine_task_id = rt.id
              and tc.ai_validation_status in ('valid','skipped')
              and (tc.created_at at time zone v_tz)::date = v_today
         )
       order by (t.duration_min is null), t.duration_min
       limit 1;
    end if;
  end if;

  -- ─── GREETING ──────────────────────────────────────────────────────────
  v_display := coalesce(nullif(trim(v_display), ''), 'amig@');
  v_greeting := case
    when v_hour between 5 and 11  then 'Buenos días, ' || v_display
    when v_hour between 12 and 18 then 'Buenas tardes, ' || v_display
    when v_hour between 19 and 23 then 'Buenas noches, ' || v_display
    else 'Aún en pie, ' || v_display
  end;

  -- ─── COACH MESSAGE (cascada, primer match gana) ────────────────────────
  v_coach := case
    when v_streak >= 30
      then '¡Llevas ' || v_streak || ' días! Eres una máquina.'
    when v_streak >= 7 and v_completed_today = 0 and v_hour >= 18
      then 'Tu racha de ' || v_streak || ' días pende de un hilo. Cierra el día.'
    when v_streak = 0 and v_had_yesterday
      then 'Reset. Empieza una nueva racha hoy.'
    when v_total_routine > 0 and v_completed_today >= v_total_routine
      then '¡Día completo!'
    when v_total_routine > 0 and v_completed_today * 2 >= v_total_routine
      then 'Vas a buen ritmo.'
    when v_days_since >= 3 and v_days_since < 9999
      then 'Te echamos de menos. Una sola tarea hoy y vuelves al ritmo.'
    when v_hour < 10 and v_completed_today = 0
      then 'Comienza con la más fácil para arrancar el día.'
    else 'Cada tarea cuenta.'
  end;

  -- ─── RECOMMENDATIONS ───────────────────────────────────────────────────
  if v_first_pending.routine_task_id is not null then
    declare
      v_pri integer;
    begin
      v_pri := case
        when v_streak >= 1 and v_completed_today = 0 and v_hour >= 18 then 5
        when v_hour < 12 or v_completed_today = 0 then 5
        else 4
      end;

      v_recs := v_recs || jsonb_build_object(
        'type', case
          when v_streak >= 1 and v_completed_today = 0 and v_hour >= 18 then 'streak'
          else 'task'
        end,
        'priority', v_pri,
        'title', case
          when v_streak >= 1 and v_completed_today = 0 and v_hour >= 18 then 'Salva tu racha'
          else 'Empieza por aquí'
        end,
        'subtitle', case
          when v_streak >= 1 and v_completed_today = 0 and v_hour >= 18
            then 'Cierra ' || v_first_pending.title || (
              case when v_first_pending.duration_min is not null
                   then ' · ' || v_first_pending.duration_min || ' min' else '' end)
          else v_first_pending.title || (
              case when v_first_pending.duration_min is not null
                   then ' · ' || v_first_pending.duration_min || ' min' else '' end)
        end,
        'action', jsonb_build_object(
          'kind', 'complete_task',
          'params', jsonb_build_object(
            'routine_task_id', v_first_pending.routine_task_id,
            'slug', v_first_pending.slug
          )
        )
      );
    end;
  end if;

  if v_compl_pending.routine_task_id is not null then
    v_recs := v_recs || jsonb_build_object(
      'type', 'task',
      'priority', 4,
      'title', 'Mezcla con esto',
      'subtitle', v_compl_pending.title || (
        case when v_compl_pending.duration_min is not null
             then ' · ' || v_compl_pending.duration_min || ' min' else '' end),
      'action', jsonb_build_object(
        'kind','complete_task',
        'params', jsonb_build_object(
          'routine_task_id', v_compl_pending.routine_task_id,
          'slug', v_compl_pending.slug
        )
      )
    );
  end if;

  if v_pts_to_next is not null and v_pts_to_next between 1 and 100 then
    v_recs := v_recs || jsonb_build_object(
      'type', 'streak',
      'priority', 4,
      'title', 'Estás a ' || v_pts_to_next || ' pts de ' || v_next_league.name,
      'subtitle', 'Una tarea más esta semana y subes',
      'action', jsonb_build_object(
        'kind','open_screen',
        'params', jsonb_build_object('route','/(tabs)/rankings')
      )
    );
  end if;

  if v_last_like is null or (v_today - v_last_like) >= 3 then
    v_recs := v_recs || jsonb_build_object(
      'type', 'social',
      'priority', 2,
      'title', 'Mira qué hicieron tus amigos',
      'subtitle', 'Llevas días sin pasarte por el feed',
      'action', jsonb_build_object(
        'kind','open_screen',
        'params', jsonb_build_object('route','/(tabs)/feed')
      )
    );
  end if;

  if v_first_pending.routine_task_id is not null
     and (v_last_post is null or (v_today - v_last_post) >= 3) then
    v_recs := v_recs || jsonb_build_object(
      'type', 'social',
      'priority', 3,
      'title', 'Comparte tu progreso',
      'subtitle', 'Completa una tarea pública y vuelve al feed',
      'action', jsonb_build_object(
        'kind','complete_task',
        'params', jsonb_build_object(
          'routine_task_id', v_first_pending.routine_task_id,
          'slug', v_first_pending.slug
        )
      )
    );
  end if;

  if v_hour >= 22 and v_completed_today = 0 then
    v_recs := v_recs || jsonb_build_object(
      'type', 'reflect',
      'priority', 3,
      'title', 'Programa para mañana',
      'subtitle', 'Configura un recordatorio y cierra el día',
      'action', jsonb_build_object(
        'kind','open_screen',
        'params', jsonb_build_object('route','/settings/notifications')
      )
    );
  end if;

  -- Selección top 3 estable por priority desc + seed user/día.
  v_recs := (
    select coalesce(jsonb_agg(item order by (item->>'priority')::int desc, item->>'title'), '[]'::jsonb)
      from (
        select item
          from jsonb_array_elements(v_recs) as item
         order by (item->>'priority')::int desc,
                  md5(v_seed || (item->>'title'))
         limit 3
      ) ranked
  );

  return jsonb_build_object(
    'greeting',        v_greeting,
    'coach_message',   v_coach,
    'recommendations', v_recs,
    'today_progress',  jsonb_build_object(
      'completed',         v_completed_today,
      'total_in_routine',  v_total_routine,
      'points_today',      v_points_today,
      'streak_current',    v_streak
    )
  );
end;
$$;

revoke all on function public.daily_recommendations(uuid) from public, anon;
grant execute on function public.daily_recommendations(uuid) to authenticated;
