import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { PomodoroPhase } from '@/features/study/lib/pomodoroStore';

type Props = {
  remainingSeconds: number;
  totalSeconds: number;
  phase: PomodoroPhase;
};

const SIZE   = 280;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC   = 2 * Math.PI * RADIUS;

function format(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

/** Anillo circular grande con tiempo restante. SVG via react-native-svg. */
export default function PomodoroRing({
  remainingSeconds,
  totalSeconds,
  phase,
}: Props) {
  const ratio = totalSeconds > 0
    ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds))
    : 0;
  const offset = CIRC * (1 - ratio);
  // Convención Pomodoro clásica: foco = rojo "tomate" (intensidad/urgencia),
  // descanso = verde (relax). Las fases anteriores estaban invertidas.
  const color = phase === 'focus' ? '#ef4444' : '#10b981'; // red-500 / emerald-500
  const trackColor = '#1F4E79';

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Fase ${phase === 'focus' ? 'foco' : 'descanso'}, ${format(remainingSeconds)} restantes`}
      style={{
        width: SIZE,
        height: SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={trackColor}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 56, fontWeight: '800', color: 'white' }}>
          {format(remainingSeconds)}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: '#A9C6E8',
            textTransform: 'uppercase',
            letterSpacing: 2,
            marginTop: 4,
          }}
        >
          {phase === 'focus' ? 'Foco' : 'Descanso'}
        </Text>
      </View>
    </View>
  );
}
