import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';

import {
  fetchExerciseBySlug,
  fetchExerciseHistory,
  fetchRecentSessions,
  fetchWeeklyVolumePerMuscle,
  type Exercise,
  type WorkoutSet,
} from '@beproud/api';
import MuscleVolumeBars from '@/features/gym/components/MuscleVolumeBars';
import Sparkline from '@/features/gym/components/Sparkline';
import { backOrReplace } from '@/lib/navigation/back';

const KEY_LIFTS = [
  { slug: 'squat_back',           label: 'Sentadilla' },
  { slug: 'bench_press_barbell',  label: 'Press banca' },
  { slug: 'deadlift_conventional',label: 'Peso muerto' },
  { slug: 'overhead_press_barbell', label: 'Press militar' },
  { slug: 'barbell_row',          label: 'Remo' },
];

function brzycki1RM(weight: number, reps: number): number {
  const r = Math.min(Math.max(reps, 1), 12);
  return weight * (36 / (37 - r));
}

function weeksAgo(date: Date): number {
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

export default function GymProgress() {
  const router = useRouter();

  const volumeQ = useQuery({
    queryKey: ['gym-weekly-volume'],
    queryFn: fetchWeeklyVolumePerMuscle,
    refetchInterval: 5 * 60_000,
  });

  const sessionsQ = useQuery({
    queryKey: ['gym-recent-sessions'],
    queryFn: () => fetchRecentSessions(10),
  });

  // Resuelve los exercises de los key lifts para obtener sus IDs.
  const liftsQ = useQueries({
    queries: KEY_LIFTS.map((k) => ({
      queryKey: ['exercise', k.slug],
      queryFn: () => fetchExerciseBySlug(k.slug),
    })),
  });

  const liftHistQ = useQueries({
    queries: liftsQ.map((q) => {
      const ex = q.data as Exercise | null | undefined;
      return {
        queryKey: ['exercise-history', ex?.id ?? 'pending'],
        queryFn: () => (ex ? fetchExerciseHistory(ex.id, 60) : Promise.resolve([])),
        enabled: !!ex,
      };
    }),
  });

  const liftSparkData = useMemo(() => {
    return KEY_LIFTS.map((k, i) => {
      const sets = (liftHistQ[i]?.data ?? []) as WorkoutSet[];
      // Agrupa por semana (12 últimas), max 1RM brzycki por semana.
      const buckets = new Map<number, number>(); // week_offset → max 1rm
      for (const s of sets) {
        const w = weeksAgo(new Date(s.completed_at));
        if (w > 11) continue;
        const est = brzycki1RM(s.weight_kg, s.reps);
        buckets.set(w, Math.max(buckets.get(w) ?? 0, est));
      }
      const arr: { x: number; y: number }[] = [];
      for (let w = 11; w >= 0; w--) {
        const v = buckets.get(w);
        if (v != null) arr.push({ x: w, y: Math.round(v) });
      }
      return { ...k, data: arr };
    });
  }, [liftHistQ]);

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <Header onBack={() => backOrReplace(router, '/gym' as never)} title="Progreso" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
          Volumen esta semana por grupo muscular
        </Text>
        {volumeQ.isLoading ? (
          <ActivityIndicator color="#A9C6E8" />
        ) : (
          <MuscleVolumeBars data={volumeQ.data ?? []} />
        )}

        <Text className="mt-6 mb-2 text-xs uppercase tracking-wider text-brand-300">
          Lifts clave (1RM estimado, 12 semanas)
        </Text>
        {liftSparkData.map((l) => (
          <View
            key={l.slug}
            className="mb-3 rounded-xl border border-brand-700 bg-brand-800/60 p-3"
          >
            <Text className="mb-2 text-sm font-bold text-white">{l.label}</Text>
            {l.data.length < 2 ? (
              <Text className="text-xs text-brand-300">
                Sin datos suficientes (haz al menos 2 sesiones).
              </Text>
            ) : (
              <Sparkline values={l.data} />
            )}
          </View>
        ))}

        <Text className="mt-6 mb-2 text-xs uppercase tracking-wider text-brand-300">
          Últimos workouts
        </Text>
        {sessionsQ.isLoading ? (
          <ActivityIndicator color="#A9C6E8" />
        ) : (sessionsQ.data ?? []).length === 0 ? (
          <Text className="text-xs text-brand-300">
            Aún no has terminado ningún workout.
          </Text>
        ) : (
          (sessionsQ.data ?? []).map((s) => {
            const minutes = s.ended_at
              ? Math.max(
                  1,
                  Math.round(
                    (new Date(s.ended_at).getTime() -
                      new Date(s.started_at).getTime()) / 60000,
                  ),
                )
              : 0;
            return (
              <View
                key={s.id}
                className="mb-2 rounded-xl border border-brand-700 bg-brand-800/60 p-3"
              >
                <Text className="text-sm font-bold text-white">
                  {new Date(s.started_at).toLocaleDateString('es-ES', {
                    day: '2-digit', month: 'short', weekday: 'short',
                  })}
                </Text>
                <Text className="text-xs text-brand-300">
                  {minutes} min · {Math.round(s.total_volume)} kg movidos
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver" className="px-2 py-1">
        <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
      </Pressable>
      <View className="flex-1 items-center">
        <Text className="text-base font-bold text-white">{title}</Text>
      </View>
      <View style={{ width: 60 }} />
    </View>
  );
}
