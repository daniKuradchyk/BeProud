import { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  type FlatListProps,
  type ScrollViewProps,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/lib/theme/tokens';
import { haptic } from '@/lib/theme/haptics';

const TINT = COLORS.bp[300];

/**
 * Refresca todas las queries activas (las que están actualmente montadas).
 * Patrón: el user tira hacia abajo → todo lo visible se refetcha sin que
 * cada pantalla tenga que declarar manualmente qué keys invalidar.
 */
function useRefreshActive(custom?: () => Promise<void> | void) {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptic.light();
    try {
      if (custom) {
        await custom();
      }
      // refetchQueries({ type: 'active' }) recarga solo las queries que están
      // siendo usadas por componentes montados — barato y útil.
      await qc.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  }, [qc, custom]);
  return { refreshing, onRefresh };
}

type ScrollProps = ScrollViewProps & {
  /** Callback opcional adicional al refresco automático de queries activas. */
  onRefreshExtra?: () => Promise<void> | void;
  children?: React.ReactNode;
};

/** ScrollView con pull-to-refresh integrado. Drop-in para `<ScrollView>`. */
export function RefreshableScrollView({
  onRefreshExtra, refreshControl, children, ...rest
}: ScrollProps) {
  const { refreshing, onRefresh } = useRefreshActive(onRefreshExtra);
  return (
    <ScrollView
      {...rest}
      refreshControl={
        refreshControl ?? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={TINT}
            colors={[TINT]}
            progressBackgroundColor={COLORS.surface[2]}
          />
        )
      }
    >
      {children}
    </ScrollView>
  );
}

type ListProps<T> = FlatListProps<T> & {
  onRefreshExtra?: () => Promise<void> | void;
};

/** FlatList con pull-to-refresh integrado. Drop-in para `<FlatList>`. */
export function RefreshableFlatList<T>({
  onRefreshExtra, refreshControl, ...rest
}: ListProps<T>) {
  const { refreshing, onRefresh } = useRefreshActive(onRefreshExtra);
  return (
    <FlatList
      {...rest}
      refreshControl={
        refreshControl ?? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={TINT}
            colors={[TINT]}
            progressBackgroundColor={COLORS.surface[2]}
          />
        )
      }
    />
  );
}
