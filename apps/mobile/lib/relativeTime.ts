/**
 * Tiempo relativo en castellano, formato corto. Pensado para timestamps de
 * posts y comentarios en el feed. Sin librerías.
 *
 * Cortes:
 *   < 60s        → "ahora"
 *   < 60min      → "hace 12 m"
 *   < 24h        → "hace 5 h"
 *   < 48h        → "ayer"
 *   < 7d         → "hace 3 d"
 *   este año     → "12 abr"
 *   otros años   → "12 abr 2025"
 */
const MES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const;

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'ahora';

  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'ahora';

  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} m`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;

  const day = Math.floor(hr / 24);
  if (day < 2) return 'ayer';
  if (day < 7) return `hace ${day} d`;

  const d = then.getDate();
  const m = MES[then.getMonth()];
  if (then.getFullYear() === now.getFullYear()) return `${d} ${m}`;
  return `${d} ${m} ${then.getFullYear()}`;
}
