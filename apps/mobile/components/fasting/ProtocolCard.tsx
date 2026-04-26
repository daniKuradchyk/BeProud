import { Pressable, Text } from 'react-native';
import {
  FASTING_PROTOCOL_LABELS,
  type FastingProtocol,
} from '@beproud/validation';

type Props = {
  protocol: FastingProtocol;
  selected: boolean;
  onPress: () => void;
};

export default function ProtocolCard({ protocol, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`mb-2 rounded-2xl border p-3 ${
        selected ? 'border-brand-300 bg-brand-300/10' : 'border-brand-700 bg-brand-800/60'
      }`}
    >
      <Text className={`text-base font-extrabold ${selected ? 'text-white' : 'text-brand-100'}`}>
        {FASTING_PROTOCOL_LABELS[protocol]}
      </Text>
    </Pressable>
  );
}
