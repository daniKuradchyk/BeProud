import { useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  /** valor actual */
  value: number;
  /** valor mínimo permitido */
  min: number;
  /** valor máximo permitido */
  max: number;
  /** paso entre valores enteros (ej. 1 kg, 1 cm, 5 min) */
  step?: number;
  /** sufijo a mostrar tras el número (kg, cm, min...) */
  suffix?: string;
  /** label opcional encima */
  label?: string;
  /** descripción/hint debajo */
  hint?: string;
  /** callback continuo durante drag */
  onChange: (v: number) => void;
  /** accesibilidad */
  accessibilityLabel?: string;
};

/**
 * Slider mínimo sin librerías. Web usa <input type=range> nativo (mejor a11y);
 * native usa una pista pintada con Pan responder. Permite además editar el
 * valor a mano con un TextInput pequeño.
 */
export default function Slider({
  value, min, max, step = 1, suffix, label, hint, onChange,
  accessibilityLabel,
}: Props) {
  const [width, setWidth] = useState(0);
  const [editText, setEditText] = useState(String(value));
  useEffect(() => setEditText(String(value)), [value]);

  const valueRef = useRef(value);
  valueRef.current = value;

  function clamp(v: number): number {
    const stepped = Math.round(v / step) * step;
    return Math.max(min, Math.min(max, stepped));
  }

  function valueFromX(x: number): number {
    if (width <= 0) return value;
    const ratio = Math.max(0, Math.min(1, x / width));
    return clamp(min + ratio * (max - min));
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        onChange(valueFromX(e.nativeEvent.locationX));
      },
      onPanResponderMove: (e) => {
        onChange(valueFromX(e.nativeEvent.locationX));
      },
    }),
  ).current;

  function onLayout(ev: LayoutChangeEvent) {
    setWidth(ev.nativeEvent.layout.width);
  }

  const ratio = max === min ? 0 : (value - min) / (max - min);
  const filled = Math.max(0, Math.min(1, ratio));

  // ── Web: <input type=range> nativo (a11y mejor) ─────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View className="mb-3">
        {label && (
          <Text className="mb-1 text-sm font-semibold text-brand-200">
            {label}
          </Text>
        )}
        <View className="flex-row items-center gap-3">
          {/* @ts-expect-error: input es válido en RNW */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e: { target: { valueAsNumber: number } }) =>
              onChange(clamp(e.target.valueAsNumber))
            }
            aria-label={accessibilityLabel ?? label ?? 'Valor'}
            style={{ flex: 1, accentColor: '#A9C6E8' }}
          />
          <NumberBox
            value={editText}
            onChangeText={setEditText}
            onCommit={(n) => onChange(clamp(n))}
            suffix={suffix}
          />
        </View>
        {hint && <Text className="mt-1 text-xs text-brand-300">{hint}</Text>}
      </View>
    );
  }

  // ── Native: track + thumb táctil ────────────────────────────────────────
  return (
    <View className="mb-3">
      {label && (
        <Text className="mb-1 text-sm font-semibold text-brand-200">{label}</Text>
      )}
      <View className="flex-row items-center gap-3">
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel ?? label ?? 'Valor'}
          accessibilityValue={{ min, max, now: value }}
          onLayout={onLayout}
          {...pan.panHandlers}
          style={{ flex: 1, height: 40, justifyContent: 'center' }}
        >
          <View className="h-1.5 rounded-full bg-brand-700" />
          <View
            className="absolute h-1.5 rounded-full bg-brand-300"
            style={{ width: `${Math.round(filled * 100)}%` }}
          />
          <View
            className="absolute h-5 w-5 rounded-full bg-white"
            style={{
              left: `${Math.round(filled * 100)}%`,
              transform: [{ translateX: -10 }],
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 2,
            }}
          />
        </View>
        <NumberBox
          value={editText}
          onChangeText={setEditText}
          onCommit={(n) => onChange(clamp(n))}
          suffix={suffix}
        />
      </View>
      {hint && <Text className="mt-1 text-xs text-brand-300">{hint}</Text>}
    </View>
  );
}

function NumberBox({
  value,
  onChangeText,
  onCommit,
  suffix,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onCommit: (n: number) => void;
  suffix?: string;
}) {
  return (
    <View className="flex-row items-center rounded-lg bg-brand-700/50 px-2 py-1">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={() => {
          const n = Number(value);
          if (Number.isFinite(n)) onCommit(n);
        }}
        keyboardType="numeric"
        maxLength={4}
        className="min-w-[44px] text-center text-base font-bold text-white"
      />
      {suffix && <Text className="ml-1 text-xs text-brand-300">{suffix}</Text>}
    </View>
  );
}
