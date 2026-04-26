import { useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ensureActiveRoutine, fetchActiveRoutine } from '@beproud/api';
import { WIZARD_SLOTS, type WizardSlot } from '@beproud/validation';
import { useSession } from '@/lib/session';
import BlockHubCard from '@/components/routine-design/BlockHubCard';

export default function RoutineDesignHub() {
  const router = useRouter();
  const { refreshRoutine } = useSession();
  const [skipping, setSkipping] = useState(false);
  const routineQ = useQuery({
    queryKey: ['routine', 'active'],
    queryFn: fetchActiveRoutine,
  });

  const tasks = routineQ.data?.tasks ?? [];
  const countBySlot = (s: WizardSlot) => tasks.filter((t) => t.time_slot === s).length;

  async function onSkip() {
    if (skipping) return;
    setSkipping(true);
    try {
      // Asegura una rutina activa (aunque vacía) para que el RouteGuard no
      // devuelva al user a /routine-design al salir.
      await ensureActiveRoutine();
      await refreshRoutine();
      router.replace('/(tabs)/routine' as never);
    } finally {
      setSkipping(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="mb-2 text-2xl font-extrabold text-white">Diseña tu día</Text>
        <Text className="mb-6 text-sm leading-5 text-brand-200">
          Te ayudamos a montar una rutina que de verdad puedas seguir. Empieza por la
          mañana, después la tarde y por último la noche. Puedes hacerlas todas hoy o
          ir poco a poco.
        </Text>

        {WIZARD_SLOTS.map((slot) => (
          <BlockHubCard
            key={slot}
            slot={slot}
            count={countBySlot(slot)}
            onPress={() => router.push(`/routine-design/block/${slot}` as never)}
          />
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Saltar por ahora"
          disabled={skipping}
          onPress={onSkip}
          className="mt-8 self-center px-4 py-2"
        >
          <Text className="text-sm text-brand-300 underline">
            {skipping ? 'Un momento…' : 'Saltar por ahora'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
