// BeProud · Fase 10 — cliente Expo Push minimalista.
// https://docs.expo.dev/push-notifications/sending-notifications/

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
};

export type ExpoTicket =
  | { status: 'ok'; id: string }
  | {
      status: 'error';
      message: string;
      details?: { error?: string };
    };

const ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export async function sendExpoPush(
  messages: ExpoPushMessage[],
  accessToken?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ExpoTicket[]> {
  if (messages.length === 0) return [];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Expo acepta arrays de hasta 100. Asumimos que el caller batchea.
  const res = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`expo_push_http_${res.status}: ${text}`);
  }

  const json = (await res.json()) as { data?: ExpoTicket[] };
  return json.data ?? [];
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
