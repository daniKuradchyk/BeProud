import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, Vibration, View } from 'react-native';

type Props = {
  /** Duración inicial en segundos. Cambiar el valor reinicia el timer. */
  seconds: number;
  /** Callback al llegar a 0. */
  onDone?: () => void;
};

export default function RestTimer({ seconds, onDone }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reinicia cuando cambia la duración objetivo (tras logSet).
  useEffect(() => {
    setRemaining(seconds);
    setRunning(true);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (Platform.OS !== 'web') {
            try { Vibration.vibrate([0, 200, 100, 200]); } catch { /* nooop */ }
          }
          onDone?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, onDone]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const label = `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  const ratio = seconds > 0 ? remaining / seconds : 0;

  return (
    <View className="rounded-2xl border border-brand-700 bg-brand-800/80 p-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[10px] uppercase tracking-wider text-brand-300">
            Descanso
          </Text>
          <Text className={`text-3xl font-extrabold ${
            remaining === 0 ? 'text-emerald-300' : 'text-white'
          }`}>
            {label}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="±15s"
            onPress={() => setRemaining((r) => Math.max(0, r + 15))}
            className="rounded-full bg-brand-700 px-3 py-2 active:bg-brand-600"
          >
            <Text className="text-sm font-bold text-white">+15s</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="-15s"
            onPress={() => setRemaining((r) => Math.max(0, r - 15))}
            className="rounded-full bg-brand-700 px-3 py-2 active:bg-brand-600"
          >
            <Text className="text-sm font-bold text-white">−15s</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={running ? 'Pausar' : 'Reanudar'}
            onPress={() => setRunning((r) => !r)}
            className="rounded-full bg-brand-300 px-3 py-2 active:bg-brand-200"
          >
            <Text className="text-sm font-extrabold text-brand-900">
              {running ? '⏸' : '▶'}
            </Text>
          </Pressable>
        </View>
      </View>
      <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-700/60">
        <View
          className="h-full bg-brand-300"
          style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
        />
      </View>
    </View>
  );
}
