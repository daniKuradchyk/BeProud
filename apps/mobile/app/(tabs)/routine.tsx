import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import Screen from '@/components/Screen';
import Button from '@/components/Button';
import RoutineHeader from '@/components/routine/RoutineHeader';
import NowCard from '@/components/routine/NowCard';
import DayBlock from '@/components/routine/DayBlock';
import RoutineModulesCarousel from '@/components/routine/RoutineModulesCarousel';
import AddTaskSheet from '@/features/routine/components/AddTaskSheet';
import CompleteSheet from '@/features/routine/components/CompleteSheet';
import TaskActionsSheet from '@/features/routine/components/TaskActionsSheet';
import { useSession } from '@/lib/session';
import { getActiveTimeSlot } from '@/lib/time';
import {
  addRoutineTask,
  fetchMyGymRoutine,
  fetchMyRecentCompletions,
  fetchTodayCompletionByRoutineTask,
  getCurrentStreak,
  removeRoutineTask,
  todayLocalDayIndex,
  updateRoutineTaskTimeSlot,
  type RoutineTaskWithCatalog,
} from '@beproud/api';
import { TIME_SLOTS, type TimeSlot } from '@beproud/validation';

export default function RoutineScreen() {
  const router = useRouter();
  const { routine, refreshRoutine, profile } = useSession();
  const qc = useQueryClient();

  const showGymBanner =
    profile?.primary_goal === 'gain_muscle' || profile?.primary_goal === 'performance';
  const gymRoutineQ = useQuery({
    queryKey: ['gym-routine'],
    queryFn: fetchMyGymRoutine,
    enabled: showGymBanner,
  });
  const todayIdx = todayLocalDayIndex();
  const gymToday =
    gymRoutineQ.data?.days.find((d) => d.day_index === todayIdx) ?? null;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [completing, setCompleting] = useState<RoutineTaskWithCatalog | null>(null);
  const [actionsFor, setActionsFor] = useState<RoutineTaskWithCatalog | null>(null);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Bloque temporal activo (Mañana / Tarde / Noche). Recalcula cada minuto
  // para que el dot pulsante y el bloque expandido por defecto sean correctos
  // si el usuario deja la app abierta cruzando una franja.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const activeSlot: TimeSlot = useMemo(() => getActiveTimeSlot(now), [now]);

  // Streak + puntos de hoy para el header.
  const streakQ = useQuery({
    queryKey: ['my-streak'],
    queryFn: getCurrentStreak,
    enabled: !!profile,
  });
  const todayCompletionsQ = useQuery({
    queryKey: ['my-completions-today'],
    queryFn: () => fetchMyRecentCompletions(50),
    enabled: !!profile,
  });
  const pointsToday = useMemo(() => {
    const list = todayCompletionsQ.data ?? [];
    const todayKey = new Date().toDateString();
    return list
      .filter((c) => new Date(c.created_at).toDateString() === todayKey)
      .reduce((acc, c) => acc + c.points_awarded, 0);
  }, [todayCompletionsQ.data]);

  // Carga "qué tareas ya tengo completadas hoy" cada vez que cambia la rutina.
  useEffect(() => {
    if (!routine) return;
    let cancel = false;
    (async () => {
      try {
        const results = await Promise.all(
          routine.tasks.map((rt) =>
            fetchTodayCompletionByRoutineTask(rt.id)
              .then((c) => (c ? rt.id : null))
              .catch(() => null),
          ),
        );
        if (cancel) return;
        const done = new Set<string>();
        for (const id of results) if (id) done.add(id);
        setCompletedToday(done);
      } catch {
        // Silencio: si falla, mostramos progreso 0/N hasta el siguiente refresh.
      }
    })();
    return () => {
      cancel = true;
    };
  }, [routine]);

  if (!routine) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      </Screen>
    );
  }

  const tasks = routine.tasks;
  const totalToday = tasks.length;
  const doneToday = completedToday.size;

  // Empty state: rutina sin diseñar — Fase 15 lleva a /routine-design.
  if (tasks.length === 0) {
    return (
      <Screen scroll>
        <View className="flex-1 items-center justify-center px-6 py-12">
          <Text className="mb-3 text-5xl">🎯</Text>
          <Text className="mb-2 text-center text-2xl font-extrabold text-white">
            Aún no has diseñado tu rutina
          </Text>
          <Text className="mb-6 text-center text-sm text-brand-200">
            Te llevamos a diseñarla por bloques. Empieza por la mañana, sigue por la
            tarde y termina con la noche.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Diseñar mi rutina"
            onPress={() => router.push('/routine-design' as never)}
            className="rounded-full bg-brand-300 px-6 py-3 active:bg-brand-200"
          >
            <Text className="text-base font-extrabold text-brand-900">
              Diseñar mi rutina
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // Agrupación por slot, manteniendo orden global de position.
  const tasksBySlot: Record<TimeSlot, RoutineTaskWithCatalog[]> = {
    morning: [], afternoon: [], evening: [], anytime: [],
  };
  for (const rt of tasks) {
    tasksBySlot[rt.time_slot].push(rt);
  }

  // Routing tipado: si la tarea pertenece a un módulo dedicado, redirige
  // en lugar de abrir el CompleteSheet de foto.
  function onCompletePress(rt: RoutineTaskWithCatalog) {
    const mod = (rt.task as { module?: string }).module ?? 'generic';
    if (mod === 'study') {
      router.push(`/study/start?routineTaskId=${rt.id}` as never);
      return;
    }
    if (mod === 'gym') {
      router.push(`/gym?routineTaskId=${rt.id}` as never);
      return;
    }
    if (mod === 'nutrition') {
      const slug = (rt.task as { slug?: string }).slug ?? '';
      const mealBySlug =
        slug === 'healthy_breakfast' ? 'breakfast'
        : slug === 'healthy_lunch'   ? 'lunch'
        : slug === 'healthy_snack'   ? 'snack'
        : slug === 'healthy_dinner'  ? 'dinner'
        : null;
      router.push(
        (mealBySlug ? `/nutrition/meal/${mealBySlug}` : '/nutrition') as never,
      );
      return;
    }
    setCompleting(rt);
  }

  async function onMoveSlot(rt: RoutineTaskWithCatalog, slot: TimeSlot) {
    if (rt.time_slot === slot) return;
    setError(null);
    try {
      await updateRoutineTaskTimeSlot(rt.id, slot);
      await refreshRoutine();
      qc.invalidateQueries({ queryKey: ['daily-recommendations'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar de bloque');
    }
  }

  async function onRemove(routineTaskId: string) {
    setError(null);
    try {
      await removeRoutineTask(routineTaskId);
      await refreshRoutine();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  return (
    <Screen scroll>
      <RoutineHeader
        displayName={profile?.display_name ?? null}
        activeSlot={activeSlot}
        completedToday={doneToday}
        totalToday={totalToday}
        streakDays={streakQ.data ?? profile?.streak_current ?? 0}
        pointsToday={pointsToday}
      />

      <NowCard
        tasks={tasks}
        completedTodayIds={completedToday}
        activeSlot={activeSlot}
        onComplete={(rt) => onCompletePress(rt)}
      />

      <RoutineModulesCarousel />

      {showGymBanner && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            gymToday ? `Empezar día de ${gymToday.name}` : 'Abrir Gimnasio'
          }
          onPress={() => router.push('/gym' as never)}
          className="mb-4 flex-row items-center rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 active:bg-amber-400/15"
        >
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-amber-400/20">
            <Text style={{ fontSize: 24 }}>🏋️</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200">
              Gimnasio
            </Text>
            <Text className="text-sm font-extrabold text-white" numberOfLines={1}>
              {gymToday ? `Hoy es día de ${gymToday.name}` : 'Tu sub-app de gym'}
            </Text>
            <Text className="text-xs text-amber-100/80" numberOfLines={1}>
              {gymToday
                ? `${gymToday.exercises.length} ejercicios programados`
                : gymRoutineQ.data
                  ? 'Hoy es día de descanso'
                  : 'Crea tu rutina personalizada'}
            </Text>
          </View>
          <Text className="ml-2 text-base text-amber-200">›</Text>
        </Pressable>
      )}

      {error && (
        <Text className="mb-3 text-sm text-red-400" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      {TIME_SLOTS.map((slot) => (
        <DayBlock
          key={slot}
          slot={slot}
          tasks={tasksBySlot[slot]}
          completedTodayIds={completedToday}
          isActive={slot === activeSlot}
          onComplete={(rt) => onCompletePress(rt)}
          onOpenActions={(rt) => setActionsFor(rt)}
        />
      ))}

      {tasks.length === 0 && (
        <View className="mb-4 rounded-2xl border border-dashed border-brand-600 bg-brand-800/40 p-6">
          <Text className="text-center text-base text-brand-200">
            Tu rutina está vacía. Añade tareas del catálogo.
          </Text>
        </View>
      )}

      <Button
        title="+ Añadir tarea"
        variant="secondary"
        onPress={() => setSheetOpen(true)}
        className="mt-2"
      />

      <AddTaskSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        alreadyPicked={tasks.map((t) => t.task.id)}
        onPick={async (task, timeSlot) => {
          setError(null);
          try {
            await addRoutineTask(routine.id, { taskId: task.id }, { timeSlot });
            await refreshRoutine();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo añadir');
          }
        }}
      />

      <TaskActionsSheet
        rt={actionsFor}
        onClose={() => setActionsFor(null)}
        onComplete={() => {
          if (actionsFor) onCompletePress(actionsFor);
        }}
        onMoveSlot={(slot) => {
          if (actionsFor) void onMoveSlot(actionsFor, slot);
        }}
        onRemove={() => {
          if (actionsFor) void onRemove(actionsFor.id);
        }}
      />

      {completing && (
        <CompleteSheet
          visible={!!completing}
          onClose={() => {
            setCompleting(null);
            qc.invalidateQueries({ queryKey: ['daily-recommendations'] });
            qc.invalidateQueries({ queryKey: ['my-completions-today'] });
          }}
          routineTaskId={completing.id}
          taskId={completing.task.id}
          baseTitle={completing.task.title}
          basePoints={completing.points_override ?? completing.task.base_points}
          baseHint={completing.task.photo_hint}
        />
      )}
    </Screen>
  );
}
