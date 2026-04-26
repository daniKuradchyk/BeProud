import { Text, View } from 'react-native';
import { ringPct } from '@/lib/nutrition/format';

type Props = {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  color?: string;
};

export default function MacroBar({ label, consumed, target, unit, color }: Props) {
  const pct = ringPct(consumed, target) * 100;
  const bar = color ?? '#7DD3FC';
  return (
    <View className="mb-3">
      <View className="mb-1 flex-row items-baseline justify-between">
        <Text className="text-xs uppercase tracking-wider text-brand-300">{label}</Text>
        <Text className="text-xs text-brand-200">
          {Math.round(consumed)} / {Math.round(target)} {unit}
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-brand-700/40">
        <View
          style={{ width: `${pct}%`, backgroundColor: bar }}
          className="h-full rounded-full"
        />
      </View>
    </View>
  );
}
