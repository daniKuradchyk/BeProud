import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import Screen from '@/components/Screen';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useSession } from '@/lib/session';
import { setUsername, signOut } from '@beproud/api';
import { UsernameSchema, DisplayNameSchema } from '@beproud/validation';

export default function CompleteProfileScreen() {
  const { user, setProfile } = useSession();
  const [username, setUsernameField] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameError = useMemo(() => {
    if (!username) return null;
    const result = UsernameSchema.safeParse(username);
    return result.success
      ? null
      : (result.error.issues[0]?.message ?? 'Invalido');
  }, [username]);

  const displayNameError = useMemo(() => {
    if (!displayName) return null;
    const result = DisplayNameSchema.safeParse(displayName);
    return result.success
      ? null
      : (result.error.issues[0]?.message ?? 'Invalido');
  }, [displayName]);

  const canSubmit =
    !!username &&
    !!displayName &&
    !usernameError &&
    !displayNameError &&
    !loading;

  async function onSubmit() {
    setError(null);

    const parsedUsername = UsernameSchema.safeParse(
      username.trim().toLowerCase(),
    );
    const parsedDisplayName = DisplayNameSchema.safeParse(displayName.trim());

    if (!parsedUsername.success) {
      setError(parsedUsername.error.issues[0]?.message ?? 'Username invalido');
      return;
    }
    if (!parsedDisplayName.success) {
      setError(
        parsedDisplayName.error.issues[0]?.message ?? 'Nombre invalido',
      );
      return;
    }

    setLoading(true);
    try {
      const profile = await setUsername(
        parsedUsername.data,
        parsedDisplayName.data,
      );
      setProfile(profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  async function onCancel() {
    await signOut();
  }

  return (
    <Screen scroll>
      <View className="flex-1 justify-center">
        <Text className="mb-1 text-4xl font-extrabold text-white">
          Elige tu nombre
        </Text>
        <Text className="mb-8 text-base text-brand-200">
          Tu username es unico y aparece en tu perfil y en el feed. Tu nombre
          lo veran tus amigos.
        </Text>

        <Input
          label="Username"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={(value) => setUsernameField(value.toLowerCase())}
          placeholder="ej: danik99"
          hint="Solo minusculas, numeros y guiones bajos. 3-24 caracteres."
          error={usernameError ?? undefined}
        />

        <Input
          label="Nombre visible"
          autoCapitalize="words"
          autoCorrect={false}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="ej: Danik"
          error={displayNameError ?? undefined}
        />

        {error && (
          <Text
            className="mb-3 text-sm text-red-400"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        )}

        <Button
          title="Guardar y continuar"
          onPress={onSubmit}
          loading={loading}
          disabled={!canSubmit}
        />

        <View className="mt-8">
          <Text className="text-center text-xs text-brand-300">
            Has iniciado sesion como {user?.email}
          </Text>
          <Button
            title="Cerrar sesion"
            variant="ghost"
            onPress={onCancel}
            className="mt-2"
          />
        </View>
      </View>
    </Screen>
  );
}
