import { supabase } from './client';
import {
  OnboardingAnswersSchema,
  TargetFrequencySchema,
  TimeSlotSchema,
  type OnboardingAnswers,
  type ProposedTask,
  type TargetFrequency,
  type TaskCategory,
  type TaskSource,
  type TimeSlot,
  type WizardSlot,
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
  task_id: string | null;
  user_task_id: string | null;
  target_frequency: TargetFrequency;
  points_override: number | null;
  position: number;
  time_slot: TimeSlot;
  created_at: string;
};

/**
 * RoutineTask hidratada con datos del origen (catálogo o user_task).
 * Mantiene la propiedad `task` para no romper consumers existentes.
 * `task_source` permite diferenciar el origen y `slug` solo está en catálogo.
 */
export type RoutineTaskWithCatalog = RoutineTask & {
  task: TaskCatalogItem;
  task_source: TaskSource;
};

/** Rutina activa con sus tareas hidratadas y ordenadas por position. */
export type ActiveRoutine = Routine & {
  tasks: RoutineTaskWithCatalog[];
};

type ResolvedRow = {
  id: string;
  routine_id: string;
  position: number;
  target_frequency: TargetFrequency;
  points_override: number | null;
  time_slot: TimeSlot;
  created_at: string;
  task_id: string | null;
  user_task_id: string | null;
  title: string;
  description: string | null;
  category: TaskCategory;
  module: 'generic' | 'gym' | 'study' | 'nutrition';
  base_points: number;
  difficulty: number | null;
  icon: string | null;
  slug: string | null;
  task_source: TaskSource;
};

/**
 * Genera una rutina nueva (desactiva la anterior si la hay) llamando al
 * RPC `generate_routine` con las respuestas del wizard. Devuelve el id de
 * la rutina creada.
 *
 * Se conserva como método alternativo. El flujo principal en Fase 15+ es
 * el wizard de diseño guiado por bloques (`applyWizardProposal`).
 */
export async function generateRoutine(answers: OnboardingAnswers): Promise<string> {
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

function rehydrateRow(row: ResolvedRow): RoutineTaskWithCatalog {
  // Reconstruimos el shape `task: TaskCatalogItem` para no romper consumers.
  // Los campos que no aplican a user_tasks (slug, photo_hint, etc.) se rellenan
  // con valores neutros tipados.
  const task = {
    id: row.task_id ?? row.user_task_id ?? row.id,
    slug: row.slug ?? '',
    title: row.title,
    description: row.description ?? '',
    category: row.category,
    base_points: row.base_points,
    icon: row.icon ?? null,
    photo_hint: '',
    duration_min: null,
    calories_burned: null,
    equipment_required: [],
    muscle_groups: [],
    difficulty: row.difficulty,
    contraindications: [],
    evidence_level: null,
    references_text: null,
    subcategory: null,
    module: row.module,
    is_active: true,
    created_at: row.created_at,
  } as unknown as TaskCatalogItem;

  return {
    id: row.id,
    routine_id: row.routine_id,
    task_id: row.task_id,
    user_task_id: row.user_task_id,
    target_frequency: row.target_frequency,
    points_override: row.points_override,
    position: row.position,
    time_slot: row.time_slot,
    created_at: row.created_at,
    task,
    task_source: row.task_source,
  };
}

/** Carga la rutina activa del usuario con sus tareas hidratadas desde la vista. */
export async function fetchActiveRoutine(): Promise<ActiveRoutine | null> {
  const { data: routine, error: routineErr } = await supabase
    .from('routines')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();
  if (routineErr) throw routineErr;
  if (!routine) return null;

  const { data: rows, error: rowsErr } = await supabase
    .from('routine_tasks_resolved')
    .select('*')
    .eq('routine_id', routine.id)
    .order('position', { ascending: true });
  if (rowsErr) throw rowsErr;

  const tasks = ((rows ?? []) as ResolvedRow[]).map(rehydrateRow);
  return { ...(routine as Routine), tasks };
}

/**
 * Añade una tarea a la rutina, en la última posición.
 * Exactamente uno de `taskId` (catálogo) o `userTaskId` debe ser non-null.
 */
export async function addRoutineTask(
  routineId: string,
  source: { taskId?: string; userTaskId?: string },
  options: { frequency?: TargetFrequency; timeSlot?: TimeSlot } = {},
): Promise<RoutineTask> {
  const taskId = source.taskId ?? null;
  const userTaskId = source.userTaskId ?? null;
  if (!taskId === !userTaskId) {
    throw new Error('addRoutineTask: pasa exactamente uno de taskId o userTaskId');
  }

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
      user_task_id: userTaskId,
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

/** Elimina una tarea de la rutina. */
export async function removeRoutineTask(routineTaskId: string): Promise<void> {
  const { error } = await supabase
    .from('routine_tasks')
    .delete()
    .eq('id', routineTaskId);
  if (error) throw error;
}

/**
 * Borra todas las routine_tasks de un slot concreto. Útil al "rediseñar"
 * un bloque desde Settings: las user_tasks asociadas se borran por cascada
 * via FK cuando ya no quedan routine_tasks que las referencien (si fueron
 * creadas por el wizard). Las tareas de catálogo no se afectan.
 *
 * Implementación: borra primero las routine_tasks, luego limpia las
 * user_tasks huérfanas (sin ningún routine_task asociado al user actual).
 */
export async function removeRoutineTasksBySlot(
  routineId: string,
  slot: TimeSlot,
): Promise<number> {
  const { data: rows, error: selErr } = await supabase
    .from('routine_tasks')
    .select('id, user_task_id')
    .eq('routine_id', routineId)
    .eq('time_slot', slot);
  if (selErr) throw selErr;
  const ids = (rows ?? []).map((r) => r.id as string);
  const userTaskIds = (rows ?? [])
    .map((r) => r.user_task_id as string | null)
    .filter((v): v is string => v != null);
  if (ids.length === 0) return 0;

  const { error: delErr } = await supabase
    .from('routine_tasks')
    .delete()
    .in('id', ids);
  if (delErr) throw delErr;

  if (userTaskIds.length > 0) {
    // Borra las user_tasks que ya no referencian ninguna routine_task.
    const { data: stillUsed } = await supabase
      .from('routine_tasks')
      .select('user_task_id')
      .in('user_task_id', userTaskIds);
    const inUse = new Set((stillUsed ?? []).map((r) => r.user_task_id as string));
    const orphaned = userTaskIds.filter((id) => !inUse.has(id));
    if (orphaned.length > 0) {
      await supabase.from('user_tasks').delete().in('id', orphaned);
    }
  }

  return ids.length;
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

/** Reordena en bloque las routine_tasks (RPC reorder_routine_tasks). */
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

/**
 * Aplica una propuesta del wizard. Crea user_tasks para items sin
 * `catalog_slug` y enlaza al catálogo cuando lo tienen.
 */
export async function applyWizardProposal(
  slot: WizardSlot | 'anytime',
  proposals: ProposedTask[],
): Promise<number> {
  if (proposals.length === 0) return 0;
  const { data, error } = await supabase.rpc('apply_wizard_proposal', {
    p_slot: slot,
    p_proposals: proposals,
  });
  if (error) {
    if (error.code === '42501') throw new Error('Necesitas iniciar sesión.');
    throw new Error(error.message);
  }
  return (data as number) ?? proposals.length;
}

/**
 * Devuelve true si el user debe pasar por el flujo de diseño porque aún no
 * tiene rutina activa. Una rutina activa **vacía** ya cuenta como "lista":
 * el user pudo haber pulsado "Saltar por ahora" y ver el empty state en la
 * pestaña Rutina hasta que decida volver a `/routine-design` (desde Settings
 * o desde el propio empty state).
 */
export function needsRoutineSetup(routine: ActiveRoutine | null): boolean {
  return routine === null;
}

/**
 * Devuelve la rutina activa del user, creándola vacía si no existe.
 * Usado al "Saltar por ahora" para que el RouteGuard no atrape al user
 * en /routine-design para siempre.
 */
export async function ensureActiveRoutine(): Promise<Routine> {
  const { data: existing, error: selErr } = await supabase
    .from('routines')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing as Routine;

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const userId = auth.user?.id;
  if (!userId) throw new Error('not_authenticated');

  const { data, error } = await supabase
    .from('routines')
    .insert({ user_id: userId, is_active: true })
    .select('*')
    .single();
  if (error) throw error;
  return data as Routine;
}
