import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Button from '@/components/Button';
import { useSession } from '@/lib/session';
import { updateProfile } from '@beproud/api';
import { backOrReplace } from '@/lib/navigation/back';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useSession();
  const [isPrivate, setIsPrivate] = useState(profile?.is_private ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setIsPrivate(profile?.is_private ?? false);
  }, [profile?.is_private]);

  const dirty = profile ? isPrivate !== profile.is_private : false;

  async function onSave() {
    setError(null);
    setSaving(true);
    try {
      await updateProfile({ is_private: isPrivate });
      await refreshProfile();
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => backOrReplace(router, '/settings' as never)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center pr-12">
          <Text className="text-base font-bold text-white">Privacidad</Text>
        </View>
      </View>

      <View className="flex-1 px-6 pt-4">
        <Pressable
          onPress={() => setIsPrivate(!isPrivate)}
          accessibilityRole="switch"
          accessibilityState={{ checked: isPrivate }}
          className="flex-row items-center justify-between rounded-xl border border-brand-600 bg-brand-700/50 px-4 py-3"
        >
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-white">
              Cuenta privada
            </Text>
            <Text className="text-xs text-brand-300">
              Solo tus seguidores aceptados verán tus posts.
            </Text>
          </View>
          <View
            className={`h-6 w-11 justify-center rounded-full p-0.5 ${
              isPrivate ? 'bg-brand-300' : 'bg-brand-600'
            }`}
          >
            <View
              className={`h-5 w-5 rounded-full bg-white ${
                isPrivate ? 'ml-auto' : ''
              }`}
            />
          </View>
        </Pressable>

        <Text className="mt-4 text-xs text-brand-300">
          Si activas la cuenta privada, las solicitudes pendientes se
          mantienen y los posts existentes solo serán visibles para tus
          seguidores actuales aceptados.
        </Text>

        {error && (
          <Text
            className="mt-4 text-sm text-red-400"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        )}
        {savedAt && !dirty && !error && (
          <Text className="mt-4 text-sm text-emerald-300">Guardado ✓</Text>
        )}

        <View className="mt-6">
          <Button
            title="Guardar cambios"
            onPress={onSave}
            loading={saving}
            disabled={!dirty}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
