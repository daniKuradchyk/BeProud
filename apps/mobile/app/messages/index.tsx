import { useCallback, useState } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Avatar from '@/components/Avatar';
import { relativeTime } from '@/lib/relativeTime';
import {
  fetchMyThreads,
  type ThreadWithLastMessage,
} from '@beproud/api';

const THREADS_KEY = ['threads'] as const;

export default function MessagesIndex() {
  const router = useRouter();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const threads = useQuery({
    queryKey: THREADS_KEY,
    queryFn: fetchMyThreads,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries({ queryKey: THREADS_KEY });
      await threads.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [qc, threads]);

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
        <View className="flex-1 items-center pr-12">
          <Text className="text-base font-bold text-white">Mensajes</Text>
        </View>
      </View>

      <FlatList
        data={threads.data ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A9C6E8"
          />
        }
        renderItem={({ item }) => (
          <ThreadRow
            thread={item}
            onPress={() => router.push(`/messages/${item.id}` as never)}
          />
        )}
        ListEmptyComponent={
          threads.isLoading ? (
            <View className="items-center py-20">
              <ActivityIndicator color="#A9C6E8" />
            </View>
          ) : (
            <View className="items-center px-6 py-20">
              <Text className="mb-2 text-base font-bold text-white">
                Aún no tienes conversaciones
              </Text>
              <Text className="text-center text-sm text-brand-200">
                Visita el perfil de alguien para empezar a hablar.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function ThreadRow({
  thread,
  onPress,
}: {
  thread: ThreadWithLastMessage;
  onPress: () => void;
}) {
  const other = thread.other_user;
  const last = thread.last_message;
  const preview = last?.content ?? (last?.media_url ? '📷 Foto' : 'Sin mensajes aún');
  const when = last
    ? relativeTime(last.created_at)
    : relativeTime(thread.created_at);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir chat con ${other?.display_name ?? 'usuario'}`}
      onPress={onPress}
      className="mb-2 flex-row items-center rounded-2xl border border-brand-700 bg-brand-800/60 p-3 active:bg-brand-700/40"
    >
      <Avatar url={other?.avatar_url ?? null} name={other?.display_name ?? '?'} size={48} />
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="flex-1 text-sm font-bold text-white" numberOfLines={1}>
            {other?.display_name ?? 'Usuario'}
          </Text>
          <Text className="ml-2 text-[11px] text-brand-300">{when}</Text>
        </View>
        <View className="mt-1 flex-row items-center">
          <Text
            className={`flex-1 text-xs ${
              thread.unread ? 'font-bold text-white' : 'text-brand-300'
            }`}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {thread.unread && (
            <View className="ml-2 h-2.5 w-2.5 rounded-full bg-brand-300" />
          )}
        </View>
      </View>
    </Pressable>
  );
}
