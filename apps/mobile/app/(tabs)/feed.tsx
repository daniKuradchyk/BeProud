import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import PostCard from '@/features/feed/components/PostCard';
import { EmptyState, Skeleton } from '@/components/primitives';
import { EmptyFeed } from '@/components/illustrations';
import { useSession } from '@/lib/session';
import {
  blockUser,
  createReport,
  deletePost,
  fetchFeedPage,
  togglePostLike,
  type FeedItem,
} from '@beproud/api';

const FEED_KEY = ['feed'] as const;

export default function FeedScreen() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const query = useInfiniteQuery({
    queryKey: FEED_KEY,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchFeedPage({ cursor: pageParam ?? undefined, limit: 20 }),
    getNextPageParam: (last) => last.nextCursor,
  });

  const items: FeedItem[] = query.data?.pages.flatMap((p) => p.items) ?? [];

  const likeMutation = useMutation({
    mutationFn: (postId: string) => togglePostLike(postId),
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: FEED_KEY });
      const prev = qc.getQueryData(FEED_KEY);
      qc.setQueryData(FEED_KEY, (old: typeof query.data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((it) =>
              it.id === postId
                ? {
                    ...it,
                    liked_by_me: !it.liked_by_me,
                    likes_count: Math.max(
                      0,
                      it.likes_count + (it.liked_by_me ? -1 : 1),
                    ),
                  }
                : it,
            ),
          })),
        };
      });
      return { prev };
    },
    onError: (_err, _postId, ctx) => {
      if (ctx?.prev) qc.setQueryData(FEED_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FEED_KEY });
    },
  });

  const reportMutation = useMutation({
    mutationFn: (postId: string) =>
      createReport({ targetType: 'post', targetId: postId }),
  });

  const blockMutation = useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEED_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEED_KEY }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries({ queryKey: FEED_KEY });
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [qc, query]);

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="px-6 pb-2 pt-3">
        <Text className="text-2xl font-extrabold text-white">Feed</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?.id ?? null}
            onToggleLike={() => likeMutation.mutate(item.id)}
            onReport={() => reportMutation.mutate(item.id)}
            onBlock={() => blockMutation.mutate(item.user_id)}
            onDelete={() => deleteMutation.mutate(item.id)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A9C6E8"
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          query.isLoading ? (
            <View className="px-4 py-2">
              <Skeleton.Card />
              <Skeleton.Card />
              <Skeleton.Card />
            </View>
          ) : (
            <EmptyState
              illustration={<EmptyFeed />}
              title="Aún no hay posts"
              description="Completa una tarea pública o sigue a alguien para ver su progreso."
            />
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator color="#A9C6E8" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
