-- BeProud · Fase 14 — RPC que calcula y upsertea nutrition_targets desde la
-- biometría del profile. Reusa calculate_bmr / calculate_tdee / target_calories
-- para mantener una sola fuente de verdad de las kcal.
--
-- Macros:
--   - Proteína por kg de peso: 1.8 (gain_muscle, performance), 1.6 (lose_weight),
--     1.2 (resto). Mínimo 30g.
--   - Grasa: 25% de las kcal. Mínimo 20g.
--   - Carbos: las kcal restantes. Mínimo 50g.
--
-- Si la fila ya existe con source='manual' y p_force=false, no pisa los
-- valores manuales pero sí refresca computed_at.

create or replace function public.compute_nutrition_targets(p_force boolean default false)
returns public.nutrition_targets
language plpgsql
security invoker
set search_path = public
as $$
declare
  p              record;
  v_age          int;
  v_bmr          int;
  v_tdee         int;
  v_kcal         numeric;
  v_protein      numeric;
  v_fat          numeric;
  v_carbs        numeric;
  v_existing     public.nutrition_targets;
  r              public.nutrition_targets;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into p from public.profiles where id = auth.uid();
  if p.id is null then
    raise exception 'no_profile';
  end if;

  if p.birth_date is null or p.height_cm is null or p.weight_kg is null
     or p.biological_sex is null then
    raise exception 'missing_biometrics';
  end if;

  v_age  := extract(year from age(p.birth_date::date))::int;
  v_bmr  := public.calculate_bmr(p.weight_kg, p.height_cm, v_age, p.biological_sex);
  v_tdee := public.calculate_tdee(v_bmr, p.weekly_days, p.daily_minutes);
  v_kcal := public.target_calories(v_tdee, p.primary_goal);

  if v_kcal is null then
    raise exception 'kcal_calc_failed';
  end if;

  v_protein := case
    when p.primary_goal in ('gain_muscle','performance') then 1.8 * p.weight_kg
    when p.primary_goal = 'lose_weight'                  then 1.6 * p.weight_kg
    else 1.2 * p.weight_kg
  end;
  v_fat   := (v_kcal * 0.25) / 9;
  v_carbs := (v_kcal - (v_protein * 4) - (v_fat * 9)) / 4;

  v_kcal    := round(greatest(v_kcal, 1000));
  v_protein := round(greatest(v_protein, 30));
  v_fat     := round(greatest(v_fat, 20));
  v_carbs   := round(greatest(v_carbs, 50));

  -- Respeto a edición manual: solo recalculamos si force=true o source='auto'.
  select * into v_existing from public.nutrition_targets where user_id = auth.uid();
  if v_existing.user_id is not null and v_existing.source = 'manual' and not p_force then
    update public.nutrition_targets
       set computed_at = now()
     where user_id = auth.uid()
     returning * into r;
    return r;
  end if;

  insert into public.nutrition_targets
    (user_id, daily_kcal, daily_protein_g, daily_carbs_g, daily_fat_g, source, computed_at)
  values
    (auth.uid(), v_kcal, v_protein, v_carbs, v_fat, 'auto', now())
  on conflict (user_id) do update set
    daily_kcal      = excluded.daily_kcal,
    daily_protein_g = excluded.daily_protein_g,
    daily_carbs_g   = excluded.daily_carbs_g,
    daily_fat_g     = excluded.daily_fat_g,
    source          = 'auto',
    computed_at     = now()
  returning * into r;

  return r;
end $$;

revoke all on function public.compute_nutrition_targets(boolean) from public;
grant execute on function public.compute_nutrition_targets(boolean) to authenticated;
