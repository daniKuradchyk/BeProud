import { Text, View } from 'react-native';

import { TIME_SLOT_ICONS, type TimeSlot } from '@beproud/validation';

type Props = {
  displayName: string | null;
  activeSlot: TimeSlot;
  completedToday: number;
  totalToday: number;
  streakDays: number;
  pointsToday: number;
};

/** Saludo + progreso del día + badges de racha y puntos. */
export default function RoutineHeader({
  displayName,
  activeSlot,
  completedToday,
  totalToday,
  streakDays,
  pointsToday,
}: Props) {
  const name = displayName?.trim() || 'amig@';
  const slotEmoji = TIME_SLOT_ICONS[activeSlot];
  const ratio = totalToday > 0 ? Math.min(1, completedToday / totalToday) : 0;

  return (
    <View className="mb-4">
      <Text className="text-3xl font-extrabold text-white" numberOfLines={2}>
        {slotEmoji} Hola, {name}
      </Text>
      <Text className="mt-1 text-sm text-brand-200">
        {completedToday} de {totalToday} hoy
      </Text>
      <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-700/60">
        <View
          className="h-full bg-brand-300"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </View>
      <View className="mt-3 flex-row gap-2">
        <Badge text={`🔥 ${streakDays}d`} />
        <Badge text={`⭐ ${pointsToday} pts`} />
      </View>
    </View>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View className="rounded-full bg-brand-700/60 px-2.5 py-1">
      <Text className="text-xs font-bold text-brand-100">{text}</Text>
    </View>
  );
}
