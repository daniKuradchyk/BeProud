import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  dayName,
  deleteRoutineExercise,
  fetchMyGymRoutine,
} from '@beproud/api';

export default function GymRoutineEditor() {
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['gym-routine'], queryFn: fetchMyGymRoutine });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRoutineExercise(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gym-routine'] }),
  });

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <Header title="Mi rutina" onBack={() => router.back()} />
      {q.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      ) : !q.data ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-brand-200">
            No tienes rutina activa.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text className="mb-1 text-2xl font-extrabold text-white">
            {q.data.name}
          </Text>
          <Text className="mb-4 text-xs text-brand-300">
            {q.data.days_per_week} días/semana · plantilla {q.data.template ?? 'custom'}
          </Text>

          {q.data.days.map((d) => (
            <View key={d.id} className="mb-5 rounded-2xl border border-brand-700 bg-brand-800/60 p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-white">
                  {dayName(d.day_index)} · {d.name}
                </Text>
                <Text className="text-xs text-brand-300">
                  {d.exercises.length} ejercicios
                </Text>
              </View>
              {d.exercises.map((re) => (
                <View
                  key={re.id}
                  className="mb-2 flex-row items-center rounded-xl border border-brand-700 bg-brand-800/40 p-3"
                >
                  <View className="flex-1">
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push(`/gym/exercise/${re.exercise.slug}` as never)
                      }
                    >
                      <Text className="text-sm font-bold text-white">
                        {re.exercise.name}
                      </Text>
                    </Pressable>
                    <Text className="text-xs text-brand-300">
                      {re.sets} × {re.reps_min}-{re.reps_max} reps · {re.rest_seconds}s descanso
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Quitar"
                    onPress={() => deleteMut.mutate(re.id)}
                    hitSlop={6}
                    className="rounded-full bg-red-500/15 px-2 py-1 active:bg-red-500/30"
                  >
                    <Text className="text-xs font-bold text-red-200">✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cambiar plantilla"
            onPress={() => router.push('/gym/setup' as never)}
            className="mt-4 rounded-full bg-brand-700 px-4 py-3 active:bg-brand-600"
          >
            <Text className="text-center text-sm font-bold text-white">
              Cambiar plantilla
            </Text>
          </Pressable>
        </ScrollView>
      )}
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
