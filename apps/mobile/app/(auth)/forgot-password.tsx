import { useState } from 'react';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import Screen from '@/components/Screen';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { sendPasswordReset } from '@beproud/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    // El redirect lo configurarás en Supabase Auth → URL Configuration cuando despliegues.
    const { error } = await sendPasswordReset(
      email.trim(),
      'https://beproud.app/reset-password',
    );
    setLoading(false);
    if (error) setError(error);
    else setSent(true);
  }

  if (sent) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <Text className="mb-2 text-3xl font-extrabold text-white">Listo</Text>
          <Text className="mb-8 text-center text-base text-brand-200">
            Si ese email tiene una cuenta, recibirá un enlace para restablecer la contraseña.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Text className="text-base font-semibold text-brand-100 underline">
              Volver a iniciar sesión
            </Text>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View className="flex-1 justify-center">
        <Text className="mb-1 text-4xl font-extrabold text-white">
          Recuperar contraseña
        </Text>
        <Text className="mb-8 text-base text-brand-200">
          Pon tu email y te mandamos un enlace para crear una nueva.
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

        {error && (
          <Text className="mb-3 text-sm text-red-400">{error}</Text>
        )}

        <Button
          title="Enviar email"
          onPress={onSubmit}
          loading={loading}
          disabled={!email}
        />

        <View className="mt-6 flex-row justify-center">
          <Link href="/(auth)/login" asChild>
            <Text className="text-sm text-brand-200 underline">
              ← Volver al login
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
