import { View } from 'react-native';

type Props = {
  total: number;
  current: number; // 0-based
};

export default function WizardProgressBar({ total, current }: Props) {
  if (total <= 0) return null;
  return (
    <View className="flex-row gap-1 px-4 pb-2">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-1 flex-1 rounded-full ${i <= current ? 'bg-brand-300' : 'bg-brand-700/40'}`}
        />
      ))}
    </View>
  );
}
