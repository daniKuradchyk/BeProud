import { supabase } from './client';
import type { StudyTechnique } from '@beproud/validation';

export type StudySession = {
  id: string;
  user_id: string;
  routine_task_id: string | null;
  technique: StudyTechnique;
  planned_minutes: number;
  focus_minutes: number;
  break_minutes: number;
  cycles_planned: number;
  cycles_completed: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  ended_at: string | null;
  notes: string | null;
};

export type StudyTodayStats = {
  cyclesToday: number;
  minutesToday: number;
  sessionsToday: number;
};

export async function startStudySession(input: {
  technique: StudyTechnique;
  focusMinutes: number;
  breakMinutes: number;
  cyclesPlanned: number;
  routineTaskId?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('start_study_session', {
    p_technique:        input.technique,
    p_focus_minutes:    input.focusMinutes,
    p_break_minutes:    input.breakMinutes,
    p_cycles_planned:   input.cyclesPlanned,
    p_routine_task_id:  input.routineTaskId ?? null,
  });
  if (error) {
    console.warn('[study] startStudySession error', error);
    throw new Error(error.message);
  }
  if (typeof data !== 'string') {
    throw new Error('Respuesta inesperada al iniciar sesión de estudio.');
  }
  return data;
}

export async function completeStudyCycle(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_study_cycle', {
    p_session_id: sessionId,
  });
  if (error) {
    console.warn('[study] completeStudyCycle error', error);
    throw new Error(error.message);
  }
}

export async function finishStudySession(
  sessionId: string,
  status: 'completed' | 'abandoned',
  notes?: string,
): Promise<void> {
  const { error } = await supabase.rpc('finish_study_session', {
    p_session_id: sessionId,
    p_status:     status,
    p_notes:      notes ?? null,
  });
  if (error) {
    console.warn('[study] finishStudySession error', error);
    throw new Error(error.message);
  }
}

export async function fetchStudySession(id: string): Promise<StudySession | null> {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.warn('[study] fetchStudySession error', error);
    return null;
  }
  return (data as StudySession | null) ?? null;
}

export async function fetchActiveStudySession(): Promise<StudySession | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[study] fetchActiveStudySession error', error);
    return null;
  }
  return (data as StudySession | null) ?? null;
}

export async function fetchTodayStudyStats(): Promise<StudyTodayStats> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { cyclesToday: 0, minutesToday: 0, sessionsToday: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since = today.toISOString();

  const { data, error } = await supabase
    .from('study_sessions')
    .select('cycles_completed, focus_minutes')
    .eq('user_id', userId)
    .gte('started_at', since);
  if (error) {
    console.warn('[study] fetchTodayStudyStats error', error);
    return { cyclesToday: 0, minutesToday: 0, sessionsToday: 0 };
  }
  const rows = (data ?? []) as Array<{ cycles_completed: number; focus_minutes: number }>;
  const cyclesToday   = rows.reduce((acc, r) => acc + r.cycles_completed, 0);
  const minutesToday  = rows.reduce((acc, r) => acc + r.cycles_completed * r.focus_minutes, 0);
  return { cyclesToday, minutesToday, sessionsToday: rows.length };
}
