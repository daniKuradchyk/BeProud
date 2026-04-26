// BeProud · Fase 10 — Edge Function send-push.
// Disparada por dispatch_push (pg_net) tras un INSERT en notifications.
// Lee la notification + tokens del user, comprueba quiet_hours en su
// timezone, envía push vía Expo, registra resultado y limpia tokens
// inválidos.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import {
  buildCopy,
  type NotificationPayload,
  type NotificationType,
} from './i18n.ts';
import {
  chunk,
  sendExpoPush,
  type ExpoPushMessage,
  type ExpoTicket,
} from './expoClient.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const INVOKE_TOKEN  = Deno.env.get('SEND_PUSH_INVOKE_TOKEN') ?? SERVICE_ROLE;
const EXPO_TOKEN    = Deno.env.get('EXPO_ACCESS_TOKEN') ?? undefined;

type NotifRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: NotificationPayload;
  sent_push_at: string | null;
};

type ProfileRow = {
  id: string;
  notification_prefs: {
    quiet_start?: string;
    quiet_end?: string;
  } & Record<string, unknown>;
  timezone: string;
  deleted_at: string | null;
};

type TokenRow = { token: string; platform: 'ios' | 'android' | 'web' };

export async function handle(
  req: Request,
  deps: {
    supabase: SupabaseClient;
    sendExpoPushImpl: typeof sendExpoPush;
    nowDate: Date;
  },
): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== INVOKE_TOKEN) {
    return json({ error: 'unauthorized' }, 401);
  }

  let notification_id: string | null = null;
  try {
    const body = await req.json();
    notification_id = typeof body?.notification_id === 'string' ? body.notification_id : null;
  } catch {
    return json({ error: 'bad_body' }, 400);
  }
  if (!notification_id) return json({ error: 'missing_notification_id' }, 400);

  const sb = deps.supabase;

  const { data: notif, error: nErr } = await sb
    .from('notifications')
    .select('id, user_id, type, payload, sent_push_at')
    .eq('id', notification_id)
    .maybeSingle();
  if (nErr) {
    console.warn('[push] notif fetch error', nErr);
    return json({ error: 'notif_fetch_failed' }, 500);
  }
  if (!notif) return json({ skipped: 'not_found' }, 200);
  if (notif.sent_push_at) return json({ skipped: 'already_sent' }, 200);

  const n = notif as NotifRow;

  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id, notification_prefs, timezone, deleted_at')
    .eq('id', n.user_id)
    .maybeSingle();
  if (pErr || !profile) {
    await markError(sb, n.id, 'profile_not_found');
    return json({ error: 'profile_not_found' }, 200);
  }
  const p = profile as ProfileRow;
  if (p.deleted_at) {
    await markError(sb, n.id, 'user_deleted');
    return json({ skipped: 'user_deleted' }, 200);
  }

  // Quiet hours en el timezone del user.
  if (isInQuietHours(deps.nowDate, p.timezone, p.notification_prefs.quiet_start, p.notification_prefs.quiet_end)) {
    await markError(sb, n.id, 'quiet_hours');
    return json({ skipped: 'quiet_hours' }, 200);
  }

  const { data: tokensData } = await sb
    .from('push_tokens')
    .select('token, platform')
    .eq('user_id', n.user_id);
  const tokens = (tokensData ?? []) as TokenRow[];

  if (tokens.length === 0) {
    await markError(sb, n.id, 'no_tokens');
    return json({ skipped: 'no_tokens' }, 200);
  }

  const copy = buildCopy(n.type, n.payload);

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    title: copy.title,
    body: copy.body,
    data: { type: n.type, payload: n.payload, notification_id: n.id },
    sound: 'default',
    priority: 'high',
    channelId: 'default',
  }));

  let tickets: ExpoTicket[] = [];
  try {
    for (const batch of chunk(messages, 100)) {
      const r = await deps.sendExpoPushImpl(batch, EXPO_TOKEN);
      tickets = tickets.concat(r);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    await markError(sb, n.id, `expo_failed: ${msg}`);
    return json({ error: 'expo_failed', detail: msg }, 200);
  }

  // Limpieza de tokens inválidos.
  const tokensToRemove: string[] = [];
  let okCount = 0;
  let errCount = 0;
  tickets.forEach((t, idx) => {
    if (t.status === 'ok') {
      okCount++;
      return;
    }
    errCount++;
    const reason = t.details?.error ?? '';
    if (reason === 'DeviceNotRegistered' || reason === 'InvalidCredentials') {
      const token = tokens[idx]?.token;
      if (token) tokensToRemove.push(token);
    }
  });

  if (tokensToRemove.length > 0) {
    await sb.from('push_tokens').delete().in('token', tokensToRemove);
  }

  const allFailed = okCount === 0 && errCount > 0;
  await sb
    .from('notifications')
    .update({
      sent_push_at: new Date().toISOString(),
      push_error: allFailed ? 'no_valid_tokens' : null,
    })
    .eq('id', n.id);

  return json(
    {
      sent: okCount,
      failed: errCount,
      removed_tokens: tokensToRemove.length,
    },
    200,
  );
}

async function markError(sb: SupabaseClient, id: string, reason: string) {
  await sb.from('notifications').update({ push_error: reason }).eq('id', id);
}

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Comprueba si "now" cae dentro de la franja [start, end] del user en su
 * timezone. start/end son "HH:MM". Soporta cruces de medianoche.
 */
export function isInQuietHours(
  now: Date,
  tz: string,
  start: string | undefined,
  end: string | undefined,
): boolean {
  if (!start || !end) return false;
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz || 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const cur = h * 60 + m;

  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  const s = sH * 60 + sM;
  const e = eH * 60 + eM;

  if (s === e) return false;
  if (s < e) {
    return cur >= s && cur < e;
  }
  // Cruza medianoche: e.g. 23:00 → 08:00.
  return cur >= s || cur < e;
}

if (import.meta.main) {
  Deno.serve((req) => {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return handle(req, {
      supabase,
      sendExpoPushImpl: sendExpoPush,
      nowDate: new Date(),
    });
  });
}
