import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

type Props = {
  /** ISO yyyy-mm-dd o null si no rellenado */
  value: string | null;
  onChange: (v: string | null) => void;
  label?: string;
  /** Fecha máxima permitida (ISO yyyy-mm-dd). Por defecto, hoy. */
  maximumDate?: string;
  /** Fecha mínima. Por defecto 1900-01-01. */
  minimumDate?: string;
};

/**
 * Selector de fecha cross-platform. Web → <input type=date> real.
 * Native → @react-native-community/datetimepicker (con import dinámico
 * para no romper si la dep no está instalada todavía).
 */
export default function DatePickerInput({
  value,
  onChange,
  label,
  maximumDate,
  minimumDate,
}: Props) {
  const [show, setShow] = useState(false);
  const [pickerLib, setPickerLib] =
    useState<typeof import('@react-native-community/datetimepicker') | null>(null);

  if (Platform.OS === 'web') {
    return (
      <View className="mb-3">
        {label && (
          <Text className="mb-1 text-sm font-semibold text-brand-200">{label}</Text>
        )}
        {/* @ts-expect-error input válido en RNW */}
        <input
          type="date"
          value={value ?? ''}
          onChange={(e: { target: { value: string } }) =>
            onChange(e.target.value || null)
          }
          max={maximumDate ?? defaultMax()}
          min={minimumDate ?? '1900-01-01'}
          aria-label={label ?? 'Fecha'}
          style={{
            backgroundColor: '#1F4E79',
            color: 'white',
            border: '1px solid #2A5FA0',
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 16,
            colorScheme: 'dark',
          }}
        />
      </View>
    );
  }

  return (
    <View className="mb-3">
      {label && (
        <Text className="mb-1 text-sm font-semibold text-brand-200">{label}</Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Elegir fecha'}
        onPress={async () => {
          if (!pickerLib) {
            try {
              const mod = await import('@react-native-community/datetimepicker');
              setPickerLib(mod);
            } catch (e) {
              console.warn('[onboarding] datetimepicker no disponible', e);
              return;
            }
          }
          setShow(true);
        }}
        className="rounded-xl border border-brand-600 bg-brand-700/50 px-4 py-3"
      >
        <Text className="text-base text-white">
          {value ? formatHuman(value) : 'Selecciona fecha'}
        </Text>
      </Pressable>

      {show && pickerLib && (
        <pickerLib.default
          value={value ? new Date(value + 'T00:00:00') : new Date('2000-01-01')}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date((maximumDate ?? defaultMax()) + 'T23:59:59')}
          minimumDate={new Date((minimumDate ?? '1900-01-01') + 'T00:00:00')}
          onChange={(_event, selected) => {
            setShow(false);
            if (selected) {
              const iso = selected.toISOString().slice(0, 10);
              onChange(iso);
            }
          }}
        />
      )}
    </View>
  );
}

function defaultMax(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 13);
  return d.toISOString().slice(0, 10);
}

function formatHuman(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return iso;
  }
}
