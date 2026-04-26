import type { ProposedTask } from '@beproud/validation';
import type { Question, Wizard, WizardRule } from './types';
import { getArr, getNum, getStr } from './types';

const QUESTIONS: Question[] = [
  { id: 'wake_time',     kind: 'time',         label: '¿A qué hora te levantas?', defaultValue: '07:30' },
  { id: 'available_min', kind: 'duration_min', label: '¿De cuánto tiempo dispones antes de empezar el día?',
    options: [15, 30, 45, 60, 90, 120], defaultValue: 45 },
  { id: 'movement', kind: 'single', label: '¿Quieres mover el cuerpo por la mañana?', options: [
    { value: 'none',          label: 'Por ahora no' },
    { value: 'stretch',       label: 'Estirar 5–10 min' },
    { value: 'short_workout', label: 'Entreno corto 15–25 min' },
    { value: 'full_workout',  label: 'Entreno completo' },
  ]},
  { id: 'mind', kind: 'single', label: '¿Quieres incluir un momento de mente clara?', options: [
    { value: 'none',         label: 'Por ahora no' },
    { value: 'meditate_5',   label: 'Meditar 5 min' },
    { value: 'journal_3',    label: 'Journaling: 3 prioridades del día' },
    { value: 'read_10',      label: 'Leer 10 min' },
    { value: 'coffee_focus', label: 'Café consciente sin móvil 5 min' },
  ]},
  { id: 'breakfast', kind: 'single', label: '¿Cómo es tu desayuno?', options: [
    { value: 'none',    label: 'No desayuno' },
    { value: 'light',   label: 'Fruta y café' },
    { value: 'full',    label: 'Desayuno completo' },
    { value: 'fasting', label: 'Estoy en ayuno intermitente' },
  ]},
  { id: 'wins', kind: 'multi', max: 3, label: 'Primera victoria del día (elige hasta 3)', options: [
    { value: 'make_bed',    label: 'Hacer la cama' },
    { value: 'pushups_10',  label: '10 flexiones' },
    { value: 'water_lemon', label: 'Vaso de agua con limón' },
    { value: 'priorities',  label: 'Escribir 3 prioridades del día' },
    { value: 'cold_face',   label: 'Lavarse la cara con agua fría' },
    { value: 'gratitude',   label: 'Anotar 1 cosa por la que estoy agradecido' },
  ]},
];

const WINS_MAP: Record<string, ProposedTask> = {
  make_bed:    { title: 'Hacer la cama',                category: 'productivity', module: 'generic', base_points: 3, target_frequency: 'daily' },
  pushups_10:  { title: '10 flexiones al despertar',    category: 'fitness',      module: 'generic', base_points: 5, target_frequency: 'daily' },
  water_lemon: { title: 'Vaso de agua con limón',       category: 'nutrition',    module: 'generic', base_points: 3, target_frequency: 'daily' },
  priorities:  { title: 'Escribir 3 prioridades del día', category: 'productivity', module: 'generic', base_points: 5, target_frequency: 'daily' },
  cold_face:   { title: 'Lavarse la cara con agua fría', category: 'wellbeing',   module: 'generic', base_points: 3, target_frequency: 'daily' },
  gratitude:   { title: 'Anotar 1 gratitud',             category: 'wellbeing',   module: 'generic', base_points: 3, target_frequency: 'daily' },
};

const RULES: WizardRule[] = [
  // Movimiento
  {
    when: (a) => getStr(a, 'movement') === 'stretch',
    propose: () => ({ title: 'Estirar 5 min al levantarme', category: 'wellbeing', module: 'generic', base_points: 5, target_frequency: 'daily' }),
  },
  {
    when: (a) => getStr(a, 'movement') === 'short_workout',
    propose: () => ({ title: 'Movimiento mañanero 15 min', category: 'fitness', module: 'generic', base_points: 10, target_frequency: 'daily' }),
  },
  {
    when: (a) => getStr(a, 'movement') === 'full_workout',
    propose: () => ({ title: 'Entreno completo', category: 'fitness', module: 'gym', base_points: 20, target_frequency: 'days:MON,WED,FRI' }),
  },
  // Mente
  {
    when: (a) => getStr(a, 'mind') === 'meditate_5',
    propose: () => ({ title: 'Meditar 5 min al despertar', category: 'wellbeing', module: 'generic', base_points: 5, target_frequency: 'daily' }),
  },
  {
    when: (a) => getStr(a, 'mind') === 'journal_3',
    propose: () => ({ title: 'Escribir 3 prioridades del día', category: 'productivity', module: 'generic', base_points: 5, target_frequency: 'daily' }),
  },
  {
    when: (a) => getStr(a, 'mind') === 'read_10',
    propose: () => ({ title: 'Leer 10 min con el café', category: 'study', module: 'generic', base_points: 5, target_frequency: 'daily' }),
  },
  {
    when: (a) => getStr(a, 'mind') === 'coffee_focus',
    propose: () => ({ title: 'Café consciente sin móvil 5 min', category: 'wellbeing', module: 'generic', base_points: 3, target_frequency: 'daily' }),
  },
  // Desayuno (enlazamos al catálogo cuando aplica para preservar Fase 14)
  {
    when: (a) => getStr(a, 'breakfast') === 'none',
    propose: () => ({ title: 'Vaso de agua nada más despertar', category: 'nutrition', module: 'generic', base_points: 3, target_frequency: 'daily' }),
  },
  {
    when: (a) => getStr(a, 'breakfast') === 'light',
    propose: () => ({ title: 'Desayuno saludable', category: 'nutrition', module: 'nutrition', base_points: 10, target_frequency: 'daily', catalog_slug: 'healthy_breakfast' }),
  },
  {
    when: (a) => getStr(a, 'breakfast') === 'full',
    propose: () => ({ title: 'Desayuno saludable', category: 'nutrition', module: 'nutrition', base_points: 10, target_frequency: 'daily', catalog_slug: 'healthy_breakfast' }),
  },
  {
    when: (a) => getStr(a, 'breakfast') === 'fasting',
    propose: () => ({ title: 'Comprobar ventana de ayuno', category: 'nutrition', module: 'nutrition', base_points: 3, target_frequency: 'daily' }),
  },
  // Wins
  {
    when: (a) => getArr(a, 'wins').length > 0,
    propose: (a) => getArr(a, 'wins').map((w) => WINS_MAP[w]).filter((p): p is ProposedTask => p != null),
  },
];

const ORDER: Record<string, number> = {
  // hidratación primero
  'vaso de agua nada más despertar': 0,
  'vaso de agua con limón':           0,
  // movimiento
  'estirar 5 min al levantarme':      1,
  'movimiento mañanero 15 min':       1,
  'entreno completo':                 1,
  '10 flexiones al despertar':        1,
  // mente
  'meditar 5 min al despertar':       2,
  'escribir 3 prioridades del día':   2,
  'leer 10 min con el café':          2,
  'café consciente sin móvil 5 min':  2,
  // desayuno
  'desayuno saludable':               3,
  'comprobar ventana de ayuno':       3,
  // resto: wins
  'hacer la cama':                    4,
  'lavarse la cara con agua fría':    4,
  'anotar 1 gratitud':                4,
};

function priority(p: ProposedTask): number {
  return ORDER[p.title.toLowerCase()] ?? 5;
}

export const morningWizard: Wizard = {
  slot: 'morning',
  questions: QUESTIONS,
  rules: RULES,
  postProcess: (proposals, a) => {
    const sorted = [...proposals].sort((x, y) => priority(x) - priority(y));
    const minutes = getNum(a, 'available_min');
    let cap = Infinity;
    if (minutes < 30) cap = 3;
    else if (minutes <= 45) cap = 4;
    if (sorted.length <= cap) return sorted;
    // Cap conservando movimiento + desayuno; eliminamos wins extra primero, luego mente.
    const keepCore = (p: ProposedTask) => priority(p) <= 1 || priority(p) === 3;
    const kept = sorted.filter(keepCore);
    const extras = sorted.filter((p) => !keepCore(p));
    const remaining = Math.max(0, cap - kept.length);
    return [...kept, ...extras.slice(0, remaining)];
  },
};
