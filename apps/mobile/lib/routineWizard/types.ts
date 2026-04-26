import type { ProposedTask, WizardSlot } from '@beproud/validation';

export type QuestionId = string;

export type Question =
  | { id: QuestionId; kind: 'time';         label: string; defaultValue: string }
  | { id: QuestionId; kind: 'duration_min'; label: string; options: number[]; defaultValue: number }
  | { id: QuestionId; kind: 'single';       label: string; options: { value: string; label: string }[] }
  | { id: QuestionId; kind: 'multi';        label: string; options: { value: string; label: string }[]; max?: number }
  | { id: QuestionId; kind: 'free_text';    label: string; placeholder: string };

export type Answer = string | number | string[];
export type Answers = Record<QuestionId, Answer>;

export type WizardRule = {
  when: (a: Answers) => boolean;
  propose: (a: Answers) => ProposedTask | ProposedTask[];
};

export type Wizard = {
  slot: WizardSlot;
  questions: Question[];
  rules: WizardRule[];
  /** Aplica dedupe, cap y orden tras evaluar las reglas. */
  postProcess?: (proposals: ProposedTask[], a: Answers) => ProposedTask[];
};

export function getDefaultAnswer(q: Question): Answer {
  switch (q.kind) {
    case 'time':         return q.defaultValue;
    case 'duration_min': return q.defaultValue;
    case 'single':       return '';
    case 'multi':        return [];
    case 'free_text':    return '';
  }
}

/** Helper para obtener una respuesta tipada con default si falta. */
export function getStr(a: Answers, id: QuestionId): string {
  const v = a[id];
  return typeof v === 'string' ? v : '';
}
export function getNum(a: Answers, id: QuestionId): number {
  const v = a[id];
  return typeof v === 'number' ? v : 0;
}
export function getArr(a: Answers, id: QuestionId): string[] {
  const v = a[id];
  return Array.isArray(v) ? v : [];
}
