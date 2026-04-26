import { supabase } from './client';
import {
  OnboardingAnswersSchema,
  TargetFrequencySchema,
  TimeSlotSchema,
  type OnboardingAnswers,
  type TargetFrequency,
  type TimeSlot,
} from '@beproud/validation';
import type { TaskCatalogItem } from './tasks';

export type Routine = {
  id: string;
  user_id: string;
  horizon: 'daily' | 'weekly';
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  answers: OnboardingAnswers | null;
  created_at: string;
  updated_at: string;
};

export type RoutineTask = {
  id: string;
  routine_id: string;
  task_id: string;
  target_frequency: TargetFrequency;
  points_override: number | null;
  position: number;
  time_slot: TimeSlot;
  created_at: string;
};

/** RoutineTask + datos de catálogo unidos (lo que necesita la pantalla Rutina). */
export type RoutineTaskWithCatalog = RoutineTask & {
  task: TaskCatalogItem;
};

/** Rutina activa con sus tareas hidratadas y ordenadas por position. */
export type ActiveRoutine = Routine & {
  tasks: RoutineTaskWithCatalog[];
};

/**
 * Genera una rutina nueva (desactiva la anterior si la hay) llamando al
 * RPC `generate_routine` con las respuestas del wizard. Devuelve el id de
 * la rutina creada.
 */
export async function generateRoutine(answers: OnboardingAnswers): Promise<string> {
  // Validamos en cliente antes de mandar al servidor para mensajes claros.
  const parsed = OnboardingAnswersSchema.parse(answers);
  const { data, error } = await supabase.rpc('generate_routine', {
    answers: parsed,
  });
  if (error) {
    if (error.code === '42501') throw new Error('Necesitas iniciar sesión.');
    throw new Error(error.message);
  }
  if (typeof data !== 'string') {
    throw new Error('Respuesta inesperada del servidor al generar la rutina.');
  }
  return data;
}

/** Carga la rutina activa del usuario con todas sus tareas hidratadas. */
export async function fetchActiveRoutine(): Promise<ActiveRoutine | null> {
  const { data: routine, error: routineErr } = await supabase
    .from('routines')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();
  if (routineErr) throw routineErr;
  if (!routine) return null;

  const { data: tasks, error: tasksErr } = await supabase
    .from('routine_tasks')
    .select('*, task:tasks_catalog(*)')
    .eq('routine_id', routine.id)
    .order('position', { ascending: true });
  if (tasksErr) throw tasksErr;

  return {
    ...(routine as Routine),
    tasks: (tasks ?? []) as RoutineTaskWithCatalog[],
  };
}

/**
 * Añade una tarea del catálogo a la rutina activa, en la última posición.
 * Devuelve la routine_task creada (sin hidratar).
 */
export async function addRoutineTask(
  routineId: string,
  taskId: string,
  options: { frequency?: TargetFrequency; timeSlot?: TimeSlot } = {},
): Promise<RoutineTask> {
  // Calculamos la siguiente position con un select de max+1.
  const { data: maxRow, error: maxErr } = await supabase
    .from('routine_tasks')
    .select('position')
    .eq('routine_id', routineId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw maxErr;
  const nextPos = (maxRow?.position ?? -1) + 1;

  const freq = TargetFrequencySchema.parse(options.frequency ?? 'daily');
  const slot = TimeSlotSchema.parse(options.timeSlot ?? 'anytime');

  const { data, error } = await supabase
    .from('routine_tasks')
    .insert({
      routine_id: routineId,
      task_id: taskId,
      target_frequency: freq,
      position: nextPos,
      time_slot: slot,
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new Error('Esa tarea ya está en tu rutina.');
    }
    throw error;
  }
  return data as RoutineTask;
}

/** Cambia el bloque temporal de una routine_task. */
export async function updateRoutineTaskTimeSlot(
  routineTaskId: string,
  timeSlot: TimeSlot,
): Promise<void> {
  const slot = TimeSlotSchema.parse(timeSlot);
  const { error } = await supabase
    .from('routine_tasks')
    .update({ time_slot: slot })
    .eq('id', routineTaskId);
  if (error) throw error;
}

/** Elimina una tarea de la rutina (y compacta posiciones en JS). */
export async function removeRoutineTask(routineTaskId: string): Promise<void> {
  const { error } = await supabase
    .from('routine_tasks')
    .delete()
    .eq('id', routineTaskId);
  if (error) throw error;
}

/** Cambia la frecuencia de una routine_task. */
export async function updateRoutineTaskFrequency(
  routineTaskId: string,
  frequency: TargetFrequency,
): Promise<RoutineTask> {
  const freq = TargetFrequencySchema.parse(frequency);
  const { data, error } = await supabase
    .from('routine_tasks')
    .update({ target_frequency: freq })
    .eq('id', routineTaskId)
    .select()
    .single();
  if (error) throw error;
  return data as RoutineTask;
}

/**
 * Reordena en bloque las routine_tasks de una rutina concreta.
 * Llama al RPC `reorder_routine_tasks`, que actualiza positions en una sola
 * transacción y valida ownership server-side. Es atómico e idempotente.
 */
export async function reorderRoutineTasks(
  routineId: string,
  routineTaskIds: string[],
): Promise<void> {
  if (routineTaskIds.length === 0) return;
  const { error } = await supabase.rpc('reorder_routine_tasks', {
    p_routine_id: routineId,
    p_ids: routineTaskIds,
  });
  if (error) {
    if (error.code === '42501') {
      throw new Error('No tienes permiso para reordenar esta rutina.');
    }
    throw new Error(error.message);
  }
}

/** Devuelve true si el usuario aún no tiene una rutina activa generada. */
export function needsRoutineSetup(routine: ActiveRoutine | null): boolean {
  return routine === null;
}
