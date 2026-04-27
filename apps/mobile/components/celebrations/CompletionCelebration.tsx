import { useEffect } from 'react';
import { Modal as RNModal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { Body } from '@/components/primitives';
import { SPRING_BOUNCE } from '@/lib/theme/motion';
import { haptic } from '@/lib/theme/haptics';
import ConfettiBurst from './ConfettiBurst';

type Props = {
  visible: boolean;
  points: number;
  taskTitle: string;
  onClose: () => void;
  /** Auto-cerrar tras N ms. Default 2500. Pasa 0 para no auto-cerrar. */
  autoCloseMs?: number;
};

/**
 * Celebración full-screen tras completar una tarea. Confetti + anillo
 * expandiéndose desde el centro + texto "+X puntos" + nombre de la tarea.
 * Tap en cualquier sitio la cierra antes.
 */
export default function CompletionCelebration({
  visible, points, taskTitle, onClose, autoCloseMs = 2500,
}: Props) {
  const { width, height } = useWindowDimensions();
  const ringMax = Math.max(width, height) * 1.2;

  const ringScale = useSharedValue(0);
  const textScale = useSharedValue(0.4);

  useEffect(() => {
    if (!visible) {
      ringScale.value = 0;
      textScale.value = 0.4;
      return;
    }
    haptic.success();
    ringScale.value = withTiming(1, { duration: 800, easing: Easing.bezier(0.16, 1, 0.3, 1) });
    textScale.value = withDelay(120, withSpring(1, SPRING_BOUNCE));
    if (autoCloseMs > 0) {
      const timer = setTimeout(onClose, autoCloseMs);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, autoCloseMs, onClose, ringScale, textScale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: 1 - ringScale.value * 0.3,
  }));
  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
    opacity: textScale.value,
  }));

  return (
    <RNModal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(180)}
        className="flex-1"
      >
        <BlurView intensity={50} tint="dark" className="absolute inset-0" />
        <Pressable accessibilityLabel="Cerrar" onPress={onClose} className="absolute inset-0" />

        <View className="flex-1 items-center justify-center" pointerEvents="none">
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: ringMax,
                height: ringMax,
                borderRadius: ringMax / 2,
                borderWidth: 6,
                borderColor: '#6B3BF5',
              },
              ringStyle,
            ]}
          />
          <Animated.View style={textStyle} className="items-center px-8">
            <Text className="text-display-xl text-amber-400">+{points} pts</Text>
            <Body size="lg" tone={1} className="mt-2 text-center">
              {taskTitle}
            </Body>
          </Animated.View>
        </View>

        {visible && <ConfettiBurst />}
      </Animated.View>
    </RNModal>
  );
}
