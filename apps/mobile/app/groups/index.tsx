import { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Button from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/primitives';
import { EmptyGroups } from '@/components/illustrations';
import {
  fetchMyGroups,
  joinGroupByCode,
  type GroupWithCounts,
} from '@beproud/api';
import { backOrReplace } from '@/lib/navigation/back';

const MY_GROUPS_KEY = ['my-groups'] as const;

export default function GroupsIndex() {
  const router = useRouter();
  const qc = useQueryClient();
  const [joinOpen, setJoinOpen] = useState(false);

  const groups = useQuery({
    queryKey: MY_GROUPS_KEY,
    queryFn: fetchMyGroups,
  });

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => backOrReplace(router, '/(tabs)/profile' as never)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center pr-12">
          <Text className="text-base font-bold text-white">Mis grupos</Text>
        </View>
      </View>

      <View className="flex-row gap-2 px-4 pb-3">
        <View className="flex-1">
          <Button title="Crear grupo" onPress={() => router.push('/groups/new' as never)} />
        </View>
        <View className="flex-1">
          <Button title="Unirme con código" variant="secondary" onPress={() => setJoinOpen(true)} />
        </View>
      </View>

      <FlatList
        data={groups.data ?? []}
        keyExtractor={(g) => g.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 8 }}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onPress={() => router.push(`/group/${item.id}/chat` as never)}
          />
        )}
        ListEmptyComponent={
          groups.isLoading ? (
            <View className="px-4 py-2">
              <Skeleton.Card />
              <Skeleton.Card />
            </View>
          ) : (
            <EmptyState
              illustration={<EmptyGroups />}
              title="Aún no estás en ningún grupo"
              description="Crea uno o únete con un código de invitación."
            />
          )
        }
      />

      <JoinByCodeModal
        visible={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={async (groupId) => {
          await qc.invalidateQueries({ queryKey: MY_GROUPS_KEY });
          setJoinOpen(false);
          router.push(`/group/${groupId}/chat` as never);
        }}
      />
    </SafeAreaView>
  );
}

function GroupCard({
  group,
  onPress,
}: {
  group: GroupWithCounts;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir grupo ${group.name}`}
      onPress={onPress}
      style={{ flex: 1 }}
      className="overflow-hidden rounded-2xl border border-brand-700 bg-brand-800/60 active:bg-brand-700/40"
    >
      {group.cover_url ? (
        <Image
          source={{ uri: group.cover_url }}
          style={{ width: '100%', aspectRatio: 16 / 9 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{ width: '100%', aspectRatio: 16 / 9 }}
          className="items-center justify-center bg-brand-700/40"
        >
          <Text className="text-3xl">👥</Text>
        </View>
      )}
      <View className="px-3 py-2">
        <Text className="text-sm font-bold text-white" numberOfLines={1}>
          {group.name}
        </Text>
        <Text className="text-xs text-brand-300" numberOfLines={1}>
          {group.member_count} miembros
          {group.is_private ? ' · privado' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function JoinByCodeModal({
  visible,
  onClose,
  onJoined,
}: {
  visible: boolean;
  onClose: () => void;
  onJoined: (groupId: string) => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => joinGroupByCode(code),
    onSuccess: (r) => onJoined(r.group_id),
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  });
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar diálogo"
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/60 px-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-brand-700 bg-brand-800 p-5"
        >
          <Text className="mb-1 text-base font-extrabold text-white">
            Unirse a un grupo
          </Text>
          <Text className="mb-4 text-sm text-brand-200">
            Pega aquí el código que te han compartido.
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Código (10 caracteres)"
            placeholderTextColor="#7DA9DC"
            autoCapitalize="none"
            autoCorrect={false}
            className="mb-3 rounded-xl border border-brand-600 bg-brand-700/50 px-4 py-3 text-base text-white"
          />
          {error && (
            <Text className="mb-3 text-sm text-red-400">{error}</Text>
          )}
          <Button
            title="Unirme"
            loading={mutation.isPending}
            disabled={!code.trim()}
            onPress={() => {
              setError(null);
              mutation.mutate();
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            onPress={onClose}
            className="mt-2 rounded-xl px-4 py-3"
          >
            <Text className="text-center text-base font-bold text-brand-200">
              Cancelar
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
