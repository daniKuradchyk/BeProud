import { create } from 'zustand';

export type PomodoroPhase = 'focus' | 'break';

export type PomodoroState = {
  sessionId: string | null;
  phase: PomodoroPhase;
  remainingSeconds: number;
  isPaused: boolean;
  cyclesCompleted: number;
  cyclesPlanned: number;
  focusSeconds: number;
  breakSeconds: number;

  /** Inicializa el store al entrar en /study/session/[id]. */
  init: (params: {
    sessionId: string;
    cyclesCompleted: number;
    cyclesPlanned: number;
    focusMinutes: number;
    breakMinutes: number;
    initialPhase: PomodoroPhase;
    initialRemaining: number;
  }) => void;

  tick: () => void;
  pause: () => void;
  resume: () => void;
  /** Llama esto al terminar una fase de focus (cycle ✓). */
  onFocusEnded: () => void;
  /** Llama esto al terminar una fase de break. */
  onBreakEnded: () => void;
  /** Para pruebas: salta la fase actual. */
  skipPhase: () => void;
  reset: () => void;
};

const initial = {
  sessionId: null as string | null,
  phase: 'focus' as PomodoroPhase,
  remainingSeconds: 0,
  isPaused: false,
  cyclesCompleted: 0,
  cyclesPlanned: 1,
  focusSeconds: 0,
  breakSeconds: 0,
};

export const usePomodoro = create<PomodoroState>((set, get) => ({
  ...initial,

  init: ({
    sessionId, cyclesCompleted, cyclesPlanned, focusMinutes, breakMinutes,
    initialPhase, initialRemaining,
  }) => {
    set({
      sessionId,
      phase: initialPhase,
      remainingSeconds: Math.max(0, initialRemaining),
      isPaused: false,
      cyclesCompleted,
      cyclesPlanned,
      focusSeconds: focusMinutes * 60,
      breakSeconds: breakMinutes * 60,
    });
  },

  tick: () => {
    const s = get();
    if (s.isPaused) return;
    if (s.remainingSeconds <= 0) return;
    set({ remainingSeconds: s.remainingSeconds - 1 });
  },

  pause: () => set({ isPaused: true }),
  resume: () => set({ isPaused: false }),

  onFocusEnded: () => {
    const s = get();
    set({
      phase: 'break',
      remainingSeconds: s.breakSeconds,
      cyclesCompleted: s.cyclesCompleted + 1,
    });
  },

  onBreakEnded: () => {
    set((s) => ({
      phase: 'focus',
      remainingSeconds: s.focusSeconds,
    }));
  },

  skipPhase: () => {
    set({ remainingSeconds: 0 });
  },

  reset: () => set({ ...initial }),
}));
