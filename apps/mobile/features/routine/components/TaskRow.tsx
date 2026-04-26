import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { RoutineTaskWithCatalog } from '@beproud/api';

type Props = {
  rt: RoutineTaskWithCatalog;
  isFirst: boolean;
  isLast: boolean;
  completedToday: boolean;
  onComplete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
};

/** Una fila en la lista de la rutina activa con acción primaria "Completar". */
export default function TaskRow({
  rt,
  isFirst,
  isLast,
  completedToday,
  onComplete,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Props) {
  const router = useRouter();
  const points = rt.points_override ?? rt.task.base_points;
  const duration = (rt.task as { duration_min?: number | null }).duration_min;
  return (
    <View className="mb-3 rounded-2xl border border-brand-700 bg-brand-800/60 p-3">
      <View className="flex-row items-center">
        <Text className="mr-3 text-2xl" style={{ lineHeight: 32 }}>
          {rt.task.icon ?? '✓'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Detalle de ${rt.task.title}`}
          onPress={() => router.push(`/task/${rt.task.slug}` as never)}
          className="flex-1 pr-2"
        >
          <Text className="text-base font-bold text-white" numberOfLines={1}>
            {rt.task.title}
          </Text>
          <Text className="text-xs text-brand-300" numberOfLines={1}>
            {points} pts
            {duration != null ? ` · ${duration} min` : ''}
            {' · '}
            {rt.target_frequency}
          </Text>
        </Pressable>
        <View className="flex-row items-center gap-1">
          <SmallButton
            label="↑"
            a11y="Subir"
            onPress={onMoveUp}
            disabled={isFirst}
          />
          <SmallButton
            label="↓"
            a11y="Bajar"
            onPress={onMoveDown}
            disabled={isLast}
          />
          <SmallButton
            label="✕"
            a11y="Quitar"
            onPress={onRemove}
            variant="danger"
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          completedToday ? `${rt.task.title} ya completada hoy` : `Completar ${rt.task.title}`
        }
        accessibilityState={{ disabled: completedToday }}
        disabled={completedToday}
        onPress={onComplete}
        className={`mt-3 items-center rounded-full py-2.5 ${
          completedToday
            ? 'bg-emerald-500/20'
            : 'bg-brand-300 active:bg-brand-200'
        }`}
      >
        <Text
          className={`text-sm font-extrabold ${
            completedToday ? 'text-emerald-200' : 'text-brand-900'
          }`}
        >
          {completedToday ? 'Completado hoy ✓' : 'Completar tarea'}
        </Text>
      </Pressable>
    </View>
  );
}

function SmallButton({
  label,
  a11y,
  onPress,
  disabled,
  variant,
}: {
  label: string;
  a11y: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'danger';
}) {
  const bg = disabled
    ? 'bg-brand-700/40'
    : variant === 'danger'
      ? 'bg-red-500/20 active:bg-red-500/40'
      : 'bg-brand-600/60 active:bg-brand-500';
  const text = disabled
    ? 'text-brand-500'
    : variant === 'danger'
      ? 'text-red-300'
      : 'text-white';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      disabled={disabled}
      className={`h-9 w-9 items-center justify-center rounded-full ${bg}`}
    >
      <Text className={`text-base font-bold ${text}`}>{label}</Text>
    </Pressable>
  );
}
