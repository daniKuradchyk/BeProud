import * as Linking from 'expo-linking';

/**
 * Soporte de deep links para invitaciones a grupos.
 * Formatos aceptados:
 *   beproud://g/{code}
 *   https://beproud.app/g/{code}
 *
 * Si llega un enlace antes de tener sesión, lo guardamos en memoria y el
 * RouteGuard lo consume al pasar a `authenticated`. Sin AsyncStorage para no
 * añadir libs; si la app se cierra antes de loguearse el código se pierde.
 */

let pendingJoinCode: string | null = null;
let listenerSub: { remove: () => void } | null = null;

export function getPendingJoinCode(): string | null {
  return pendingJoinCode;
}

export function consumePendingJoinCode(): string | null {
  const c = pendingJoinCode;
  pendingJoinCode = null;
  return c;
}

export function setupDeepLinks(): () => void {
  if (listenerSub) return () => undefined;

  // URL inicial (cold start con la URL).
  Linking.getInitialURL()
    .then((url) => {
      if (!url) return;
      const code = extractGroupCode(url);
      if (code) pendingJoinCode = code;
    })
    .catch((e) => console.warn('[groups] deep link initial error', e));

  // Listener para warm starts (app abierta y recibe URL).
  listenerSub = Linking.addEventListener('url', (event) => {
    const code = extractGroupCode(event.url);
    if (code) pendingJoinCode = code;
  });

  return () => {
    listenerSub?.remove();
    listenerSub = null;
  };
}

/** Devuelve el código extraído de la URL si encaja, o null. */
export function extractGroupCode(url: string): string | null {
  // beproud://g/{code}
  const native = /^beproud:\/\/g\/([^/?#]+)/i.exec(url);
  if (native?.[1]) return native[1];
  // https://beproud.app/g/{code}
  const web = /^https?:\/\/beproud\.app\/g\/([^/?#]+)/i.exec(url);
  if (web?.[1]) return web[1];
  return null;
}
