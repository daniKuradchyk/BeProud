import { Pressable, Text, View } from 'react-native';

import {
  TASK_CATEGORY_ICONS,
  type TaskCategory,
} from '@beproud/validation';
import type { RoutineTaskWithCatalog } from '@beproud/api';

type Props = {
  rt: RoutineTaskWithCatalog;
  completedToday: boolean;
  onComplete: () => void;
  onOpenActions: () => void;
};

/** Fila compacta dentro de un DayBlock. Tap → completar, → abre acciones. */
export default function RoutineTaskRow({
  rt, completedToday, onComplete, onOpenActions,
}: Props) {
  const points = rt.points_override ?? rt.task.base_points;
  const duration = (rt.task as { duration_min?: number | null }).duration_min;
  const icon = TASK_CATEGORY_ICONS[rt.task.category as TaskCategory] ?? '✓';

  return (
    <View
      className={`mb-2 flex-row items-center rounded-xl border p-3 ${
        completedToday
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-brand-700 bg-brand-800/60'
      }`}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completedToday }}
        accessibilityLabel={
          completedToday ? `${rt.task.title}, completada` : `Completar ${rt.task.title}`
        }
        onPress={() => {
          if (!completedToday) onComplete();
        }}
        hitSlop={8}
        className={`mr-3 h-7 w-7 items-center justify-center rounded-full border-2 ${
          completedToday
            ? 'border-emerald-400 bg-emerald-500/30'
            : 'border-brand-500'
        }`}
      >
        {completedToday && (
          <Text className="text-xs font-extrabold text-emerald-200">✓</Text>
        )}
      </Pressable>

      <Text style={{ fontSize: 22, lineHeight: 26 }} className="mr-2">
        {icon}
      </Text>

      <View className="flex-1 pr-2">
        <Text
          className={`text-sm font-bold ${
            completedToday ? 'text-emerald-100 line-through' : 'text-white'
          }`}
          numberOfLines={1}
        >
          {rt.task.title}
        </Text>
        <Text className="text-xs text-brand-300" numberOfLines={1}>
          {points} pts{duration != null ? ` · ${duration} min` : ''}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Acciones de ${rt.task.title}`}
        onPress={onOpenActions}
        hitSlop={8}
        className="h-8 w-8 items-center justify-center rounded-full bg-brand-700/60 active:bg-brand-600"
      >
        <Text className="text-base font-bold text-brand-200">→</Text>
      </Pressable>
    </View>
  );
}
