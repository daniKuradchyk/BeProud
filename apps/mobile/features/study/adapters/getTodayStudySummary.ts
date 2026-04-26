import {
  fetchActiveStudySession,
  fetchTodayStudyStats,
} from '@beproud/api';
import type { ModuleSummary } from '@/lib/modules';

/**
 * Resumen del módulo Estudio para el carrusel de Rutina.
 * Si el user tiene sesión en curso, prioriza "Reanudar". Si no, muestra
 * minutos hechos hoy.
 */
export async function getTodayStudySummary(): Promise<ModuleSummary | null> {
  const [active, stats] = await Promise.all([
    fetchActiveStudySession(),
    fetchTodayStudyStats(),
  ]);

  if (active) {
    return {
      id: 'study',
      icon: '📚',
      title: 'Sesión en curso',
      subtitle: `Pomodoro ${active.cycles_completed}/${active.cycles_planned}`,
      badge: 'Reanudar',
      route: `/study/session/${active.id}`,
      enabled: true,
    };
  }

  return {
    id: 'study',
    icon: '📚',
    title: 'Estudio',
    subtitle: stats.minutesToday > 0
      ? `${stats.minutesToday}' hoy`
      : 'Sin sesiones hoy',
    route: '/study/start',
    enabled: true,
  };
}
