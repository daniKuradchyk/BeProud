import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import {
  fetchTaskBySlug,
  missingEquipment,
  type EvidenceLevel,
} from '@beproud/api';
import {
  EQUIPMENT_LABELS,
  RESTRICTION_LABELS,
  TASK_CATEGORY_LABELS,
  type Equipment,
  type Restriction,
  type TaskCategory,
} from '@beproud/validation';
import { useSession } from '@/lib/session';
import { backOrReplace } from '@/lib/navigation/back';

const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  strong:    'Evidencia fuerte',
  moderate:  'Evidencia moderada',
  weak:      'Evidencia limitada',
  consensus: 'Consenso clínico',
};

const EVIDENCE_COLOR: Record<EvidenceLevel, string> = {
  strong:    'bg-emerald-500/20 text-emerald-200',
  moderate:  'bg-brand-300/20  text-brand-100',
  weak:      'bg-amber-500/20  text-amber-200',
  consensus: 'bg-brand-700      text-brand-200',
};

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  arms: 'Brazos',
  legs: 'Piernas',
  glutes: 'Glúteos',
  core: 'Core',
  full_body: 'Full body',
  cardio_system: 'Cardiovascular',
  mobility: 'Movilidad',
  flexibility: 'Flexibilidad',
  lower_back: 'Lumbar',
  none: '—',
};

export default function TaskDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { profile } = useSession();

  const q = useQuery({
    queryKey: ['task-detail', slug],
    queryFn: () => fetchTaskBySlug(slug),
    enabled: !!slug,
  });

  const t = q.data;
  const profileEquipment = (profile?.equipment ?? []) as string[];
  const missing = t ? missingEquipment(t, profileEquipment) : [];
  const blocked = missing.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => backOrReplace(router, '/(tabs)/routine' as never)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-white" numberOfLines={1}>
            Detalle de tarea
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {q.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      ) : !t ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-bold text-white">
            Tarea no encontrada
          </Text>
          <Text className="mt-1 text-center text-sm text-brand-200">
            Es posible que se haya retirado del catálogo.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Header */}
          <View className="mb-4 flex-row items-center">
            <Text style={{ fontSize: 56, lineHeight: 64 }}>{t.icon ?? '✓'}</Text>
            <View className="ml-4 flex-1">
              <Text className="text-2xl font-extrabold text-white">{t.title}</Text>
              <Text className="text-xs text-brand-300">
                {TASK_CATEGORY_LABELS[t.category as TaskCategory] ?? t.category}
                {t.subcategory && t.subcategory !== 'none'
                  ? ` · ${t.subcategory.replaceAll('_', ' ')}`
                  : ''}
              </Text>
            </View>
          </View>

          <Text className="mb-4 text-base text-brand-100">{t.description}</Text>

          {/* Métricas */}
          <View className="mb-4 flex-row gap-2">
            <Metric label="Puntos" value={`${t.base_points}`} suffix="pts" />
            {t.duration_min != null && (
              <Metric label="Duración" value={`${t.duration_min}`} suffix="min" />
            )}
            {t.calories_burned != null && t.calories_burned > 0 && (
              <Metric label="Calorías" value={`${t.calories_burned}`} suffix="kcal" />
            )}
            {t.difficulty != null && (
              <Metric label="Dificultad" value={'★'.repeat(t.difficulty)} />
            )}
          </View>

          {/* Lock */}
          {blocked && (
            <View className="mb-4 rounded-xl border border-amber-300/40 bg-amber-300/10 p-3">
              <Text className="text-sm font-bold text-amber-100">
                🔒 Necesitas: {missing.map((e) => EQUIPMENT_LABELS[e as Equipment] ?? e).join(', ')}
              </Text>
              <Text className="mt-1 text-xs text-amber-200/80">
                Añade el equipo en Ajustes → Datos biométricos para usarla.
              </Text>
            </View>
          )}

          {/* Muscle groups */}
          {(t.muscle_groups ?? []).filter((m) => m !== 'none').length > 0 && (
            <Section title="Grupos musculares">
              <View className="flex-row flex-wrap gap-2">
                {t.muscle_groups
                  .filter((m) => m !== 'none')
                  .map((m) => (
                    <Pill key={m} label={MUSCLE_LABELS[m] ?? m} />
                  ))}
              </View>
            </Section>
          )}

          {/* Equipment */}
          {(t.equipment_required ?? []).length > 0 && (
            <Section title="Equipo requerido">
              <View className="flex-row flex-wrap gap-2">
                {t.equipment_required.map((e) => (
                  <Pill key={e} label={EQUIPMENT_LABELS[e as Equipment] ?? e} />
                ))}
              </View>
            </Section>
          )}

          {/* Contraindications */}
          {(t.contraindications ?? []).length > 0 && (
            <Section title="Precauciones">
              <View className="flex-row flex-wrap gap-2">
                {t.contraindications.map((c) => (
                  <View
                    key={c}
                    className="rounded-full bg-red-500/15 px-3 py-1"
                  >
                    <Text className="text-xs font-bold text-red-200">
                      ⚠ {RESTRICTION_LABELS[c as Restriction] ?? c}
                    </Text>
                  </View>
                ))}
              </View>
              <Text className="mt-2 text-xs text-brand-300">
                Si alguna te aplica, salta esta tarea.
              </Text>
            </Section>
          )}

          {/* Photo hint */}
          <Section title="Foto sugerida">
            <Text className="text-sm text-brand-100">{t.photo_hint}</Text>
          </Section>

          {/* Evidencia + referencias */}
          {t.evidence_level && (
            <View className="mb-3 flex-row">
              <View
                className={`rounded-full px-3 py-1 ${
                  EVIDENCE_COLOR[t.evidence_level].split(' ')[0]
                }`}
              >
                <Text
                  className={`text-xs font-extrabold ${
                    EVIDENCE_COLOR[t.evidence_level].split(' ')[1]
                  }`}
                >
                  {EVIDENCE_LABEL[t.evidence_level]}
                </Text>
              </View>
            </View>
          )}
          {t.references_text && (
            <View className="mb-4 rounded-xl border border-brand-700 bg-brand-800/60 p-3">
              <Text className="text-[10px] font-extrabold uppercase tracking-wider text-brand-300">
                Referencias
              </Text>
              <Text className="mt-1 text-xs text-brand-200">
                {t.references_text}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <View className="flex-1 rounded-xl border border-brand-700 bg-brand-800/60 p-3">
      <Text className="text-[10px] uppercase tracking-wider text-brand-300">
        {label}
      </Text>
      <Text className="mt-1 text-base font-extrabold text-white">
        {value}
        {suffix ? ` ${suffix}` : ''}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-brand-700 px-3 py-1">
      <Text className="text-xs font-bold text-brand-100">{label}</Text>
    </View>
  );
}
