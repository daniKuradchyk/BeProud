import { fetchMyGymRoutine, todayLocalDayIndex } from '@beproud/api';
import type { ModuleSummary } from '@/lib/modules';

/**
 * Lectura del módulo Gym (Fase 13). NO modifica nada del módulo gym.
 * Devuelve null si:
 *  - el user no tiene gym_routine activa, o
 *  - hoy no es día de entreno.
 */
export async function getTodayWorkoutSummary(): Promise<ModuleSummary | null> {
  const routine = await fetchMyGymRoutine();
  if (!routine) return null;
  const day = routine.days.find((d) => d.day_index === todayLocalDayIndex());
  if (!day) return null;
  return {
    id: 'gym',
    icon: '🏋️',
    title: 'Entrenamiento de hoy',
    subtitle: day.name,
    badge: `${day.exercises.length} ej`,
    route: '/gym',
    enabled: true,
  };
}
