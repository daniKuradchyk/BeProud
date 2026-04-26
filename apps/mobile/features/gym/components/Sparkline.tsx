import { Text, View } from 'react-native';

type Props = {
  values: Array<{ x: number; y: number }>;
  height?: number;
  color?: string;
};

/** Sparkline minimalista usando View bars (no libs externas). Buena para
 *  evolución de 1RM o volumen por semana. */
export default function Sparkline({ values, height = 60, color = '#A9C6E8' }: Props) {
  if (values.length === 0) {
    return (
      <Text className="text-xs text-brand-300">Sin datos suficientes.</Text>
    );
  }
  const ys = values.map((v) => v.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = Math.max(0.0001, max - min);
  const last = ys[ys.length - 1] ?? 0;
  const first = ys[0] ?? 0;
  const trendPct = first > 0 ? ((last - first) / first) * 100 : 0;

  return (
    <View>
      <View className="flex-row items-end" style={{ height, gap: 2 }}>
        {values.map((v, i) => {
          const ratio = (v.y - min) / span;
          const h = Math.max(2, Math.round(ratio * height));
          return (
            <View
              key={i}
              style={{
                width: 6,
                height: h,
                backgroundColor: color,
                borderRadius: 2,
              }}
            />
          );
        })}
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="text-xs text-brand-300">
          {Math.round(min)} → {Math.round(max)}
        </Text>
        <Text
          className={`text-xs font-bold ${
            trendPct > 0 ? 'text-emerald-300' : trendPct < 0 ? 'text-red-300' : 'text-brand-300'
          }`}
        >
          {trendPct > 0 ? '↑' : trendPct < 0 ? '↓' : '→'} {Math.abs(trendPct).toFixed(0)}%
        </Text>
      </View>
    </View>
  );
}
