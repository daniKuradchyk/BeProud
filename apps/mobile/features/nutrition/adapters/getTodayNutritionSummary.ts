import { fetchTargets, fetchTodayTotals } from '@beproud/api';
import type { ModuleSummary } from '@/lib/modules';

/**
 * Resumen del módulo Nutrición para el carrusel de Rutina.
 * Si no hay targets aún, ofrece configurarlos. Si los hay, muestra
 * `kcal_consumidas / kcal_objetivo` y badge `mealsLogged/4`.
 */
export async function getTodayNutritionSummary(): Promise<ModuleSummary | null> {
  const [target, totals] = await Promise.all([
    fetchTargets(),
    fetchTodayTotals(),
  ]);

  const mealsLogged = (Object.values(totals.per_meal) as { items: number }[])
    .filter((m) => m.items > 0).length;

  return {
    id: 'nutrition',
    icon: '🥗',
    title: 'Nutrición',
    subtitle: target
      ? `${Math.round(totals.kcal)} / ${Math.round(target.daily_kcal)} kcal`
      : 'Configurar objetivos',
    badge: `${mealsLogged}/4`,
    route: '/nutrition',
    enabled: true,
  };
}
