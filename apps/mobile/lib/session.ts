import { create } from 'zustand';
import type { Session, User } from '@beproud/api';
import {
  getSession,
  onAuthStateChange,
  fetchMyProfile,
  needsOnboarding,
  fetchActiveRoutine,
  needsRoutineSetup,
  type Profile,
  type ActiveRoutine,
} from '@beproud/api';

type Status =
  | 'loading'
  | 'unauthenticated'
  | 'needs_onboarding'      // Falta username/display_name
  | 'needs_routine_setup'   // Tiene perfil pero no rutina activa
  | 'authenticated';

type SessionState = {
  status: Status;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  routine: ActiveRoutine | null;
  init: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
  refreshProfile: () => Promise<void>;
  refreshRoutine: () => Promise<void>;
};

let initialized = false;

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading',
  user: null,
  session: null,
  profile: null,
  routine: null,

  init: async () => {
    if (initialized) return;
    initialized = true;

    const session = await getSession();
    await applySession(session, set);

    onAuthStateChange(async (newSession) => {
      await applySession(newSession, set);
    });
  },

  setProfile: (profile) => {
    const { routine } = get();
    set({
      profile,
      status: computeStatus(profile, routine),
    });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const profile = await fetchMyProfile();
      const routine = await fetchActiveRoutine().catch(() => null);
      set({
        profile,
        routine,
        status: computeStatus(profile, routine),
      });
    } catch (e) {
      console.warn('[session] refreshProfile error', e);
    }
  },

  refreshRoutine: async () => {
    const { user, profile } = get();
    if (!user) return;
    try {
      const routine = await fetchActiveRoutine();
      set({
        routine,
        status: computeStatus(profile, routine),
      });
    } catch (e) {
      console.warn('[session] refreshRoutine error', e);
    }
  },
}));

function computeStatus(
  profile: Profile | null,
  routine: ActiveRoutine | null,
): Status {
  if (needsOnboarding(profile)) return 'needs_onboarding';
  if (needsRoutineSetup(routine)) return 'needs_routine_setup';
  return 'authenticated';
}

async function applySession(
  session: Session | null,
  set: (partial: Partial<SessionState>) => void,
) {
  if (!session) {
    set({
      status: 'unauthenticated',
      session: null,
      user: null,
      profile: null,
      routine: null,
    });
    return;
  }
  set({ session, user: session.user });
  try {
    const profile = await fetchMyProfile();
    const routine = await fetchActiveRoutine().catch(() => null);
    set({
      profile,
      routine,
      status: computeStatus(profile, routine),
    });
  } catch (e) {
    console.warn('[session] no se pudo cargar el perfil', e);
    set({ profile: null, routine: null, status: 'needs_onboarding' });
  }
}
