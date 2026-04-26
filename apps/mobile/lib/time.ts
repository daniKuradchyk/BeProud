import type { TimeSlot } from '@beproud/validation';

/**
 * Devuelve el bloque temporal según la hora local del dispositivo.
 *  5..11 → morning · 12..17 → afternoon · resto (18..04) → evening.
 *  'anytime' nunca es el slot activo: es para tareas sin franja preferida.
 */
export function getActiveTimeSlot(now: Date = new Date()): TimeSlot {
  const h = now.getHours();
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

/** Orden de "siguiente bloque" para fallback cuando el actual está completo. */
export const NEXT_SLOT_ORDER: Record<TimeSlot, TimeSlot[]> = {
  morning:   ['morning',   'afternoon', 'evening', 'anytime'],
  afternoon: ['afternoon', 'evening',   'anytime', 'morning'],
  evening:   ['evening',   'anytime',   'morning', 'afternoon'],
  anytime:   ['anytime',   'morning',   'afternoon', 'evening'],
};
