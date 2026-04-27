import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import {
  fetchExerciseCatalog,
  type Exercise,
  type MuscleGroup,
} from '@beproud/api';
import { backOrReplace } from '@/lib/navigation/back';

const MUSCLES: Array<{ key: MuscleGroup | 'all'; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'chest', label: 'Pecho' },
  { key: 'back', label: 'Espalda' },
  { key: 'shoulders', label: 'Hombros' },
  { key: 'arms', label: 'Brazos' },
  { key: 'legs', label: 'Piernas' },
  { key: 'glutes', label: 'Glúteos' },
  { key: 'core', label: 'Core' },
];

export default function GymExercises() {
  const router = useRouter();
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<number | 'all'>('all');

  const q = useQuery({
    queryKey: ['exercise-catalog', muscle, difficulty, search],
    queryFn: () => fetchExerciseCatalog({
      muscleGroup: muscle === 'all' ? undefined : (muscle as MuscleGroup),
      difficulty: difficulty === 'all' ? undefined : difficulty,
      search: search.trim() || undefined,
    }),
  });

  const items: Exercise[] = q.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <Header title="Ejercicios" onBack={() => backOrReplace(router, '/gym' as never)} />
      <View className="px-4 pb-2">
        <TextInput
          placeholder="Buscar ejercicio…"
          placeholderTextColor="#7DA9DC"
          value={search}
          onChangeText={setSearch}
          className="mb-2 rounded-xl border border-brand-600 bg-brand-700/50 px-4 py-3 text-base text-white"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 12 }}>
          {MUSCLES.map((m) => (
            <Pressable
              key={m.key}
              accessibilityRole="button"
              onPress={() => setMuscle(m.key)}
              className={`rounded-full border px-3 py-1.5 ${
                muscle === m.key ? 'border-brand-300 bg-brand-300' : 'border-brand-600 bg-brand-700/40'
              }`}
            >
              <Text className={`text-xs font-bold ${muscle === m.key ? 'text-brand-900' : 'text-brand-100'}`}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 6, paddingRight: 12 }}>
          {(['all', 1, 2, 3, 4, 5] as const).map((d) => (
            <Pressable
              key={String(d)}
              accessibilityRole="button"
              onPress={() => setDifficulty(d)}
              className={`rounded-full border px-3 py-1 ${
                difficulty === d ? 'border-brand-300 bg-brand-300/40' : 'border-brand-600 bg-brand-700/40'
              }`}
            >
              <Text className={`text-[11px] font-bold ${difficulty === d ? 'text-white' : 'text-brand-200'}`}>
                {d === 'all' ? 'Cualquier dificultad' : `${'★'.repeat(d)}`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {q.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 40 }}>
          {items.length === 0 ? (
            <Text className="mt-8 text-center text-sm text-brand-300">
              Sin coincidencias.
            </Text>
          ) : (
            items.map((e) => (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                accessibilityLabel={e.name}
                onPress={() => router.push(`/gym/exercise/${e.slug}` as never)}
                className="mb-2 flex-row items-center rounded-xl border border-brand-700 bg-brand-800/60 p-3 active:bg-brand-700/40"
              >
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-brand-700">
                  <Text style={{ fontSize: 20 }}>
                    {e.mechanic === 'compound' ? '🏋️' : '💪'}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-white" numberOfLines={1}>
                    {e.name}
                  </Text>
                  <Text className="text-xs text-brand-300" numberOfLines={1}>
                    {e.muscle_groups_primary.join(', ')} · {'★'.repeat(e.difficulty)}
                  </Text>
                </View>
                <Text className="text-base text-brand-200">›</Text>
              </Pressable>
            ))
          )}
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
