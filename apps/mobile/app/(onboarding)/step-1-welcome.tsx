import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import Screen from '@/components/Screen';
import WizardHeader from '@/components/WizardHeader';
import { Body, Button, Caption, Heading } from '@/components/primitives';
import { useSession } from '@/lib/session';

const CHIPS = ['Tareas con foto', 'Rutina por bloques', 'Verificación con IA'];

export default function Step1Welcome() {
  const router = useRouter();
  const { profile } = useSession();

  const skip =
    typeof __DEV__ !== 'undefined' && __DEV__
      ? {
          label: 'Saltar (dev)',
          onPress: () => router.replace('/routine-design' as never),
        }
      : undefined;

  // Pulso suave del logo cada 3s.
  const glow = useSharedValue(0.6);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const greeting = profile?.display_name
    ? `Hola, ${profile.display_name}`
    : 'Hola';

  return (
    <Screen scroll>
      <WizardHeader step={1} total={9} canGoBack={false} skip={skip} />

      <View className="flex-1 justify-center">
        {/* Logo con halo violeta animado. */}
        <View className="mb-8 items-center">
          <View className="relative h-28 w-28 items-center justify-center">
            <Animated.View
              style={glowStyle}
              className="absolute inset-0 rounded-pill bg-bp-500/30"
            />
            <View className="h-20 w-20 items-center justify-center rounded-pill bg-bp-500 shadow-glow-bp">
              <Animated.Text
                entering={FadeIn.duration(500)}
                className="text-4xl"
              >
                ✨
              </Animated.Text>
            </View>
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(500).delay(120)}>
          <Heading size="xl">{greeting}.</Heading>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(220)}>
          <Heading size="md" className="mt-1 text-bp-200">
            Sé constante. Sé tú.
          </Heading>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(320)}>
          <Body size="md" tone={2} className="mt-3">
            Te haremos unas preguntas rápidas y montaremos una rutina que
            encaje contigo. Podrás cambiarla siempre que quieras.
          </Body>
        </Animated.View>

        {/* Chips flotantes con stagger. */}
        <View className="mt-6 flex-row flex-wrap gap-2">
          {CHIPS.map((chip, i) => (
            <Animated.View
              key={chip}
              entering={FadeInDown.duration(450).delay(420 + i * 90)}
              className="rounded-pill border border-bp-500/40 bg-bp-500/10 px-3 py-1.5"
            >
              <Caption variant="caption" tone={1}>{chip}</Caption>
            </Animated.View>
          ))}
        </View>
      </View>

      <Animated.View entering={FadeInDown.duration(500).delay(700)} className="mt-8">
        <Button
          size="lg"
          title="Empezar"
          onPress={() => router.push('/(onboarding)/step-2-biometrics')}
        />
      </Animated.View>
    </Screen>
  );
}
