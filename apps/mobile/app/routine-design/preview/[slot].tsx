import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { applyWizardProposal, fetchMyProtocol } from '@beproud/api';
import { useSession } from '@/lib/session';
import type { FastingProtocol } from '@beproud/validation';
import {
  TIME_SLOT_LABELS,
  WizardSlotSchema,
  type ProposedTask,
  type WizardSlot,
} from '@beproud/validation';
import { getWizardForSlot, useRoutineWizardStore } from '@/lib/routineWizard/store';
import { runWizard } from '@/lib/routineWizard/runWizard';
import ProposedTaskRow from '@/components/routine-design/ProposedTaskRow';
import { backOrReplace } from '@/lib/navigation/back';

export default function PreviewScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { refreshRoutine } = useSession();
  const params = useLocalSearchParams<{ slot?: string }>();
  const parsed = WizardSlotSchema.safeParse(params.slot);
  const slot: WizardSlot | null = parsed.success ? parsed.data : null;

  const { answers, slot: storedSlot, reset } = useRoutineWizardStore();
  const [proposals, setProposals] = useState<ProposedTask[]>([]);

  const wizard = useMemo(() => (slot ? getWizardForSlot(slot) : null), [slot]);

  useEffect(() => {
    if (!wizard) return;
    if (storedSlot !== slot) return; // respuestas no son de este slot
    setProposals(runWizard(wizard, answers));
    // Las respuestas vienen del store (fuente de verdad). No depende de
    // `answers` para evitar regenerar la propuesta tras una edición local.
  }, [wizard, storedSlot, slot, answers]);

  const acceptMut = useMutation({
    mutationFn: async () => {
      const inserted = await applyWizardProposal(slot as WizardSlot, proposals);
      // Detecta si la respuesta del wizard sugiere onboarding al ayuno.
      const fastingHint = detectFastingHint(slot, answers);
      if (fastingHint) {
        const existing = await fetchMyProtocol().catch(() => null);
        if (!existing) return { inserted, fastingHint };
      }
      return { inserted, fastingHint: null as null };
    },
    onSuccess: async (result) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['routine', 'active'] }),
        refreshRoutine(),
      ]);
      reset();
      if (result.fastingHint) {
        router.replace(
          `/fasting/setup?protocol=${result.fastingHint}&from=wizard` as never,
        );
      } else {
        router.replace('/routine-design' as never);
      }
    },
  });

  if (!slot || !wizard) {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <Text className="px-6 py-8 text-brand-300">Bloque no válido.</Text>
      </SafeAreaView>
    );
  }

  function removeAt(i: number) {
    setProposals((prev) => prev.filter((_, idx) => idx !== i));
  }

  function startOver() {
    reset();
    router.replace(`/routine-design/wizard/${slot}` as never);
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => backOrReplace(router, `/routine-design/block/${slot}` as never)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-white">Tu propuesta</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text className="mb-3 text-xl font-extrabold text-white">
          Tu {TIME_SLOT_LABELS[slot].toLowerCase()} propuesta
        </Text>

        {proposals.length === 0 ? (
          <Text className="text-sm text-brand-300">
            No hay propuestas con tus respuestas. Vuelve y prueba otras opciones.
          </Text>
        ) : (
          proposals.map((p, i) => (
            <ProposedTaskRow key={`${p.title}-${i}`} proposal={p} onRemove={() => removeAt(i)} />
          ))
        )}
      </ScrollView>

      <View className="gap-2 px-4 pb-6 pt-2">
        {acceptMut.isError && (
          <Text className="text-sm text-red-400">
            {acceptMut.error instanceof Error ? acceptMut.error.message : 'No se pudo crear'}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Aceptar y crear"
          disabled={proposals.length === 0 || acceptMut.isPending}
          onPress={() => acceptMut.mutate()}
          className={`items-center rounded-full py-3 ${
            proposals.length === 0 || acceptMut.isPending
              ? 'bg-brand-700/40'
              : 'bg-brand-300 active:bg-brand-200'
          }`}
        >
          <Text
            className={`text-base font-extrabold ${
              proposals.length === 0 || acceptMut.isPending ? 'text-brand-400' : 'text-brand-900'
            }`}
          >
            {acceptMut.isPending ? 'Creando…' : `Aceptar y crear (${proposals.length})`}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={startOver}
          className="items-center rounded-full bg-brand-700/40 py-3 active:bg-brand-600/60"
        >
          <Text className="text-sm font-bold text-brand-100">Empezar de nuevo</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/**
 * Mapea las respuestas del wizard a un protocolo de ayuno si procede.
 * Devuelve el slug FastingProtocol o null si no hay señal de ayuno.
 */
function detectFastingHint(
  slot: WizardSlot | null,
  answers: Record<string, unknown>,
): FastingProtocol | null {
  if (!slot) return null;
  if (slot === 'morning') {
    const breakfast = answers['breakfast'];
    if (breakfast === 'fasting') return '16_8';
  }
  if (slot === 'evening') {
    const fc = answers['fasting_close'];
    if (fc === 'yes_16_8') return '16_8';
    if (fc === 'yes_18_6') return '18_6';
    if (fc === 'yes_other') return 'custom';
  }
  return null;
}
