import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import {
  estimate1RM,
  fetchExerciseBySlug,
  fetchExerciseHistory,
} from '@beproud/api';

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', arms: 'Brazos',
  legs: 'Piernas', glutes: 'Glúteos', core: 'Core', full_body: 'Full body',
  cardio_system: 'Cardio', lower_back: 'Lumbar', neck: 'Cuello',
};

export default function ExerciseDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const exQ = useQuery({
    queryKey: ['exercise', slug],
    queryFn: () => fetchExerciseBySlug(slug),
    enabled: !!slug,
  });

  const oneRMQ = useQuery({
    queryKey: ['exercise-1rm', exQ.data?.id],
    queryFn: () => estimate1RM(exQ.data!.id),
    enabled: !!exQ.data?.id,
  });

  const histQ = useQuery({
    queryKey: ['exercise-history', exQ.data?.id],
    queryFn: () => fetchExerciseHistory(exQ.data!.id, 30),
    enabled: !!exQ.data?.id,
  });

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <Header onBack={() => router.back()} title="Ejercicio" />

      {exQ.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#A9C6E8" /></View>
      ) : !exQ.data ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-bold text-white">No encontrado</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text className="text-2xl font-extrabold text-white">{exQ.data.name}</Text>
          <Text className="mt-1 text-xs text-brand-300">
            {exQ.data.muscle_groups_primary.map((m) => MUSCLE_LABELS[m] ?? m).join(' · ')}
            {' · '}{exQ.data.mechanic === 'compound' ? 'compound' : 'isolation'}
            {' · '}{'★'.repeat(exQ.data.difficulty)}
          </Text>

          {/* Visual */}
          <View className="mt-3 overflow-hidden rounded-2xl bg-brand-700/30" style={{ aspectRatio: 16 / 9 }}>
            {exQ.data.gif_url ? (
              <Image
                source={{ uri: exQ.data.gif_url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text style={{ fontSize: 64 }}>🏋️</Text>
                <Text className="mt-1 text-xs text-brand-300">Vídeo en breve</Text>
              </View>
            )}
          </View>

          {exQ.data.description && (
            <Text className="mt-3 text-sm text-brand-100">{exQ.data.description}</Text>
          )}

          {/* 1RM */}
          {oneRMQ.data != null && (
            <View className="mt-4 rounded-2xl border border-brand-300/40 bg-brand-300/10 p-4">
              <Text className="text-[10px] uppercase tracking-wider text-brand-100">
                Tu 1RM estimado (Brzycki, 90 días)
              </Text>
              <Text className="mt-1 text-3xl font-extrabold text-white">
                ~{Math.round(oneRMQ.data)} kg
              </Text>
            </View>
          )}

          {/* Instructions */}
          <Section title="Instrucciones">
            <Text className="text-sm leading-5 text-brand-100">
              {exQ.data.instructions}
            </Text>
          </Section>

          {/* Common mistakes */}
          {exQ.data.common_mistakes.length > 0 && (
            <Section title="Errores comunes">
              {exQ.data.common_mistakes.map((m, i) => (
                <Text key={i} className="text-sm leading-5 text-brand-100">
                  • {m}
                </Text>
              ))}
            </Section>
          )}

          {/* Equipment */}
          {exQ.data.equipment.length > 0 && (
            <Section title="Equipo">
              <View className="flex-row flex-wrap gap-2">
                {exQ.data.equipment.map((e) => (
                  <View key={e} className="rounded-full bg-brand-700 px-3 py-1">
                    <Text className="text-xs font-bold text-brand-100">{e}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {/* Contraindications */}
          {exQ.data.contraindications.length > 0 && (
            <Section title="Precauciones">
              <View className="flex-row flex-wrap gap-2">
                {exQ.data.contraindications.map((c) => (
                  <View key={c} className="rounded-full bg-red-500/15 px-3 py-1">
                    <Text className="text-xs font-bold text-red-200">⚠ {c}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {/* Mi historial */}
          <Section title="Tu historial">
            {histQ.isLoading ? (
              <ActivityIndicator color="#A9C6E8" />
            ) : (histQ.data ?? []).length === 0 ? (
              <Text className="text-xs text-brand-300">
                Aún no has registrado sets de este ejercicio.
              </Text>
            ) : (
              (histQ.data ?? []).slice(0, 12).map((s) => (
                <View
                  key={s.id}
                  className="mb-1 flex-row items-center rounded-lg border border-brand-700 bg-brand-800/60 p-2"
                >
                  <Text className="flex-1 text-xs text-brand-300">
                    {new Date(s.completed_at).toLocaleDateString('es-ES', {
                      day: '2-digit', month: 'short',
                    })}
                  </Text>
                  <Text className="text-sm font-bold text-white">
                    {s.weight_kg} kg × {s.reps}
                  </Text>
                </View>
              ))
            )}
          </Section>

          {exQ.data.references_text && (
            <View className="mt-4 rounded-xl border border-brand-700 bg-brand-800/60 p-3">
              <Text className="text-[10px] uppercase tracking-wider text-brand-300">
                Referencia
              </Text>
              <Text className="mt-1 text-xs text-brand-200">
                {exQ.data.references_text}
              </Text>
            </View>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
        {title}
      </Text>
      {children}
    </View>
  );
}
