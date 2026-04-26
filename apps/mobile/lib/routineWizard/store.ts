import { create } from 'zustand';
import type { WizardSlot } from '@beproud/validation';
import type { Answer, Answers, Wizard } from './types';
import { morningWizard } from './morning';
import { afternoonWizard } from './afternoon';
import { eveningWizard } from './evening';

type WizardStore = {
  slot: WizardSlot | null;
  answers: Answers;
  set: (slot: WizardSlot, answers: Answers) => void;
  patch: (id: string, value: Answer) => void;
  reset: () => void;
};

export const useRoutineWizardStore = create<WizardStore>((set) => ({
  slot: null,
  answers: {},
  set: (slot, answers) => set({ slot, answers }),
  patch: (id, value) =>
    set((s) => ({ answers: { ...s.answers, [id]: value } })),
  reset: () => set({ slot: null, answers: {} }),
}));

export function getWizardForSlot(slot: WizardSlot): Wizard {
  if (slot === 'morning')   return morningWizard;
  if (slot === 'afternoon') return afternoonWizard;
  return eveningWizard;
}
