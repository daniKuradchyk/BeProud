-- BeProud · Fase 11A — calorías objetivo según primary_goal. Cap mínimo 1200.

create or replace function public.target_calories(
  tdee         integer,
  primary_goal text
) returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when tdee is null then null
    else greatest(1200, case primary_goal
      when 'lose_weight'    then tdee - 400
      when 'gain_muscle'    then tdee + 300
      when 'maintain'       then tdee
      when 'performance'    then tdee + 200
      when 'general_health' then tdee
      else tdee
    end)
  end;
$$;

revoke all on function public.target_calories(integer, text) from public;
grant execute on function public.target_calories(integer, text) to authenticated, anon;
