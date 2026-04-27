import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#A47FFF', '#FFB547', '#10D9A0', '#FF7A7A', '#6B3BF5'];

type Props = {
  count?: number;
  /** Duración total (ms). Default 1800. */
  duration?: number;
};

/**
 * Burst de partículas SVG-less (Views coloreadas) desde el centro de la
 * pantalla, con drift horizontal aleatorio + gravedad simulada + fade out.
 * Reanimated puro, sin libs externas.
 */
export default function ConfettiBurst({ count = 28, duration = 1800 }: Props) {
  const { width, height } = useWindowDimensions();
  const cx = width / 2;
  const cy = height / 2;

  // Sembramos pseudoaleatorio determinista para que el burst no varíe en
  // re-renders (idéntico tras hot-reload, aceptable para celebraciones).
  const seeds = Array.from({ length: count }, (_, i) => seededRandom(i));

  return (
    <View pointerEvents="none" className="absolute inset-0">
      {seeds.map((s, i) => (
        <Particle
          key={i}
          startX={cx}
          startY={cy}
          driftX={(s.a - 0.5) * width * 0.9}
          driftY={(s.b - 0.5) * height * 0.4 - height * 0.2}
          color={COLORS[i % COLORS.length] as string}
          delay={Math.floor(s.c * 200)}
          duration={duration}
        />
      ))}
    </View>
  );
}

function Particle({
  startX, startY, driftX, driftY, color, delay, duration,
}: {
  startX: number; startY: number;
  driftX: number; driftY: number;
  color: string; delay: number; duration: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
      ),
    );
  }, [t, delay, duration]);

  const style = useAnimatedStyle(() => {
    const v = t.value;
    // Trayectoria parabólica simple: x lineal, y con gravedad.
    const x = driftX * v;
    const y = driftY * v + 0.6 * driftY * v * v;
    const opacity = v < 0.85 ? 1 : 1 - (v - 0.85) / 0.15;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${v * 540}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX - 4,
          top: startY - 4,
          width: 8,
          height: 8,
          backgroundColor: color,
          borderRadius: 2,
        },
        style,
      ]}
    />
  );
}

// PRNG mulberry32 ligero, 3 valores deterministas por índice.
function seededRandom(seed: number) {
  const a = mulberry32(seed * 9301 + 49297)();
  const b = mulberry32(seed * 233280 + 1)();
  const c = mulberry32(seed * 4711 + 17)();
  return { a, b, c };
}
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}
