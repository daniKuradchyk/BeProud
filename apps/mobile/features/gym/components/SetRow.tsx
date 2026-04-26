import { Pressable, Text, TextInput, View } from 'react-native';

type Props = {
  setIndex: number;
  reps: string;
  weightKg: string;
  done: boolean;
  onChangeReps: (v: string) => void;
  onChangeWeight: (v: string) => void;
  onMarkDone: () => void;
  onUndo?: () => void;
};

export default function SetRow({
  setIndex, reps, weightKg, done,
  onChangeReps, onChangeWeight, onMarkDone, onUndo,
}: Props) {
  return (
    <View className={`flex-row items-center rounded-xl border p-2 ${
      done ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-brand-700 bg-brand-800/60'
    }`}>
      <Text className="w-8 text-center text-sm font-extrabold text-brand-200">
        {setIndex}
      </Text>
      <View className="flex-1 flex-row items-center gap-2">
        <NumInput value={weightKg} onChangeText={onChangeWeight} suffix="kg" />
        <Text className="text-brand-300">×</Text>
        <NumInput value={reps} onChangeText={onChangeReps} suffix="reps" />
      </View>
      {done ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Deshacer set"
          onPress={onUndo}
          className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-emerald-500/30 active:bg-emerald-500/50"
        >
          <Text className="text-base font-extrabold text-emerald-200">✓</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Marcar set"
          onPress={onMarkDone}
          className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-brand-300 active:bg-brand-200"
        >
          <Text className="text-base font-extrabold text-brand-900">○</Text>
        </Pressable>
      )}
    </View>
  );
}

function NumInput({
  value, onChangeText, suffix,
}: {
  value: string;
  onChangeText: (v: string) => void;
  suffix?: string;
}) {
  return (
    <View className="flex-row items-center rounded-lg bg-brand-700/40 px-2 py-1">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        maxLength={5}
        className="min-w-[40px] text-center text-base font-bold text-white"
      />
      {suffix && <Text className="ml-1 text-[10px] text-brand-300">{suffix}</Text>}
    </View>
  );
}
