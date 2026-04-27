import { useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Button from '@/components/Button';
import { fetchGroupByCode, joinGroupByCode } from '@beproud/api';
import { backOrReplace } from '@/lib/navigation/back';

export default function JoinByCodeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { code } = useLocalSearchParams<{ code: string }>();

  const preview = useQuery({
    queryKey: ['group-preview', code],
    queryFn: () => fetchGroupByCode(code),
    enabled: !!code,
  });

  const joinMutation = useMutation({
    mutationFn: () => joinGroupByCode(code),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ['my-groups'] });
      router.replace(`/group/${r.group_id}` as never);
    },
  });

  // Si no hay grupo (404) y la query terminó, mostramos el mensaje sin spam.
  useEffect(() => {
    if (preview.isError) {
      console.warn('[groups] join preview error', preview.error);
    }
  }, [preview.isError, preview.error]);

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => backOrReplace(router, '/groups' as never)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center pr-12">
          <Text className="text-base font-bold text-white">Invitación</Text>
        </View>
      </View>

      <View className="flex-1 px-6">
        {preview.isLoading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#A9C6E8" />
          </View>
        )}

        {!preview.isLoading && !preview.data && (
          <View className="flex-1 items-center justify-center">
            <Text className="mb-2 text-base font-bold text-white">
              Código inválido
            </Text>
            <Text className="text-center text-sm text-brand-200">
              Comprueba el código o pídele al admin un enlace nuevo.
            </Text>
          </View>
        )}

        {preview.data && (
          <View className="flex-1">
            <View className="mb-4 overflow-hidden rounded-2xl border border-brand-700 bg-brand-800/60">
              {preview.data.cover_url ? (
                <Image
                  source={{ uri: preview.data.cover_url }}
                  style={{ width: '100%', aspectRatio: 16 / 9 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{ width: '100%', aspectRatio: 16 / 9 }}
                  className="items-center justify-center"
                >
                  <Text className="text-5xl">👥</Text>
                </View>
              )}
            </View>

            <Text className="text-2xl font-extrabold text-white">
              {preview.data.name}
            </Text>
            <Text className="text-sm text-brand-300">
              {preview.data.member_count} miembros · creado por @
              {preview.data.owner_username}
            </Text>
            {preview.data.description && (
              <Text className="mt-3 text-sm text-brand-100">
                {preview.data.description}
              </Text>
            )}
            {preview.data.is_private && (
              <Text className="mt-3 text-xs text-brand-300">
                Grupo privado · solo miembros podrán ver el chat.
              </Text>
            )}

            <View className="mt-auto pb-6 pt-4">
              {joinMutation.isError && (
                <Text className="mb-3 text-sm text-red-400">
                  {joinMutation.error instanceof Error
                    ? joinMutation.error.message
                    : 'No se pudo unir al grupo.'}
                </Text>
              )}
              <Button
                title="Unirme al grupo"
                loading={joinMutation.isPending}
                onPress={() => joinMutation.mutate()}
              />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
