import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  dayName,
  fetchMyGymRoutine,
  startWorkoutSession,
  todayLocalDayIndex,
} from '@beproud/api';

export default function GymDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const todayIdx = todayLocalDayIndex();

  const routineQ = useQuery({
    queryKey: ['gym-routine'],
    queryFn: fetchMyGymRoutine,
  });

  const startMut = useMutation({
    mutationFn: (gymRoutineDayId: string | null) => startWorkoutSession(gymRoutineDayId),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['gym-routine'] });
      router.push(`/gym/workout/${s.id}` as never);
    },
  });

  const todayDay = useMemo(() => {
    return routineQ.data?.days.find((d) => d.day_index === todayIdx) ?? null;
  }, [routineQ.data, todayIdx]);

  const otherDays = useMemo(
    () => (routineQ.data?.days ?? []).filter((d) => d.day_index !== todayIdx),
    [routineQ.data, todayIdx],
  );

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <Header onBack={() => router.back()} title="Gimnasio" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {routineQ.isLoading ? (
          <ActivityIndicator color="#A9C6E8" />
        ) : !routineQ.data ? (
          <View className="items-center py-8">
            <Text className="mb-3 text-2xl">🏋️</Text>
            <Text className="mb-2 text-base font-extrabold text-white">
              Aún no tienes rutina de gym
            </Text>
            <Text className="mb-4 text-center text-sm text-brand-200">
              Elige una plantilla y la adaptamos a tu equipo.
            </Text>
            <Big
              label="Crear rutina"
              onPress={() => router.push('/gym/setup' as never)}
            />
          </View>
        ) : (
          <>
            {todayDay ? (
              <View className="mb-4 rounded-2xl border border-brand-300/40 bg-brand-300/10 p-4">
                <Text className="text-[10px] uppercase tracking-wider text-brand-100">
                  Hoy es día de
                </Text>
                <Text className="mt-1 text-3xl font-extrabold text-white">
                  {todayDay.name}
                </Text>
                <Text className="mt-1 text-xs text-brand-200">
                  {todayDay.exercises.length} ejercicios
                </Text>
                <Big
                  label={startMut.isPending ? 'Empezando…' : 'Empezar workout'}
                  onPress={() => startMut.mutate(todayDay.id)}
                  disabled={startMut.isPending}
                  className="mt-3"
                />
              </View>
            ) : (
              <View className="mb-4 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
                <Text className="text-base font-extrabold text-white">
                  Hoy es día de descanso
                </Text>
                <Text className="mt-1 text-xs text-brand-300">
                  Tu rutina cubre: {(routineQ.data.days).map((d) => dayName(d.day_index)).join(' · ')}
                </Text>
              </View>
            )}

            {otherDays.length > 0 && (
              <View className="mb-4">
                <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
                  Otros días
                </Text>
                {otherDays.map((d) => (
                  <Pressable
                    key={d.id}
                    accessibilityRole="button"
                    onPress={() => startMut.mutate(d.id)}
                    className="mb-2 flex-row items-center rounded-xl border border-brand-700 bg-brand-800/60 p-3 active:bg-brand-700/40"
                  >
                    <Text className="w-12 text-xs font-extrabold text-brand-200">
                      {dayName(d.day_index)}
                    </Text>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-white">{d.name}</Text>
                      <Text className="text-xs text-brand-300">
                        {d.exercises.length} ejercicios
                      </Text>
                    </View>
                    <Text className="text-base text-brand-200">›</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View className="mt-2 flex-row gap-2">
              <Box label="Mi rutina"      emoji="📋" onPress={() => router.push('/gym/routine' as never)} />
              <Box label="Ejercicios"     emoji="📚" onPress={() => router.push('/gym/exercises' as never)} />
            </View>
            <View className="mt-2 flex-row gap-2">
              <Box label="Progreso"       emoji="📈" onPress={() => router.push('/gym/progress' as never)} />
              <Box label="Cambiar plan"   emoji="🔄" onPress={() => router.push('/gym/setup' as never)} />
            </View>
          </>
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

function Big({
  label, onPress, disabled, className,
}: {
  label: string; onPress: () => void; disabled?: boolean; className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      className={`rounded-full bg-brand-300 px-5 py-3 active:bg-brand-200 ${
        disabled ? 'opacity-60' : ''
      } ${className ?? ''}`}
    >
      <Text className="text-center text-base font-extrabold text-brand-900">
        {label}
      </Text>
    </Pressable>
  );
}

function Box({
  label, emoji, onPress,
}: {
  label: string; emoji: string; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="flex-1 rounded-2xl border border-brand-700 bg-brand-800/60 p-4 active:bg-brand-700/40"
    >
      <Text className="text-2xl">{emoji}</Text>
      <Text className="mt-2 text-sm font-extrabold text-white">{label}</Text>
    </Pressable>
  );
}
