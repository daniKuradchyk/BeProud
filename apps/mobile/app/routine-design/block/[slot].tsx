import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchActiveRoutine, removeRoutineTasksBySlot } from '@beproud/api';
import {
  TIME_SLOT_ICONS,
  TIME_SLOT_LABELS,
  WizardSlotSchema,
  type WizardSlot,
} from '@beproud/validation';

export default function BlockModePicker() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ slot?: string }>();
  const parsed = WizardSlotSchema.safeParse(params.slot);

  const routineQ = useQuery({
    queryKey: ['routine', 'active'],
    queryFn: fetchActiveRoutine,
  });

  const [busy, setBusy] = useState(false);
  const replaceMut = useMutation({
    mutationFn: async (slot: WizardSlot) => {
      const routineId = routineQ.data?.id;
      if (!routineId) throw new Error('Sin rutina activa');
      return removeRoutineTasksBySlot(routineId, slot);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routine', 'active'] }),
  });

  if (!parsed.success) {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <Header title="Bloque inválido" onBack={() => router.back()} />
        <Text className="px-6 text-brand-300">Bloque no válido.</Text>
      </SafeAreaView>
    );
  }

  const slot: WizardSlot = parsed.data;
  const tasksInSlot = (routineQ.data?.tasks ?? []).filter((t) => t.time_slot === slot);
  const alreadyConfigured = tasksInSlot.length > 0;

  function navigateOrConfirm(target: 'wizard' | 'manual') {
    if (alreadyConfigured && target === 'wizard') {
      Alert.alert(
        'Reemplazar bloque',
        `Este bloque ya tiene ${tasksInSlot.length} ${tasksInSlot.length === 1 ? 'tarea' : 'tareas'}. Continuar reemplazará estas tareas por las nuevas que diseñes.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar y reemplazar',
            style: 'destructive',
            onPress: async () => {
              setBusy(true);
              try {
                await replaceMut.mutateAsync(slot);
                router.push(`/routine-design/wizard/${slot}` as never);
              } finally {
                setBusy(false);
              }
            },
          },
        ],
      );
      return;
    }
    router.push(`/routine-design/${target}/${slot}` as never);
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <Header
        title={`${TIME_SLOT_ICONS[slot]} ${TIME_SLOT_LABELS[slot]}`}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="mb-2 text-xl font-extrabold text-white">
          ¿Cómo quieres diseñar tu {TIME_SLOT_LABELS[slot].toLowerCase()}?
        </Text>
        <Text className="mb-6 text-sm text-brand-300">
          Elige una de las dos opciones. Puedes cambiar de opinión en cualquier momento.
        </Text>

        <ModeCard
          emoji="🧠"
          title="Asistente"
          subtitle="Te hago algunas preguntas y te propongo tareas basadas en tus respuestas. ~2 min."
          ctaLabel={busy ? 'Preparando…' : 'Empezar'}
          disabled={busy}
          onPress={() => navigateOrConfirm('wizard')}
        />
        <ModeCard
          emoji="🛠️"
          title="Manual"
          subtitle="Eliges tareas del catálogo tú mismo."
          ctaLabel="Empezar"
          onPress={() => navigateOrConfirm('manual')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ModeCard({
  emoji, title, subtitle, ctaLabel, disabled, onPress,
}: {
  emoji: string; title: string; subtitle: string; ctaLabel: string;
  disabled?: boolean; onPress: () => void;
}) {
  return (
    <View className="mb-3 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
      <Text className="mb-1 text-3xl" style={{ lineHeight: 36 }}>{emoji}</Text>
      <Text className="text-base font-extrabold text-white">{title}</Text>
      <Text className="mt-1 text-sm text-brand-300">{subtitle}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${ctaLabel}`}
        disabled={disabled}
        onPress={onPress}
        className={`mt-3 items-center rounded-full py-3 ${
          disabled ? 'bg-brand-700/40' : 'bg-brand-300 active:bg-brand-200'
        }`}
      >
        <Text className={`text-sm font-extrabold ${disabled ? 'text-brand-400' : 'text-brand-900'}`}>
          {ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        className="px-2 py-1"
      >
        <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
      </Pressable>
      <View className="flex-1 items-center">
        <Text className="text-base font-bold text-white" numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={{ width: 60 }} />
    </View>
  );
}
