import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import PostCard from '@/features/feed/components/PostCard';
import CommentItem from '@/features/feed/components/CommentItem';
import { useSession } from '@/lib/session';
import {
  blockUser,
  createComment,
  createReport,
  deleteComment,
  deletePost,
  fetchPostById,
  fetchPostComments,
  supabase,
  togglePostLike,
  type CommentTreeNode,
} from '@beproud/api';

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const qc = useQueryClient();
  const postKey = ['post', id] as const;
  const commentsKey = ['post', id, 'comments'] as const;

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentTreeNode | null>(null);

  const post = useQuery({
    queryKey: postKey,
    queryFn: () => fetchPostById(id),
    enabled: !!id,
  });

  const comments = useQuery({
    queryKey: commentsKey,
    queryFn: () => fetchPostComments(id),
    enabled: !!id,
  });

  // Realtime: invalida queries cuando cambian likes o comments del post.
  // Si la suscripción no se establece (config de replicación faltante),
  // degradamos a polling cada 15s.
  useEffect(() => {
    if (!id) return;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (pollTimer) return;
      console.warn('[feed] realtime no disponible, polling cada 15s');
      pollTimer = setInterval(() => {
        qc.invalidateQueries({ queryKey: postKey });
        qc.invalidateQueries({ queryKey: commentsKey });
      }, 15_000);
    };

    const channel = supabase
      .channel(`post-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: postKey }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${id}` },
        () => {
          qc.invalidateQueries({ queryKey: commentsKey });
          qc.invalidateQueries({ queryKey: postKey });
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          startPolling();
        }
      });

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
    // qc es estable (singleton del provider). Las keys se reconstruyen en
    // cada render pero las invalidaciones de TanStack matchean por keyHash.
  }, [id, qc]);

  const likeMutation = useMutation({
    mutationFn: () => togglePostLike(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: postKey }),
  });

  const submitMutation = useMutation({
    mutationFn: () => createComment(id, text, replyTo?.id ?? null),
    onSuccess: () => {
      setText('');
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: commentsKey });
      qc.invalidateQueries({ queryKey: postKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsKey });
      qc.invalidateQueries({ queryKey: postKey });
    },
  });

  const reportMutation = useMutation({
    mutationFn: () => createReport({ targetType: 'post', targetId: id }),
  });

  const blockMutation = useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onSuccess: () => router.back(),
  });

  const deletePostMutation = useMutation({
    mutationFn: () => deletePost(id),
    onSuccess: () => router.back(),
  });

  const headerText = useMemo(() => {
    if (replyTo) return `Respondiendo a @${replyTo.username}`;
    return null;
  }, [replyTo]);

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
          <Text className="text-base font-bold text-white">Post</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {post.isLoading && (
            <View className="items-center py-12">
              <ActivityIndicator color="#A9C6E8" />
            </View>
          )}
          {post.data && (
            <PostCard
              post={post.data}
              currentUserId={user?.id ?? null}
              navigateOnPress={false}
              onToggleLike={() => likeMutation.mutate()}
              onReport={() => reportMutation.mutate()}
              onBlock={() => blockMutation.mutate(post.data!.user_id)}
              onDelete={() => deletePostMutation.mutate()}
            />
          )}
          {!post.isLoading && !post.data && (
            <View className="items-center py-8">
              <Text className="text-sm text-brand-200">
                Este post ya no está disponible.
              </Text>
            </View>
          )}

          <Text className="mb-2 mt-4 text-xs uppercase tracking-wider text-brand-300">
            Comentarios
          </Text>
          {comments.isLoading ? (
            <ActivityIndicator color="#A9C6E8" />
          ) : (comments.data ?? []).length === 0 ? (
            <Text className="text-sm text-brand-300">
              Sé el primero en comentar.
            </Text>
          ) : (
            (comments.data ?? []).map((c) => (
              <View key={c.id}>
                <CommentItem
                  comment={c}
                  currentUserId={user?.id ?? null}
                  canReply
                  onReply={() => setReplyTo(c)}
                  onDelete={() => removeMutation.mutate(c.id)}
                />
                {c.replies.map((r) => (
                  <CommentItem
                    key={r.id}
                    comment={r}
                    currentUserId={user?.id ?? null}
                    canReply={false}
                    onReply={() => undefined}
                    onDelete={() => removeMutation.mutate(r.id)}
                    indented
                  />
                ))}
              </View>
            ))
          )}
        </ScrollView>

        {/* Input de comentario */}
        <View className="border-t border-brand-700 bg-brand-800 px-4 py-3">
          {headerText && (
            <View className="mb-2 flex-row items-center">
              <Text className="flex-1 text-xs text-brand-300">{headerText}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar respuesta"
                onPress={() => setReplyTo(null)}
                hitSlop={6}
              >
                <Text className="text-xs font-semibold text-brand-200">Cancelar</Text>
              </Pressable>
            </View>
          )}
          <View className="flex-row items-center">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Escribe un comentario…"
              placeholderTextColor="#7DA9DC"
              maxLength={500}
              multiline
              className="mr-2 flex-1 rounded-2xl border border-brand-600 bg-brand-700/50 px-4 py-2 text-sm text-white"
              style={{ maxHeight: 96 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar comentario"
              disabled={!text.trim() || submitMutation.isPending}
              onPress={() => submitMutation.mutate()}
              className={`rounded-full px-4 py-2 ${
                text.trim() && !submitMutation.isPending
                  ? 'bg-brand-300 active:bg-brand-200'
                  : 'bg-brand-600/60'
              }`}
            >
              <Text
                className={`text-sm font-extrabold ${
                  text.trim() && !submitMutation.isPending
                    ? 'text-brand-900'
                    : 'text-brand-300'
                }`}
              >
                Enviar
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
