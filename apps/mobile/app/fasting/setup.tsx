import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  disableMyProtocol,
  fetchMyProfile,
  fetchMyProtocol,
  upsertMyProtocol,
} from '@beproud/api';
import {
  FASTING_PROTOCOLS,
  FASTING_PROTOCOL_SHORT,
  FastingProtocolSchema,
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
  type FastingProtocol,
  type WeekdayKey,
} from '@beproud/validation';
import FastingHeader from '@/components/fasting/FastingHeader';
import ProtocolCard from '@/components/fasting/ProtocolCard';
import WindowEditor from '@/components/fasting/WindowEditor';
import { defaultEatWindow } from '@/lib/fasting/presets';
import { rescheduleFastingNotifications } from '@/lib/fasting/notifications';
import { backOrReplace } from '@/lib/navigation/back';

function diffHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number) as [number, number];
  const [eh, em] = end.split(':').map(Number) as [number, number];
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

export default function FastingSetup() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ protocol?: string; from?: string }>();
  const fromWizard = params.from === 'wizard';

  const profileQ = useQuery({ queryKey: ['profile', 'me'], queryFn: fetchMyProfile });
  const protoQ   = useQuery({ queryKey: ['fasting', 'protocol'], queryFn: fetchMyProtocol });

  const initialProtocol: FastingProtocol = useMemo(() => {
    const fromUrl = FastingProtocolSchema.safeParse(params.protocol);
    if (fromUrl.success) return fromUrl.data;
    return protoQ.data?.protocol ?? '16_8';
  }, [params.protocol, protoQ.data]);

  const [protocol, setProtocol] = useState<FastingProtocol>(initialProtocol);
  const [eatStart, setEatStart] = useState<string>('13:00');
  const [eatEnd,   setEatEnd]   = useState<string>('21:00');
  const [lowDays,  setLowDays]  = useState<WeekdayKey[]>(['TUE', 'FRI']);
  const [notifyBefore, setNotifyBefore] = useState(true);
  const [notifyComplete, setNotifyComplete] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza estado inicial cuando carga el protocolo existente.
  useEffect(() => {
    if (protoQ.data) {
      setProtocol(protoQ.data.protocol);
      if (protoQ.data.eat_start) setEatStart(protoQ.data.eat_start.slice(0, 5));
      if (protoQ.data.eat_end)   setEatEnd(protoQ.data.eat_end.slice(0, 5));
      if (protoQ.data.low_cal_days) setLowDays(protoQ.data.low_cal_days as WeekdayKey[]);
      setNotifyBefore(protoQ.data.notify_before_close);
      setNotifyComplete(protoQ.data.notify_on_complete);
    } else {
      // Defaults según protocolo seleccionado.
      const win = defaultEatWindow(initialProtocol);
      if (win) { setEatStart(win.eat_start); setEatEnd(win.eat_end); }
    }
  }, [protoQ.data, initialProtocol]);

  function pickProtocol(p: FastingProtocol) {
    setProtocol(p);
    const win = defaultEatWindow(p);
    if (win) { setEatStart(win.eat_start); setEatEnd(win.eat_end); }
  }

  function toggleLowDay(d: WeekdayKey) {
    setLowDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const tz = profileQ.data?.timezone ?? 'Europe/Madrid';
      const isHourBased = protocol !== '5_2';
      const row = await upsertMyProtocol({
        protocol,
        eat_start: isHourBased ? eatStart : undefined,
        eat_end:   isHourBased ? eatEnd   : undefined,
        low_cal_days: protocol === '5_2' ? lowDays : undefined,
        notify_before_close: notifyBefore,
        notify_on_complete:  notifyComplete,
        timezone: tz,
      });
      await rescheduleFastingNotifications(row);
      return row;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['fasting'] });
      if (fromWizard) {
        router.replace('/routine-design' as never);
      } else {
        router.replace('/fasting' as never);
      }
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar'),
  });

  const disableMut = useMutation({
    mutationFn: async () => {
      await disableMyProtocol();
      await rescheduleFastingNotifications(null);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['fasting'] });
      router.replace('/fasting' as never);
    },
  });

  function confirmDisable() {
    Alert.alert(
      'Desactivar ayuno',
      'Cancelaremos las notificaciones y ya no aparecerá la card en Rutina.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desactivar', style: 'destructive', onPress: () => disableMut.mutate() },
      ],
    );
  }

  const isHourBased = protocol !== '5_2';
  const fastH = isHourBased ? Math.round((24 - diffHours(eatStart, eatEnd)) * 10) / 10 : 0;
  const eatH  = isHourBased ? diffHours(eatStart, eatEnd) : 0;

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <FastingHeader
        title="Configurar ayuno"
        onBack={() =>
          backOrReplace(router, (fromWizard ? '/routine-design' : '/fasting') as never)
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">Protocolo</Text>
        {FASTING_PROTOCOLS.map((p) => (
          <ProtocolCard
            key={p}
            protocol={p}
            selected={protocol === p}
            onPress={() => pickProtocol(p)}
          />
        ))}

        {isHourBased && (
          <>
            <Text className="mb-2 mt-4 text-xs uppercase tracking-wider text-brand-300">
              Ventana de comidas
            </Text>
            <WindowEditor label="Inicio (eat_start)" value={eatStart} onChange={setEatStart} />
            <WindowEditor label="Fin (eat_end)"      value={eatEnd}   onChange={setEatEnd} />
            <View className="rounded-2xl border border-brand-700 bg-brand-800/60 p-3">
              <Text className="text-sm text-brand-200">
                Ayuno de {fastH}h, ventana {eatH}h.
              </Text>
            </View>
          </>
        )}

        {protocol === '5_2' && (
          <>
            <Text className="mb-2 mt-4 text-xs uppercase tracking-wider text-brand-300">
              Días bajos en calorías
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {WEEKDAY_KEYS.map((d) => {
                const on = lowDays.includes(d);
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => toggleLowDay(d)}
                    className={`rounded-full border px-3 py-1.5 ${
                      on ? 'border-brand-300 bg-brand-300/20' : 'border-brand-700 bg-brand-800/60'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${on ? 'text-white' : 'text-brand-100'}`}>
                      {WEEKDAY_LABELS[d]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Text className="mb-2 mt-6 text-xs uppercase tracking-wider text-brand-300">
          Notificaciones
        </Text>
        <ToggleRow
          label="Avisarme 30 min antes de cerrar la ventana"
          value={notifyBefore}
          onChange={setNotifyBefore}
        />
        <ToggleRow
          label="Avisarme cuando complete el ayuno"
          value={notifyComplete}
          onChange={setNotifyComplete}
        />

        {error && <Text className="mt-3 text-sm text-red-400">{error}</Text>}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Guardar protocolo de ayuno"
          disabled={saveMut.isPending}
          onPress={() => saveMut.mutate()}
          className="mt-6 items-center rounded-full bg-brand-300 py-3 active:bg-brand-200"
        >
          <Text className="text-base font-extrabold text-brand-900">
            {saveMut.isPending ? 'Guardando…' : `Guardar (${FASTING_PROTOCOL_SHORT[protocol]})`}
          </Text>
        </Pressable>

        {protoQ.data?.enabled && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Desactivar ayuno"
            onPress={confirmDisable}
            className="mt-3 items-center rounded-full bg-brand-700/40 py-3 active:bg-brand-600/60"
          >
            <Text className="text-sm font-bold text-red-300">Desactivar ayuno</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="mb-2 flex-row items-center justify-between rounded-2xl border border-brand-700 bg-brand-800/60 p-3">
      <Text className="flex-1 pr-3 text-sm text-brand-100">{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}
