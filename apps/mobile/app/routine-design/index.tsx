import { useState } from 'react';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ensureActiveRoutine, fetchActiveRoutine } from '@beproud/api';
import { WIZARD_SLOTS, type WizardSlot } from '@beproud/validation';
import { useSession } from '@/lib/session';
import { Body, Caption, Heading, RefreshableScrollView, Skeleton } from '@/components/primitives';
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
      await ensureActiveRoutine();
      await refreshRoutine();
      router.replace('/(tabs)/routine' as never);
    } finally {
      setSkipping(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-0">
      <RefreshableScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Heading size="lg" className="mb-2">Diseña tu día</Heading>
        <Body size="md" tone={2} className="mb-6">
          Te ayudamos a montar una rutina que de verdad puedas seguir. Empieza
          por la mañana, después la tarde y por último la noche. Puedes hacerlas
          todas hoy o ir poco a poco.
        </Body>

        {routineQ.isLoading ? (
          <>
            <Skeleton className="mb-3 h-24 w-full rounded-xl" />
            <Skeleton className="mb-3 h-24 w-full rounded-xl" />
            <Skeleton className="mb-3 h-24 w-full rounded-xl" />
          </>
        ) : (
          WIZARD_SLOTS.map((slot, i) => (
            <BlockHubCard
              key={slot}
              slot={slot}
              count={countBySlot(slot)}
              delay={i * 80}
              onPress={() => router.push(`/routine-design/block/${slot}` as never)}
            />
          ))
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Saltar por ahora"
          disabled={skipping}
          onPress={onSkip}
          className="mt-8 self-center px-4 py-2"
        >
          <Caption variant="caption" tone={3} className="underline">
            {skipping ? 'Un momento…' : 'Saltar por ahora'}
          </Caption>
        </Pressable>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}
