-- BeProud · Fase 11A — BMR Mifflin-St Jeor.
-- NULL si falta cualquier dato.

create or replace function public.calculate_bmr(
  weight_kg numeric,
  height_cm numeric,
  age       integer,
  sex       text
) returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when weight_kg is null or height_cm is null or age is null or sex is null
      then null
    when sex = 'male' then
      round(10 * weight_kg + 6.25 * height_cm - 5 * age + 5)::int
    when sex = 'female' then
      round(10 * weight_kg + 6.25 * height_cm - 5 * age - 161)::int
    else
      round(((10 * weight_kg + 6.25 * height_cm - 5 * age + 5)
           + (10 * weight_kg + 6.25 * height_cm - 5 * age - 161)) / 2.0)::int
  end;
$$;

revoke all on function public.calculate_bmr(numeric, numeric, integer, text) from public;
grant execute on function public.calculate_bmr(numeric, numeric, integer, text) to authenticated, anon;
