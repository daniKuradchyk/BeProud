import { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type Props = Omit<ViewProps, 'style'> & {
  className?: string;
};

/**
 * Bloque animado de carga. Pulse de opacidad entre `surface-2` y `surface-3`.
 * Pasa el tamaño/forma con className: ej. `<Skeleton className="h-4 w-32 rounded-md" />`.
 */
function SkeletonBlock({ className = '', children, ...rest }: Props) {
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [phase]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + 0.4 * phase.value,
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className={`bg-surface-3 ${className}`}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}

function CardSkeleton() {
  return (
    <View className="mb-3 rounded-lg bg-surface-1 p-4">
      <SkeletonBlock className="mb-2 h-4 w-1/2 rounded-md" />
      <SkeletonBlock className="h-3 w-2/3 rounded-md" />
    </View>
  );
}

function RowSkeleton() {
  return (
    <View className="mb-2 flex-row items-center rounded-md bg-surface-1 p-3">
      <SkeletonBlock className="mr-3 h-10 w-10 rounded-pill" />
      <View className="flex-1">
        <SkeletonBlock className="mb-2 h-3 w-2/3 rounded-md" />
        <SkeletonBlock className="h-3 w-1/3 rounded-md" />
      </View>
    </View>
  );
}

const Skeleton = SkeletonBlock as typeof SkeletonBlock & {
  Card: typeof CardSkeleton;
  Row:  typeof RowSkeleton;
};
Skeleton.Card = CardSkeleton;
Skeleton.Row  = RowSkeleton;

export default Skeleton;
