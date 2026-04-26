import { supabase } from './client';

export type RecommendationType = 'task' | 'break' | 'reflect' | 'streak' | 'social';

export type RecommendationAction =
  | { kind: 'complete_task'; params: { routine_task_id: string; slug: string } }
  | { kind: 'open_screen';   params: { route: string } }
  | { kind: 'none';          params?: Record<string, unknown> };

export type Recommendation = {
  type: RecommendationType;
  priority: number;
  title: string;
  subtitle: string;
  action: RecommendationAction;
};

export type DailyRecommendations = {
  greeting: string;
  coach_message: string;
  recommendations: Recommendation[];
  today_progress: {
    completed: number;
    total_in_routine: number;
    points_today: number;
    streak_current: number;
  };
};

const DEFAULT: DailyRecommendations = {
  greeting: '',
  coach_message: '',
  recommendations: [],
  today_progress: { completed: 0, total_in_routine: 0, points_today: 0, streak_current: 0 },
};

export async function fetchDailyRecommendations(): Promise<DailyRecommendations> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return DEFAULT;

  const { data, error } = await supabase.rpc('daily_recommendations', {
    p_user_id: userId,
  });
  if (error) {
    console.warn('[recommendations] fetchDailyRecommendations error', error);
    return DEFAULT;
  }
  return (data ?? DEFAULT) as DailyRecommendations;
}
