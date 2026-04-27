import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createGymRoutineFromTemplate, dayName, type GymTemplate } from '@beproud/api';
import { backOrReplace } from '@/lib/navigation/back';

const TEMPLATES: Array<{
  id: GymTemplate;
  title: string;
  description: string;
  blocks: number;
  defaultDays: number[]; // 0=Lun, 6=Dom
}> = [
  { id: 'full_body_3',   title: 'Full Body × 3',     description: '3 sesiones full body equilibradas. Ideal para principiantes.',         blocks: 3, defaultDays: [0, 2, 4] },
  { id: 'upper_lower_4', title: 'Upper / Lower × 4', description: 'Dos upper y dos lower a la semana.',                                   blocks: 4, defaultDays: [0, 1, 3, 4] },
  { id: 'ppl_3',         title: 'Push Pull Legs × 3', description: 'Push, pull, legs (1×/sem cada uno).',                                 blocks: 3, defaultDays: [0, 2, 4] },
  { id: 'ppl_6',         title: 'Push Pull Legs × 6', description: 'PPL doble por semana. Volumen alto.',                                 blocks: 6, defaultDays: [0, 1, 2, 3, 4, 5] },
  { id: 'bro_split_5',   title: 'Bro split × 5',      description: 'Pecho · Espalda · Hombros · Brazos · Piernas.',                       blocks: 5, defaultDays: [0, 1, 2, 3, 4] },
];

export default function GymSetup() {
  const router = useRouter();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<GymTemplate>('ppl_3');
  const [days, setDays] = useState<number[]>(TEMPLATES[2]!.defaultDays);
  const [error, setError] = useState<string | null>(null);

  const tpl = TEMPLATES.find((t) => t.id === selected)!;

  function pickTemplate(id: GymTemplate) {
    setSelected(id);
    const t = TEMPLATES.find((x) => x.id === id);
    if (t) setDays(t.defaultDays);
  }

  function toggleDay(idx: number) {
    setDays((curr) => {
      if (curr.includes(idx)) return curr.filter((d) => d !== idx);
      if (curr.length >= tpl.blocks) {
        // reemplaza el primero que se añadió.
        return [...curr.slice(1), idx].sort((a, b) => a - b);
      }
      return [...curr, idx].sort((a, b) => a - b);
    });
  }

  const createMut = useMutation({
    mutationFn: () =>
      createGymRoutineFromTemplate(selected, days.length, [...days].sort((a, b) => a - b)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gym-routine'] });
      router.replace('/gym' as never);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error creando rutina'),
  });

  const valid = days.length === tpl.blocks;

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <Header title="Crear rutina" onBack={() => backOrReplace(router, '/gym' as never)} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
          Plantilla
        </Text>
        {TEMPLATES.map((t) => {
          const on = selected === t.id;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => pickTemplate(t.id)}
              className={`mb-2 rounded-2xl border p-3 ${
                on ? 'border-brand-300 bg-brand-300/10' : 'border-brand-700 bg-brand-800/60'
              }`}
            >
              <Text className={`text-base font-extrabold ${on ? 'text-white' : 'text-brand-100'}`}>
                {t.title}
              </Text>
              <Text className="text-xs text-brand-300">{t.description}</Text>
            </Pressable>
          );
        })}

        <Text className="mb-2 mt-4 text-xs uppercase tracking-wider text-brand-300">
          Días de entreno · elige {tpl.blocks}
        </Text>
        <View className="mb-2 flex-row gap-1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const on = days.includes(i);
            return (
              <Pressable
                key={i}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggleDay(i)}
                className={`flex-1 rounded-xl border py-3 ${
                  on
                    ? 'border-brand-300 bg-brand-300/15'
                    : 'border-brand-700 bg-brand-800/60'
                }`}
              >
                <Text
                  className={`text-center text-sm font-extrabold ${
                    on ? 'text-white' : 'text-brand-300'
                  }`}
                >
                  {dayName(i)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="text-xs text-brand-300">
          Seleccionados: {days.length}/{tpl.blocks}
        </Text>

        {error && <Text className="mt-3 text-sm text-red-400">{error}</Text>}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Crear rutina"
          disabled={!valid || createMut.isPending}
          onPress={() => createMut.mutate()}
          className={`mt-6 rounded-full px-5 py-3 ${
            valid ? 'bg-brand-300 active:bg-brand-200' : 'bg-brand-700/60'
          }`}
        >
          {createMut.isPending ? (
            <ActivityIndicator color="#0F253B" />
          ) : (
            <Text
              className={`text-center text-base font-extrabold ${
                valid ? 'text-brand-900' : 'text-brand-300'
              }`}
            >
              Crear rutina
            </Text>
          )}
        </Pressable>
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
