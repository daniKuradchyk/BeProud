import { create } from 'zustand';
import type {
  Availability,
  BiologicalSex,
  Equipment,
  Level,
  OnboardingAnswers,
  PrimaryGoal,
  Restriction,
  TaskCategory,
} from '@beproud/validation';

type Partial = {
  // Categorías y goals.
  goals: TaskCategory[];
  preferenceCategories: TaskCategory[];

  // Disponibilidad clásica + biometría Fase 11A.
  availability: Availability | null;
  level: Level | null;

  birthDate: string | null;        // yyyy-mm-dd
  biologicalSex: BiologicalSex | null;
  heightCm: number | null;
  weightKg: number | null;
  primaryGoal: PrimaryGoal | null;
  weeklyDays: number | null;
  dailyMinutes: number | null;
  equipment: Equipment[];
  restrictions: Restriction[];
};

type Store = Partial & {
  // Categorías
  toggleGoal: (g: TaskCategory) => void;
  setGoals: (g: TaskCategory[]) => void;
  togglePreferenceCategory: (c: TaskCategory) => void;
  setPreferenceCategories: (c: TaskCategory[]) => void;

  // Wizard original
  setAvailability: (a: Availability) => void;
  setLevel: (l: Level) => void;

  // Biometría
  setBirthDate: (v: string | null) => void;
  setBiologicalSex: (v: BiologicalSex | null) => void;
  setHeightCm: (v: number | null) => void;
  setWeightKg: (v: number | null) => void;

  // Objetivo y disponibilidad biométrica
  setPrimaryGoal: (v: PrimaryGoal | null) => void;
  setWeeklyDays: (v: number | null) => void;
  setDailyMinutes: (v: number | null) => void;

  // Equipment / restrictions
  toggleEquipment: (e: Equipment) => void;
  setEquipment: (v: Equipment[]) => void;
  toggleRestriction: (r: Restriction) => void;
  setRestrictions: (v: Restriction[]) => void;

  reset: () => void;
  asAnswers: () => OnboardingAnswers | null;
};

const initial: Partial = {
  goals: [],
  preferenceCategories: [],

  availability: null,
  level: null,

  birthDate: null,
  biologicalSex: null,
  heightCm: null,
  weightKg: null,
  primaryGoal: null,
  weeklyDays: null,
  dailyMinutes: null,
  equipment: [],
  restrictions: [],
};

/**
 * Mapea daily_minutes a la bucket clásica para mantener compat con la RPC
 * generate_routine cuando alguien no rellene biometría.
 */
function fallbackAvailability(dailyMinutes: number | null): Availability {
  if (dailyMinutes == null) return 'medium';
  if (dailyMinutes < 30) return 'low';
  if (dailyMinutes < 75) return 'medium';
  return 'high';
}

export const useOnboarding = create<Store>((set, get) => ({
  ...initial,

  toggleGoal: (g) =>
    set((s) => ({
      goals: s.goals.includes(g) ? s.goals.filter((x) => x !== g) : [...s.goals, g],
    })),
  setGoals: (goals) => set({ goals }),
  togglePreferenceCategory: (c) =>
    set((s) => ({
      preferenceCategories: s.preferenceCategories.includes(c)
        ? s.preferenceCategories.filter((x) => x !== c)
        : [...s.preferenceCategories, c],
    })),
  setPreferenceCategories: (preferenceCategories) => set({ preferenceCategories }),

  setAvailability: (availability) => set({ availability }),
  setLevel: (level) => set({ level }),

  setBirthDate: (birthDate) => set({ birthDate }),
  setBiologicalSex: (biologicalSex) => set({ biologicalSex }),
  setHeightCm: (heightCm) => set({ heightCm }),
  setWeightKg: (weightKg) => set({ weightKg }),

  setPrimaryGoal: (primaryGoal) => set({ primaryGoal }),
  setWeeklyDays: (weeklyDays) => set({ weeklyDays }),
  setDailyMinutes: (dailyMinutes) =>
    set((s) => ({
      dailyMinutes,
      // Si no se ha tocado availability todavía, lo derivamos para que la
      // RPC siempre tenga un valor válido.
      availability: s.availability ?? fallbackAvailability(dailyMinutes),
    })),

  toggleEquipment: (e) =>
    set((s) => ({
      equipment: s.equipment.includes(e)
        ? s.equipment.filter((x) => x !== e)
        : [...s.equipment, e],
    })),
  setEquipment: (equipment) => set({ equipment }),
  toggleRestriction: (r) =>
    set((s) => ({
      restrictions: s.restrictions.includes(r)
        ? s.restrictions.filter((x) => x !== r)
        : [...s.restrictions, r],
    })),
  setRestrictions: (restrictions) => set({ restrictions }),

  reset: () => set(initial),

  asAnswers: () => {
    const s = get();
    if (s.goals.length === 0 || !s.level) return null;
    const availability = s.availability ?? fallbackAvailability(s.dailyMinutes);
    return {
      goals: s.goals,
      availability,
      level: s.level,
      preferences: { categories: s.preferenceCategories },
      ...(s.birthDate     ? { birth_date:     s.birthDate }     : {}),
      ...(s.biologicalSex ? { biological_sex: s.biologicalSex } : {}),
      ...(s.heightCm  != null ? { height_cm:     s.heightCm }     : {}),
      ...(s.weightKg  != null ? { weight_kg:     s.weightKg }     : {}),
      ...(s.primaryGoal   ? { primary_goal:   s.primaryGoal }   : {}),
      ...(s.weeklyDays   != null ? { weekly_days:   s.weeklyDays }   : {}),
      ...(s.dailyMinutes != null ? { daily_minutes: s.dailyMinutes } : {}),
      ...(s.equipment.length    > 0 ? { equipment:    s.equipment }    : {}),
      ...(s.restrictions.length > 0 ? { restrictions: s.restrictions } : {}),
    };
  },
}));
