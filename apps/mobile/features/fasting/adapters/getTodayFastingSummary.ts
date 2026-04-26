import { fetchMyProtocol } from '@beproud/api';
import { FASTING_PROTOCOL_SHORT } from '@beproud/validation';
import type { ModuleSummary } from '@/lib/modules';
import { computeFastingState } from '@/lib/fasting/computeState';
import { formatDuration } from '@/lib/fasting/format';

/**
 * Resumen del módulo Ayuno para el carrusel de Rutina. Devuelve null si:
 * - No hay protocolo o está deshabilitado.
 * - Es 5:2 en off-day (state.idle:5_2_off_day).
 */
export async function getTodayFastingSummary(): Promise<ModuleSummary | null> {
  const proto = await fetchMyProtocol();
  if (!proto || !proto.enabled) return null;

  const state = computeFastingState(proto);
  if (state.phase === 'idle') return null;

  const subtitle =
    state.phase === 'fasting'
      ? `Ayunando · ${formatDuration(state.elapsedMs)} de ${formatDuration(state.plannedMs)}`
      : `Ventana abierta · queda ${formatDuration(state.remainingMs)}`;

  return {
    id: 'fasting',
    icon: '⏱️',
    title: 'Ayuno',
    subtitle,
    badge: FASTING_PROTOCOL_SHORT[proto.protocol],
    route: '/fasting',
    enabled: true,
  };
}
