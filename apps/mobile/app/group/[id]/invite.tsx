import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useGlobalSearchParams } from 'expo-router';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import Avatar from '@/components/Avatar';
import { useDebounce } from '@/lib/useDebounce';
import {
  addMemberToGroup,
  fetchGroupMembers,
  searchProfiles,
  type ProfileSearchResult,
} from '@beproud/api';

export default function GroupInvite() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q.trim(), 300);

  const searchKey = ['group-invite-search', debouncedQ] as const;
  const membersKey = ['group-members', id] as const;

  const search = useQuery({
    queryKey: searchKey,
    queryFn: () => searchProfiles(debouncedQ),
    enabled: debouncedQ.length > 0,
  });
  const members = useQuery({
    queryKey: membersKey,
    queryFn: () => fetchGroupMembers(id),
    enabled: !!id,
  });

  const memberIds = useMemo(
    () => new Set((members.data ?? []).map((m) => m.user_id)),
    [members.data],
  );

  const addMutation = useMutation({
    mutationFn: (userId: string) => addMemberToGroup(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey });
      qc.invalidateQueries({ queryKey: ['group', id] });
    },
  });

  return (
    <View className="flex-1 bg-brand-800 p-4">
      <Text className="mb-2 text-2xl font-extrabold text-white">
        Invitar miembros
      </Text>
      <Text className="mb-3 text-sm text-brand-200">
        Busca por nombre o usuario y añádelos al grupo.
      </Text>

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Buscar usuario…"
        placeholderTextColor="#7DA9DC"
        autoCapitalize="none"
        autoCorrect={false}
        className="mb-3 rounded-xl border border-brand-600 bg-brand-700/50 px-4 py-3 text-base text-white"
      />

      {debouncedQ.length === 0 ? (
        <View className="items-center py-8">
          <Text className="text-sm text-brand-300">
            Escribe al menos un carácter para buscar.
          </Text>
        </View>
      ) : search.isLoading ? (
        <View className="items-center py-6">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      ) : (
        <FlatList
          data={search.data ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <InviteRow
              profile={item}
              alreadyMember={memberIds.has(item.id)}
              loading={addMutation.isPending && addMutation.variables === item.id}
              error={
                addMutation.isError && addMutation.variables === item.id
                  ? addMutation.error instanceof Error
                    ? addMutation.error.message
                    : 'Error'
                  : null
              }
              onAdd={() => addMutation.mutate(item.id)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-8">
              <Text className="text-sm text-brand-300">Sin resultados.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function InviteRow({
  profile,
  alreadyMember,
  loading,
  error,
  onAdd,
}: {
  profile: ProfileSearchResult;
  alreadyMember: boolean;
  loading: boolean;
  error: string | null;
  onAdd: () => void;
}) {
  return (
    <View className="mb-2 rounded-xl border border-brand-700 bg-brand-800/60 p-3">
      <View className="flex-row items-center">
        <Avatar url={profile.avatar_url} name={profile.display_name} size={40} />
        <View className="ml-3 flex-1">
          <Text className="text-sm font-bold text-white" numberOfLines={1}>
            {profile.display_name}
          </Text>
          <Text className="text-xs text-brand-300" numberOfLines={1}>
            @{profile.username}
            {profile.is_private ? ' · privada' : ''}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={alreadyMember ? 'Ya es miembro' : `Añadir a ${profile.username}`}
          disabled={alreadyMember || loading}
          onPress={onAdd}
          className={`rounded-full px-3 py-1.5 ${
            alreadyMember
              ? 'bg-brand-700/40'
              : 'bg-brand-300 active:bg-brand-200'
          }`}
        >
          <Text
            className={`text-xs font-extrabold ${
              alreadyMember ? 'text-brand-300' : 'text-brand-900'
            }`}
          >
            {alreadyMember ? 'En el grupo' : loading ? '…' : 'Añadir'}
          </Text>
        </Pressable>
      </View>
      {error && (
        <Text className="mt-2 text-xs text-red-400">{error}</Text>
      )}
    </View>
  );
}
