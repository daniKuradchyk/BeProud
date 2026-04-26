import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

type Props = {
  /** Peso objetivo total (incluyendo barra) */
  targetKg: number;
  /** Peso de la barra. Default 20 kg (olímpica). */
  barKg?: number;
};

/** Calcula greedy qué discos por lado para llegar a target_kg con bar_kg.
 *  Devuelve los discos que han sumado y el remanente sin colocar. */
function platesPerSide(targetKg: number, barKg: number): {
  plates: { weight: number; count: number }[];
  remainder: number;
} {
  const perSide = (targetKg - barKg) / 2;
  if (perSide <= 0) return { plates: [], remainder: 0 };
  let remaining = perSide;
  const plates: { weight: number; count: number }[] = [];
  for (const w of PLATES_KG) {
    if (remaining + 1e-9 < w) continue;
    const count = Math.floor((remaining + 1e-9) / w);
    if (count > 0) {
      plates.push({ weight: w, count });
      remaining = Math.max(0, remaining - count * w);
    }
  }
  return { plates, remainder: Math.max(0, remaining) };
}

export default function PlateCalculator({ targetKg, barKg: barKgProp = 20 }: Props) {
  const [barKg, setBarKg] = useState(String(barKgProp));
  const [target, setTarget] = useState(String(targetKg));
  const bar = Number(barKg) || 20;
  const tgt = Number(target) || 0;

  const result = useMemo(() => platesPerSide(tgt, bar), [tgt, bar]);

  return (
    <View className="rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
      <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
        Calculadora de discos
      </Text>
      <View className="flex-row gap-2">
        <NumBox label="Objetivo" value={target} onChange={setTarget} suffix="kg" />
        <NumBox label="Barra" value={barKg} onChange={setBarKg} suffix="kg" />
      </View>
      <Text className="mt-3 text-sm text-brand-200">Por lado:</Text>
      {result.plates.length === 0 ? (
        <Text className="mt-1 text-sm text-brand-300">
          Sin discos (objetivo ≤ barra).
        </Text>
      ) : (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {result.plates.map((p) => (
            <View
              key={p.weight}
              className="rounded-full bg-brand-300/20 px-3 py-1.5"
            >
              <Text className="text-sm font-extrabold text-brand-100">
                {p.count}× {p.weight} kg
              </Text>
            </View>
          ))}
        </View>
      )}
      {result.remainder > 0 && (
        <Text className="mt-2 text-xs text-amber-200">
          Falta {result.remainder.toFixed(2)} kg por lado para alcanzar {tgt} kg.
        </Text>
      )}
    </View>
  );
}

function NumBox({
  label, value, onChange, suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-1 text-[10px] uppercase tracking-wider text-brand-300">
        {label}
      </Text>
      <View className="flex-row items-center rounded-xl border border-brand-600 bg-brand-700/50 px-3 py-2">
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          className="flex-1 text-base font-bold text-white"
        />
        {suffix && <Text className="ml-1 text-xs text-brand-300">{suffix}</Text>}
      </View>
    </View>
  );
}

// Suprime warning sobre Pressable no usado en este archivo.
void Pressable;
