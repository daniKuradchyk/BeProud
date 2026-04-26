import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { WizardSlotSchema, type WizardSlot } from '@beproud/validation';
import { getDefaultAnswer, type Answer, type Answers } from '@/lib/routineWizard/types';
import { getWizardForSlot, useRoutineWizardStore } from '@/lib/routineWizard/store';
import WizardProgressBar from '@/components/routine-design/WizardProgressBar';
import WizardQuestion from '@/components/routine-design/WizardQuestion';

export default function WizardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slot?: string }>();
  const parsed = WizardSlotSchema.safeParse(params.slot);
  const setStore = useRoutineWizardStore((s) => s.set);
  const slot: WizardSlot | null = parsed.success ? parsed.data : null;

  const wizard = useMemo(() => (slot ? getWizardForSlot(slot) : null), [slot]);

  // Inicializa respuestas con defaults.
  const [answers, setAnswers] = useState<Answers>(() => {
    if (!wizard) return {};
    const init: Answers = {};
    for (const q of wizard.questions) init[q.id] = getDefaultAnswer(q);
    return init;
  });
  const [idx, setIdx] = useState(0);

  const q = wizard ? wizard.questions[idx] : undefined;

  if (!wizard || !slot || !q) {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <Text className="px-6 py-8 text-brand-300">Bloque no válido.</Text>
      </SafeAreaView>
    );
  }

  const isLast = idx === wizard.questions.length - 1;

  function next() {
    if (!isLast) {
      setIdx(idx + 1);
      return;
    }
    setStore(slot!, answers);
    router.replace(`/routine-design/preview/${slot}` as never);
  }

  function back() {
    if (idx > 0) setIdx(idx - 1);
    else router.back();
  }

  const qId = q.id;
  function setValue(v: Answer) {
    setAnswers((prev) => ({ ...prev, [qId]: v }));
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={back}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-white">
            Pregunta {idx + 1} de {wizard.questions.length}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <WizardProgressBar total={wizard.questions.length} current={idx} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <WizardQuestion question={q} value={answers[q.id]} onChange={setValue} />
      </ScrollView>

      <View className="px-4 pb-6 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Ver mi propuesta' : 'Siguiente'}
          onPress={next}
          className="items-center rounded-full bg-brand-300 py-3 active:bg-brand-200"
        >
          <Text className="text-base font-extrabold text-brand-900">
            {isLast ? 'Ver mi propuesta →' : 'Siguiente'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
