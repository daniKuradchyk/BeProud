import { supabase } from './client';
import {
  ProposedTaskSchema,
  type ProposedTask,
  type TaskCategory,
  type Module,
  type UserTaskSource,
} from '@beproud/validation';

export type UserTask = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  module: Module;
  base_points: number;
  difficulty: number;
  source: UserTaskSource;
  icon: string | null;
  created_at: string;
};

export async function createUserTask(input: ProposedTask): Promise<UserTask> {
  const parsed = ProposedTaskSchema.parse(input);
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const userId = auth.user?.id;
  if (!userId) throw new Error('not_authenticated');

  const { data, error } = await supabase
    .from('user_tasks')
    .insert({
      user_id: userId,
      title:        parsed.title,
      description:  parsed.description ?? null,
      category:     parsed.category,
      module:       parsed.module,
      base_points:  parsed.base_points,
      source:       'manual',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as UserTask;
}

export async function fetchMyUserTasks(): Promise<UserTask[]> {
  const { data, error } = await supabase
    .from('user_tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserTask[];
}

export async function deleteUserTask(id: string): Promise<void> {
  const { error } = await supabase.from('user_tasks').delete().eq('id', id);
  if (error) throw error;
}
