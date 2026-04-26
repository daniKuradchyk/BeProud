import {
  FASTING_PRESET_HOURS,
  type FastingProtocol,
} from '@beproud/validation';

/**
 * Para protocolos por horas, sugiere una ventana de comidas razonable según
 * las horas de comida y ayuno. Para "personalizado" devuelve la del 16:8 como
 * punto de partida; "5_2" no usa horas (devuelve null).
 */
export function defaultEatWindow(
  protocol: FastingProtocol,
): { eat_start: string; eat_end: string } | null {
  if (protocol === '5_2') return null;
  switch (protocol) {
    case '16_8':  return { eat_start: '13:00', eat_end: '21:00' };
    case '14_10': return { eat_start: '11:00', eat_end: '21:00' };
    case '18_6':  return { eat_start: '14:00', eat_end: '20:00' };
    case '20_4':  return { eat_start: '17:00', eat_end: '21:00' };
    case 'omad':  return { eat_start: '19:00', eat_end: '20:00' };
    case 'custom': return { eat_start: '13:00', eat_end: '21:00' };
  }
}

export function fastHoursForProtocol(protocol: FastingProtocol): number {
  if (protocol === '5_2' || protocol === 'custom') return 16;
  return FASTING_PRESET_HOURS[protocol].fast;
}
