import { useEffect } from 'react';
import { Modal as RNModal, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPRING_SNAPPY, TIMING_FAST } from '@/lib/theme/motion';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** 0..1, fracción del alto de la pantalla. Default 0.6. */
  heightFraction?: number;
};

/**
 * Hoja inferior que entra desde abajo con SPRING_SNAPPY, backdrop con fade.
 * Sin libs externas — Modal de RN + Reanimated.
 */
export default function BottomSheet({
  visible, onClose, children, heightFraction = 0.6,
}: Props) {
  const { height } = useWindowDimensions();
  const sheetHeight = Math.round(height * heightFraction);
  const translateY = useSharedValue(sheetHeight);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_SNAPPY);
    } else {
      translateY.value = withTiming(sheetHeight, TIMING_FAST);
    }
  }, [visible, sheetHeight, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(120)}
        className="flex-1 justify-end bg-black/60"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar hoja"
          onPress={onClose}
          className="absolute inset-0"
        />
        <Animated.View
          style={[{ height: sheetHeight }, sheetStyle]}
          className="rounded-t-2xl bg-surface-2 shadow-lift-2"
        >
          <SafeAreaView edges={['bottom']} className="flex-1">
            <View className="items-center pt-3">
              <View className="h-1 w-10 rounded-pill bg-surface-3" />
            </View>
            <View className="flex-1 px-5 pb-2 pt-2">{children}</View>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
}
