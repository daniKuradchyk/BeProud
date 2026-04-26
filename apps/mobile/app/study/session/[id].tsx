import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  completeStudyCycle,
  fetchStudySession,
  finishStudySession,
} from '@beproud/api';
import PomodoroRing from '@/features/study/components/PomodoroRing';
import PomodoroControls from '@/features/study/components/PomodoroControls';
import {
  usePomodoro,
  type PomodoroPhase,
} from '@/features/study/lib/pomodoroStore';

/**
 * Recomputa fase y tiempo restante desde el estado de la sesión BBDD.
 * Asume que el user no ha pausado (best-effort tras cierre de app).
 * - cycles_completed = X significa que lleva X focus terminados.
 * - Si elapsed entra dentro de un focus en curso, devolvemos focus + remaining.
 * - Si elapsed entra dentro de un break, devolvemos break + remaining.
 * - Si ya pasó cycles_planned focus + (planned-1) break, marca el resto en 0
 *   y deja al user terminar manualmente.
 */
function deriveInitialPhase(opts: {
  startedAt: Date;
  cyclesCompleted: number;
  cyclesPlanned: number;
  focusSeconds: number;
  breakSeconds: number;
  now: Date;
}): { phase: PomodoroPhase; remainingSeconds: number; cyclesCompleted: number } {
  const { startedAt, cyclesCompleted, cyclesPlanned, focusSeconds, breakSeconds, now } = opts;
  // Tiempo elapsed desde el início del primer focus.
  let elapsed = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));

  // Tiempo "consumido" por los ciclos ya completados (focus + break entre ellos).
  const fullCycleSeconds = focusSeconds + breakSeconds;
  const consumed = cyclesCompleted * fullCycleSeconds;
  if (consumed > elapsed) {
    // El timestamp no cuadra (BBDD reporta más ciclos que tiempo) → empieza fresh.
    return { phase: 'focus', remainingSeconds: focusSeconds, cyclesCompleted };
  }
  let after = elapsed - consumed;

  // Estamos en focus N+1 hasta que `after >= focusSeconds`.
  if (cyclesCompleted >= cyclesPlanned) {
    // Ya están todos los ciclos hechos. Sesión esperando finalización.
    return { phase: 'break', remainingSeconds: 0, cyclesCompleted };
  }
  if (after < focusSeconds) {
    return {
      phase: 'focus',
      remainingSeconds: focusSeconds - after,
      cyclesCompleted,
    };
  }
  after -= focusSeconds;
  // Avanzamos al break que sigue al cycleCompleted+1 (excepto si es el último).
  const nextCyclesCompleted = cyclesCompleted + 1;
  if (nextCyclesCompleted >= cyclesPlanned) {
    return { phase: 'break', remainingSeconds: 0, cyclesCompleted: nextCyclesCompleted };
  }
  if (after < breakSeconds) {
    return {
      phase: 'break',
      remainingSeconds: breakSeconds - after,
      cyclesCompleted: nextCyclesCompleted,
    };
  }
  // Pasamos al siguiente focus.
  return {
    phase: 'focus',
    remainingSeconds: focusSeconds,
    cyclesCompleted: nextCyclesCompleted,
  };
}

async function loadKeepAwake(): Promise<typeof import('expo-keep-awake') | null> {
  try {
    return await import('expo-keep-awake');
  } catch {
    return null;
  }
}

async function loadNotifications(): Promise<typeof import('expo-notifications') | null> {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

async function scheduleBoundaryNotification(message: string) {
  if (Platform.OS === 'web') return;
  try {
    const Notif = await loadNotifications();
    if (!Notif) return;
    await Notif.scheduleNotificationAsync({
      content: { title: 'Estudio', body: message, sound: 'default' },
      trigger: null, // inmediato
    });
  } catch (e) {
    console.warn('[study] no pude notificar', e);
  }
}

export default function StudySessionScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const sessionQ = useQuery({
    queryKey: ['study-session', id],
    queryFn: () => fetchStudySession(id),
    enabled: !!id,
  });

  const session = sessionQ.data;
  const state = usePomodoro();

  // Inicializa el store al cargar la sesión, recomputando la fase.
  const initedRef = useRef(false);
  useEffect(() => {
    if (!session || initedRef.current) return;
    if (session.status !== 'in_progress') {
      // Ya está cerrada → vuelve atrás.
      router.replace('/(tabs)/routine' as never);
      return;
    }
    const derived = deriveInitialPhase({
      startedAt: new Date(session.started_at),
      cyclesCompleted: session.cycles_completed,
      cyclesPlanned: session.cycles_planned,
      focusSeconds: session.focus_minutes * 60,
      breakSeconds: session.break_minutes * 60,
      now: new Date(),
    });
    state.init({
      sessionId: session.id,
      cyclesCompleted: derived.cyclesCompleted,
      cyclesPlanned:   session.cycles_planned,
      focusMinutes:    session.focus_minutes,
      breakMinutes:    session.break_minutes,
      initialPhase:    derived.phase,
      initialRemaining: derived.remainingSeconds,
    });
    initedRef.current = true;
  }, [session, router, state]);

  // Keep-awake mientras la sesión está abierta.
  useEffect(() => {
    let cancel = false;
    let activate: (() => Promise<void>) | null = null;
    let deactivate: (() => Promise<void>) | null = null;
    (async () => {
      const Lib = await loadKeepAwake();
      if (!Lib || cancel) return;
      const tag = `study-${id}`;
      activate   = () => Lib.activateKeepAwakeAsync(tag);
      deactivate = () => Lib.deactivateKeepAwake(tag);
      await activate();
    })();
    return () => {
      cancel = true;
      void deactivate?.();
    };
  }, [id]);

  // Tick por segundo.
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (state.isPaused) return;
    if (state.remainingSeconds <= 0) return;
    tickRef.current = setInterval(() => state.tick(), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [state.isPaused, state.remainingSeconds, state.tick]);

  // Cuando se acaba la fase actual.
  const finishMut = useMutation({
    mutationFn: (status: 'completed' | 'abandoned') =>
      finishStudySession(id, status),
  });
  const cycleMut = useMutation({
    mutationFn: () => completeStudyCycle(id),
  });

  const phaseEndedRef = useRef(false);
  useEffect(() => {
    if (state.remainingSeconds > 0) {
      phaseEndedRef.current = false;
      return;
    }
    if (!session || !initedRef.current) return;
    if (phaseEndedRef.current) return;
    phaseEndedRef.current = true;

    if (state.phase === 'focus') {
      // Persistimos el ciclo cumplido.
      cycleMut.mutate(undefined, {
        onSuccess: () => {
          if (Platform.OS !== 'web') Vibration.vibrate([0, 200, 100, 200]);
          void scheduleBoundaryNotification(
            `Ciclo completado, descansa ${session.break_minutes} min.`,
          );
          // Si era el último focus, terminamos sin pasar a break largo.
          const nextCycles = state.cyclesCompleted + 1;
          if (nextCycles >= session.cycles_planned) {
            finishMut.mutate('completed', {
              onSuccess: () => {
                qc.invalidateQueries({ queryKey: ['routine-today-modules'] });
                qc.invalidateQueries({ queryKey: ['my-completions-today'] });
                qc.invalidateQueries({ queryKey: ['daily-recommendations'] });
                router.replace('/(tabs)/routine' as never);
              },
            });
          } else {
            state.onFocusEnded();
          }
        },
      });
    } else {
      if (Platform.OS !== 'web') Vibration.vibrate([0, 100, 100, 100]);
      void scheduleBoundaryNotification('Descanso terminado, vuelve al lío.');
      state.onBreakEnded();
    }
  }, [state.remainingSeconds, state.phase, session, state, cycleMut, finishMut, qc, router]);

  const [confirmEnd, setConfirmEnd] = useState(false);

  if (sessionQ.isLoading || !session) {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      </SafeAreaView>
    );
  }

  const totalCurrent = state.phase === 'focus' ? state.focusSeconds : state.breakSeconds;
  const cyclesLabel = `Ciclo ${Math.min(state.cyclesCompleted + (state.phase === 'focus' ? 1 : 0), session.cycles_planned)} de ${session.cycles_planned}`;

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-white">Pomodoro</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <PomodoroRing
          remainingSeconds={state.remainingSeconds}
          totalSeconds={totalCurrent}
          phase={state.phase}
        />
        <Text className="mt-4 text-sm text-brand-200">
          {state.phase === 'focus' ? 'Foco' : 'Descanso'} · {cyclesLabel}
        </Text>
        {Platform.OS === 'web' && (
          <Text className="mt-1 text-[11px] text-brand-300">
            Mantén la pestaña abierta para que el timer corra.
          </Text>
        )}

        <PomodoroControls
          isPaused={state.isPaused}
          canSkipBreak={state.phase === 'focus'}
          onPauseToggle={state.isPaused ? state.resume : state.pause}
          onSkip={state.skipPhase}
          onFinish={() => setConfirmEnd(true)}
        />
      </View>

      <Modal
        visible={confirmEnd}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmEnd(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={() => setConfirmEnd(false)}
          className="flex-1 items-center justify-center bg-black/60 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-brand-700 bg-brand-800 p-5"
          >
            <Text className="mb-1 text-base font-extrabold text-white">
              ¿Terminar sesión?
            </Text>
            <Text className="mb-4 text-sm text-brand-200">
              Si quedan ciclos, la sesión se marcará como abandonada y no
              contará puntos.
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                onPress={() => setConfirmEnd(false)}
                className="flex-1 rounded-full bg-brand-700 py-2 active:bg-brand-600"
              >
                <Text className="text-center text-sm font-bold text-white">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Terminar"
                disabled={finishMut.isPending}
                onPress={() => {
                  setConfirmEnd(false);
                  finishMut.mutate('abandoned', {
                    onSuccess: () => {
                      qc.invalidateQueries({ queryKey: ['routine-today-modules'] });
                      router.replace('/(tabs)/routine' as never);
                    },
                  });
                }}
                className="flex-1 rounded-full bg-red-500/30 py-2 active:bg-red-500/50"
              >
                <Text className="text-center text-sm font-bold text-red-100">
                  Terminar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
