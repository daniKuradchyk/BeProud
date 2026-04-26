import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '@beproud/api';
import { buildNotificationBody } from '@/features/notifications/components/NotificationToast';

const ICON_BY_TYPE: Record<Notification['type'], string> = {
  new_like: '❤️',
  new_comment: '💬',
  new_follower: '👤',
  follow_request: '🙋',
  new_dm: '✉️',
  league_promotion: '🏆',
  achievement_unlocked: '🏅',
  daily_reminder: '⏰',
};

function dayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return target.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function routeForNotification(n: Notification): string | null {
  const p = n.payload as Record<string, unknown>;
  switch (n.type) {
    case 'new_like':
    case 'new_comment':
      return p.post_id ? `/post/${String(p.post_id)}` : null;
    case 'new_follower':
    case 'follow_request':
      return p.follower_username ? `/user/${String(p.follower_username)}` : null;
    case 'new_dm':
      return p.thread_id ? `/messages/${String(p.thread_id)}` : null;
    case 'league_promotion':
      return '/(tabs)/rankings';
    case 'achievement_unlocked':
      return '/profile/achievements';
    case 'daily_reminder':
      return '/(tabs)/routine';
    default:
      return null;
  }
}

type Section = { day: string; items: Notification[] };

function groupByDay(items: Notification[]): Section[] {
  const map = new Map<string, Notification[]>();
  for (const n of items) {
    const k = dayLabel(new Date(n.created_at));
    const list = map.get(k) ?? [];
    list.push(n);
    map.set(k, list);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

export default function NotificationsScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => fetchMyNotifications({ limit: 50 }),
    refetchInterval: 60_000,
  });

  const markOneMut = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
  const markAllMut = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const sections = useMemo(() => groupByDay(q.data ?? []), [q.data]);
  const flat: Array<
    { kind: 'header'; day: string } | { kind: 'item'; n: Notification }
  > = useMemo(() => {
    const out: Array<{ kind: 'header'; day: string } | { kind: 'item'; n: Notification }> = [];
    for (const s of sections) {
      out.push({ kind: 'header', day: s.day });
      for (const n of s.items) out.push({ kind: 'item', n });
    }
    return out;
  }, [sections]);

  const unreadCount = (q.data ?? []).filter((n) => !n.read_at).length;

  function onItemPress(n: Notification) {
    if (!n.read_at) markOneMut.mutate(n.id);
    const route = routeForNotification(n);
    if (route) router.push(route as never);
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-white">Notificaciones</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Marcar todas como leídas"
          disabled={unreadCount === 0 || markAllMut.isPending}
          onPress={() => markAllMut.mutate()}
          hitSlop={6}
          className="px-2 py-1"
        >
          <Text
            className={`text-xs font-bold ${
              unreadCount === 0 ? 'text-brand-500' : 'text-brand-200'
            }`}
          >
            Todas leídas
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={flat}
        keyExtractor={(row, idx) =>
          row.kind === 'header' ? `h-${row.day}-${idx}` : `n-${row.n.id}`
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isFetching && !q.isLoading}
            onRefresh={() => q.refetch()}
            tintColor="#A9C6E8"
          />
        }
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <Text className="mb-2 mt-4 text-xs uppercase tracking-wider text-brand-300">
              {item.day}
            </Text>
          ) : (
            <NotificationRow
              n={item.n}
              onPress={() => onItemPress(item.n)}
            />
          )
        }
        ListEmptyComponent={
          q.isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#A9C6E8" />
            </View>
          ) : (
            <View className="items-center py-16">
              <Text className="text-base font-bold text-white">
                Sin notificaciones
              </Text>
              <Text className="mt-1 text-center text-sm text-brand-200">
                Cuando alguien interactúe contigo lo verás aquí.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function NotificationRow({
  n,
  onPress,
}: {
  n: Notification;
  onPress: () => void;
}) {
  const unread = !n.read_at;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={buildNotificationBody(n)}
      onPress={onPress}
      className={`mb-2 flex-row items-center rounded-xl border p-3 ${
        unread
          ? 'border-brand-300/40 bg-brand-300/10'
          : 'border-brand-700 bg-brand-800/60'
      } active:bg-brand-700/40`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-700">
        <Text style={{ fontSize: 20 }}>{ICON_BY_TYPE[n.type]}</Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm text-white" numberOfLines={2}>
          {buildNotificationBody(n)}
        </Text>
        <Text className="text-[11px] text-brand-300">
          {relativeTime(n.created_at)}
        </Text>
      </View>
      {unread && (
        <View className="ml-2 h-2 w-2 rounded-full bg-brand-300" />
      )}
    </Pressable>
  );
}
