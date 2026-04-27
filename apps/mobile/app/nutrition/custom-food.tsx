import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { createCustomFood } from '@beproud/api';
import { CustomFoodSchema, MealTypeSchema } from '@beproud/validation';
import NutritionHeader from '@/components/nutrition/NutritionHeader';
import { backOrReplace } from '@/lib/navigation/back';

type FormState = {
  name: string;
  brand: string;
  kcal_per_100g: string;
  protein_per_100g: string;
  carbs_per_100g: string;
  fat_per_100g: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const initial: FormState = {
  name: '',
  brand: '',
  kcal_per_100g: '',
  protein_per_100g: '',
  carbs_per_100g: '',
  fat_per_100g: '',
};

function toNumber(s: string): number {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export default function CustomFood() {
  const router = useRouter();
  const params = useLocalSearchParams<{ meal?: string; barcode?: string }>();
  const meal = MealTypeSchema.safeParse(params.meal).success ? params.meal : null;
  const barcode = typeof params.barcode === 'string' ? params.barcode : null;
  const fallback = (meal ? `/nutrition/meal/${meal}` : '/nutrition') as never;

  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Errors>({});

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const createMut = useMutation({
    mutationFn: (input: { name: string; brand?: string; kcal_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number }) =>
      createCustomFood(input),
    onSuccess: (food) => {
      if (meal) {
        router.replace(`/nutrition/food/${food.id}?meal=${meal}` as never);
      } else {
        backOrReplace(router, '/nutrition' as never);
      }
    },
  });

  function handleSubmit() {
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      kcal_per_100g: toNumber(form.kcal_per_100g),
      protein_per_100g: toNumber(form.protein_per_100g),
      carbs_per_100g: toNumber(form.carbs_per_100g),
      fat_per_100g: toNumber(form.fat_per_100g),
    };

    const parsed = CustomFoodSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormState | undefined;
        if (k) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    createMut.mutate(parsed.data);
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <NutritionHeader
        title="Crear alimento"
        onBack={() => backOrReplace(router, fallback)}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {barcode && (
          <View className="mb-3 rounded-2xl border border-brand-700 bg-brand-800/60 p-3">
            <Text className="text-xs text-brand-300">Código no encontrado en Open Food Facts</Text>
            <Text className="text-sm font-bold text-white">{barcode}</Text>
          </View>
        )}

        <Field
          label="Nombre"
          value={form.name}
          onChangeText={(v) => setField('name', v)}
          placeholder="Ej. Tortilla casera"
          error={errors.name}
        />
        <Field
          label="Marca (opcional)"
          value={form.brand}
          onChangeText={(v) => setField('brand', v)}
          placeholder="Ej. Hacendado"
          error={errors.brand}
        />

        <Text className="mb-2 mt-3 text-xs uppercase tracking-wider text-brand-300">
          Por 100 g
        </Text>
        <NumericField
          label="Calorías (kcal)"
          value={form.kcal_per_100g}
          onChangeText={(v) => setField('kcal_per_100g', v)}
          error={errors.kcal_per_100g}
        />
        <NumericField
          label="Proteína (g)"
          value={form.protein_per_100g}
          onChangeText={(v) => setField('protein_per_100g', v)}
          error={errors.protein_per_100g}
        />
        <NumericField
          label="Carbohidratos (g)"
          value={form.carbs_per_100g}
          onChangeText={(v) => setField('carbs_per_100g', v)}
          error={errors.carbs_per_100g}
        />
        <NumericField
          label="Grasas (g)"
          value={form.fat_per_100g}
          onChangeText={(v) => setField('fat_per_100g', v)}
          error={errors.fat_per_100g}
        />

        {createMut.isError && (
          <Text className="mt-3 text-sm text-red-400">
            {createMut.error instanceof Error ? createMut.error.message : 'No se pudo guardar'}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Guardar alimento"
          disabled={createMut.isPending}
          onPress={handleSubmit}
          className="mt-6 items-center rounded-full bg-brand-300 py-3 active:bg-brand-200"
        >
          <Text className="text-base font-extrabold text-brand-900">
            {createMut.isPending ? 'Guardando…' : 'Guardar'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
};

function Field({ label, value, onChangeText, placeholder, error }: FieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs uppercase tracking-wider text-brand-300">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7894B5"
        accessibilityLabel={label}
        className="rounded-2xl bg-brand-700/40 px-4 py-3 text-base text-white"
      />
      {error && <Text className="mt-1 text-xs text-red-400">{error}</Text>}
    </View>
  );
}

function NumericField({ label, value, onChangeText, error }: FieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs uppercase tracking-wider text-brand-300">{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.replace(',', '.').replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor="#7894B5"
        accessibilityLabel={label}
        className="rounded-2xl bg-brand-700/40 px-4 py-3 text-base text-white"
      />
      {error && <Text className="mt-1 text-xs text-red-400">{error}</Text>}
    </View>
  );
}
