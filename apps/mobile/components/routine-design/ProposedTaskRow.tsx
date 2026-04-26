import { Pressable, Text, View } from 'react-native';
import { TASK_CATEGORY_ICONS, type ProposedTask } from '@beproud/validation';

type Props = {
  proposal: ProposedTask;
  onRemove: () => void;
};

export default function ProposedTaskRow({ proposal, onRemove }: Props) {
  const icon = TASK_CATEGORY_ICONS[proposal.category] ?? '✓';
  return (
    <View className="mb-2 flex-row items-center rounded-2xl border border-brand-700 bg-brand-800/60 p-3">
      <Text className="mr-3 text-2xl" style={{ lineHeight: 28 }}>
        {icon}
      </Text>
      <View className="flex-1 pr-2">
        <Text className="text-sm font-bold text-white" numberOfLines={1}>
          {proposal.title}
        </Text>
        <Text className="text-xs text-brand-300" numberOfLines={1}>
          {proposal.base_points} pts · {proposal.target_frequency}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Eliminar ${proposal.title}`}
        onPress={onRemove}
        hitSlop={8}
        className="h-8 w-8 items-center justify-center rounded-full bg-red-500/20 active:bg-red-500/40"
      >
        <Text className="text-base font-bold text-red-300">×</Text>
      </Pressable>
    </View>
  );
}
