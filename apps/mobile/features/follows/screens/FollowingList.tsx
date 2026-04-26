import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import UserListRow from '@/features/follows/components/UserListRow';
import { useSession } from '@/lib/session';
import { fetchMyFollowing } from '@beproud/api';

type Props = { userId: string };

export default function FollowingList({ userId }: Props) {
  const { user } = useSession();
  const queryKey = ['following', userId] as const;
  const q = useQuery({
    queryKey,
    queryFn: () => fetchMyFollowing(userId),
  });

  if (q.isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#A9C6E8" />
      </View>
    );
  }

  return (
    <FlatList
      data={q.data ?? []}
      keyExtractor={(it) => it.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      renderItem={({ item }) => (
        <UserListRow
          id={item.id}
          username={item.username}
          display_name={item.display_name}
          avatar_url={item.avatar_url}
          is_private={item.is_private}
          follow_status={item.follow_status}
          isOwn={user?.id === item.id}
          invalidateKeys={[queryKey]}
        />
      )}
      ListEmptyComponent={
        <View className="items-center px-6 py-16">
          <Text className="text-sm text-brand-300">No sigue a nadie todavía.</Text>
        </View>
      }
    />
  );
}
