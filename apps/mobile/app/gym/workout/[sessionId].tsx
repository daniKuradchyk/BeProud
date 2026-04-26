import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  endWorkoutSession,
  fetchExerciseHistory,
  fetchMyGymRoutine,
  fetchSessionSets,
  fetchWorkoutSession,
  logSet,
  type GymRoutineExercise,
  type WorkoutSet,
} from '@beproud/api';
import RestTimer from '@/features/gym/components/RestTimer';
import SetRow from '@/features/gym/components/SetRow';
import PlateCalculator from '@/features/gym/components/PlateCalculator';

type SetState = {
  reps: string;
  weight: string;
  done: boolean;
  setId: string | null;
};

export default function WorkoutLive() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const sessionQ = useQuery({
    queryKey: ['workout-session', sessionId],
    queryFn: () => fetchWorkoutSession(sessionId),
    enabled: !!sessionId,
  });
  const routineQ = useQuery({
    queryKey: ['gym-routine'],
    queryFn: fetchMyGymRoutine,
  });
  const setsQ = useQuery({
    queryKey: ['session-sets', sessionId],
    queryFn: () => fetchSessionSets(sessionId),
    enabled: !!sessionId,
  });

  const day = useMemo(() => {
    if (!sessionQ.data || !routineQ.data) return null;
    return (
      routineQ.data.days.find((d) => d.id === sessionQ.data!.gym_routine_day_id) ?? null
    );
  }, [sessionQ.data, routineQ.data]);

  // Estructura de estado: por exercise_id → array de SetState (longitud = sets planeados).
  const [byExercise, setByExercise] = useState<Record<string, SetState[]>>({});
  const [restAtSeconds, setRestAtSeconds] = useState<number>(0);
  const [restKey, setRestKey] = useState<number>(0); // para reiniciar el timer
  const [calcOpen, setCalcOpen] = useState<{ targetKg: number } | null>(null);
  const [endError, setEndError] = useState<string | null>(null);

  // Inicializa estado al cargar día + sets persistidos.
  useEffect(() => {
    if (!day) return;
    setByExercise((prev) => {
      const next: Record<string, SetState[]> = { ...prev };
      for (const re of day.exercises) {
        if (next[re.exercise_id]) continue;
        next[re.exercise_id] = Array.from({ length: re.sets }, () => ({
          reps: '',
          weight: '',
          done: false,
          setId: null,
        }));
      }
      return next;
    });
  }, [day]);

  // Hidrata sets ya guardados (recargas / vuelve más tarde).
  useEffect(() => {
    if (!setsQ.data || !day) return;
    setByExercise((prev) => {
      const next = { ...prev };
      const groups = new Map<string, WorkoutSet[]>();
      for (const s of setsQ.data) {
        const list = groups.get(s.exercise_id) ?? [];
        list.push(s);
        groups.set(s.exercise_id, list);
      }
      for (const re of day.exercises) {
        const list = (groups.get(re.exercise_id) ?? []).sort(
          (a, b) => a.set_index - b.set_index,
        );
        const slots = next[re.exercise_id] ?? Array.from({ length: re.sets }, () => ({
          reps: '', weight: '', done: false, setId: null,
        }));
        list.forEach((s, i) => {
          if (slots[i]) {
            slots[i] = {
              reps: String(s.reps),
              weight: String(s.weight_kg),
              done: true,
              setId: s.id,
            };
          }
        });
        next[re.exercise_id] = slots;
      }
      return next;
    });
  }, [setsQ.data, day]);

  const logMut = useMutation({
    mutationFn: (vars: {
      sessionId: string;
      exerciseId: string;
      setIndex: number;
      reps: number;
      weightKg: number;
    }) => logSet(vars),
  });

  const endMut = useMutation({
    mutationFn: () => endWorkoutSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gym-routine'] });
      qc.invalidateQueries({ queryKey: ['workout-session', sessionId] });
      router.replace('/gym' as never);
    },
    onError: (e) => setEndError(e instanceof Error ? e.message : 'Error'),
  });

  function setField(
    exerciseId: string,
    idx: number,
    field: 'reps' | 'weight',
    value: string,
  ) {
    setByExercise((prev) => {
      const slots = [...(prev[exerciseId] ?? [])];
      const cur = slots[idx];
      if (!cur) return prev;
      slots[idx] = { ...cur, [field]: value };
      return { ...prev, [exerciseId]: slots };
    });
  }

  async function markDone(re: GymRoutineExercise, idx: number) {
    const slots = byExercise[re.exercise_id] ?? [];
    const slot = slots[idx];
    if (!slot) return;
    const reps = Number(slot.reps);
    const weight = Number(slot.weight);
    if (!Number.isFinite(reps) || reps <= 0) return;
    if (!Number.isFinite(weight) || weight < 0) return;
    try {
      const inserted = await logMut.mutateAsync({
        sessionId,
        exerciseId: re.exercise_id,
        setIndex: idx + 1,
        reps,
        weightKg: weight,
      });
      setByExercise((prev) => {
        const next = { ...prev };
        const arr = [...(next[re.exercise_id] ?? [])];
        arr[idx] = { ...slot, done: true, setId: inserted.id };
        next[re.exercise_id] = arr;
        return next;
      });
      qc.invalidateQueries({ queryKey: ['session-sets', sessionId] });
      // Arranca el timer con el rest del ejercicio.
      setRestAtSeconds(re.rest_seconds);
      setRestKey((k) => k + 1);
    } catch (e) {
      console.warn('[gym] logSet falló', e);
    }
  }

  if (sessionQ.isLoading || routineQ.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <Header onBack={() => router.back()} title="Workout" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      </SafeAreaView>
    );
  }

  if (!sessionQ.data || !day) {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <Header onBack={() => router.back()} title="Workout" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-white">Sesión no encontrada</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalDone = Object.values(byExercise).reduce(
    (acc, arr) => acc + arr.filter((s) => s.done).length,
    0,
  );
  const totalSlots = Object.values(byExercise).reduce(
    (acc, arr) => acc + arr.length,
    0,
  );

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <Header onBack={() => router.back()} title={day.name} />

      <View className="px-4 pb-1">
        <RestTimer key={restKey} seconds={restAtSeconds} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {day.exercises.map((re) => (
          <ExerciseBlock
            key={re.id}
            re={re}
            sets={byExercise[re.exercise_id] ?? []}
            onChangeField={(idx, field, v) => setField(re.exercise_id, idx, field, v)}
            onMarkDone={(idx) => markDone(re, idx)}
            onOpenCalc={(target) => setCalcOpen({ targetKg: target })}
          />
        ))}

        {endError && <Text className="mt-2 text-sm text-red-400">{endError}</Text>}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Terminar workout"
          disabled={endMut.isPending}
          onPress={() => endMut.mutate()}
          className="mt-6 rounded-full bg-brand-300 px-5 py-3 active:bg-brand-200"
        >
          <Text className="text-center text-base font-extrabold text-brand-900">
            {endMut.isPending
              ? 'Cerrando…'
              : `Terminar workout (${totalDone}/${totalSlots})`}
          </Text>
        </Pressable>
      </ScrollView>

      {calcOpen && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setCalcOpen(null)}
        >
          <Pressable
            onPress={() => setCalcOpen(null)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar calculadora"
            className="flex-1 items-center justify-center bg-black/60 px-6"
          >
            <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-sm">
              <PlateCalculator targetKg={calcOpen.targetKg} />
              <Pressable
                accessibilityRole="button"
                onPress={() => setCalcOpen(null)}
                className="mt-3 rounded-full bg-brand-700 py-2 active:bg-brand-600"
              >
                <Text className="text-center text-sm font-bold text-white">
                  Cerrar
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function ExerciseBlock({
  re,
  sets,
  onChangeField,
  onMarkDone,
  onOpenCalc,
}: {
  re: GymRoutineExercise;
  sets: SetState[];
  onChangeField: (idx: number, field: 'reps' | 'weight', v: string) => void;
  onMarkDone: (idx: number) => void;
  onOpenCalc: (targetKg: number) => void;
}) {
  // Sugerencia de peso = último set logueado del mismo ejercicio.
  const lastQ = useQuery({
    queryKey: ['exercise-history-last', re.exercise_id],
    queryFn: () => fetchExerciseHistory(re.exercise_id, 1),
  });
  const lastWeight = lastQ.data?.[0]?.weight_kg;

  const usesBarbell = re.exercise.equipment.includes('barbell');

  return (
    <View className="mb-4 rounded-2xl border border-brand-700 bg-brand-800/60 p-3">
      <View className="mb-2 flex-row items-center">
        <View className="flex-1">
          <Text className="text-base font-extrabold text-white">
            {re.exercise.name}
          </Text>
          <Text className="text-xs text-brand-300">
            {re.sets} × {re.reps_min}-{re.reps_max} · {re.rest_seconds}s descanso
            {lastWeight != null ? ` · último: ${lastWeight} kg` : ''}
          </Text>
        </View>
        {usesBarbell && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Calculadora de discos"
            onPress={() => onOpenCalc(Number(sets[0]?.weight) || lastWeight || 60)}
            className="ml-2 rounded-full bg-brand-700 px-3 py-1.5 active:bg-brand-600"
          >
            <Text className="text-xs font-bold text-brand-100">🥏 Discos</Text>
          </Pressable>
        )}
      </View>

      {sets.map((s, idx) => (
        <View key={idx} className="mb-2">
          <SetRow
            setIndex={idx + 1}
            reps={s.reps}
            weightKg={s.weight}
            done={s.done}
            onChangeReps={(v) => onChangeField(idx, 'reps', v)}
            onChangeWeight={(v) => onChangeField(idx, 'weight', v)}
            onMarkDone={() => onMarkDone(idx)}
          />
        </View>
      ))}
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver" className="px-2 py-1">
        <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
      </Pressable>
      <View className="flex-1 items-center">
        <Text className="text-base font-bold text-white" numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={{ width: 60 }} />
    </View>
  );
}
