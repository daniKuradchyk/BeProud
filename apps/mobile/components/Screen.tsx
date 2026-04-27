import { useCallback, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/lib/theme/tokens';
import { haptic } from '@/lib/theme/haptics';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  /** Si false, desactiva el pull-to-refresh en pantallas scroll. Default true. */
  refreshable?: boolean;
  /** Callback adicional al refrescar (además del refetch de queries activas). */
  onRefreshExtra?: () => Promise<void> | void;
};

const TINT = COLORS.bp[300];

export default function Screen({
  children,
  scroll = false,
  className,
  refreshable = true,
  onRefreshExtra,
}: Props) {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptic.light();
    try {
      if (onRefreshExtra) await onRefreshExtra();
      await qc.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  }, [qc, onRefreshExtra]);

  if (!scroll) {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <View className={`flex-1 px-6 ${className ?? ''}`}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <ScrollView
        className={`flex-1 px-6 ${className ?? ''}`}
        contentContainerStyle={{ paddingVertical: 24, flexGrow: 1 }}
        refreshControl={
          refreshable ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={TINT}
              colors={[TINT]}
              progressBackgroundColor={COLORS.surface[2]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
