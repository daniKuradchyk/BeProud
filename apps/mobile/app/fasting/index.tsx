import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import {
  closeCompletedFasts,
  fetchFastingStats,
  fetchMyProtocol,
} from '@beproud/api';
import { FASTING_PROTOCOL_LABELS } from '@beproud/validation';
import FastingHeader from '@/components/fasting/FastingHeader';
import FastingRing from '@/components/fasting/FastingRing';
import { computeFastingState } from '@/lib/fasting/computeState';
import { formatDuration, formatHHMMSS, formatMinutes } from '@/lib/fasting/format';
import { rescheduleFastingNotifications } from '@/lib/fasting/notifications';

export default function FastingScreen() {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());

  // Tick cada segundo para el timer en vivo.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const protoQ = useQuery({
    queryKey: ['fasting', 'protocol'],
    queryFn: fetchMyProtocol,
  });
  const statsQ = useQuery({
    queryKey: ['fasting', 'stats'],
    queryFn: fetchFastingStats,
  });

  // Al montar: cierra ayunos pendientes (idempotente) + reprograma notifs.
  useEffect(() => {
    closeCompletedFasts().catch(() => undefined);
  }, []);
  useEffect(() => {
    rescheduleFastingNotifications(protoQ.data ?? null).catch(() => undefined);
  }, [protoQ.data]);

  const proto = protoQ.data ?? null;
  const state = useMemo(() => computeFastingState(proto, now), [proto, now]);

  const isFasting = state.phase === 'fasting';
  const isEating  = state.phase === 'eating';
  const ringColor = isFasting ? '#A78BFA' : isEating ? '#34D399' : '#475569';

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <FastingHeader
        title="Ayuno"
        onBack={() => router.back()}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Configurar"
            onPress={() => router.push('/fasting/setup' as never)}
            hitSlop={12}
            className="px-2 py-1"
          >
            <Text className="text-base font-semibold text-brand-200">⚙️</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {!proto || !proto.enabled ? (
          <IdleConfigure onConfigure={() => router.push('/fasting/setup' as never)} />
        ) : state.phase === 'idle' ? (
          <IdleNote reason={state.reason} />
        ) : (
          <View className="items-center">
            <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
              {FASTING_PROTOCOL_LABELS[proto.protocol]}
            </Text>

            <FastingRing progress={state.progressRatio} color={ringColor}>
              {isFasting ? (
                <>
                  <Text className="text-3xl font-extrabold text-white">
                    {formatHHMMSS(state.elapsedMs)}
                  </Text>
                  <Text className="mt-1 text-xs text-brand-300">
                    de {formatDuration(state.plannedMs)}
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-2xl font-extrabold text-white">Ventana abierta</Text>
                  <Text className="mt-1 text-xs text-brand-300">
                    {formatDuration(state.remainingMs)} restantes
                  </Text>
                </>
              )}
            </FastingRing>

            {proto.eat_start && proto.eat_end && (
              <Text className="mt-4 text-sm text-brand-200">
                Ventana {proto.eat_start.slice(0, 5)} – {proto.eat_end.slice(0, 5)}
              </Text>
            )}

            {isFasting && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Romper ayuno"
                onPress={() => router.push('/fasting/break' as never)}
                className="mt-6 rounded-full bg-red-500/20 px-6 py-3 active:bg-red-500/40"
              >
                <Text className="text-sm font-extrabold text-red-300">Romper ayuno</Text>
              </Pressable>
            )}

            <View className="mt-8 w-full flex-row justify-around">
              <Stat icon="🔥" label="Racha" value={`${statsQ.data?.currentStreak ?? 0}`} />
              <Stat
                icon="⏱️"
                label="Más largo"
                value={formatMinutes(statsQ.data?.longestMin ?? 0)}
              />
              <Stat icon="✅" label="Completados" value={`${statsQ.data?.totalCompleted ?? 0}`} />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/fasting/history' as never)}
              className="mt-6 rounded-full bg-brand-700/40 px-5 py-2 active:bg-brand-600/60"
            >
              <Text className="text-sm font-bold text-brand-100">Ver historial</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function IdleConfigure({ onConfigure }: { onConfigure: () => void }) {
  return (
    <View className="items-center px-4 py-12">
      <Text className="mb-2 text-3xl">⏱️</Text>
      <Text className="text-center text-base font-extrabold text-white">
        No tienes protocolo activo
      </Text>
      <Text className="mt-1 text-center text-sm text-brand-300">
        Elige un protocolo (16:8, 18:6, OMAD…) y empezamos.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onConfigure}
        className="mt-6 rounded-full bg-brand-300 px-6 py-3 active:bg-brand-200"
      >
        <Text className="text-base font-extrabold text-brand-900">Configurar</Text>
      </Pressable>
    </View>
  );
}

function IdleNote({ reason }: { reason: 'no_protocol' | 'disabled' | '5_2_off_day' }) {
  const text =
    reason === '5_2_off_day'
      ? 'Hoy no toca día bajo en calorías. Vuelve mañana.'
      : reason === 'disabled'
      ? 'Tu protocolo está desactivado.'
      : 'Sin protocolo activo.';
  return (
    <View className="rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
      <Text className="text-sm text-brand-200">{text}</Text>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="items-center">
      <Text className="text-xl">{icon}</Text>
      <Text className="mt-1 text-base font-extrabold text-white">{value}</Text>
      <Text className="text-[10px] uppercase tracking-wider text-brand-300">{label}</Text>
    </View>
  );
}
