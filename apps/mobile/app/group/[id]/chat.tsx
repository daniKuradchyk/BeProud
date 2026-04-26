import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useGlobalSearchParams } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import MessageBubble from '@/features/messages/components/MessageBubble';
import { useSession } from '@/lib/session';
import {
  fetchThreadMessages,
  getGroupThreadId,
  markThreadRead,
  sendMessage,
  supabase,
  uploadMessageMedia,
  type Message,
} from '@beproud/api';

const MAX_SIDE = 1080;

export default function GroupChat() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { user } = useSession();
  const qc = useQueryClient();

  const threadIdQuery = useQuery({
    queryKey: ['group-thread', id],
    queryFn: () => getGroupThreadId(id),
    enabled: !!id,
  });
  const threadId = threadIdQuery.data ?? null;

  const messagesKey = useMemo(
    () => ['messages', threadId ?? 'pending'] as const,
    [threadId],
  );

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesQuery = useInfiniteQuery({
    queryKey: messagesKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchThreadMessages(threadId!, {
        cursor: pageParam ?? undefined,
        limit: 30,
      }),
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!threadId,
  });

  const items: Message[] =
    messagesQuery.data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    if (!threadId) return;
    void markThreadRead(threadId);
    qc.invalidateQueries({ queryKey: ['unread-count'] });
  }, [threadId, items.length, qc]);

  useEffect(() => {
    if (!threadId) return;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (pollTimer) return;
      console.warn('[messages] realtime no disponible, polling cada 15s');
      pollTimer = setInterval(() => {
        qc.invalidateQueries({ queryKey: messagesKey });
      }, 15_000);
    };

    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: messagesKey });
          void markThreadRead(threadId);
        },
      )
      .subscribe((status) => {
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          startPolling();
        }
      });

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [threadId, qc, messagesKey]);

  const sendMutation = useMutation({
    mutationFn: (vars: { content?: string; mediaPath?: string }) =>
      sendMessage(threadId!, vars),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: messagesKey });
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el mensaje.');
    },
  });

  async function onSendText() {
    setError(null);
    if (!text.trim() || !threadId) return;
    sendMutation.mutate({ content: text });
  }

  async function onSendMedia() {
    setError(null);
    if (!threadId || !user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permiso de galería denegado.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    setSending(true);
    try {
      const compressed = await compressImage(result.assets[0].uri);
      const blob = await fetchAsBlob(compressed.uri, compressed.mime);
      const path = await uploadMessageMedia(threadId, blob, compressed.ext);
      sendMutation.mutate({ mediaPath: path });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.');
    } finally {
      setSending(false);
    }
  }

  if (threadIdQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-800">
        <ActivityIndicator color="#A9C6E8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#07121D' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <FlatList
        data={items}
        inverted
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
        renderItem={({ item }) => (
          <MessageBubble message={item} isMine={item.sender_id === user?.id} />
        )}
        onEndReached={() => {
          if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
            void messagesQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          messagesQuery.isFetchingNextPage ? (
            <View className="py-2">
              <ActivityIndicator color="#A9C6E8" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          messagesQuery.isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#A9C6E8" />
            </View>
          ) : (
            <View className="items-center py-12">
              <Text className="text-sm text-brand-300">
                Sé el primero en escribir.
              </Text>
            </View>
          )
        }
      />

      {error && (
        <Text className="px-4 pb-1 text-xs text-red-400" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      <View className="flex-row items-end gap-2 border-t border-brand-700 bg-brand-800 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adjuntar imagen"
          onPress={onSendMedia}
          disabled={sending}
          className="h-10 w-10 items-center justify-center rounded-full bg-brand-700 active:bg-brand-600"
        >
          <Text className="text-lg text-white">📎</Text>
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje al grupo…"
          placeholderTextColor="#7DA9DC"
          multiline
          maxLength={2000}
          className="flex-1 rounded-2xl border border-brand-600 bg-brand-700/50 px-3 py-2 text-sm text-white"
          style={{ maxHeight: 96 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          disabled={!text.trim() || sendMutation.isPending}
          onPress={onSendText}
          className={`rounded-full px-4 py-2 ${
            text.trim() && !sendMutation.isPending
              ? 'bg-brand-300 active:bg-brand-200'
              : 'bg-brand-600/60'
          }`}
        >
          <Text
            className={`text-sm font-extrabold ${
              text.trim() && !sendMutation.isPending
                ? 'text-brand-900'
                : 'text-brand-300'
            }`}
          >
            Enviar
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

async function compressImage(
  uri: string,
): Promise<{ uri: string; ext: 'webp' | 'jpg'; mime: string }> {
  const actions = [{ resize: { width: MAX_SIDE } }];
  if (Platform.OS !== 'web') {
    try {
      const out = await ImageManipulator.manipulateAsync(uri, actions, {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.WEBP,
      });
      return { uri: out.uri, ext: 'webp', mime: 'image/webp' };
    } catch (e) {
      console.warn('[messages] webp falló, uso jpeg', e);
    }
  }
  const out = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: out.uri, ext: 'jpg', mime: 'image/jpeg' };
}

async function fetchAsBlob(uri: string, mime: string): Promise<Blob> {
  const res = await fetch(uri);
  const blob = await res.blob();
  if (!blob.type) return blob.slice(0, blob.size, mime);
  return blob;
}
