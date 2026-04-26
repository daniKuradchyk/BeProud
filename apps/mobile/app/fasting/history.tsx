import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { fetchFastingHistory, fetchFastingStats } from '@beproud/api';
import FastingHeader from '@/components/fasting/FastingHeader';
import FastingHistoryRow from '@/components/fasting/FastingHistoryRow';
import { formatMinutes } from '@/lib/fasting/format';

export default function FastingHistory() {
  const router = useRouter();
  const historyQ = useQuery({
    queryKey: ['fasting', 'history'],
    queryFn: () => fetchFastingHistory(30),
  });
  const statsQ = useQuery({
    queryKey: ['fasting', 'stats'],
    queryFn: fetchFastingStats,
  });
  const stats = statsQ.data;

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <FastingHeader title="Historial de ayuno" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="mb-4 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
          <Text className="text-xs uppercase tracking-wider text-brand-300">Resumen</Text>
          <Text className="mt-1 text-sm text-white">
            {stats?.totalCompleted ?? 0} ayunos completados
          </Text>
          <Text className="text-sm text-white">
            Más largo: {formatMinutes(stats?.longestMin ?? 0)}
          </Text>
          <Text className="text-sm text-white">
            Total acumulado: {formatMinutes(stats?.totalMin ?? 0)}
          </Text>
          <Text className="text-sm text-white">
            Racha actual: {stats?.currentStreak ?? 0} ayunos
          </Text>
        </View>

        {(historyQ.data ?? []).length === 0 ? (
          <Text className="text-sm text-brand-300">
            Aún no hay ayunos registrados.
          </Text>
        ) : (
          (historyQ.data ?? []).map((log) => (
            <FastingHistoryRow key={log.id} log={log} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
