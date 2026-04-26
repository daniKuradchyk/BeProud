import { Pressable, Text, View } from 'react-native';

import type { Recommendation, RecommendationType } from '@beproud/api';

const COLOR_BY_TYPE: Record<
  RecommendationType,
  { border: string; bg: string; chip: string; chipText: string; icon: string; label: string }
> = {
  task:    { border: 'border-brand-300/40',  bg: 'bg-brand-300/10',   chip: 'bg-brand-300/30',   chipText: 'text-brand-100', icon: '✓',  label: 'Tarea' },
  streak:  { border: 'border-amber-400/40',  bg: 'bg-amber-400/10',   chip: 'bg-amber-400/30',   chipText: 'text-amber-100', icon: '🔥', label: 'Racha' },
  break:   { border: 'border-teal-400/40',   bg: 'bg-teal-400/10',    chip: 'bg-teal-400/30',    chipText: 'text-teal-100',  icon: '☕', label: 'Descanso' },
  reflect: { border: 'border-purple-400/40', bg: 'bg-purple-400/10',  chip: 'bg-purple-400/30',  chipText: 'text-purple-100',icon: '🌙', label: 'Reflexión' },
  social:  { border: 'border-pink-400/40',   bg: 'bg-pink-400/10',    chip: 'bg-pink-400/30',    chipText: 'text-pink-100',  icon: '👥', label: 'Social' },
};

type Props = {
  recommendation: Recommendation;
  onPress: () => void;
};

export default function RecommendationCard({ recommendation, onPress }: Props) {
  const c = COLOR_BY_TYPE[recommendation.type] ?? COLOR_BY_TYPE.task;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${c.label}: ${recommendation.title}. ${recommendation.subtitle}`}
      onPress={onPress}
      className={`mr-3 rounded-2xl border p-4 ${c.border} ${c.bg}`}
      style={{ width: 240 }}
    >
      <View className="flex-row items-center">
        <View
          className={`h-9 w-9 items-center justify-center rounded-xl ${c.chip}`}
        >
          <Text style={{ fontSize: 18 }}>{c.icon}</Text>
        </View>
        <View className={`ml-2 rounded-full px-2 py-0.5 ${c.chip}`}>
          <Text className={`text-[10px] font-extrabold ${c.chipText}`}>
            {c.label}
          </Text>
        </View>
      </View>
      <Text
        className="mt-3 text-base font-extrabold text-white"
        numberOfLines={2}
      >
        {recommendation.title}
      </Text>
      <Text
        className="mt-1 text-xs text-brand-200"
        numberOfLines={3}
      >
        {recommendation.subtitle}
      </Text>
    </Pressable>
  );
}
