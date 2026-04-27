import { supabase } from './client';
import type { TaskCatalogItem } from './tasks';

export type AiValidationStatus = 'pending' | 'valid' | 'invalid' | 'skipped';

export type TaskCompletion = {
  id: string;
  user_id: string;
  routine_task_id: string | null;
  /** Tras Fase 17 puede ser null si la completion procede de una user_task. */
  task_id: string | null;
  /** Tras Fase 17: completion procedente de user_tasks (Fase 15 wizard). */
  user_task_id: string | null;
  /** Tras Fase 13: nullable (auto_validated meals/study sessions sin foto). */
  photo_path: string | null;
  points_awarded: number;
  ai_validation_status: AiValidationStatus;
  ai_confidence: number | null;
  ai_reason: string | null;
  is_public: boolean;
  created_at: string;
};

/** Una completion + datos de catálogo + URL firmada lista para `<Image source>`. */
export type TaskCompletionWithCatalog = TaskCompletion & {
  task: TaskCatalogItem;
  signed_url: string | null;
};

const BUCKET = 'task-photos';

/**
 * Sube una foto al bucket privado `task-photos` siguiendo el path canónico
 * `{user_id}/{yyyy}/{mm}/{uuid}.{ext}`. Devuelve el path (no la URL firmada,
 * porque la guardamos cruda en BBDD).
 */
export async function uploadTaskPhoto(
  userId: string,
  fileBlob: Blob,
  ext: string,
): Promise<string> {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const now = new Date();
  const yyyy = now.getUTCFullYear().toString();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const uuid = cryptoRandomUuid();
  const path = `${userId}/${yyyy}/${mm}/${uuid}.${safeExt}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileBlob, {
      upsert: false,
      contentType: blobMimeForExt(safeExt),
      cacheControl: '3600',
    });
  if (error) throw error;
  return path;
}

export type CreateTaskCompletionInput = {
  routineTaskId: string | null;
  /** Pasar exactamente uno: taskId (catálogo) o userTaskId (Fase 15). */
  taskId?: string | null;
  userTaskId?: string | null;
  photoPath: string;
  pointsAwarded: number;
  isPublic: boolean;
};

/**
 * Inserta una task_completion. ai_validation_status se queda en 'skipped' (la
 * IA llega en Fase 9). El trigger `bump_user_points` actualiza profile.total_points.
 *
 * Tras Fase 17: la routine_task puede venir de tasks_catalog (taskId) o de
 * user_tasks (userTaskId). Pasamos exactamente uno; el CHECK de la BBDD
 * garantiza la coherencia.
 */
export async function createTaskCompletion(
  input: CreateTaskCompletionInput,
): Promise<TaskCompletion> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user) throw new Error('Necesitas iniciar sesión.');

  const taskId     = input.taskId ?? null;
  const userTaskId = input.userTaskId ?? null;
  if (!taskId === !userTaskId) {
    throw new Error('createTaskCompletion: pasa exactamente uno de taskId o userTaskId.');
  }

  const { data, error } = await supabase
    .from('task_completions')
    .insert({
      user_id: user.id,
      routine_task_id: input.routineTaskId,
      task_id: taskId,
      user_task_id: userTaskId,
      photo_path: input.photoPath,
      points_awarded: input.pointsAwarded,
      is_public: input.isPublic,
      ai_validation_status: 'skipped' as AiValidationStatus,
    })
    .select()
    .single();

  if (error) {
    console.warn('[completions] createTaskCompletion error', error);
    throw new Error(error.message);
  }
  return data as TaskCompletion;
}

/**
 * Devuelve mis completions más recientes hidratadas con tasks_catalog y la
 * URL firmada de la foto (TTL por defecto 1 h).
 * Filtra explícitamente por user_id porque la RLS deja pasar las completions
 * is_public=true de cualquiera.
 */
export async function fetchMyRecentCompletions(
  limit = 30,
): Promise<TaskCompletionWithCatalog[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('task_completions')
    .select('*, task:tasks_catalog(*), user_task:user_tasks(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return await hydrateSignedUrls(data ?? []);
}

/** Completions más recientes asociadas a una tarea concreta (para mi historial). */
export async function fetchCompletionsByTask(
  taskId: string,
  limit = 12,
): Promise<TaskCompletionWithCatalog[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('task_completions')
    .select('*, task:tasks_catalog(*), user_task:user_tasks(*)')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return await hydrateSignedUrls(data ?? []);
}

/**
 * Mapa "día del mes actual → cuántas completions tuve". Las claves son
 * 'YYYY-MM-DD' del día UTC. Solo del mes en curso.
 */
export async function fetchMyMonthlyStats(): Promise<Record<string, number>> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return {};

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const { data, error } = await supabase
    .from('task_completions')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString())
    .lt('created_at', nextMonth.toISOString());
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ created_at: string }>) {
    const day = row.created_at.slice(0, 10); // 'YYYY-MM-DD'
    counts[day] = (counts[day] ?? 0) + 1;
  }
  return counts;
}

/** URL firmada para una foto del bucket privado. Vida útil por defecto 1 h. */
export async function getSignedPhotoUrl(
  path: string,
  ttlSec = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, ttlSec);
  if (error) {
    console.warn('[completions] getSignedPhotoUrl error', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Devuelve la primera completion del día actual (UTC) para una routine_task del
 * usuario logueado, o null si aún no la ha completado hoy. Útil para pintar
 * "Completado hoy ✓" en TaskRow.
 */
export async function fetchTodayCompletionByRoutineTask(
  routineTaskId: string,
): Promise<TaskCompletion | null> {
  const now = new Date();
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .eq('routine_task_id', routineTaskId)
    .gte('created_at', dayStart.toISOString())
    .lt('created_at', dayEnd.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as TaskCompletion | null) ?? null;
}

/** RPC current_streak — días consecutivos hasta hoy. */
export async function getCurrentStreak(): Promise<number> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user) return 0;

  const { data, error } = await supabase.rpc('current_streak', {
    p_user_id: user.id,
  });
  if (error) {
    console.warn('[completions] getCurrentStreak error', error);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}

// ── helpers internos ────────────────────────────────────────────────────────

type RawCompletionRow = TaskCompletion & {
  task: TaskCatalogItem | null;
  user_task?: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    module: string;
    base_points: number;
    icon: string | null;
  } | null;
};

/**
 * Rehidrata cada completion con:
 * - URL firmada de la foto (null si no hay foto, ej. auto_validated meals).
 * - `task` sintético desde user_task cuando la completion procede del wizard
 *   de Fase 15. Así los componentes (PhotoGrid, perfil, recommendations)
 *   pueden seguir leyendo `c.task.title` sin null checks por todas partes.
 */
async function hydrateSignedUrls(
  rows: RawCompletionRow[],
): Promise<TaskCompletionWithCatalog[]> {
  const signed = await Promise.all(
    rows.map((r) =>
      r.photo_path
        ? getSignedPhotoUrl(r.photo_path).catch(() => null)
        : Promise.resolve(null),
    ),
  );
  return rows.map((r, idx) => {
    let task: TaskCatalogItem | null = r.task ?? null;
    if (!task && r.user_task) {
      task = {
        id: r.user_task.id,
        slug: '',
        title: r.user_task.title,
        description: r.user_task.description ?? '',
        category: r.user_task.category,
        base_points: r.user_task.base_points,
        icon: r.user_task.icon ?? null,
        photo_hint: '',
        is_active: true,
        created_at: r.created_at,
        duration_min: null,
        calories_burned: null,
        equipment_required: [],
        muscle_groups: [],
        difficulty: null,
        contraindications: [],
        evidence_level: null,
        references_text: null,
        subcategory: null,
        module: r.user_task.module,
      } as unknown as TaskCatalogItem;
    }
    if (!task) {
      // Última red: la completion no tiene catálogo NI user_task asociado
      // (caso muy raro tras eliminaciones manuales). Sintetizamos un mínimo
      // para no romper la UI.
      task = {
        id: r.task_id ?? r.user_task_id ?? r.id,
        slug: '',
        title: 'Tarea',
        description: '',
        category: 'productivity',
        base_points: r.points_awarded,
        icon: null,
        photo_hint: '',
        is_active: true,
        created_at: r.created_at,
        duration_min: null,
        calories_burned: null,
        equipment_required: [],
        muscle_groups: [],
        difficulty: null,
        contraindications: [],
        evidence_level: null,
        references_text: null,
        subcategory: null,
        module: 'generic',
      } as unknown as TaskCatalogItem;
    }
    return {
      ...r,
      task,
      signed_url: signed[idx] ?? null,
    };
  });
}

function blobMimeForExt(ext: string): string {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

function cryptoRandomUuid(): string {
  // crypto.randomUUID está disponible en RN (Hermes), Deno y navegadores modernos.
  const c: { randomUUID?: () => string } | undefined =
    typeof globalThis !== 'undefined'
      ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
      : undefined;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback: timestamp + random. Suficiente para nombres de archivo.
  const rand = Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${rand}`;
}
