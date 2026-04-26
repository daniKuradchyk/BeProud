import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { startStudySession } from '@beproud/api';
import {
  STUDY_TECHNIQUE_PRESETS,
  type StudyTechnique,
} from '@beproud/validation';
import { TECHNIQUE_OPTIONS, clampInt } from '@/features/study/lib/techniques';

export default function StudyStart() {
  const router = useRouter();
  const params = useLocalSearchParams<{ routineTaskId?: string }>();
  const routineTaskId = typeof params.routineTaskId === 'string' ? params.routineTaskId : null;

  const [tech, setTech] = useState<StudyTechnique>('pomodoro_25_5');
  const initialPreset = STUDY_TECHNIQUE_PRESETS[
    tech === 'custom' ? 'pomodoro_25_5' : tech
  ];
  const [focus, setFocus]     = useState<number>(initialPreset.focus);
  const [breakM, setBreakM]   = useState<number>(initialPreset.break);
  const [cycles, setCycles]   = useState<number>(initialPreset.cycles);
  const [error, setError]     = useState<string | null>(null);

  function pickTech(value: StudyTechnique) {
    setTech(value);
    if (value !== 'custom') {
      const p = STUDY_TECHNIQUE_PRESETS[value];
      setFocus(p.focus);
      setBreakM(p.break);
      setCycles(p.cycles);
    }
  }

  const startMut = useMutation({
    mutationFn: () =>
      startStudySession({
        technique: tech,
        focusMinutes:  clampInt(focus,  5, 90),
        breakMinutes:  clampInt(breakM, 1, 30),
        cyclesPlanned: clampInt(cycles, 1, 12),
        routineTaskId,
      }),
    onSuccess: (id) => {
      router.replace(`/study/session/${id}` as never);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  });

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <Header onBack={() => router.back()} title="Sesión de estudio" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
          Técnica
        </Text>
        {TECHNIQUE_OPTIONS.map((o) => {
          const on = tech === o.value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => pickTech(o.value)}
              className={`mb-2 rounded-2xl border p-3 ${
                on ? 'border-brand-300 bg-brand-300/10' : 'border-brand-700 bg-brand-800/60'
              }`}
            >
              <Text className={`text-base font-extrabold ${on ? 'text-white' : 'text-brand-100'}`}>
                {o.label}
              </Text>
              <Text className="text-xs text-brand-300">{o.description}</Text>
            </Pressable>
          );
        })}

        {tech === 'custom' && (
          <View className="mt-2 mb-2 rounded-2xl border border-brand-700 bg-brand-800/60 p-3">
            <NumberRow label="Foco (min)"     value={focus}  setValue={setFocus}  min={5} max={90} />
            <NumberRow label="Descanso (min)" value={breakM} setValue={setBreakM} min={1} max={30} />
            <NumberRow label="Ciclos"          value={cycles} setValue={setCycles} min={1} max={12} />
          </View>
        )}

        <View className="mt-2 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
          <Text className="text-[10px] uppercase tracking-wider text-brand-300">
            Resumen
          </Text>
          <Text className="mt-1 text-base font-extrabold text-white">
            {focus} min foco · {breakM} min descanso · {cycles} ciclos
          </Text>
          <Text className="mt-1 text-xs text-brand-300">
            Total ~{focus * cycles + breakM * (cycles - 1)} min
          </Text>
        </View>

        {error && <Text className="mt-3 text-sm text-red-400">{error}</Text>}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Empezar sesión"
          disabled={startMut.isPending}
          onPress={() => startMut.mutate()}
          className="mt-6 rounded-full bg-brand-300 px-5 py-3 active:bg-brand-200"
        >
          <Text className="text-center text-base font-extrabold text-brand-900">
            {startMut.isPending ? 'Empezando…' : 'Empezar'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function NumberRow({
  label, value, setValue, min, max,
}: {
  label: string; value: number; setValue: (n: number) => void; min: number; max: number;
}) {
  return (
    <View className="mb-2 flex-row items-center">
      <Text className="flex-1 text-sm text-brand-200">{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setValue(clampInt(value - 1, min, max))}
        className="h-8 w-8 items-center justify-center rounded-full bg-brand-700/60 active:bg-brand-600"
      >
        <Text className="text-base font-bold text-white">−</Text>
      </Pressable>
      <TextInput
        value={String(value)}
        onChangeText={(t) => setValue(clampInt(Number(t), min, max))}
        keyboardType="numeric"
        className="mx-2 min-w-[48px] rounded-md bg-brand-700/40 px-2 py-1 text-center text-base font-bold text-white"
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => setValue(clampInt(value + 1, min, max))}
        className="h-8 w-8 items-center justify-center rounded-full bg-brand-700/60 active:bg-brand-600"
      >
        <Text className="text-base font-bold text-white">+</Text>
      </Pressable>
    </View>
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
