import { supabase } from './client';

// ── Tipos ────────────────────────────────────────────────────────────────────

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'glutes' | 'core'
  | 'full_body' | 'cardio_system' | 'lower_back';

export type ExerciseEquipment =
  | 'barbell' | 'dumbbells' | 'machine' | 'cable' | 'bodyweight'
  | 'kettlebell' | 'bands';

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  instructions: string;
  common_mistakes: string[];
  muscle_groups_primary: string[];
  muscle_groups_secondary: string[];
  equipment: ExerciseEquipment[];
  mechanic: 'compound' | 'isolation';
  force: 'push' | 'pull' | 'static' | 'none' | null;
  difficulty: number;
  gif_url: string | null;
  image_url: string | null;
  contraindications: string[];
  evidence_level: 'strong' | 'moderate' | 'weak' | 'consensus' | null;
  references_text: string | null;
};

export type GymRoutineExercise = {
  id: string;
  gym_routine_day_id: string;
  exercise_id: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string | null;
  position: number;
  exercise: Exercise;
};

export type GymRoutineDay = {
  id: string;
  gym_routine_id: string;
  day_index: number; // 0 = Lun, 6 = Dom
  name: string;
  exercises: GymRoutineExercise[];
};

export type GymRoutine = {
  id: string;
  user_id: string;
  name: string;
  template: string | null;
  days_per_week: number;
  is_active: boolean;
  created_at: string;
  days: GymRoutineDay[];
};

export type WorkoutSession = {
  id: string;
  user_id: string;
  gym_routine_day_id: string | null;
  started_at: string;
  ended_at: string | null;
  total_volume: number;
  notes: string | null;
};

export type WorkoutSet = {
  id: string;
  session_id: string;
  user_id: string;
  exercise_id: string;
  set_index: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
  completed_at: string;
};

export type GymTemplate =
  | 'full_body_3' | 'upper_lower_4' | 'ppl_3' | 'ppl_6' | 'bro_split_5';

export type WeeklyVolumeEntry = {
  muscle_group: string;
  sets: number;
  total_kg: number;
};

// ── Catálogo de ejercicios ───────────────────────────────────────────────────

export async function fetchExerciseCatalog(opts?: {
  equipment?: ExerciseEquipment[];
  muscleGroup?: MuscleGroup;
  difficulty?: number;
  search?: string;
  mechanic?: 'compound' | 'isolation';
}): Promise<Exercise[]> {
  let q = supabase.from('exercises').select('*').order('name');
  if (opts?.muscleGroup) q = q.contains('muscle_groups_primary', [opts.muscleGroup]);
  if (opts?.difficulty)  q = q.eq('difficulty', opts.difficulty);
  if (opts?.mechanic)    q = q.eq('mechanic', opts.mechanic);
  if (opts?.search)      q = q.ilike('name', `%${opts.search}%`);
  const { data, error } = await q;
  if (error) {
    console.warn('[gym] fetchExerciseCatalog error', error);
    throw new Error(error.message);
  }
  let items = (data ?? []) as Exercise[];
  if (opts?.equipment && opts.equipment.length > 0) {
    const expanded = expandGymEquipment(opts.equipment);
    items = items.filter((e) =>
      e.equipment.length === 0 || e.equipment.some((eq) => expanded.includes(eq)),
    );
  }
  return items;
}

export async function fetchExerciseBySlug(slug: string): Promise<Exercise | null> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.warn('[gym] fetchExerciseBySlug error', error);
    return null;
  }
  return (data as Exercise | null) ?? null;
}

/** Expande gym_full → barbell + dumbbells + machine + cable + kettlebell + bands + mat.
 *  bodyweight siempre presente. */
export function expandGymEquipment(profileEquipment: string[]): string[] {
  const set = new Set(profileEquipment);
  set.add('bodyweight');
  if (set.has('gym_full')) {
    ['barbell', 'dumbbells', 'machine', 'cable', 'kettlebell', 'bands', 'mat']
      .forEach((e) => set.add(e));
  }
  return Array.from(set);
}

// ── Rutinas de gym ───────────────────────────────────────────────────────────

export async function fetchMyGymRoutine(): Promise<GymRoutine | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data: routine, error } = await supabase
    .from('gym_routines')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!routine) return null;

  const { data: days, error: dayErr } = await supabase
    .from('gym_routine_days')
    .select('*')
    .eq('gym_routine_id', routine.id)
    .order('day_index');
  if (dayErr) throw dayErr;

  const dayIds = (days ?? []).map((d) => d.id);
  const { data: rows, error: exErr } = dayIds.length
    ? await supabase
        .from('gym_routine_exercises')
        .select('*, exercise:exercises(*)')
        .in('gym_routine_day_id', dayIds)
        .order('position')
    : { data: [] as unknown[], error: null };
  if (exErr) throw exErr;

  type Row = GymRoutineExercise & { exercise: Exercise };
  const byDay = new Map<string, GymRoutineExercise[]>();
  for (const r of (rows ?? []) as Row[]) {
    const list = byDay.get(r.gym_routine_day_id) ?? [];
    list.push(r);
    byDay.set(r.gym_routine_day_id, list);
  }

  return {
    ...(routine as Omit<GymRoutine, 'days'>),
    days: (days ?? []).map((d) => ({
      ...(d as Omit<GymRoutineDay, 'exercises'>),
      exercises: byDay.get(d.id) ?? [],
    })),
  };
}

export async function createGymRoutineFromTemplate(
  template: GymTemplate,
  daysPerWeek: number,
  dayIndices: number[],
): Promise<string> {
  const { data, error } = await supabase.rpc('create_gym_routine_from_template', {
    p_template: template,
    p_days_per_week: daysPerWeek,
    p_day_indices: dayIndices,
  });
  if (error) {
    console.warn('[gym] createGymRoutineFromTemplate error', error);
    throw new Error(error.message);
  }
  if (typeof data !== 'string') throw new Error('Respuesta inesperada del servidor');
  return data;
}

export async function deleteRoutineExercise(id: string): Promise<void> {
  const { error } = await supabase.from('gym_routine_exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function updateRoutineExercise(
  id: string,
  patch: Partial<Pick<GymRoutineExercise, 'sets' | 'reps_min' | 'reps_max' | 'rest_seconds' | 'notes'>>,
): Promise<void> {
  const { error } = await supabase.from('gym_routine_exercises').update(patch).eq('id', id);
  if (error) throw error;
}

export async function addRoutineExercise(
  gymRoutineDayId: string,
  exerciseId: string,
  defaults?: Partial<Pick<GymRoutineExercise, 'sets' | 'reps_min' | 'reps_max' | 'rest_seconds'>>,
): Promise<void> {
  const { data: rows } = await supabase
    .from('gym_routine_exercises')
    .select('position')
    .eq('gym_routine_day_id', gymRoutineDayId)
    .order('position', { ascending: false })
    .limit(1);
  const nextPos = ((rows?.[0]?.position as number | undefined) ?? -1) + 1;
  const { error } = await supabase.from('gym_routine_exercises').insert({
    gym_routine_day_id: gymRoutineDayId,
    exercise_id: exerciseId,
    sets: defaults?.sets ?? 3,
    reps_min: defaults?.reps_min ?? 8,
    reps_max: defaults?.reps_max ?? 12,
    rest_seconds: defaults?.rest_seconds ?? 90,
    position: nextPos,
  });
  if (error) throw error;
}

// ── Workout en vivo ──────────────────────────────────────────────────────────

export async function startWorkoutSession(
  gymRoutineDayId: string | null,
): Promise<WorkoutSession> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Necesitas iniciar sesión.');
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: userId, gym_routine_day_id: gymRoutineDayId })
    .select()
    .single();
  if (error) throw error;
  return data as WorkoutSession;
}

export async function fetchWorkoutSession(id: string): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as WorkoutSession | null) ?? null;
}

export async function fetchSessionSets(sessionId: string): Promise<WorkoutSet[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('session_id', sessionId)
    .order('set_index');
  if (error) throw error;
  return (data ?? []) as WorkoutSet[];
}

export async function logSet(input: {
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  reps: number;
  weightKg: number;
  rpe?: number | null;
}): Promise<WorkoutSet> {
  const { data, error } = await supabase
    .from('workout_sets')
    .insert({
      session_id: input.sessionId,
      exercise_id: input.exerciseId,
      set_index: input.setIndex,
      reps: input.reps,
      weight_kg: input.weightKg,
      rpe: input.rpe ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as WorkoutSet;
}

export async function updateSet(id: string, patch: Partial<Pick<WorkoutSet, 'reps' | 'weight_kg' | 'rpe'>>): Promise<void> {
  const { error } = await supabase.from('workout_sets').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteSet(id: string): Promise<void> {
  const { error } = await supabase.from('workout_sets').delete().eq('id', id);
  if (error) throw error;
}

export async function endWorkoutSession(sessionId: string): Promise<WorkoutSession> {
  // Calcula total_volume sumando reps*weight de todos los sets.
  const sets = await fetchSessionSets(sessionId);
  const total = sets.reduce((acc, s) => acc + s.reps * s.weight_kg, 0);
  const { data, error } = await supabase
    .from('workout_sessions')
    .update({
      ended_at: new Date().toISOString(),
      total_volume: Math.round(total * 100) / 100,
    })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return data as WorkoutSession;
}

// ── Progresión ──────────────────────────────────────────────────────────────

export async function estimate1RM(exerciseId: string): Promise<number | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase.rpc('estimate_1rm', {
    p_user_id: userId,
    p_exercise_id: exerciseId,
  });
  if (error) {
    console.warn('[gym] estimate_1rm error', error);
    return null;
  }
  return data == null ? null : Number(data);
}

export async function fetchWeeklyVolumePerMuscle(): Promise<WeeklyVolumeEntry[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase.rpc('weekly_volume_per_muscle', {
    p_user_id: userId,
  });
  if (error) {
    console.warn('[gym] weekly_volume error', error);
    return [];
  }
  type Raw = { muscle_group: string; sets: number | string; total_kg: number | string };
  return ((data ?? []) as Raw[]).map((r) => ({
    muscle_group: r.muscle_group,
    sets: Number(r.sets),
    total_kg: Number(r.total_kg),
  }));
}

export async function fetchExerciseHistory(
  exerciseId: string,
  limit = 30,
): Promise<WorkoutSet[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkoutSet[];
}

export async function fetchRecentSessions(limit = 20): Promise<WorkoutSession[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkoutSession[];
}

export function dayName(idx: number): string {
  return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][idx] ?? '?';
}

/** 0 = Lun, 6 = Dom (consistente con `gym_routine_days.day_index`). */
export function todayLocalDayIndex(): number {
  const d = new Date();
  // getDay(): 0 = Dom, 6 = Sáb. Convertimos a 0=Lun, 6=Dom.
  return (d.getDay() + 6) % 7;
}
