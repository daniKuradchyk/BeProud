// Espejo cliente de la RPC compute_nutrition_targets para mostrar previews
// en UI sin ida y vuelta a BBDD. La RPC sigue siendo la fuente de verdad
// al persistir.

import type { BiologicalSex, PrimaryGoal } from '@beproud/validation';
import {
  ageFromBirthDate,
  calculateBmr,
  calculateTdee,
  targetCalories,
} from '@/lib/calorieCalcs';

export type ComputeInput = {
  weight_kg: number;
  height_cm: number;
  birth_date: string;
  biological_sex: BiologicalSex;
  weekly_days?: number | null;
  daily_minutes?: number | null;
  primary_goal?: PrimaryGoal | null;
};

export type ComputedTargets = {
  bmr: number;
  tdee: number;
  daily_kcal: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
};

export function computeTargets(i: ComputeInput): ComputedTargets | null {
  const age = ageFromBirthDate(i.birth_date);
  if (age == null) return null;

  const bmr = calculateBmr(i.weight_kg, i.height_cm, age, i.biological_sex);
  if (bmr == null) return null;

  const tdee = calculateTdee(bmr, i.weekly_days ?? null, i.daily_minutes ?? null);
  if (tdee == null) return null;

  const kcal = targetCalories(tdee, i.primary_goal ?? null);
  if (kcal == null) return null;

  const proteinPerKg =
    i.primary_goal === 'gain_muscle' || i.primary_goal === 'performance' ? 1.8
    : i.primary_goal === 'lose_weight' ? 1.6
    : 1.2;

  const proteinRaw = proteinPerKg * i.weight_kg;
  const fatRaw     = (kcal * 0.25) / 9;
  const carbsRaw   = (kcal - proteinRaw * 4 - fatRaw * 9) / 4;

  return {
    bmr,
    tdee,
    daily_kcal:      Math.max(1000, Math.round(kcal)),
    daily_protein_g: Math.max(30,   Math.round(proteinRaw)),
    daily_fat_g:     Math.max(20,   Math.round(fatRaw)),
    daily_carbs_g:   Math.max(50,   Math.round(carbsRaw)),
  };
}
