import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import FollowersList from '@/features/follows/screens/FollowersList';
import { fetchProfileByUsername } from '@beproud/api';

export default function FollowersRoute() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const profile = useQuery({
    queryKey: ['profile', username],
    queryFn: () => fetchProfileByUsername(username),
    enabled: !!username,
  });

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
          <Text className="text-base font-bold text-white">
            Seguidores de @{username}
          </Text>
        </View>
      </View>
      {profile.isLoading || !profile.data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      ) : (
        <FollowersList userId={profile.data.id} />
      )}
    </SafeAreaView>
  );
}
