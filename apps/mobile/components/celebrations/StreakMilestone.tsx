import { useEffect } from 'react';
import { Modal as RNModal, Pressable, Share, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { Body, Button, Heading } from '@/components/primitives';
import { SPRING_BOUNCE } from '@/lib/theme/motion';
import { haptic } from '@/lib/theme/haptics';

type Props = {
  visible: boolean;
  days: number;
  onClose: () => void;
};

/**
 * Pantalla de hito de racha (7/14/30/50/100). Llama animada con pulso,
 * texto grande y CTA Compartir.
 */
export default function StreakMilestone({ visible, days, onClose }: Props) {
  const flameScale = useSharedValue(0.4);
  const glow = useSharedValue(0.6);

  useEffect(() => {
    if (!visible) {
      flameScale.value = 0.4;
      glow.value = 0.6;
      return;
    }
    haptic.heavy();
    flameScale.value = withSpring(1, SPRING_BOUNCE);
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0.6, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, [visible, flameScale, glow]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  async function handleShare() {
    haptic.light();
    try {
      await Share.share({
        message: `🔥 ${days} días seguidos completando mi rutina en BeProud. Sigue así.`,
      });
    } catch {
      // share cancelado / no disponible
    }
  }

  return (
    <RNModal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(180)}
        className="flex-1"
      >
        <BlurView intensity={40} tint="dark" className="absolute inset-0" />
        <Pressable accessibilityLabel="Cerrar" onPress={onClose} className="absolute inset-0" />
        <View className="flex-1 items-center justify-center px-8">
          <View className="relative h-40 w-40 items-center justify-center">
            <Animated.View
              style={glowStyle}
              className="absolute inset-0 rounded-pill bg-amber-500/40"
            />
            <Animated.Text style={[flameStyle, { fontSize: 96, lineHeight: 110 }]}>
              🔥
            </Animated.Text>
          </View>
          <Heading size="xl" className="mt-6 text-center">
            {days} días seguidos
          </Heading>
          <Body size="lg" tone={2} className="mt-2 text-center">
            Sigue así. Cada día cuenta.
          </Body>
          <View className="mt-8 w-full max-w-xs gap-2">
            <Button title="Compartir" onPress={handleShare} variant="primary" size="lg" />
            <Button title="Cerrar" onPress={onClose} variant="ghost" size="md" />
          </View>
        </View>
      </Animated.View>
    </RNModal>
  );
}
