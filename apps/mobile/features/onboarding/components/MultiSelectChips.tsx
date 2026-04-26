import { Pressable, Text, View } from 'react-native';

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  selected: T[];
  onToggle: (v: T) => void;
  /** Si el option == "none", al pulsarlo deselecciona el resto. */
  exclusiveNone?: T;
};

export default function MultiSelectChips<T extends string>({
  options,
  selected,
  onToggle,
  exclusiveNone,
}: Props<T>) {
  return (
    <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
      {options.map((o) => {
        const isOn = selected.includes(o.value);
        return (
          <View key={o.value} style={{ width: '50%', padding: 4 }}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isOn }}
              accessibilityLabel={o.label}
              onPress={() => {
                if (exclusiveNone && o.value === exclusiveNone) {
                  // "Ninguna" deselecciona todo y se queda solo si estaba apagado.
                  if (isOn) {
                    onToggle(o.value);
                  } else {
                    // limpiar otros: emitimos toggle por cada uno seleccionado, luego "none".
                    selected.forEach((s) => onToggle(s));
                    onToggle(o.value);
                  }
                  return;
                }
                if (exclusiveNone && selected.includes(exclusiveNone) && o.value !== exclusiveNone) {
                  // Si está "none" activo y se pulsa otro, quitamos "none" antes.
                  onToggle(exclusiveNone);
                }
                onToggle(o.value);
              }}
              className={`flex-row items-center rounded-2xl border p-3 ${
                isOn
                  ? 'border-brand-300 bg-brand-300/15'
                  : 'border-brand-700 bg-brand-800/60'
              } active:bg-brand-700/40`}
            >
              {o.icon && (
                <Text style={{ fontSize: 20 }} className="mr-2">
                  {o.icon}
                </Text>
              )}
              <Text
                className={`flex-1 text-sm font-bold ${
                  isOn ? 'text-white' : 'text-brand-200'
                }`}
                numberOfLines={1}
              >
                {o.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
