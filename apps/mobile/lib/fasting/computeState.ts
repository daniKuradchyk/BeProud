import type { WeekdayKey } from '@beproud/validation';
import type { FastingProtocolRow } from '@beproud/api';

export type FastingState =
  | { phase: 'idle'; reason: 'no_protocol' | 'disabled' | '5_2_off_day' }
  | {
      phase: 'fasting';
      windowOpensAt: Date;
      windowClosedAt: Date;     // último eat_end
      elapsedMs: number;
      remainingMs: number;
      plannedMs: number;
      progressRatio: number;
    }
  | {
      phase: 'eating';
      windowOpenedAt: Date;     // eat_start de hoy
      windowClosesAt: Date;     // eat_end de hoy
      remainingMs: number;
      windowDurationMs: number;
      progressRatio: number;
    };

const WEEKDAY_BY_INDEX: WeekdayKey[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Devuelve el "Y-M-D" en la timezone dada para una fecha UTC concreta.
 * Usa Intl.DateTimeFormat (sin libs externas).
 */
function ymdInTz(d: Date, tz: string): { y: number; m: number; day: number; weekday: WeekdayKey } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const wd = get('weekday'); // 'Mon', 'Tue', ...
  const map: Record<string, WeekdayKey> = {
    Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT', Sun: 'SUN',
  };
  return {
    y: Number(get('year')),
    m: Number(get('month')),
    day: Number(get('day')),
    weekday: map[wd] ?? WEEKDAY_BY_INDEX[d.getUTCDay()] ?? 'MON',
  };
}

/**
 * Convierte (y-m-d, "HH:MM:SS") en una zona dada → instante UTC (Date).
 * Algoritmo: probamos un offset, comparamos qué hora local da en esa tz, y
 * ajustamos para corregir el offset. Suficiente para horas que no caen en el
 * minuto exacto del cambio DST.
 */
function localToUtc(
  y: number,
  m: number,
  day: number,
  hms: string,        // 'HH:MM:SS'
  tz: string,
): Date {
  const [hh, mm, ss] = hms.split(':').map(Number) as [number, number, number];
  // Asumimos que el instante UTC equivalente es el mismo wall clock. Postgres
  // tendrá una semántica idéntica con `at time zone`.
  const guess = Date.UTC(y, m - 1, day, hh, mm, ss);
  const guessDate = new Date(guess);
  // Corregimos por el offset de la timezone respecto a UTC en ese instante.
  const localStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(guessDate);
  const map = Object.fromEntries(localStr.map((p) => [p.type, p.value]));
  const wallY  = Number(map.year);
  const wallMo = Number(map.month);
  const wallD  = Number(map.day);
  const wallH  = Number(map.hour);
  const wallMi = Number(map.minute);
  const wallS  = Number(map.second);
  const wallUtc = Date.UTC(wallY, wallMo - 1, wallD, wallH, wallMi, wallS);
  const offset = wallUtc - guess;
  return new Date(guess - offset);
}

function timeStrFromProto(t: string | null): string {
  if (!t) return '00:00:00';
  return t.length === 5 ? `${t}:00` : t;
}

/**
 * Estado actual del ayuno a partir del protocolo y la hora actual.
 * Función pura; el caller refresca cada segundo si quiere ver el timer vivo.
 */
export function computeFastingState(
  proto: FastingProtocolRow | null,
  now: Date = new Date(),
): FastingState {
  if (!proto) return { phase: 'idle', reason: 'no_protocol' };
  if (!proto.enabled) return { phase: 'idle', reason: 'disabled' };

  if (proto.protocol === '5_2') {
    // 5:2 — solo "activo" en los low_cal_days. Aún así, no hay timer real;
    // simplemente avisamos en off-day para no llenar el carrusel.
    const today = ymdInTz(now, proto.timezone);
    const lowDays = (proto.low_cal_days ?? []) as WeekdayKey[];
    if (!lowDays.includes(today.weekday)) {
      return { phase: 'idle', reason: '5_2_off_day' };
    }
    // En low-cal days lo modelamos como ventana de 8h en mitad del día
    // para mostrar algo razonable, pero no es la lógica nuclear de 5:2.
    const startUtc = localToUtc(today.y, today.m, today.day, '12:00:00', proto.timezone);
    const endUtc   = localToUtc(today.y, today.m, today.day, '20:00:00', proto.timezone);
    if (now < startUtc) {
      const elapsedMs = now.getTime() - localToUtc(today.y, today.m, today.day - 1, '20:00:00', proto.timezone).getTime();
      const plannedMs = startUtc.getTime() - localToUtc(today.y, today.m, today.day - 1, '20:00:00', proto.timezone).getTime();
      return {
        phase: 'fasting',
        windowOpensAt: startUtc,
        windowClosedAt: localToUtc(today.y, today.m, today.day - 1, '20:00:00', proto.timezone),
        elapsedMs,
        remainingMs: Math.max(0, startUtc.getTime() - now.getTime()),
        plannedMs,
        progressRatio: clamp01(elapsedMs / plannedMs),
      };
    }
    if (now < endUtc) {
      const remainingMs = endUtc.getTime() - now.getTime();
      const windowDurationMs = endUtc.getTime() - startUtc.getTime();
      return {
        phase: 'eating',
        windowOpenedAt: startUtc,
        windowClosesAt: endUtc,
        remainingMs,
        windowDurationMs,
        progressRatio: clamp01((windowDurationMs - remainingMs) / windowDurationMs),
      };
    }
    return { phase: 'idle', reason: '5_2_off_day' };
  }

  // Protocolos por horas.
  if (!proto.eat_start || !proto.eat_end) {
    return { phase: 'idle', reason: 'no_protocol' };
  }
  const eatStart = timeStrFromProto(proto.eat_start);
  const eatEnd   = timeStrFromProto(proto.eat_end);

  const today = ymdInTz(now, proto.timezone);
  const eatStartToday   = localToUtc(today.y, today.m, today.day, eatStart, proto.timezone);
  const eatEndToday     = localToUtc(today.y, today.m, today.day, eatEnd, proto.timezone);
  const eatEndYesterday = localToUtc(today.y, today.m, today.day - 1, eatEnd, proto.timezone);
  const eatStartTomorrow = localToUtc(today.y, today.m, today.day + 1, eatStart, proto.timezone);

  // Eating: la ventana de hoy puede ser [eatStart, eatEnd] (mismo día)
  // o cruzar medianoche (eatStart > eatEnd → comer hasta eatEnd del día sig).
  const sameDayWindow = eatStartToday < eatEndToday;
  if (sameDayWindow) {
    if (now >= eatStartToday && now < eatEndToday) {
      const remainingMs = eatEndToday.getTime() - now.getTime();
      const windowDurationMs = eatEndToday.getTime() - eatStartToday.getTime();
      return {
        phase: 'eating',
        windowOpenedAt: eatStartToday,
        windowClosesAt: eatEndToday,
        remainingMs,
        windowDurationMs,
        progressRatio: clamp01((windowDurationMs - remainingMs) / windowDurationMs),
      };
    }
  } else {
    // ventana cruza medianoche: open (ayer eat_start, hoy eat_end) o (hoy eat_start, mañana eat_end)
    const eatStartYesterday = localToUtc(today.y, today.m, today.day - 1, eatStart, proto.timezone);
    if (now >= eatStartYesterday && now < eatEndToday) {
      const remainingMs = eatEndToday.getTime() - now.getTime();
      const windowDurationMs = eatEndToday.getTime() - eatStartYesterday.getTime();
      return {
        phase: 'eating',
        windowOpenedAt: eatStartYesterday,
        windowClosesAt: eatEndToday,
        remainingMs,
        windowDurationMs,
        progressRatio: clamp01((windowDurationMs - remainingMs) / windowDurationMs),
      };
    }
    if (now >= eatStartToday) {
      const eatEndTomorrow = localToUtc(today.y, today.m, today.day + 1, eatEnd, proto.timezone);
      const remainingMs = eatEndTomorrow.getTime() - now.getTime();
      const windowDurationMs = eatEndTomorrow.getTime() - eatStartToday.getTime();
      return {
        phase: 'eating',
        windowOpenedAt: eatStartToday,
        windowClosesAt: eatEndTomorrow,
        remainingMs,
        windowDurationMs,
        progressRatio: clamp01((windowDurationMs - remainingMs) / windowDurationMs),
      };
    }
  }

  // Fasting: cerrado más reciente y próxima apertura.
  const lastClose = sameDayWindow
    ? (now < eatStartToday ? eatEndYesterday : eatEndToday)
    : eatEndToday;
  const nextOpen = sameDayWindow
    ? (now < eatStartToday ? eatStartToday : eatStartTomorrow)
    : eatStartTomorrow;

  const elapsedMs   = Math.max(0, now.getTime() - lastClose.getTime());
  const plannedMs   = Math.max(1, nextOpen.getTime() - lastClose.getTime());
  const remainingMs = Math.max(0, nextOpen.getTime() - now.getTime());
  return {
    phase: 'fasting',
    windowOpensAt: nextOpen,
    windowClosedAt: lastClose,
    elapsedMs,
    remainingMs,
    plannedMs,
    progressRatio: clamp01(elapsedMs / plannedMs),
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
