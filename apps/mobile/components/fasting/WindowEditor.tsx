import { Text, TextInput, View } from 'react-native';

type Props = {
  label: string;
  value: string;        // 'HH:MM'
  onChange: (v: string) => void;
};

function maskHHMM(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export default function WindowEditor({ label, value, onChange }: Props) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs uppercase tracking-wider text-brand-300">{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(maskHHMM(t))}
        keyboardType="numbers-and-punctuation"
        placeholder="HH:MM"
        placeholderTextColor="#7894B5"
        accessibilityLabel={label}
        maxLength={5}
        className="rounded-2xl bg-brand-700/40 px-4 py-3 text-base text-white"
      />
    </View>
  );
}
