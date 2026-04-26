import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import {
  fetchDailyRecommendations,
  type Recommendation,
  type RoutineTaskWithCatalog,
} from '@beproud/api';
import RecommendationCard from './RecommendationCard';

type Props = {
  /** La rutina activa, para resolver routine_task_id → RoutineTaskWithCatalog
   *  cuando una recomendación pide complete_task. */
  routineTasks: RoutineTaskWithCatalog[];
  /** Callback al pulsar una rec con action=complete_task. El componente padre
   *  abre el CompleteSheet. */
  onCompleteTask: (rt: RoutineTaskWithCatalog) => void;
};

export default function TodaySection({ routineTasks, onCompleteTask }: Props) {
  const router = useRouter();
  const q = useQuery({
    queryKey: ['daily-recommendations'],
    queryFn: fetchDailyRecommendations,
    refetchOnMount: 'always',
    refetchInterval: 5 * 60_000,
  });

  function handleAction(r: Recommendation) {
    const a = r.action;
    if (a.kind === 'complete_task') {
      const rt = routineTasks.find((x) => x.id === a.params.routine_task_id);
      if (rt) onCompleteTask(rt);
    } else if (a.kind === 'open_screen') {
      router.push(a.params.route as never);
    }
  }

  if (q.isLoading) {
    return (
      <View className="mb-6 items-center py-3">
        <ActivityIndicator color="#A9C6E8" />
      </View>
    );
  }

  const data = q.data;
  if (!data) return null;

  const { greeting, coach_message, recommendations, today_progress } = data;
  const total = today_progress.total_in_routine;
  const done  = today_progress.completed;
  const ratio = total > 0 ? Math.min(1, done / total) : 0;

  return (
    <View className="mb-6">
      <Text className="text-3xl font-extrabold text-white" numberOfLines={2}>
        {greeting}
      </Text>
      <Text className="mt-1 text-sm italic text-brand-100">
        💬 {coach_message}
      </Text>

      <View className="mt-4 rounded-2xl border border-brand-700 bg-brand-800/60 p-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[10px] uppercase tracking-wider text-brand-300">
              Hoy
            </Text>
            <Text className="text-base font-extrabold text-white">
              {done} de {total} tareas · {today_progress.points_today} pts
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[10px] uppercase tracking-wider text-brand-300">
              Racha
            </Text>
            <Text className="text-base font-extrabold text-amber-200">
              🔥 {today_progress.streak_current}
            </Text>
          </View>
        </View>
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-700/60">
          <View
            className="h-full bg-brand-300"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </View>
      </View>

      {recommendations.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{ paddingRight: 12 }}
        >
          {recommendations.map((r, i) => (
            <RecommendationCard
              key={`${r.title}-${i}`}
              recommendation={r}
              onPress={() => handleAction(r)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
