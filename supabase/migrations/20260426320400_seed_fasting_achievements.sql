-- BeProud · Fase 16 — 4 logros del módulo de ayuno + trigger de evaluación.
-- Schema real de achievements: slug, title, description, icon, category, tier.
-- La columna id es int sin secuencia, así que asignamos IDs a partir de max(id).

with base as (select coalesce(max(id), 0) as start_id from public.achievements)
insert into public.achievements (id, slug, title, description, icon, category, tier)
select start_id + row_number() over (order by ord), slug, title, description, icon, category, tier
  from base, (values
    (1, 'fasting_first', 'Primer ayuno',      'Completa tu primer ayuno',                    '⏱️',  'fasting', 1),
    (2, 'fasting_week',  'Semana completa',   'Completa 7 ayunos seguidos sin romper antes', '📅', 'fasting', 2),
    (3, 'fasting_30',    'Ayunador habitual', 'Completa 30 ayunos en total',                 '🌙', 'fasting', 2),
    (4, 'fasting_100h',  'Centenario',        '100 horas acumuladas en ayuno',               '💯', 'fasting', 3)
  ) as rows(ord, slug, title, description, icon, category, tier)
on conflict (slug) do nothing;

-- Trigger: evalúa los 4 logros al insertar un fasting_log con status='completed'.
create or replace function public.evaluate_fasting_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total       int;
  v_streak      int;
  v_total_hours numeric;
begin
  if new.status <> 'completed' then return new; end if;

  select count(*) into v_total
    from public.fasting_logs
   where user_id = new.user_id and status = 'completed';

  if v_total = 1  then perform public.unlock_achievement(new.user_id, 'fasting_first'); end if;
  if v_total = 30 then perform public.unlock_achievement(new.user_id, 'fasting_30');    end if;

  -- Racha: 7 ayunos consecutivos completados.
  with ordered as (
    select status, row_number() over (order by started_at desc) as rn
      from public.fasting_logs
     where user_id = new.user_id
     order by started_at desc
     limit 7
  )
  select count(*) filter (where status = 'completed') into v_streak from ordered;
  if v_streak = 7 then perform public.unlock_achievement(new.user_id, 'fasting_week'); end if;

  -- Total acumulado de horas en ayunos completados.
  select sum(actual_duration_min) / 60.0 into v_total_hours
    from public.fasting_logs
   where user_id = new.user_id and status = 'completed';
  if coalesce(v_total_hours, 0) >= 100 then
    perform public.unlock_achievement(new.user_id, 'fasting_100h');
  end if;

  return new;
end $$;

drop trigger if exists trg_evaluate_fasting_achievements on public.fasting_logs;
create trigger trg_evaluate_fasting_achievements
  after insert on public.fasting_logs
  for each row execute function public.evaluate_fasting_achievements();
