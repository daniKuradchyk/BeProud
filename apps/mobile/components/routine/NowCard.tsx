import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import {
  TASK_CATEGORY_ICONS,
  TASK_CATEGORY_LABELS,
  TIME_SLOT_LABELS,
  type TaskCategory,
  type TimeSlot,
} from '@beproud/validation';
import type { RoutineTaskWithCatalog } from '@beproud/api';
import { NEXT_SLOT_ORDER } from '@/lib/time';

type Props = {
  tasks: RoutineTaskWithCatalog[];
  completedTodayIds: Set<string>;
  activeSlot: TimeSlot;
  onComplete: (rt: RoutineTaskWithCatalog) => void;
};

function pickCandidate(
  tasks: RoutineTaskWithCatalog[],
  completed: Set<string>,
  activeSlot: TimeSlot,
  skipIds: Set<string>,
): { rt: RoutineTaskWithCatalog; isCurrent: boolean; slot: TimeSlot } | null {
  for (const slot of NEXT_SLOT_ORDER[activeSlot]) {
    const cand = tasks.find(
      (t) =>
        t.time_slot === slot &&
        !completed.has(t.id) &&
        !skipIds.has(t.id),
    );
    if (cand) return { rt: cand, isCurrent: slot === activeSlot, slot };
  }
  return null;
}

export default function NowCard({
  tasks, completedTodayIds, activeSlot, onComplete,
}: Props) {
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const picked = useMemo(
    () => pickCandidate(tasks, completedTodayIds, activeSlot, skipped),
    [tasks, completedTodayIds, activeSlot, skipped],
  );

  // Si no quedan candidatos pero todavía hay skipped, los limpio para
  // ofrecer el ciclo otra vez (mejor que un empty state falso).
  useEffect(() => {
    if (!picked && skipped.size > 0) {
      setSkipped(new Set());
    }
  }, [picked, skipped.size]);

  // Dot pulsante (solo cuando estamos en el slot activo).
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (!picked?.isCurrent) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [picked?.isCurrent, pulse]);

  if (!picked) {
    // Empty state celebratorio: o todo hecho, o no hay nada en la rutina.
    const total = tasks.length;
    const allDone = total > 0 && completedTodayIds.size >= total;
    return (
      <View className="mb-6 rounded-3xl border border-brand-300/40 bg-brand-300/10 p-5">
        <Text className="text-4xl">{allDone ? '🎉' : '🌱'}</Text>
        <Text className="mt-2 text-2xl font-extrabold text-white">
          {allDone ? 'Día completo' : 'Tu rutina está vacía'}
        </Text>
        <Text className="mt-1 text-sm text-brand-100">
          {allDone
            ? `Has hecho las ${total} tareas de hoy. Mañana más.`
            : 'Añade tu primera tarea desde el botón de abajo.'}
        </Text>
      </View>
    );
  }

  const { rt, isCurrent, slot } = picked;
  const cat = rt.task.category as TaskCategory;
  const icon = TASK_CATEGORY_ICONS[cat] ?? '✓';
  const points = rt.points_override ?? rt.task.base_points;
  const duration = (rt.task as { duration_min?: number | null }).duration_min;
  const headerLabel = isCurrent
    ? `AHORA · ${TIME_SLOT_LABELS[slot]}`
    : `Siguiente · ${TIME_SLOT_LABELS[slot]}`;

  return (
    <View
      accessibilityLabel={`Tarea actual: ${rt.task.title}, ${TASK_CATEGORY_LABELS[cat]}, en bloque ${TIME_SLOT_LABELS[slot]}`}
      className="mb-6 rounded-3xl border border-brand-600 bg-brand-700 p-5"
      style={{
        shadowColor: '#000', shadowOpacity: 0.3,
        shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      <View className="flex-row items-center">
        {isCurrent && (
          <Animated.View
            style={{ opacity: pulse, marginRight: 6 }}
            className="h-2 w-2 rounded-full bg-emerald-400"
          />
        )}
        <Text className="text-[10px] font-extrabold uppercase tracking-wider text-brand-200">
          {headerLabel}
        </Text>
      </View>

      <View className="mt-3 flex-row items-center">
        <Text style={{ fontSize: 48, lineHeight: 56 }}>{icon}</Text>
        <View className="ml-3 flex-1">
          <Text className="text-xl font-extrabold text-white" numberOfLines={2}>
            {rt.task.title}
          </Text>
          <Text className="mt-0.5 text-xs text-brand-200" numberOfLines={1}>
            {TASK_CATEGORY_LABELS[cat]}
            {duration != null ? ` · ${duration} min` : ''}
            {' · '}
            {points} pts
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Completar ${rt.task.title}`}
        onPress={() => onComplete(rt)}
        className="mt-4 rounded-full bg-brand-300 py-3 active:bg-brand-200"
      >
        <Text className="text-center text-base font-extrabold uppercase tracking-wider text-brand-900">
          Completar
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Saltar a la siguiente"
        onPress={() => setSkipped((s) => new Set(s).add(rt.id))}
        className="mt-2 self-end px-2 py-1"
      >
        <Text className="text-xs font-bold text-brand-200">Saltar →</Text>
      </Pressable>
    </View>
  );
}
