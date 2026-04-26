// BeProud · Fase 10 — copy de notificaciones push en español.
// Cada tipo recibe el payload de la notification y devuelve { title, body }.

export type NotificationPayload = Record<string, unknown>;

export type NotificationType =
  | 'new_like'
  | 'new_comment'
  | 'new_follower'
  | 'follow_request'
  | 'new_dm'
  | 'league_promotion'
  | 'achievement_unlocked'
  | 'daily_reminder';

export type Copy = { title: string; body: string };

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

const LEAGUE_NAMES: Record<number, string> = {
  1: 'Bronce',
  2: 'Plata',
  3: 'Oro',
  4: 'Platino',
  5: 'Diamante',
};

export function buildCopy(type: NotificationType, payload: NotificationPayload): Copy {
  switch (type) {
    case 'new_like': {
      const u = asString(payload.liker_username, 'alguien');
      return { title: 'Nuevo like', body: `A @${u} le ha gustado tu publicación.` };
    }
    case 'new_comment': {
      const u = asString(payload.commenter_username, 'alguien');
      return { title: 'Nuevo comentario', body: `@${u} ha comentado en tu publicación.` };
    }
    case 'new_follower': {
      const u = asString(payload.follower_username, 'alguien');
      return { title: 'Nuevo seguidor', body: `@${u} ha empezado a seguirte.` };
    }
    case 'follow_request': {
      const u = asString(payload.follower_username, 'alguien');
      return { title: 'Solicitud de seguimiento', body: `@${u} quiere seguirte.` };
    }
    case 'new_dm': {
      const u = asString(payload.sender_username, 'alguien');
      const preview = asString(payload.preview, '');
      return { title: `Mensaje de @${u}`, body: preview || 'Te ha enviado un mensaje.' };
    }
    case 'league_promotion': {
      const toId = Number(payload.to_league_id ?? 0);
      const toName = LEAGUE_NAMES[toId] ?? 'una nueva liga';
      return { title: '¡Subiste de liga!', body: `Has llegado a ${toName} esta semana.` };
    }
    case 'achievement_unlocked': {
      const title = asString(payload.title, 'un logro');
      const icon = asString(payload.icon, '🏅');
      return { title: 'Logro desbloqueado', body: `${icon} ${title}` };
    }
    case 'daily_reminder':
      return { title: 'Tu rutina te espera', body: 'Hoy también vas a sumar puntos. 💪' };
  }
}
