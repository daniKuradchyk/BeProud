import {
  STUDY_TECHNIQUE_PRESETS,
  type StudyTechnique,
} from '@beproud/validation';

export const TECHNIQUE_OPTIONS: Array<{
  value: StudyTechnique;
  label: string;
  description: string;
  focus: number;
  break: number;
  cycles: number;
}> = [
  {
    value: 'pomodoro_25_5',
    label: STUDY_TECHNIQUE_PRESETS.pomodoro_25_5.label,
    description: 'Clásico: 25 min foco · 5 min descanso · 4 ciclos.',
    focus: 25, break: 5, cycles: 4,
  },
  {
    value: 'pomodoro_50_10',
    label: STUDY_TECHNIQUE_PRESETS.pomodoro_50_10.label,
    description: 'Bloques largos: 50 min foco · 10 min descanso · 2 ciclos.',
    focus: 50, break: 10, cycles: 2,
  },
  {
    value: 'custom',
    label: 'Personalizado',
    description: 'Configura tu propio ratio.',
    focus: 30, break: 5, cycles: 3,
  },
];

export function clampInt(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.round(v)));
}
