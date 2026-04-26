import { Pressable, Text, View } from 'react-native';
import { TIME_SLOT_ICONS, TIME_SLOT_LABELS, type WizardSlot } from '@beproud/validation';

type Props = {
  slot: WizardSlot;
  count: number;
  onPress: () => void;
};

export default function BlockHubCard({ slot, count, onPress }: Props) {
  const configured = count > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${TIME_SLOT_LABELS[slot]}, ${configured ? `${count} tareas` : 'sin configurar'}`}
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-2xl border border-brand-700 bg-brand-800/60 p-4 active:bg-brand-700/40"
    >
      <Text className="mr-3 text-3xl" style={{ lineHeight: 36 }}>
        {TIME_SLOT_ICONS[slot]}
      </Text>
      <View className="flex-1">
        {configured && (
          <Text className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
            ✓ Configurado
          </Text>
        )}
        <Text className="text-base font-extrabold text-white">
          {TIME_SLOT_LABELS[slot]}
        </Text>
        <Text className="text-xs text-brand-300">
          {configured ? `${count} ${count === 1 ? 'tarea configurada' : 'tareas configuradas'}` : 'Sin configurar'}
        </Text>
      </View>
      <Text className="text-base font-bold text-brand-300">
        {configured ? 'Editar →' : 'Diseñar →'}
      </Text>
    </Pressable>
  );
}
