import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addRoutineTask,
  ensureActiveRoutine,
  fetchActiveRoutine,
  fetchTaskCatalog,
  type TaskCatalogItem,
} from '@beproud/api';
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_ICONS,
  TASK_CATEGORY_LABELS,
  TIME_SLOT_LABELS,
  WizardSlotSchema,
  type TaskCategory,
  type WizardSlot,
} from '@beproud/validation';
import { useDebounce } from '@/lib/useDebounce';
import { useSession } from '@/lib/session';
import { backOrReplace } from '@/lib/navigation/back';

export default function ManualPicker() {
  const router = useRouter();
  const qc = useQueryClient();
  const { refreshRoutine } = useSession();
  const params = useLocalSearchParams<{ slot?: string }>();
  const parsed = WizardSlotSchema.safeParse(params.slot);
  const slot: WizardSlot | null = parsed.success ? parsed.data : null;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const debounced = useDebounce(search.trim(), 250);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const routineQ = useQuery({
    queryKey: ['routine', 'active'],
    queryFn: fetchActiveRoutine,
  });
  const alreadyInRoutine = useMemo(
    () => new Set((routineQ.data?.tasks ?? []).map((t) => t.task.id)),
    [routineQ.data],
  );

  const catalogQ = useQuery({
    queryKey: ['catalog', { search: debounced, category }],
    queryFn: () =>
      fetchTaskCatalog({
        search: debounced || undefined,
        category: category ?? undefined,
      }),
  });

  const addMut = useMutation({
    mutationFn: async () => {
      // Si el user entra al modo manual antes de aceptar ningún wizard, la
      // rutina aún no existe; la creamos vacía aquí mismo.
      const routine = await ensureActiveRoutine();
      const ids = [...picked];
      for (const id of ids) {
        await addRoutineTask(routine.id, { taskId: id }, { timeSlot: slot ?? 'anytime' });
      }
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['routine', 'active'] }),
        refreshRoutine(),
      ]);
      router.replace('/routine-design' as never);
    },
  });

  if (!slot) {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <Text className="px-6 py-8 text-brand-300">Bloque no válido.</Text>
      </SafeAreaView>
    );
  }

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const items = (catalogQ.data ?? []).filter((t) => !alreadyInRoutine.has(t.id));

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => backOrReplace(router, `/routine-design/block/${slot}` as never)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-white">
            {TIME_SLOT_LABELS[slot]} · Manual
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <View className="px-4 pb-2">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar en el catálogo…"
          placeholderTextColor="#7894B5"
          accessibilityLabel="Buscador del catálogo"
          className="rounded-2xl bg-brand-700/40 px-4 py-3 text-base text-white"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        <CategoryChip label="Todas" emoji="✨" on={category === null} onPress={() => setCategory(null)} />
        {TASK_CATEGORIES.map((c) => (
          <CategoryChip
            key={c}
            label={TASK_CATEGORY_LABELS[c]}
            emoji={TASK_CATEGORY_ICONS[c]}
            on={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {items.length === 0 && !catalogQ.isLoading && (
          <Text className="text-sm text-brand-300">Sin resultados.</Text>
        )}
        {items.map((t) => (
          <CatalogRow
            key={t.id}
            task={t}
            picked={picked.has(t.id)}
            onPress={() => togglePick(t.id)}
          />
        ))}
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0 border-t border-brand-700 bg-brand-800/95 px-4 pb-6 pt-2">
        {addMut.isError && (
          <Text className="mb-2 text-sm text-red-400">
            {addMut.error instanceof Error ? addMut.error.message : 'No se pudo añadir'}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Añadir ${picked.size} a ${TIME_SLOT_LABELS[slot]}`}
          disabled={picked.size === 0 || addMut.isPending}
          onPress={() => addMut.mutate()}
          className={`items-center rounded-full py-3 ${
            picked.size === 0 || addMut.isPending
              ? 'bg-brand-700/40'
              : 'bg-brand-300 active:bg-brand-200'
          }`}
        >
          <Text
            className={`text-base font-extrabold ${
              picked.size === 0 || addMut.isPending ? 'text-brand-400' : 'text-brand-900'
            }`}
          >
            {addMut.isPending
              ? 'Añadiendo…'
              : `Añadir ${picked.size} a ${TIME_SLOT_LABELS[slot]}`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CategoryChip({
  label, emoji, on, onPress,
}: {
  label: string; emoji: string; on: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      className={`flex-row items-center rounded-full border px-3 py-1.5 ${
        on ? 'border-brand-300 bg-brand-300/20' : 'border-brand-700 bg-brand-800/60'
      }`}
    >
      <Text className="mr-1">{emoji}</Text>
      <Text className={`text-xs font-bold ${on ? 'text-white' : 'text-brand-100'}`}>{label}</Text>
    </Pressable>
  );
}

function CatalogRow({
  task, picked, onPress,
}: { task: TaskCatalogItem; picked: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked }}
      onPress={onPress}
      className={`mb-2 flex-row items-center rounded-2xl border p-3 ${
        picked ? 'border-brand-300 bg-brand-300/10' : 'border-brand-700 bg-brand-800/60'
      }`}
    >
      <Text className="mr-3 text-2xl" style={{ lineHeight: 28 }}>
        {task.icon ?? TASK_CATEGORY_ICONS[task.category] ?? '✓'}
      </Text>
      <View className="flex-1 pr-2">
        <Text className="text-sm font-bold text-white" numberOfLines={1}>
          {task.title}
        </Text>
        <Text className="text-xs text-brand-300" numberOfLines={1}>
          {task.base_points} pts · {TASK_CATEGORY_LABELS[task.category]}
        </Text>
      </View>
      <View
        className={`h-5 w-5 items-center justify-center rounded-md border ${
          picked ? 'border-brand-300 bg-brand-300' : 'border-brand-500 bg-transparent'
        }`}
      >
        {picked && <Text className="text-xs font-extrabold text-brand-900">✓</Text>}
      </View>
    </Pressable>
  );
}
