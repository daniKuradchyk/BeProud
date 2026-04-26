import { useState } from 'react';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import Screen from '@/components/Screen';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { signUpWithPassword } from '@beproud/api';
import { EmailSchema, PasswordSchema } from '@beproud/validation';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit() {
    setError(null);

    const emailRes = EmailSchema.safeParse(email.trim());
    if (!emailRes.success) {
      setError(emailRes.error.issues[0]?.message ?? 'Email inválido');
      return;
    }
    const passRes = PasswordSchema.safeParse(password);
    if (!passRes.success) {
      setError(passRes.error.issues[0]?.message ?? 'Contraseña inválida');
      return;
    }
    if (!accepted) {
      setError('Debes confirmar que tienes al menos 13 años.');
      return;
    }

    setLoading(true);
    const { error } = await signUpWithPassword(emailRes.data, passRes.data);
    setLoading(false);

    if (error) {
      setError(error);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <Text className="mb-2 text-3xl font-extrabold text-white">
            ¡Casi listo!
          </Text>
          <Text className="mb-8 text-center text-base text-brand-200">
            Te hemos mandado un email para confirmar tu cuenta. Cuando lo confirmes podrás iniciar sesión.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Text className="text-base font-semibold text-brand-100 underline">
              Ir a iniciar sesión
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
          Crea tu cuenta
        </Text>
        <Text className="mb-8 text-base text-brand-200">
          Construye tu rutina y compite con tus amigos.
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
          value={password}
          onChangeText={setPassword}
          placeholder="mínimo 8 caracteres"
          hint="Usa mínimo 8 caracteres."
        />

        <View className="mb-4 flex-row items-start gap-3">
          <Text
            onPress={() => setAccepted(!accepted)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            className={`mt-0.5 h-5 w-5 items-center justify-center rounded border text-center ${
              accepted ? 'border-brand-300 bg-brand-300 text-brand-900' : 'border-brand-300 text-transparent'
            }`}
          >
            ✓
          </Text>
          <Text
            className="flex-1 text-sm text-brand-200"
            onPress={() => setAccepted(!accepted)}
          >
            Confirmo que tengo al menos 13 años y acepto los términos y la
            política de privacidad.
          </Text>
        </View>

        {error && (
          <Text className="mb-3 text-sm text-red-400">{error}</Text>
        )}

        <Button
          title="Crear cuenta"
          onPress={onSubmit}
          loading={loading}
          disabled={!email || !password}
        />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-brand-300">¿Ya tienes cuenta? </Text>
          <Link href="/(auth)/login" asChild>
            <Text className="text-sm font-semibold text-brand-100">
              Inicia sesión
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
