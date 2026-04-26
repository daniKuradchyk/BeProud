import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Button from '@/components/Button';
import {
  fetchMyPrefs,
  updateMyPrefs,
  type NotificationPrefs,
  type NotificationType,
} from '@beproud/api';

const TOGGLE_LABELS: Record<NotificationType, { title: string; hint: string }> = {
  new_like:             { title: 'Likes',                hint: 'Cuando alguien le da like a tu post' },
  new_comment:          { title: 'Comentarios',          hint: 'Cuando alguien comenta tu post' },
  new_follower:         { title: 'Nuevos seguidores',    hint: 'Cuando alguien empieza a seguirte' },
  follow_request:       { title: 'Solicitudes de follow',hint: 'Cuando piden seguirte (cuenta privada)' },
  new_dm:               { title: 'Mensajes',             hint: 'Mensajes directos y de grupo' },
  league_promotion:     { title: 'Cambios de liga',      hint: 'Cuando subes de liga semanal' },
  achievement_unlocked: { title: 'Logros desbloqueados', hint: 'Cuando consigues un logro nuevo' },
  daily_reminder:       { title: 'Recordatorio diario',  hint: 'Aviso para mantener tu racha' },
};

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function NotificationsSettings() {
  const router = useRouter();
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ['my-notification-prefs'], queryFn: fetchMyPrefs });

  const [draft, setDraft] = useState<NotificationPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (q.data && !draft) setDraft(q.data);
  }, [q.data, draft]);

  const saveMut = useMutation({
    mutationFn: (next: NotificationPrefs) => updateMyPrefs(next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-notification-prefs'] });
      setSavedAt(Date.now());
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error guardando'),
  });

  function setToggle(key: NotificationType, value: boolean) {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
    setSavedAt(null);
  }

  function setQuiet(key: 'quiet_start' | 'quiet_end', value: string) {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
    setSavedAt(null);
  }

  function onSave() {
    if (!draft) return;
    if (!HHMM_RE.test(draft.quiet_start) || !HHMM_RE.test(draft.quiet_end)) {
      setError('Las horas deben tener formato HH:MM (ej. 23:00).');
      return;
    }
    saveMut.mutate(draft);
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <Header title="Notificaciones" onBack={() => router.back()} />

      {q.isLoading || !draft ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
            Tipos
          </Text>
          <View className="mb-6 rounded-2xl border border-brand-700 bg-brand-800/60">
            {(Object.keys(TOGGLE_LABELS) as NotificationType[]).map((key, i, arr) => (
              <ToggleRow
                key={key}
                title={TOGGLE_LABELS[key].title}
                hint={TOGGLE_LABELS[key].hint}
                value={!!draft[key]}
                onChange={(v) => setToggle(key, v)}
                last={i === arr.length - 1}
              />
            ))}
          </View>

          <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
            Horas tranquilas
          </Text>
          <View className="mb-2 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
            <Text className="text-sm text-brand-200">
              No recibirás push entre estas horas (en tu zona horaria local).
              Las notifications se siguen creando — solo se silencia el sonido.
            </Text>
            <View className="mt-3 flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-xs text-brand-300">Inicio</Text>
                <TimeInput
                  value={draft.quiet_start}
                  onChange={(v) => setQuiet('quiet_start', v)}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-xs text-brand-300">Fin</Text>
                <TimeInput
                  value={draft.quiet_end}
                  onChange={(v) => setQuiet('quiet_end', v)}
                />
              </View>
            </View>
          </View>

          <Text className="mb-6 text-[11px] text-brand-300">
            Recordatorio diario: por ahora solo guardamos la preferencia. La
            programación real se activará en una versión próxima.
          </Text>

          {error && (
            <Text className="mb-3 text-sm text-red-400" accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
          {savedAt && !error && (
            <Text className="mb-3 text-sm text-emerald-300">Guardado ✓</Text>
          )}

          <Button
            title="Guardar"
            onPress={onSave}
            loading={saveMut.isPending}
            disabled={!draft || saveMut.isPending}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ToggleRow({
  title,
  hint,
  value,
  onChange,
  last,
}: {
  title: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last: boolean;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      className={`flex-row items-center px-4 py-3 ${
        !last ? 'border-b border-brand-700' : ''
      } active:bg-brand-700/40`}
    >
      <View className="flex-1 pr-3">
        <Text className="text-base font-semibold text-white">{title}</Text>
        <Text className="text-xs text-brand-300">{hint}</Text>
      </View>
      <View
        className={`h-6 w-11 justify-center rounded-full p-0.5 ${
          value ? 'bg-brand-300' : 'bg-brand-600'
        }`}
      >
        <View
          className={`h-5 w-5 rounded-full bg-white ${value ? 'ml-auto' : ''}`}
        />
      </View>
    </Pressable>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="HH:MM"
      placeholderTextColor="#7DA9DC"
      autoCorrect={false}
      keyboardType="numeric"
      maxLength={5}
      className="rounded-xl border border-brand-600 bg-brand-700/50 px-3 py-2 text-base text-white"
    />
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={onBack}
        hitSlop={12}
        className="px-2 py-1"
      >
        <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
      </Pressable>
      <View className="flex-1 items-center">
        <Text className="text-base font-bold text-white">{title}</Text>
      </View>
      <View style={{ width: 60 }} />
    </View>
  );
}
