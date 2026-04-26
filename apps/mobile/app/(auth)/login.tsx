import { useState } from 'react';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import Screen from '@/components/Screen';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { signInWithPassword } from '@beproud/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const { error } = await signInWithPassword(email.trim(), password);
    setLoading(false);
    if (error) setError(error);
    // El RouteGuard redirige solo cuando la sesión cambia.
  }

  return (
    <Screen scroll>
      <View className="flex-1 justify-center">
        <Text className="mb-1 text-4xl font-extrabold text-white">BeProud</Text>
        <Text className="mb-8 text-base text-brand-200">
          Inicia sesión para seguir construyendo tu rutina.
        </Text>

        <Input
          label="Email"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@email.com"
        />
        <Input
          label="Contraseña"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
        />

        {error && (
          <Text className="mb-3 text-sm text-red-400" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

        <Button
          title="Entrar"
          onPress={onSubmit}
          loading={loading}
          disabled={!email || !password}
        />

        <View className="mt-6 flex-row justify-between">
          <Link href="/(auth)/forgot-password" asChild>
            <Text className="text-sm text-brand-200 underline">
              ¿Olvidaste tu contraseña?
            </Text>
          </Link>
          <Link href="/(auth)/register" asChild>
            <Text className="text-sm font-semibold text-brand-100">
              Crear cuenta →
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
