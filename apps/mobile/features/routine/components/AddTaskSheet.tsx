import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  fetchTaskCatalog,
  missingEquipment,
  type TaskCatalogItem,
} from '@beproud/api';
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  TIME_SLOTS,
  TIME_SLOT_BY_CATEGORY,
  TIME_SLOT_ICONS,
  TIME_SLOT_LABELS,
  EQUIPMENT_LABELS,
  type Equipment,
  type TaskCategory,
  type TimeSlot,
} from '@beproud/validation';
import { useSession } from '@/lib/session';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Recibe la tarea elegida y el bloque temporal seleccionado por el user. */
  onPick: (task: TaskCatalogItem, timeSlot: TimeSlot) => Promise<void> | void;
  alreadyPicked: string[];
};

const SUBCATS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'cardio_liss', label: 'Cardio LISS' },
  { value: 'cardio_hiit', label: 'Cardio HIIT' },
  { value: 'strength_compound', label: 'Fuerza compuesto' },
  { value: 'strength_isolation', label: 'Fuerza aislado' },
  { value: 'mobility', label: 'Movilidad' },
  { value: 'flexibility', label: 'Flexibilidad' },
  { value: 'reading', label: 'Lectura' },
  { value: 'language', label: 'Idiomas' },
  { value: 'course', label: 'Cursos' },
  { value: 'deep_focus', label: 'Foco profundo' },
  { value: 'meditation', label: 'Meditación' },
  { value: 'sleep', label: 'Sueño' },
  { value: 'cooking', label: 'Cocina' },
  { value: 'hydration', label: 'Hidratación' },
  { value: 'social_outdoor', label: 'Social fuera' },
  { value: 'social_indoor', label: 'Social en casa' },
];

export default function AddTaskSheet({
  visible,
  onClose,
  onPick,
  alreadyPicked,
}: Props) {
  const { profile } = useSession();
  const profileEquipment = (profile?.equipment ?? []) as string[];

  const [catalog, setCatalog] = useState<TaskCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<TaskCategory | 'all'>('all');
  const [subcategory, setSubcategory] = useState<string>('all');
  const [submittingSlug, setSubmittingSlug] = useState<string | null>(null);
  // Slot elegido por el user. Default = derivado de la categoría seleccionada
  // (o 'anytime' si "Todas"). Se reasigna al cambiar de categoría salvo que
  // el user lo haya tocado manualmente.
  const [slotTouched, setSlotTouched] = useState(false);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('anytime');
  useEffect(() => {
    if (slotTouched) return;
    setTimeSlot(category === 'all'
      ? 'anytime'
      : (TIME_SLOT_BY_CATEGORY[category as TaskCategory] ?? 'anytime'));
  }, [category, slotTouched]);

  useEffect(() => {
    if (!visible) return;
    let cancel = false;
    setLoading(true);
    setError(null);
    fetchTaskCatalog()
      .then((items) => {
        if (!cancel) setCatalog(items);
      })
      .catch((e) => {
        if (!cancel) setError(e instanceof Error ? e.message : 'Error');
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((t) => {
      if (category !== 'all' && t.category !== category) return false;
      if (subcategory !== 'all' && t.subcategory !== subcategory) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalog, search, category, subcategory]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-brand-800 px-6 pt-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-extrabold text-white">Añadir tarea</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={onClose}
            hitSlop={12}
          >
            <Text className="text-base font-semibold text-brand-200">Cerrar</Text>
          </Pressable>
        </View>

        <TextInput
          placeholder="Buscar tarea…"
          placeholderTextColor="#7DA9DC"
          value={search}
          onChangeText={setSearch}
          className="mb-3 rounded-xl border border-brand-600 bg-brand-700/50 px-4 py-3 text-base text-white"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2"
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        >
          <Chip
            label="Todas"
            active={category === 'all'}
            onPress={() => setCategory('all')}
          />
          {TASK_CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={TASK_CATEGORY_LABELS[cat]}
              active={category === cat}
              onPress={() => setCategory(cat)}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{ gap: 6, paddingRight: 16 }}
        >
          {SUBCATS.map((s) => (
            <Chip
              key={s.value}
              label={s.label}
              active={subcategory === s.value}
              size="sm"
              onPress={() => setSubcategory(s.value)}
            />
          ))}
        </ScrollView>

        <View className="mb-3 rounded-xl border border-brand-700 bg-brand-800/40 p-2">
          <Text className="mb-2 text-[10px] uppercase tracking-wider text-brand-300">
            Bloque al añadir
          </Text>
          <View className="flex-row gap-1">
            {TIME_SLOTS.map((s) => {
              const on = timeSlot === s;
              return (
                <Pressable
                  key={s}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={TIME_SLOT_LABELS[s]}
                  onPress={() => { setSlotTouched(true); setTimeSlot(s); }}
                  className={`flex-1 rounded-lg border px-2 py-1.5 ${
                    on
                      ? 'border-brand-300 bg-brand-300/15'
                      : 'border-brand-700 bg-brand-800/60'
                  }`}
                >
                  <Text
                    className={`text-center text-[11px] font-bold ${
                      on ? 'text-white' : 'text-brand-200'
                    }`}
                    numberOfLines={1}
                  >
                    {TIME_SLOT_ICONS[s]} {TIME_SLOT_LABELS[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#A9C6E8" />
          </View>
        ) : error ? (
          <Text className="mt-4 text-center text-red-400">{error}</Text>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="-mx-2"
            contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 32 }}
          >
            {filtered.length === 0 && (
              <Text className="mt-8 text-center text-brand-300">
                No hay tareas que coincidan.
              </Text>
            )}
            {filtered.map((t) => {
              const already = alreadyPicked.includes(t.id);
              const isSubmitting = submittingSlug === t.slug;
              const missing = missingEquipment(t, profileEquipment);
              const locked = missing.length > 0;
              const missingLabels = missing
                .map((e) => EQUIPMENT_LABELS[e as Equipment] ?? e)
                .join(', ');
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={
                    locked
                      ? `${t.title} requiere ${missingLabels}`
                      : `Añadir ${t.title}`
                  }
                  disabled={already || isSubmitting || locked}
                  onPress={async () => {
                    if (locked) return;
                    setSubmittingSlug(t.slug);
                    try {
                      // Si el user no tocó el selector, infiere del slot de la
                      // tarea concreta para una sugerencia mejor que la del
                      // filtro de categoría general.
                      const finalSlot = slotTouched
                        ? timeSlot
                        : TIME_SLOT_BY_CATEGORY[t.category as TaskCategory] ?? timeSlot;
                      await onPick(t, finalSlot);
                    } finally {
                      setSubmittingSlug(null);
                    }
                  }}
                  className={`mb-2 rounded-2xl border p-3 ${
                    already
                      ? 'border-brand-700 bg-brand-800/30 opacity-50'
                      : locked
                        ? 'border-brand-700 bg-brand-800/30 opacity-70'
                        : 'border-brand-700 bg-brand-800/60 active:bg-brand-700/60'
                  }`}
                >
                  <View className="flex-row items-center">
                    <Text className="mr-3 text-2xl" style={{ lineHeight: 30 }}>
                      {t.icon ?? '✓'}
                    </Text>
                    <View className="flex-1 pr-2">
                      <Text className="text-base font-bold text-white">
                        {t.title}
                      </Text>
                      <Text className="text-xs text-brand-300" numberOfLines={1}>
                        {TASK_CATEGORY_LABELS[t.category]} · {t.base_points} pts
                        {t.duration_min != null ? ` · ⏱ ${t.duration_min} min` : ''}
                        {t.calories_burned != null && t.calories_burned > 0
                          ? ` · 🔥 ${t.calories_burned} kcal`
                          : ''}
                      </Text>
                    </View>
                    {isSubmitting ? (
                      <ActivityIndicator color="#A9C6E8" />
                    ) : already ? (
                      <Text className="text-xs font-semibold text-brand-300">
                        En tu rutina
                      </Text>
                    ) : locked ? (
                      <Text className="text-base">🔒</Text>
                    ) : (
                      <Text className="text-xl font-bold text-brand-200">＋</Text>
                    )}
                  </View>
                  {locked && (
                    <Text className="mt-1 text-[11px] text-amber-200">
                      Necesitas: {missingLabels}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function Chip({
  label,
  active,
  onPress,
  size = 'md',
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  size?: 'sm' | 'md';
}) {
  const padding = size === 'sm' ? 'px-3 py-1' : 'px-4 py-2';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`rounded-full border ${padding} ${
        active
          ? 'border-brand-300 bg-brand-300'
          : 'border-brand-600 bg-brand-700/40'
      }`}
    >
      <Text
        className={`${
          size === 'sm' ? 'text-xs' : 'text-sm'
        } font-semibold ${active ? 'text-brand-900' : 'text-brand-100'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
