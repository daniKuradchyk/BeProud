import { Pressable, Text, TextInput, View } from 'react-native';

type Props = {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  presets?: number[];
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 5000,
  step = 10,
  presets = [50, 100, 150, 200],
}: Props) {
  return (
    <View>
      <View className="flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Restar"
          onPress={() => onChange(clamp(value - step, min, max))}
          className="h-10 w-10 items-center justify-center rounded-full bg-brand-700/60 active:bg-brand-600"
        >
          <Text className="text-lg font-bold text-white">−</Text>
        </Pressable>
        <TextInput
          value={String(value)}
          onChangeText={(t) => {
            const n = Number(t.replace(/[^0-9]/g, ''));
            onChange(clamp(n, min, max));
          }}
          keyboardType="numeric"
          accessibilityLabel="Gramos"
          className="mx-2 flex-1 rounded-md bg-brand-700/40 px-3 py-2 text-center text-lg font-bold text-white"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sumar"
          onPress={() => onChange(clamp(value + step, min, max))}
          className="h-10 w-10 items-center justify-center rounded-full bg-brand-700/60 active:bg-brand-600"
        >
          <Text className="text-lg font-bold text-white">+</Text>
        </Pressable>
        <Text className="ml-2 text-sm text-brand-300">g</Text>
      </View>
      {presets.length > 0 && (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {presets.map((p) => (
            <Pressable
              key={p}
              accessibilityRole="button"
              accessibilityLabel={`Establecer ${p} gramos`}
              onPress={() => onChange(clamp(p, min, max))}
              className="rounded-full bg-brand-700/40 px-3 py-1 active:bg-brand-600/60"
            >
              <Text className="text-xs font-bold text-brand-100">{p} g</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
