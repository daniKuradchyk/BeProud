import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import Avatar from '@/components/Avatar';
import FollowButton from './FollowButton';
import type { FollowStatus } from '@beproud/api';

type Props = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_private: boolean;
  follow_status: FollowStatus;
  /** True si esta fila representa al usuario actual. */
  isOwn?: boolean;
  /** Claves de queries a invalidar al cambiar el follow. */
  invalidateKeys?: ReadonlyArray<readonly unknown[]>;
};

/** Fila reutilizable: avatar + nombre + username + FollowButton compacto. */
export default function UserListRow({
  id,
  username,
  display_name,
  avatar_url,
  is_private,
  follow_status,
  isOwn,
  invalidateKeys,
}: Props) {
  const router = useRouter();
  return (
    <View className="flex-row items-center py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir perfil de ${display_name}`}
        onPress={() => router.push(`/user/${username}` as never)}
        className="flex-1 flex-row items-center"
      >
        <Avatar url={avatar_url} name={display_name} size={42} />
        <View className="ml-3 flex-1">
          <Text className="text-sm font-bold text-white" numberOfLines={1}>
            {display_name}
          </Text>
          <Text className="text-xs text-brand-300" numberOfLines={1}>
            @{username}
            {is_private ? ' · privada' : ''}
          </Text>
        </View>
      </Pressable>
      <FollowButton
        targetId={id}
        targetIsPrivate={is_private}
        followStatus={follow_status}
        isOwn={!!isOwn}
        invalidateKeys={invalidateKeys}
        compact
      />
    </View>
  );
}
