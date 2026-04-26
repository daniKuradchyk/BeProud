import type { ProposedTask } from '@beproud/validation';
import type { Question, Wizard, WizardRule } from './types';
import { getArr, getStr } from './types';

const QUESTIONS: Question[] = [
  { id: 'dinner_time', kind: 'time', label: '¿A qué hora cenas?',          defaultValue: '21:00' },
  { id: 'bed_time',    kind: 'time', label: '¿A qué hora te acuestas?',    defaultValue: '23:30' },
  { id: 'screen_off', kind: 'single', label: '¿Quieres apagar pantallas antes de dormir?', options: [
    { value: 'none',   label: 'Por ahora no' },
    { value: 'min_30', label: '30 min antes' },
    { value: 'min_60', label: '60 min antes' },
  ]},
  { id: 'closing', kind: 'multi', max: 3, label: 'Cierre del día', options: [
    { value: 'journal_good', label: 'Escribir 3 cosas que han ido bien' },
    { value: 'read_15',      label: 'Leer 15 min antes de dormir' },
    { value: 'meditate_5',   label: 'Meditar 5 min antes de dormir' },
    { value: 'prep_morning', label: 'Preparar ropa / mochila para mañana' },
    { value: 'gratitude_3',  label: '3 gratitudes' },
  ]},
  { id: 'fasting_close', kind: 'single', label: '¿Estás haciendo ayuno intermitente?', options: [
    { value: 'no',        label: 'No' },
    { value: 'yes_16_8',  label: 'Sí, 16:8' },
    { value: 'yes_18_6',  label: 'Sí, 18:6' },
    { value: 'yes_other', label: 'Otro / personalizado' },
  ]},
];

const CLOSING_MAP: Record<string, ProposedTask> = {
  journal_good: { title: 'Escribir 3 cosas que han ido bien', category: 'wellbeing', module: 'generic', base_points: 5, target_frequency: 'daily' },
  read_15:      { title: 'Leer 15 min antes de dormir',       category: 'study',     module: 'generic', base_points: 5, target_frequency: 'daily' },
  meditate_5:   { title: 'Meditar 5 min antes de dormir',     category: 'wellbeing', module: 'generic', base_points: 5, target_frequency: 'daily' },
  prep_morning: { title: 'Preparar ropa para mañana',         category: 'productivity', module: 'generic', base_points: 3, target_frequency: 'daily' },
  gratitude_3:  { title: '3 gratitudes antes de dormir',      category: 'wellbeing', module: 'generic', base_points: 3, target_frequency: 'daily' },
};

const RULES: WizardRule[] = [
  {
    when: () => true,
    propose: () => ({
      title: 'Cena saludable', category: 'nutrition', module: 'nutrition',
      base_points: 15, target_frequency: 'daily', catalog_slug: 'healthy_dinner',
    }),
  },
  {
    when: (a) => getStr(a, 'screen_off') === 'min_30',
    propose: () => ({ title: 'Sin pantallas 30 min antes de dormir', category: 'wellbeing', module: 'generic', base_points: 5, target_frequency: 'daily' }),
  },
  {
    when: (a) => getStr(a, 'screen_off') === 'min_60',
    propose: () => ({ title: 'Sin pantallas 60 min antes de dormir', category: 'wellbeing', module: 'generic', base_points: 8, target_frequency: 'daily' }),
  },
  {
    when: (a) => getArr(a, 'closing').length > 0,
    propose: (a) => getArr(a, 'closing').map((k) => CLOSING_MAP[k]).filter((p): p is ProposedTask => p != null),
  },
  {
    when: (a) => getStr(a, 'fasting_close') !== 'no' && getStr(a, 'fasting_close') !== '',
    propose: () => ({ title: 'Cerrar ventana de comidas', category: 'nutrition', module: 'nutrition', base_points: 3, target_frequency: 'daily' }),
  },
];

const ORDER: Record<string, number> = {
  'cena saludable':                          0,
  'sin pantallas 30 min antes de dormir':    1,
  'sin pantallas 60 min antes de dormir':    1,
  'leer 15 min antes de dormir':             2,
  'meditar 5 min antes de dormir':           2,
  '3 gratitudes antes de dormir':            2,
  'escribir 3 cosas que han ido bien':       2,
  'preparar ropa para mañana':               2,
  'cerrar ventana de comidas':               3,
};

function priority(p: ProposedTask): number {
  return ORDER[p.title.toLowerCase()] ?? 4;
}

export const eveningWizard: Wizard = {
  slot: 'evening',
  questions: QUESTIONS,
  rules: RULES,
  postProcess: (proposals) => {
    const sorted = [...proposals].sort((x, y) => priority(x) - priority(y));
    return sorted.slice(0, 5);
  },
};
