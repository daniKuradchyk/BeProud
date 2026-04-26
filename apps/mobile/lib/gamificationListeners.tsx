import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import {
  fetchAllAchievements,
  fetchAllLeagues,
  fetchMyLeaguePosition,
  subscribeMyLeagueChange,
  subscribeUserAchievements,
  type Achievement,
  type League,
} from '@beproud/api';

import AchievementToast from '@/features/gamification/components/AchievementToast';
import LeagueChangeToast from '@/features/gamification/components/LeagueChangeToast';
import { useSession } from '@/lib/session';

type ToastItem =
  | { kind: 'achievement'; key: string; achievement: Achievement }
  | {
      kind: 'league';
      key: string;
      from: League | null;
      to: League;
      direction: 'promote' | 'demote' | 'enter';
    };

type Ctx = {
  pushAchievement: (a: Achievement) => void;
};

const GamificationCtx = createContext<Ctx | null>(null);

export function useGamification(): Ctx {
  const ctx = useContext(GamificationCtx);
  if (!ctx) {
    throw new Error('useGamification debe usarse dentro de GamificationProvider');
  }
  return ctx;
}

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useSession();
  const userId = status === 'authenticated' ? user?.id ?? null : null;

  const [queue, setQueue] = useState<ToastItem[]>([]);
  // IDs ya mostrados en esta sesión: deduplica si Realtime envía duplicados
  // o si refetch trae el mismo logro más de una vez.
  const seenAchievements = useRef<Set<number>>(new Set());
  const seenLeagueId = useRef<number | null | undefined>(undefined);
  const leaguesRef = useRef<League[]>([]);
  const qc = useQueryClient();

  const enqueue = useCallback((item: ToastItem) => {
    setQueue((q) => [...q, item]);
  }, []);

  const pushAchievement = useCallback(
    (a: Achievement) => {
      if (seenAchievements.current.has(a.id)) return;
      seenAchievements.current.add(a.id);
      enqueue({
        kind: 'achievement',
        key: `a-${a.id}-${Date.now()}`,
        achievement: a,
      });
    },
    [enqueue],
  );

  // Carga ligas una vez al cambiar de sesión (las usamos para los toasts de liga).
  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    (async () => {
      try {
        const leagues = await fetchAllLeagues();
        if (!cancel) leaguesRef.current = leagues;
      } catch (e) {
        console.warn('[gamification] no pude cargar leagues', e);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [userId]);

  // Snapshot inicial de logros desbloqueados → marcar como vistos para no
  // disparar toasts antiguos cuando el usuario abre la app.
  useEffect(() => {
    if (!userId) {
      seenAchievements.current = new Set();
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const all = await fetchAllAchievements();
        if (cancel) return;
        const seen = new Set<number>();
        for (const a of all) {
          if (a.unlocked_at) seen.add(a.id);
        }
        seenAchievements.current = seen;
      } catch (e) {
        console.warn('[gamification] no pude cargar achievements iniciales', e);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [userId]);

  // Snapshot inicial de la liga actual → no toast en mount; solo cuando cambie.
  useEffect(() => {
    if (!userId) {
      seenLeagueId.current = undefined;
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const pos = await fetchMyLeaguePosition();
        if (cancel) return;
        seenLeagueId.current = pos?.league?.id ?? null;
      } catch (e) {
        console.warn('[gamification] no pude cargar liga inicial', e);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [userId]);

  // Realtime: nuevos logros desbloqueados.
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeUserAchievements(userId, async (achievementId) => {
      if (seenAchievements.current.has(achievementId)) return;
      seenAchievements.current.add(achievementId);
      try {
        const all = await fetchAllAchievements();
        const a = all.find((x) => x.id === achievementId);
        if (a) {
          enqueue({
            kind: 'achievement',
            key: `a-${a.id}-${Date.now()}`,
            achievement: a,
          });
          qc.invalidateQueries({ queryKey: ['my-achievements'] });
        }
      } catch (e) {
        console.warn('[gamification] toast logro: no pude resolver detalles', e);
      }
    });
    return unsub;
  }, [userId, enqueue, qc]);

  // Realtime: cambios de liga global (insert/update sobre weekly_leaderboards
  // del propio user con group_id null).
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeMyLeagueChange(userId, (newLeagueId) => {
      const previousId = seenLeagueId.current;
      // Si previousId es undefined aún no tenemos snapshot; tomamos el primero
      // como baseline sin toast.
      if (previousId === undefined) {
        seenLeagueId.current = newLeagueId;
        return;
      }
      if (previousId === newLeagueId) return;
      seenLeagueId.current = newLeagueId;

      const leagues = leaguesRef.current;
      const to = leagues.find((l) => l.id === newLeagueId) ?? null;
      const from = leagues.find((l) => l.id === previousId) ?? null;
      if (!to) return;
      const direction: 'promote' | 'demote' | 'enter' =
        from == null
          ? 'enter'
          : to.tier > from.tier
            ? 'promote'
            : 'demote';
      enqueue({
        kind: 'league',
        key: `l-${to.id}-${Date.now()}`,
        from,
        to,
        direction,
      });
      qc.invalidateQueries({ queryKey: ['my-league-position'] });
    });
    return unsub;
  }, [userId, enqueue, qc]);

  const top = queue[0];
  const dismissTop = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  const value = useMemo<Ctx>(() => ({ pushAchievement }), [pushAchievement]);

  return (
    <GamificationCtx.Provider value={value}>
      {children}
      {top && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
          }}
        >
          {top.kind === 'achievement' ? (
            <AchievementToast
              key={top.key}
              achievement={top.achievement}
              onDismiss={dismissTop}
            />
          ) : (
            <LeagueChangeToast
              key={top.key}
              from={top.from}
              to={top.to}
              direction={top.direction}
              onDismiss={dismissTop}
            />
          )}
        </View>
      )}
    </GamificationCtx.Provider>
  );
}
