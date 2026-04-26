import type { MealType } from '@beproud/validation';

export function formatKcal(n: number): string {
  return `${Math.round(n)} kcal`;
}

export function formatGrams(n: number, decimals = 0): string {
  return `${decimals > 0 ? n.toFixed(decimals) : Math.round(n)} g`;
}

/** Porcentaje 0..1 con clamp para no superar 1 en los anillos visuales. */
export function ringPct(consumed: number, target: number): number {
  if (!target || target <= 0) return 0;
  const r = consumed / target;
  if (!Number.isFinite(r) || r < 0) return 0;
  return Math.min(r, 1);
}

/** Mapeo del nombre de tarea al meal type. Usa slug si está disponible. */
export function slugToMealType(slug: string | null | undefined): MealType | null {
  switch (slug) {
    case 'healthy_breakfast': return 'breakfast';
    case 'healthy_lunch':     return 'lunch';
    case 'healthy_snack':     return 'snack';
    case 'healthy_dinner':    return 'dinner';
    default: return null;
  }
}

/** Fallback por nombre cuando no hay slug. */
export function nameToMealType(name: string): MealType | null {
  const n = name.toLowerCase();
  if (n.includes('desayuno')) return 'breakfast';
  if (n.includes('almuerzo') || n.includes('comida')) return 'lunch';
  if (n.includes('merienda')) return 'snack';
  if (n.includes('cena')) return 'dinner';
  return null;
}
