import { Pressable, Text, View } from 'react-native';

type Props = {
  title: string;
  description?: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
  /** Si single, muestra un radio. Si multi, un check. */
  mode?: 'single' | 'multi';
};

/** Card seleccionable para steps del wizard. */
export default function SelectableCard({
  title,
  description,
  emoji,
  selected,
  onPress,
  mode = 'multi',
}: Props) {
  return (
    <Pressable
      accessibilityRole={mode === 'single' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`mb-3 flex-row items-center rounded-2xl border-2 p-4 ${
        selected
          ? 'border-brand-300 bg-brand-700/60'
          : 'border-brand-700 bg-brand-800/40'
      }`}
    >
      {emoji && (
        <Text className="mr-3 text-2xl" style={{ lineHeight: 32 }}>
          {emoji}
        </Text>
      )}
      <View className="flex-1">
        <Text
          className={`text-base font-bold ${
            selected ? 'text-white' : 'text-brand-100'
          }`}
        >
          {title}
        </Text>
        {description && (
          <Text className="mt-0.5 text-xs text-brand-300">{description}</Text>
        )}
      </View>
      <View
        className={`ml-3 h-6 w-6 items-center justify-center rounded-${
          mode === 'single' ? 'full' : 'md'
        } border-2 ${
          selected ? 'border-brand-300 bg-brand-300' : 'border-brand-500'
        }`}
      >
        {selected && (
          <Text className="text-xs font-extrabold text-brand-900">✓</Text>
        )}
      </View>
    </Pressable>
  );
}
