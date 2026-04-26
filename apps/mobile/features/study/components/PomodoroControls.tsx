import { Pressable, Text, View } from 'react-native';

type Props = {
  isPaused: boolean;
  canSkipBreak: boolean;
  onPauseToggle: () => void;
  onSkip: () => void;
  onFinish: () => void;
};

export default function PomodoroControls({
  isPaused, canSkipBreak, onPauseToggle, onSkip, onFinish,
}: Props) {
  return (
    <View className="mt-6 w-full">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPaused ? 'Reanudar' : 'Pausar'}
        onPress={onPauseToggle}
        className="rounded-full bg-brand-300 py-3 active:bg-brand-200"
      >
        <Text className="text-center text-base font-extrabold uppercase tracking-wider text-brand-900">
          {isPaused ? '▶ Reanudar' : '⏸ Pausar'}
        </Text>
      </Pressable>

      <View className="mt-3 flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={canSkipBreak ? 'Saltar a descanso' : 'Saltar fase'}
          onPress={onSkip}
          className="flex-1 rounded-full bg-brand-700 py-2.5 active:bg-brand-600"
        >
          <Text className="text-center text-sm font-bold text-white">
            {canSkipBreak ? 'Saltar a descanso' : 'Saltar fase'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Terminar sesión"
          onPress={onFinish}
          className="flex-1 rounded-full bg-red-500/15 py-2.5 active:bg-red-500/30"
        >
          <Text className="text-center text-sm font-bold text-red-200">
            Terminar
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
