// Espejo cliente de las funciones SQL calculate_bmr / calculate_tdee /
// target_calories. Las usamos en step-9-review para mostrar el cálculo
// en vivo sin ir al servidor.

import type { BiologicalSex, PrimaryGoal } from '@beproud/validation';

export function ageFromBirthDate(birthDateIso: string | null | undefined): number | null {
  if (!birthDateIso) return null;
  const d = new Date(birthDateIso + 'T00:00:00.000Z');
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

export function calculateBmr(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
  age: number | null | undefined,
  sex: BiologicalSex | null | undefined,
): number | null {
  if (
    weightKg == null || heightCm == null || age == null || sex == null
  ) return null;
  if (sex === 'male') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  }
  if (sex === 'female') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
  const m = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const f = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  return Math.round((m + f) / 2);
}

export function calculateTdee(
  bmr: number | null,
  weeklyDays: number | null | undefined,
  dailyMinutes: number | null | undefined,
): number | null {
  if (bmr == null) return null;
  let factor: number;
  if (weeklyDays == null || weeklyDays <= 1) factor = 1.2;
  else if (weeklyDays <= 3) factor = 1.375;
  else if (weeklyDays <= 5) factor = 1.55;
  else factor = 1.725;
  if (dailyMinutes != null && dailyMinutes > 90) {
    factor = Math.min(factor + 0.175, 1.9);
  }
  return Math.round(bmr * factor);
}

export function targetCalories(
  tdee: number | null,
  primaryGoal: PrimaryGoal | null | undefined,
): number | null {
  if (tdee == null) return null;
  let adj = tdee;
  switch (primaryGoal) {
    case 'lose_weight':    adj = tdee - 400; break;
    case 'gain_muscle':    adj = tdee + 300; break;
    case 'performance':    adj = tdee + 200; break;
    case 'maintain':
    case 'general_health':
    default:               adj = tdee; break;
  }
  return Math.max(1200, adj);
}
