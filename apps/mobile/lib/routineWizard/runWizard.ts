import type { ProposedTask } from '@beproud/validation';
import type { Answers, Wizard } from './types';

/** Función pura: ejecuta las reglas del wizard sobre las respuestas. */
export function runWizard(w: Wizard, answers: Answers): ProposedTask[] {
  const proposals = w.rules
    .filter((r) => r.when(answers))
    .flatMap((r) => {
      const out = r.propose(answers);
      return Array.isArray(out) ? out : [out];
    });
  // Dedupe por (title lower-case, target_frequency).
  const seen = new Set<string>();
  const unique: ProposedTask[] = [];
  for (const p of proposals) {
    const key = `${p.title.toLowerCase()}::${p.target_frequency ?? 'daily'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  return w.postProcess ? w.postProcess(unique, answers) : unique;
}
