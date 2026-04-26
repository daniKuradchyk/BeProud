-- BeProud · Fase 11A — TDEE = BMR * factor_actividad.
-- Factor base por weekly_days; +1 nivel si daily_minutes > 90 (cap 1.9).

create or replace function public.calculate_tdee(
  bmr           integer,
  weekly_days   integer,
  daily_minutes integer
) returns integer
language sql
immutable
set search_path = public
as $$
  with base as (
    select case
      when bmr is null then null
      when weekly_days is null or weekly_days <= 1 then 1.2
      when weekly_days between 2 and 3 then 1.375
      when weekly_days between 4 and 5 then 1.55
      else 1.725
    end as f
  ),
  adj as (
    select case
      when f is null then null
      when daily_minutes is not null and daily_minutes > 90 then least(f + 0.175, 1.9)
      else f
    end as factor
    from base
  )
  select case when factor is null then null else round(bmr * factor)::int end
    from adj;
$$;

revoke all on function public.calculate_tdee(integer, integer, integer) from public;
grant execute on function public.calculate_tdee(integer, integer, integer) to authenticated, anon;
