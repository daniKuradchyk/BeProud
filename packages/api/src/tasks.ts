import { supabase } from './client';
import type { Module, TaskCategory } from '@beproud/validation';

export type EvidenceLevel = 'strong' | 'moderate' | 'weak' | 'consensus';

/**
 * Una tarea del catálogo público con metadata científica (Fase 11B).
 */
export type TaskCatalogItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: TaskCategory;
  base_points: number;
  icon: string | null;
  photo_hint: string;
  is_active: boolean;
  created_at: string;
  // Fase 11B
  duration_min:       number | null;
  calories_burned:    number | null;
  equipment_required: string[];
  muscle_groups:      string[];
  difficulty:         number | null;
  contraindications:  string[];
  evidence_level:     EvidenceLevel | null;
  references_text:    string | null;
  subcategory:        string | null;
  // Fase 15
  module:             Module;
};

export type TaskCatalogFilters = {
  category?:     TaskCategory;
  search?:       string;
  /** Solo tareas cuyo equipment_required ⊆ profileEquipment (con gym_full meta). */
  equipment?:    string[];
  /** Solo tareas que NO contraindican estas restricciones. */
  restrictions?: string[];
  muscleGroup?:  string;
  difficulty?:   number;
  subcategory?:  string;
};

/** Catálogo filtrado. Las restricciones de equipment/contraindications se
 *  resuelven en cliente porque PostgREST no soporta `<@` con arrays
 *  parametrizados de forma directa para todas las versiones. */
export async function fetchTaskCatalog(
  opts?: TaskCatalogFilters,
): Promise<TaskCatalogItem[]> {
  let q = supabase
    .from('tasks_catalog')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('base_points', { ascending: false });

  if (opts?.category)    q = q.eq('category', opts.category);
  if (opts?.subcategory) q = q.eq('subcategory', opts.subcategory);
  if (opts?.difficulty)  q = q.eq('difficulty', opts.difficulty);
  if (opts?.muscleGroup) q = q.contains('muscle_groups', [opts.muscleGroup]);
  if (opts?.search) {
    q = q.ilike('title', `%${opts.search}%`);
  }

  const { data, error } = await q;
  if (error) throw error;

  let items = (data ?? []) as TaskCatalogItem[];

  // Filtros equipment/restrictions resueltos en cliente.
  if (opts?.equipment) {
    const expanded = expandEquipment(opts.equipment);
    items = items.filter((t) =>
      (t.equipment_required ?? []).every((e) => expanded.includes(e)),
    );
  }
  if (opts?.restrictions && opts.restrictions.length > 0) {
    const restr = new Set(opts.restrictions);
    items = items.filter(
      (t) => !(t.contraindications ?? []).some((c) => restr.has(c)),
    );
  }
  return items;
}

/** Devuelve la lista de equipos requeridos por una tarea que el usuario NO tiene.
 *  Si el array vacío, la tarea está accesible. */
export function missingEquipment(
  task: TaskCatalogItem,
  profileEquipment: string[],
): string[] {
  const expanded = expandEquipment(profileEquipment);
  return (task.equipment_required ?? []).filter((e) => !expanded.includes(e));
}

/** Mapea profile.equipment → set expandido considerando que gym_full
 *  satisface también dumbbells/kettlebell/bands/pullup_bar/mat (ítems
 *  que se encuentran en un gym típico). bicycle/treadmill quedan fuera. */
export function expandEquipment(profileEquipment: string[]): string[] {
  const set = new Set(profileEquipment);
  if (set.has('gym_full')) {
    ['none', 'dumbbells', 'kettlebell', 'resistance_bands', 'pullup_bar', 'mat']
      .forEach((e) => set.add(e));
  }
  return Array.from(set);
}

export async function fetchTaskBySlug(slug: string): Promise<TaskCatalogItem | null> {
  const { data, error } = await supabase
    .from('tasks_catalog')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.warn('[tasks] fetchTaskBySlug error', error);
    return null;
  }
  return (data as TaskCatalogItem | null) ?? null;
}

export async function fetchCategoriesWithCounts(): Promise<
  Array<{ category: TaskCategory; count: number }>
> {
  const all = await fetchTaskCatalog();
  const counts = new Map<TaskCategory, number>();
  for (const t of all) {
    counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));
}
