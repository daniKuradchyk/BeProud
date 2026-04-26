import { Pressable, Text, TextInput, View } from 'react-native';
import type { Answer, Question } from '@/lib/routineWizard/types';

type Props = {
  question: Question;
  value: Answer | undefined;
  onChange: (v: Answer) => void;
};

export default function WizardQuestion({ question, value, onChange }: Props) {
  return (
    <View>
      <Text className="mb-3 text-xl font-extrabold text-white">{question.label}</Text>
      {renderInput(question, value, onChange)}
    </View>
  );
}

function renderInput(
  q: Question,
  value: Answer | undefined,
  onChange: (v: Answer) => void,
) {
  switch (q.kind) {
    case 'time':
      return <TimeInput value={(value as string) ?? q.defaultValue} onChange={onChange} />;
    case 'duration_min':
      return <DurationGrid value={(value as number) ?? q.defaultValue} options={q.options} onChange={onChange} />;
    case 'single':
      return <SingleSelect value={(value as string) ?? ''} options={q.options} onChange={onChange} />;
    case 'multi':
      return <MultiSelect value={(value as string[]) ?? []} options={q.options} max={q.max ?? 99} onChange={onChange} />;
    case 'free_text':
      return (
        <TextInput
          value={(value as string) ?? ''}
          onChangeText={onChange}
          placeholder={q.placeholder}
          placeholderTextColor="#7894B5"
          accessibilityLabel={q.label}
          maxLength={120}
          className="rounded-2xl bg-brand-700/40 px-4 py-3 text-base text-white"
        />
      );
  }
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Expo SDK 52 trae @react-native-community/datetimepicker pero su UX nativa
  // varía mucho entre plataformas. Usamos TextInput con máscara HH:MM, que
  // funciona consistente en iOS/Android/Web y es accesible.
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChange(maskHHMM(t))}
      keyboardType="numbers-and-punctuation"
      placeholder="07:30"
      placeholderTextColor="#7894B5"
      accessibilityLabel="Hora en formato HH:MM"
      maxLength={5}
      className="rounded-2xl bg-brand-700/40 px-4 py-3 text-base text-white"
    />
  );
}

function maskHHMM(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function DurationGrid({
  value, options, onChange,
}: { value: number; options: number[]; onChange: (v: number) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((m) => {
        const on = value === m;
        return (
          <Pressable
            key={m}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(m)}
            className={`rounded-full border px-4 py-2 ${
              on ? 'border-brand-300 bg-brand-300/20' : 'border-brand-700 bg-brand-800/60'
            }`}
          >
            <Text className={`text-sm font-bold ${on ? 'text-white' : 'text-brand-100'}`}>
              {m} min
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SingleSelect({
  value, options, onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            className={`mb-2 rounded-2xl border p-3 ${
              on ? 'border-brand-300 bg-brand-300/10' : 'border-brand-700 bg-brand-800/60'
            }`}
          >
            <Text className={`text-base font-bold ${on ? 'text-white' : 'text-brand-100'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MultiSelect({
  value, options, max, onChange,
}: {
  value: string[];
  options: { value: string; label: string }[];
  max: number;
  onChange: (v: string[]) => void;
}) {
  function toggle(v: string) {
    const has = value.includes(v);
    if (has) {
      onChange(value.filter((x) => x !== v));
      return;
    }
    if (value.length >= max) return;
    onChange([...value, v]);
  }
  return (
    <View>
      <Text className="mb-2 text-xs text-brand-300">{value.length}/{max} elegidas</Text>
      {options.map((o) => {
        const on = value.includes(o.value);
        const disabled = !on && value.length >= max;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled }}
            disabled={disabled}
            onPress={() => toggle(o.value)}
            className={`mb-2 flex-row items-center rounded-2xl border p-3 ${
              on ? 'border-brand-300 bg-brand-300/10' : 'border-brand-700 bg-brand-800/60'
            } ${disabled ? 'opacity-40' : ''}`}
          >
            <View
              className={`mr-3 h-5 w-5 items-center justify-center rounded-md border ${
                on ? 'border-brand-300 bg-brand-300' : 'border-brand-500 bg-transparent'
              }`}
            >
              {on && <Text className="text-xs font-extrabold text-brand-900">✓</Text>}
            </View>
            <Text className={`flex-1 text-base font-bold ${on ? 'text-white' : 'text-brand-100'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
