import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchMyProtocol, logBreakEarly } from '@beproud/api';
import FastingHeader from '@/components/fasting/FastingHeader';
import { computeFastingState } from '@/lib/fasting/computeState';
import { formatDuration } from '@/lib/fasting/format';
import { rescheduleFastingNotifications } from '@/lib/fasting/notifications';
import { backOrReplace } from '@/lib/navigation/back';

export default function FastingBreak() {
  const router = useRouter();
  const qc = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const protoQ = useQuery({
    queryKey: ['fasting', 'protocol'],
    queryFn: fetchMyProtocol,
  });
  const proto = protoQ.data ?? null;
  const state = useMemo(() => computeFastingState(proto, now), [proto, now]);

  const breakMut = useMutation({
    mutationFn: async () => {
      if (!proto) throw new Error('Sin protocolo');
      if (state.phase !== 'fasting') throw new Error('No estás en ayuno');
      await logBreakEarly({
        startedAt: state.windowClosedAt.toISOString(),
        endedAt:   now.toISOString(),
        protocol:  proto.protocol,
        plannedMin: Math.round(state.plannedMs / 60_000),
        actualMin:  Math.round(state.elapsedMs / 60_000),
      });
      await rescheduleFastingNotifications(proto);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['fasting'] });
      router.replace('/fasting' as never);
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <FastingHeader
        title="Romper ayuno"
        onBack={() => backOrReplace(router, '/fasting' as never)}
      />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="mb-2 text-3xl">⚠️</Text>
        <Text className="mb-2 text-center text-xl font-extrabold text-white">
          ¿Seguro que quieres romper tu ayuno?
        </Text>
        {state.phase === 'fasting' ? (
          <Text className="text-center text-sm text-brand-300">
            Llevas {formatDuration(state.elapsedMs)} de un objetivo de {formatDuration(state.plannedMs)}.
            {'\n'}Te quedan {formatDuration(state.remainingMs)}.
          </Text>
        ) : (
          <Text className="text-center text-sm text-brand-300">
            No estás en fase de ayuno ahora mismo.
          </Text>
        )}

        {breakMut.isError && (
          <Text className="mt-4 text-sm text-red-400">
            {breakMut.error instanceof Error ? breakMut.error.message : 'Error'}
          </Text>
        )}

        <View className="mt-6 w-full gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Romper igualmente"
            disabled={breakMut.isPending || state.phase !== 'fasting'}
            onPress={() => breakMut.mutate()}
            className={`items-center rounded-full py-3 ${
              breakMut.isPending || state.phase !== 'fasting'
                ? 'bg-brand-700/40'
                : 'bg-red-500/20 active:bg-red-500/40'
            }`}
          >
            <Text
              className={`text-sm font-extrabold ${
                breakMut.isPending || state.phase !== 'fasting'
                  ? 'text-brand-400'
                  : 'text-red-300'
              }`}
            >
              {breakMut.isPending ? 'Cerrando…' : 'Romper igualmente'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => backOrReplace(router, '/fasting' as never)}
            className="items-center rounded-full bg-brand-700/40 py-3 active:bg-brand-600/60"
          >
            <Text className="text-sm font-bold text-brand-100">Volver</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
