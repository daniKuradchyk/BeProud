import type { ProposedTask } from '@beproud/validation';
import type { Question, Wizard, WizardRule } from './types';
import { getStr } from './types';

const QUESTIONS: Question[] = [
  { id: 'work_mode', kind: 'single', label: '¿Trabajas o estudias por la tarde?', options: [
    { value: 'presencial', label: 'Sí, presencial' },
    { value: 'remote',     label: 'Sí, en remoto' },
    { value: 'variable',   label: 'A veces, depende del día' },
    { value: 'none',       label: 'No' },
  ]},
  { id: 'lunch_time',     kind: 'time',         label: '¿A qué hora comes?',                 defaultValue: '14:00' },
  { id: 'lunch_duration', kind: 'duration_min', label: 'Duración aproximada de la comida',   options: [15, 30, 45, 60, 90], defaultValue: 45 },
  { id: 'post_lunch_dip', kind: 'single',       label: '¿Tienes bajón energético después de comer?', options: [
    { value: 'yes_strong', label: 'Sí, fuerte' },
    { value: 'yes_mild',   label: 'Algo, depende del día' },
    { value: 'no',         label: 'No' },
  ]},
  { id: 'afternoon_workout', kind: 'single', label: '¿Entrenas por la tarde?', options: [
    { value: 'no',        label: 'No' },
    { value: 'yes_2_3',   label: 'Sí, 2-3 días por semana' },
    { value: 'yes_4plus', label: 'Sí, 4+ días por semana' },
  ]},
  { id: 'pomodoro', kind: 'single', label: '¿Quieres incluir bloques de foco con Pomodoro?', options: [
    { value: 'none',         label: 'No' },
    { value: 'one_session',  label: '1 sesión' },
    { value: 'two_or_more',  label: '2 o más sesiones' },
  ]},
];

const RULES: WizardRule[] = [
  // Comida principal: enlace al catálogo (preserva auto-completion Fase 14).
  {
    when: () => true,
    propose: () => ({
      title: 'Comida saludable', category: 'nutrition', module: 'nutrition',
      base_points: 15, target_frequency: 'daily', catalog_slug: 'healthy_lunch',
    }),
  },
  {
    when: (a) => getStr(a, 'post_lunch_dip') === 'yes_strong',
    propose: () => ([
      { title: 'Paseo 10 min después de comer', category: 'wellbeing', module: 'generic', base_points: 5, target_frequency: 'daily' },
      { title: 'Siesta 15 min',                 category: 'wellbeing', module: 'generic', base_points: 3, target_frequency: 'daily' },
    ] as ProposedTask[]),
  },
  {
    when: (a) => getStr(a, 'post_lunch_dip') === 'yes_mild',
    propose: () => ({ title: 'Paseo 5 min después de comer', category: 'wellbeing', module: 'generic', base_points: 3, target_frequency: 'daily' }),
  },
  {
    when: (a) => getStr(a, 'afternoon_workout') === 'yes_2_3',
    propose: () => ({ title: 'Entreno tarde', category: 'fitness', module: 'gym', base_points: 20, target_frequency: 'weekly_3' }),
  },
  {
    when: (a) => getStr(a, 'afternoon_workout') === 'yes_4plus',
    propose: () => ({ title: 'Entreno tarde', category: 'fitness', module: 'gym', base_points: 20, target_frequency: 'days:MON,TUE,WED,THU,FRI' }),
  },
  // Pomodoro: solo si trabaja/estudia por la tarde.
  {
    when: (a) => getStr(a, 'pomodoro') === 'one_session' && getStr(a, 'work_mode') !== 'none',
    propose: () => ({ title: 'Sesión Pomodoro 25/5', category: 'productivity', module: 'study', base_points: 8, target_frequency: 'daily' }),
  },
  {
    when: (a) => getStr(a, 'pomodoro') === 'two_or_more' && getStr(a, 'work_mode') !== 'none',
    propose: () => ([
      { title: 'Sesión Pomodoro foco mañana',  category: 'productivity', module: 'study', base_points: 8, target_frequency: 'daily' },
      { title: 'Sesión Pomodoro repaso',       category: 'productivity', module: 'study', base_points: 5, target_frequency: 'daily' },
    ] as ProposedTask[]),
  },
];

export const afternoonWizard: Wizard = {
  slot: 'afternoon',
  questions: QUESTIONS,
  rules: RULES,
};
