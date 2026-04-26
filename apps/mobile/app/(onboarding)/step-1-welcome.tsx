import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import Screen from '@/components/Screen';
import Button from '@/components/Button';
import WizardHeader from '@/components/WizardHeader';
import { useSession } from '@/lib/session';
import { generateRoutine } from '@beproud/api';

export default function Step1Welcome() {
  const router = useRouter();
  const { profile, refreshRoutine } = useSession();

  // Solo en desarrollo: saltarse el wizard con valores razonables.
  const skip =
    typeof __DEV__ !== 'undefined' && __DEV__
      ? {
          label: 'Saltar (dev)',
          onPress: async () => {
            try {
              await generateRoutine({
                goals: ['fitness', 'study'],
                availability: 'medium',
                level: 'beginner',
                preferences: { categories: ['fitness', 'study'] },
              });
              await refreshRoutine();
              // El RouteGuard nos llevará a /(tabs)/routine.
            } catch (e) {
              console.warn('[onboarding] skip failed', e);
            }
          },
        }
      : undefined;

  return (
    <Screen scroll>
      <WizardHeader step={1} total={9} canGoBack={false} skip={skip} />

      <View className="flex-1 justify-center">
        <Text className="mb-3 text-5xl">👋</Text>
        <Text className="mb-2 text-4xl font-extrabold text-white">
          {profile?.display_name
            ? `Hola, ${profile.display_name}`
            : 'Hola'}
        </Text>
        <Text className="mb-2 text-2xl font-bold text-brand-100">
          Vamos a montar tu rutina.
        </Text>
        <Text className="mb-8 text-base text-brand-200">
          Te haremos algunas preguntas rápidas (datos opcionales si lo
          prefieres) y elegiremos tareas que encajen contigo. Podrás
          cambiarla siempre que quieras.
        </Text>

        <View className="rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
          <Text className="mb-1 text-xs uppercase tracking-wider text-brand-300">
            Cómo funciona
          </Text>
          <Text className="text-sm text-brand-100">
            Cada día completas tareas con una foto. La IA valida que has hecho
            lo que dices, ganas puntos y subes en los rankings con tus amigos.
          </Text>
        </View>
      </View>

      <Button
        title="Empezar"
        onPress={() => router.push('/(onboarding)/step-2-biometrics')}
        className="mt-8"
      />
    </Screen>
  );
}
