import type { Router } from 'expo-router';

type RouterHref = Parameters<Router['replace']>[0];

export function backOrReplace(router: Router, fallback: RouterHref): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}

export function backFallbackForPath(pathname: string): RouterHref | null {
  const path = normalizePath(pathname);

  if (path === '/nutrition') return '/(tabs)/routine' as never;
  if (path.startsWith('/nutrition/')) return '/nutrition' as never;

  if (path === '/fasting') return '/(tabs)/routine' as never;
  if (path.startsWith('/fasting/')) return '/fasting' as never;

  if (path === '/gym') return '/(tabs)/routine' as never;
  if (path.startsWith('/gym/')) {
    if (path.startsWith('/gym/exercise/')) return '/gym/exercises' as never;
    return '/gym' as never;
  }

  if (path.startsWith('/study/')) return '/(tabs)/routine' as never;

  if (path === '/routine-design') return '/(tabs)/routine' as never;
  if (path.startsWith('/routine-design/')) return '/routine-design' as never;

  if (path === '/settings') return '/(tabs)/profile' as never;
  if (path.startsWith('/settings/')) return '/settings' as never;
  if (path.startsWith('/legal/')) return '/settings' as never;

  if (path === '/groups') return '/(tabs)/profile' as never;
  if (path.startsWith('/groups/')) return '/groups' as never;
  if (path.startsWith('/group/')) return '/groups' as never;
  if (path.startsWith('/join/')) return '/groups' as never;

  if (path === '/messages') return '/(tabs)/profile' as never;
  if (path.startsWith('/messages/')) return '/messages' as never;
  if (path === '/notifications') return '/(tabs)/profile' as never;
  if (path === '/profile/achievements') return '/(tabs)/profile' as never;

  if (path.startsWith('/post/')) return '/(tabs)/feed' as never;
  if (path.startsWith('/task/')) return '/(tabs)/routine' as never;

  const userListMatch = path.match(/^\/user\/([^/]+)\/(?:followers|following)$/);
  if (userListMatch?.[1]) return `/user/${userListMatch[1]}` as never;
  if (path.startsWith('/user/')) return '/(tabs)/search' as never;

  return null;
}

function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split('?')[0] ?? '/';
  const trimmed = withoutQuery.length > 1
    ? withoutQuery.replace(/\/+$/, '')
    : withoutQuery;
  return trimmed || '/';
}
