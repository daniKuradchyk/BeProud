import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useGlobalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import Avatar from '@/components/Avatar';
import {
  fetchGroupLeaderboard,
  type GroupLeaderboardEntry,
} from '@beproud/api';

type Period = 'day' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Hoy',
  week: 'Semana',
  month: 'Mes',
};

export default function GroupLeaderboard() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const [period, setPeriod] = useState<Period>('week');

  const q = useQuery({
    queryKey: ['group-leaderboard', id, period],
    queryFn: () => fetchGroupLeaderboard(id, period),
    enabled: !!id,
    refetchInterval: 60_000,
  });

  const podium = (q.data ?? []).slice(0, 3);
  const rest = (q.data ?? []).slice(3);

  return (
    <ScrollView
      className="flex-1 bg-brand-800"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <View className="mb-4 flex-row gap-2">
        {(['day', 'week', 'month'] as Period[]).map((p) => (
          <Pressable
            key={p}
            accessibilityRole="button"
            accessibilityLabel={`Ranking de ${PERIOD_LABELS[p]}`}
            onPress={() => setPeriod(p)}
            className={`flex-1 rounded-full px-3 py-2 ${
              period === p ? 'bg-brand-300' : 'bg-brand-700'
            }`}
          >
            <Text
              className={`text-center text-xs font-extrabold ${
                period === p ? 'text-brand-900' : 'text-brand-200'
              }`}
            >
              {PERIOD_LABELS[p]}
            </Text>
          </Pressable>
        ))}
      </View>

      {q.isLoading && (
        <View className="items-center py-12">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      )}

      {q.isError && (
        <Text className="text-center text-sm text-red-400">
          {q.error instanceof Error ? q.error.message : 'Error cargando ranking'}
        </Text>
      )}

      {!q.isLoading && !q.isError && (q.data ?? []).length === 0 && (
        <Text className="text-center text-sm text-brand-300">
          Sin actividad este periodo.
        </Text>
      )}

      {/* Podio top-3 */}
      {podium.length > 0 && (
        <View className="mb-4 flex-row items-end justify-around">
          {podium.map((p) => (
            <PodiumItem key={p.user_id} entry={p} />
          ))}
        </View>
      )}

      {/* Resto */}
      {rest.map((e) => (
        <View
          key={e.user_id}
          className="mb-2 flex-row items-center rounded-xl border border-brand-700 bg-brand-800/60 p-3"
        >
          <Text className="w-8 text-center text-base font-extrabold text-brand-200">
            {e.rank}
          </Text>
          <Avatar url={e.avatar_url} name={e.display_name} size={36} />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-bold text-white" numberOfLines={1}>
              {e.display_name}
            </Text>
            <Text className="text-xs text-brand-300" numberOfLines={1}>
              @{e.username}
            </Text>
          </View>
          <Text className="text-base font-extrabold text-brand-100">
            {e.points}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function PodiumItem({ entry }: { entry: GroupLeaderboardEntry }) {
  const sizes = { 1: 80, 2: 64, 3: 56 } as const;
  const heights = { 1: 100, 2: 70, 3: 50 } as const;
  const colors = {
    1: 'bg-amber-400',
    2: 'bg-slate-300',
    3: 'bg-amber-700',
  } as const;
  const r = (entry.rank as 1 | 2 | 3) ?? 3;
  const size = sizes[r];
  const height = heights[r];
  const color = colors[r];
  return (
    <View className="items-center" style={{ width: size + 24 }}>
      <Avatar url={entry.avatar_url} name={entry.display_name} size={size} />
      <Text className="mt-2 text-xs font-bold text-white" numberOfLines={1}>
        {entry.display_name}
      </Text>
      <Text className="text-[10px] text-brand-300">{entry.points} pts</Text>
      <View
        className={`mt-2 w-full items-center justify-center rounded-t-md ${color}`}
        style={{ height }}
      >
        <Text className="text-lg font-extrabold text-brand-900">{r}</Text>
      </View>
    </View>
  );
}
