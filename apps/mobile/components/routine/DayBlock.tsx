import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  TIME_SLOT_ICONS,
  TIME_SLOT_LABELS,
  type TimeSlot,
} from '@beproud/validation';
import type { RoutineTaskWithCatalog } from '@beproud/api';

import RoutineTaskRow from './RoutineTaskRow';

type Props = {
  slot: TimeSlot;
  tasks: RoutineTaskWithCatalog[]; // ya filtradas por slot, ordenadas por position
  completedTodayIds: Set<string>;
  isActive: boolean; // expandido por defecto si activo
  onComplete: (rt: RoutineTaskWithCatalog) => void;
  onOpenActions: (rt: RoutineTaskWithCatalog) => void;
};

export default function DayBlock({
  slot, tasks, completedTodayIds, isActive, onComplete, onOpenActions,
}: Props) {
  const [expanded, setExpanded] = useState<boolean>(isActive);
  if (tasks.length === 0) return null;

  const done = tasks.filter((t) => completedTodayIds.has(t.id)).length;
  const allDone = done === tasks.length;

  return (
    <View className="mb-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${TIME_SLOT_LABELS[slot]}: ${done} de ${tasks.length}, ${expanded ? 'expandido' : 'colapsado'}`}
        onPress={() => setExpanded((v) => !v)}
        className="flex-row items-center rounded-2xl bg-brand-800/40 px-4 py-3 active:bg-brand-700/40"
      >
        <Text style={{ fontSize: 20 }} className="mr-2">
          {TIME_SLOT_ICONS[slot]}
        </Text>
        <View className="flex-1">
          <Text className="text-base font-extrabold text-white">
            {TIME_SLOT_LABELS[slot]}
          </Text>
          <Text className="text-xs text-brand-300">
            {done} / {tasks.length} {allDone ? '· ¡hecho!' : ''}
          </Text>
        </View>
        <Text className="text-base text-brand-200">
          {expanded ? '▾' : '▸'}
        </Text>
      </Pressable>

      {expanded && (
        <View className="mt-2 px-1">
          {tasks.map((rt) => (
            <RoutineTaskRow
              key={rt.id}
              rt={rt}
              completedToday={completedTodayIds.has(rt.id)}
              onComplete={() => onComplete(rt)}
              onOpenActions={() => onOpenActions(rt)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
