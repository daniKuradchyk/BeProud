import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import Screen from '@/components/Screen';
import UserListRow from '@/features/follows/components/UserListRow';
import { useSession } from '@/lib/session';
import { useDebounce } from '@/lib/useDebounce';
import {
  fetchSuggestions,
  searchProfiles,
  type ProfileSearchResult,
} from '@beproud/api';

export default function SearchScreen() {
  const { user } = useSession();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q.trim(), 300);

  const searchKey = ['search', debouncedQ] as const;
  const suggestionsKey = ['search-suggestions'] as const;

  const search = useQuery({
    queryKey: searchKey,
    queryFn: () => searchProfiles(debouncedQ),
    enabled: debouncedQ.length > 0,
  });

  const suggestions = useQuery({
    queryKey: suggestionsKey,
    queryFn: () => fetchSuggestions(),
    enabled: debouncedQ.length === 0,
  });

  const showing: ProfileSearchResult[] =
    debouncedQ.length > 0 ? (search.data ?? []) : (suggestions.data ?? []);

  const isLoading =
    debouncedQ.length > 0 ? search.isLoading : suggestions.isLoading;

  return (
    <Screen>
      <Text className="mb-3 text-3xl font-extrabold text-white">Buscar</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Buscar por usuario o nombre…"
        placeholderTextColor="#7DA9DC"
        autoCapitalize="none"
        autoCorrect={false}
        className="mb-3 rounded-xl border border-brand-600 bg-brand-700/50 px-4 py-3 text-base text-white"
      />

      {debouncedQ.length === 0 && !suggestions.isLoading && showing.length > 0 && (
        <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
          Sugerencias para ti
        </Text>
      )}

      {isLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      ) : (
        <FlatList
          data={showing}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <UserListRow
              id={item.id}
              username={item.username}
              display_name={item.display_name}
              avatar_url={item.avatar_url}
              is_private={item.is_private}
              follow_status={item.follow_status}
              isOwn={user?.id === item.id}
              invalidateKeys={[searchKey, suggestionsKey]}
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-sm text-brand-300">
                {debouncedQ.length > 0
                  ? 'Sin resultados.'
                  : 'No hay sugerencias por ahora.'}
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}
