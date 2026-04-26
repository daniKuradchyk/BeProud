import { getTodayWorkoutSummary } from '@/features/gym/adapters/getTodayWorkoutSummary';
import { getTodayStudySummary } from '@/features/study/adapters/getTodayStudySummary';
import { getTodayNutritionSummary } from '@/features/nutrition/adapters/getTodayNutritionSummary';
import { getTodayFastingSummary } from '@/features/fasting/adapters/getTodayFastingSummary';

export type ModuleId = 'gym' | 'study' | 'nutrition' | 'fasting';

export type ModuleSummary = {
  id: ModuleId;
  icon: string;          // emoji
  title: string;         // ES
  subtitle: string;      // ES, corto
  badge?: string;        // ej "1/2", "60'"
  route: string;         // path para router.push
  enabled: boolean;
};

export type ModuleAdapter = {
  id: ModuleId;
  /** Resumen del día. null si no aplica hoy (no se renderiza la card). */
  getTodaySummary: () => Promise<ModuleSummary | null>;
};

/**
 * Registry de módulos. Añadir entradas aquí los hace aparecer en el
 * carrusel "Hoy" de Rutina sin tocar la pantalla. Fase 14 añadirá
 * `nutrition` cuando exista el adapter.
 */
export const MODULE_REGISTRY: ModuleAdapter[] = [
  { id: 'gym',       getTodaySummary: getTodayWorkoutSummary },
  { id: 'study',     getTodaySummary: getTodayStudySummary },
  { id: 'nutrition', getTodaySummary: getTodayNutritionSummary },
  { id: 'fasting',   getTodaySummary: getTodayFastingSummary },
];

/** Helper para fetch en paralelo + filtrar nulls. */
export async function loadTodayModules(): Promise<ModuleSummary[]> {
  const results = await Promise.all(
    MODULE_REGISTRY.map((m) =>
      m.getTodaySummary().catch((e) => {
        console.warn('[modules] adapter falló', m.id, e);
        return null;
      }),
    ),
  );
  return results.filter((r): r is ModuleSummary => r != null && r.enabled);
}
