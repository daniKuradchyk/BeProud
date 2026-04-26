import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import Avatar from '@/components/Avatar';
import Screen from '@/components/Screen';
import { useSession } from '@/lib/session';
import {
  fetchGlobalLeaderboard,
  fetchMyGroups,
  fetchMyLeaguePosition,
  fetchWeekHistory,
  type GroupWithCounts,
  type LeaderboardEntry,
  type League,
  type MyLeaguePosition,
  type WeekHistoryEntry,
} from '@beproud/api';

type Tab = 'global' | 'groups' | 'history';

const TAB_LABELS: Record<Tab, string> = {
  global: 'Global',
  groups: 'Mis grupos',
  history: 'Histórico',
};

export default function RankingsScreen() {
  const [tab, setTab] = useState<Tab>('global');

  return (
    <Screen>
      <Text className="mb-1 text-3xl font-extrabold text-white">Rankings</Text>
      <Text className="mb-4 text-sm text-brand-200">
        Tu posición global, en tus grupos y a lo largo de las semanas.
      </Text>

      <View className="mb-4 flex-row rounded-full border border-brand-700 bg-brand-800/60 p-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityLabel={TAB_LABELS[t]}
            onPress={() => setTab(t)}
            className={`flex-1 rounded-full px-3 py-2 ${
              tab === t ? 'bg-brand-300' : ''
            }`}
          >
            <Text
              className={`text-center text-xs font-extrabold ${
                tab === t ? 'text-brand-900' : 'text-brand-200'
              }`}
            >
              {TAB_LABELS[t]}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'global' && <GlobalTab />}
      {tab === 'groups' && <GroupsTab />}
      {tab === 'history' && <HistoryTab />}
    </Screen>
  );
}

// ── Global ────────────────────────────────────────────────────────────────

function GlobalTab() {
  const { user } = useSession();

  const position = useQuery({
    queryKey: ['my-league-position'],
    queryFn: fetchMyLeaguePosition,
    refetchInterval: 60_000,
  });

  const board = useQuery({
    queryKey: ['leaderboard-global', 0],
    queryFn: () => fetchGlobalLeaderboard(0, 100),
    refetchInterval: 60_000,
  });

  const myEntry = useMemo(() => {
    if (!user || !board.data) return null;
    return board.data.find((e) => e.user_id === user.id) ?? null;
  }, [user, board.data]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <LeagueCard position={position.data ?? null} loading={position.isLoading} />

      {myEntry && (
        <View className="mb-3 rounded-2xl border border-brand-300/40 bg-brand-300/10 p-3">
          <Text className="text-[10px] font-extrabold uppercase tracking-wider text-brand-200">
            Tu posición esta semana
          </Text>
          <View className="mt-1 flex-row items-center">
            <Text className="w-10 text-center text-base font-extrabold text-white">
              #{myEntry.rank}
            </Text>
            <Text className="flex-1 text-sm text-brand-100">
              {myEntry.points} pts
            </Text>
            <Trend rank={myEntry.rank} />
          </View>
        </View>
      )}

      {board.isLoading ? (
        <View className="items-center py-12">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      ) : (board.data ?? []).length === 0 ? (
        <View className="items-center py-12">
          <Text className="text-sm text-brand-300">
            Aún nadie tiene puntos esta semana.
          </Text>
          <Text className="mt-1 text-center text-xs text-brand-300">
            Completa tareas y aparecerás aquí en la siguiente actualización.
          </Text>
        </View>
      ) : (
        (board.data ?? []).map((e) => (
          <BoardRow
            key={e.user_id}
            entry={e}
            highlighted={user?.id === e.user_id}
          />
        ))
      )}
    </ScrollView>
  );
}

function LeagueCard({
  position,
  loading,
}: {
  position: MyLeaguePosition | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <View className="mb-4 items-center rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
        <ActivityIndicator color="#A9C6E8" />
      </View>
    );
  }

  if (!position?.league) {
    return (
      <View className="mb-4 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
        <Text className="text-sm text-brand-300">
          Sin liga aún esta semana — completa tareas para entrar en Bronce.
        </Text>
      </View>
    );
  }

  const { league, prev_league, next_league, points, progress } = position;
  const max = league.max_points_week ?? league.min_points_week + 100;

  return (
    <View
      className="mb-4 rounded-2xl border p-4"
      style={{
        backgroundColor: `#${league.color}15`,
        borderColor: `#${league.color}55`,
      }}
    >
      <View className="flex-row items-center">
        <View
          className="h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `#${league.color}33` }}
        >
          <Text style={{ fontSize: 28 }}>{league.icon}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[10px] font-extrabold uppercase tracking-wider text-white/70">
            Tu liga · semana en curso
          </Text>
          <Text className="text-2xl font-extrabold text-white">{league.name}</Text>
          <Text className="text-xs text-white/70">
            {points} pts · puesto #{position.rank || '—'}
          </Text>
        </View>
      </View>

      <View className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <View
          style={{
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: `#${league.color}`,
          }}
          className="h-full"
        />
      </View>
      <View className="mt-1 flex-row justify-between">
        <Text className="text-[10px] text-white/70">
          {prev_league ? `${prev_league.icon} ${prev_league.name}` : 'Inicio'}
        </Text>
        <Text className="text-[10px] text-white/70">
          {league.max_points_week == null
            ? 'Top tier'
            : next_league
              ? `${next_league.icon} ${next_league.name}`
              : 'Top tier'}
        </Text>
      </View>
      <Text className="mt-2 text-[11px] text-white/80">
        {league.max_points_week == null
          ? `Estás en la liga más alta. ¡Mantén el ritmo!`
          : `${Math.max(0, max - points + 1)} pts para ${
              next_league ? next_league.name : 'la siguiente liga'
            }.`}
      </Text>
    </View>
  );
}

function BoardRow({
  entry,
  highlighted,
}: {
  entry: LeaderboardEntry;
  highlighted: boolean;
}) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir perfil de ${entry.display_name}`}
      onPress={() => {
        if (entry.username) router.push(`/user/${entry.username}` as never);
      }}
      className={`mb-2 flex-row items-center rounded-xl border p-3 ${
        highlighted
          ? 'border-brand-300 bg-brand-300/15'
          : 'border-brand-700 bg-brand-800/60'
      } active:bg-brand-700/40`}
    >
      <Text className="w-8 text-center text-base font-extrabold text-brand-200">
        {entry.rank}
      </Text>
      <Avatar url={entry.avatar_url} name={entry.display_name} size={36} />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-bold text-white" numberOfLines={1}>
          {entry.display_name}
        </Text>
        <Text className="text-xs text-brand-300" numberOfLines={1}>
          @{entry.username}
        </Text>
      </View>
      <Text className="text-base font-extrabold text-brand-100">
        {entry.points}
      </Text>
    </Pressable>
  );
}

function Trend({ rank }: { rank: number }) {
  // Heurística simple sin histórico de la semana anterior:
  // top 10 → subes; 11..50 → mantienes; 51+ → bajas.
  const direction =
    rank > 0 && rank <= 10 ? 'up' : rank > 50 ? 'down' : 'flat';
  const label =
    direction === 'up' ? '↑ subes' : direction === 'down' ? '↓ bajas' : '→ mantienes';
  const color =
    direction === 'up'
      ? 'text-emerald-300'
      : direction === 'down'
        ? 'text-red-300'
        : 'text-brand-200';
  return <Text className={`text-xs font-extrabold ${color}`}>{label}</Text>;
}

// ── Mis grupos ────────────────────────────────────────────────────────────

function GroupsTab() {
  const router = useRouter();
  const groups = useQuery({
    queryKey: ['my-groups'],
    queryFn: fetchMyGroups,
  });

  if (groups.isLoading) {
    return (
      <View className="items-center py-12">
        <ActivityIndicator color="#A9C6E8" />
      </View>
    );
  }
  return (
    <FlatList
      data={groups.data ?? []}
      keyExtractor={(g) => g.id}
      renderItem={({ item }) => (
        <GroupRankRow
          group={item}
          onPress={() => router.push(`/group/${item.id}/leaderboard` as never)}
        />
      )}
      ListEmptyComponent={
        <View className="items-center py-12">
          <Text className="mb-2 text-base font-bold text-white">
            Aún no estás en ningún grupo
          </Text>
          <Text className="text-center text-sm text-brand-200">
            Únete a uno desde Perfil → Mis grupos.
          </Text>
        </View>
      }
    />
  );
}

function GroupRankRow({
  group,
  onPress,
}: {
  group: GroupWithCounts;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver ranking de ${group.name}`}
      onPress={onPress}
      className="mb-2 flex-row items-center rounded-2xl border border-brand-700 bg-brand-800/60 p-3 active:bg-brand-700/40"
    >
      {group.cover_url ? (
        <Image
          source={{ uri: group.cover_url }}
          style={{ width: 48, height: 48, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{ width: 48, height: 48, borderRadius: 8 }}
          className="items-center justify-center bg-brand-700"
        >
          <Text>👥</Text>
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="text-sm font-bold text-white" numberOfLines={1}>
          {group.name}
        </Text>
        <Text className="text-xs text-brand-300" numberOfLines={1}>
          {group.member_count} miembros
        </Text>
      </View>
      <Text className="ml-2 text-base text-brand-200">›</Text>
    </Pressable>
  );
}

// ── Histórico ─────────────────────────────────────────────────────────────

function HistoryTab() {
  const history = useQuery({
    queryKey: ['my-week-history'],
    queryFn: () => fetchWeekHistory(8),
    refetchInterval: 5 * 60_000,
  });

  if (history.isLoading) {
    return (
      <View className="items-center py-12">
        <ActivityIndicator color="#A9C6E8" />
      </View>
    );
  }
  if ((history.data ?? []).length === 0) {
    return (
      <View className="items-center py-12">
        <Text className="text-sm text-brand-300">
          Sin historial todavía. Aparecerá aquí tras la primera actualización
          semanal.
        </Text>
      </View>
    );
  }
  return (
    <FlatList
      data={history.data ?? []}
      keyExtractor={(h) => h.week}
      renderItem={({ item }) => <HistoryRow entry={item} />}
    />
  );
}

function HistoryRow({ entry }: { entry: WeekHistoryEntry }) {
  const dt = new Date(entry.week + 'T00:00:00.000Z');
  const label = dt.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  });
  return (
    <View className="mb-2 flex-row items-center rounded-xl border border-brand-700 bg-brand-800/60 p-3">
      <View className="flex-1">
        <Text className="text-xs uppercase tracking-wider text-brand-300">
          Semana del {label}
        </Text>
        <Text className="text-base font-extrabold text-white">
          {entry.points} pts · puesto #{entry.rank || '—'}
        </Text>
      </View>
      {entry.league && <LeagueChip league={entry.league} />}
    </View>
  );
}

function LeagueChip({ league }: { league: League }) {
  return (
    <View
      className="flex-row items-center rounded-full px-2 py-1"
      style={{ backgroundColor: `#${league.color}33` }}
    >
      <Text style={{ fontSize: 14 }}>{league.icon}</Text>
      <Text className="ml-1 text-[11px] font-extrabold text-white">
        {league.name}
      </Text>
    </View>
  );
}
