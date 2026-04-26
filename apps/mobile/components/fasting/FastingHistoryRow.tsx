import { Text, View } from 'react-native';
import { FASTING_PROTOCOL_SHORT } from '@beproud/validation';
import type { FastingLog } from '@beproud/api';
import { formatMinutes } from '@/lib/fasting/format';

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function FastingHistoryRow({ log }: { log: FastingLog }) {
  const ok = log.status === 'completed';
  return (
    <View className="mb-2 flex-row items-center rounded-2xl border border-brand-700 bg-brand-800/60 p-3">
      <Text className="mr-3 text-2xl" style={{ lineHeight: 28 }}>
        {ok ? '✅' : '⚠️'}
      </Text>
      <View className="flex-1 pr-2">
        <Text className="text-sm font-bold text-white" numberOfLines={1}>
          {shortDate(log.started_at)} · {formatMinutes(log.actual_duration_min)}
        </Text>
        <Text className="text-xs text-brand-300" numberOfLines={1}>
          {FASTING_PROTOCOL_SHORT[log.protocol]} · {ok ? 'completado' : 'roto antes'}
        </Text>
      </View>
    </View>
  );
}
