import { Pressable, Text, View } from 'react-native';

import type { ModuleSummary } from '@/lib/modules';

type Props = {
  summary: ModuleSummary;
  highlighted?: boolean;
  onPress: () => void;
};

const HIGHLIGHT_BADGE_TEXT = 'Reanudar';

export default function ModuleCard({ summary, highlighted, onPress }: Props) {
  // Visual de "sesión en curso" — borde emerald + chip pulsante visual.
  const isResume = summary.badge === HIGHLIGHT_BADGE_TEXT;
  const borderClass = highlighted || isResume
    ? 'border-emerald-400/60'
    : 'border-brand-600';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${summary.title}, ${summary.subtitle}`}
      onPress={onPress}
      className={`mr-3 rounded-2xl border bg-brand-700 p-4 active:bg-brand-600 ${borderClass}`}
      style={{ width: 220 }}
    >
      <View className="flex-row items-center">
        <Text style={{ fontSize: 28, lineHeight: 32 }}>{summary.icon}</Text>
        {summary.badge && (
          <View
            className={`ml-auto rounded-full px-2 py-0.5 ${
              isResume ? 'bg-emerald-400/30' : 'bg-brand-300/30'
            }`}
          >
            <Text
              className={`text-[10px] font-extrabold ${
                isResume ? 'text-emerald-100' : 'text-brand-100'
              }`}
            >
              {summary.badge}
            </Text>
          </View>
        )}
      </View>
      <Text className="mt-3 text-base font-extrabold text-white" numberOfLines={1}>
        {summary.title}
      </Text>
      <Text className="mt-1 text-xs text-brand-200" numberOfLines={2}>
        {summary.subtitle}
      </Text>
    </Pressable>
  );
}
