// BeProud · Fase 10 — tests Deno con mock de fetch + cliente Supabase fake.
// Ejecutar: pnpm supabase:functions:test (o `deno test --allow-net --allow-env`).

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handle, isInQuietHours } from './index.ts';
import type { ExpoTicket } from './expoClient.ts';

// ── Quiet hours ─────────────────────────────────────────────────────────────
Deno.test('quiet hours: 23:00→08:00 incluye 02:00', () => {
  const d = new Date('2026-04-25T02:00:00Z');
  assertEquals(isInQuietHours(d, 'UTC', '23:00', '08:00'), true);
});

Deno.test('quiet hours: 23:00→08:00 NO incluye 12:00', () => {
  const d = new Date('2026-04-25T12:00:00Z');
  assertEquals(isInQuietHours(d, 'UTC', '23:00', '08:00'), false);
});

Deno.test('quiet hours: ventana normal 13:00→14:00 incluye 13:30', () => {
  const d = new Date('2026-04-25T13:30:00Z');
  assertEquals(isInQuietHours(d, 'UTC', '13:00', '14:00'), true);
});

Deno.test('quiet hours: respeta timezone Madrid', () => {
  // 22:00 UTC = 00:00 en Madrid (CEST UTC+2 en abril).
  const d = new Date('2026-04-25T22:00:00Z');
  assertEquals(isInQuietHours(d, 'Europe/Madrid', '23:00', '08:00'), true);
});

// ── Handler con mocks ───────────────────────────────────────────────────────
type FakeRow = Record<string, unknown>;

function makeFakeSupabase(state: {
  notifications: FakeRow[];
  profiles: FakeRow[];
  push_tokens: FakeRow[];
}) {
  const updates: { table: string; patch: FakeRow; where: FakeRow }[] = [];
  const deletes: { table: string; where: FakeRow }[] = [];

  const fromTable = (table: string) => {
    let filter: FakeRow = {};
    const builder: Record<string, (...args: unknown[]) => unknown> = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filter[col] = val;
        return builder;
      },
      in: (col: string, vals: unknown[]) => {
        filter[col] = { in: vals };
        return builder;
      },
      maybeSingle: async () => {
        const arr = (state as Record<string, FakeRow[]>)[table] ?? [];
        const found = arr.find((r) => Object.entries(filter).every(([k, v]) => r[k] === v));
        return { data: found ?? null, error: null };
      },
      then: async (resolve: (v: unknown) => unknown) => {
        const arr = (state as Record<string, FakeRow[]>)[table] ?? [];
        const matched = arr.filter((r) => Object.entries(filter).every(([k, v]) => r[k] === v));
        return resolve({ data: matched, error: null });
      },
      update: (patch: FakeRow) => ({
        eq: (col: string, val: unknown) => {
          updates.push({ table, patch, where: { [col]: val } });
          return Promise.resolve({ error: null });
        },
      }),
      delete: () => ({
        in: (col: string, vals: unknown[]) => {
          deletes.push({ table, where: { [col]: { in: vals } } });
          return Promise.resolve({ error: null });
        },
        eq: (col: string, val: unknown) => {
          deletes.push({ table, where: { [col]: val } });
          return Promise.resolve({ error: null });
        },
      }),
    };
    return builder;
  };

  return {
    sb: { from: fromTable } as unknown as Parameters<typeof handle>[1]['supabase'],
    updates,
    deletes,
  };
}

function makeRequest(body: unknown, token = 'invoke-token'): Request {
  return new Request('http://x/functions/v1/send-push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

Deno.test('handle: 401 si Authorization no coincide', async () => {
  Deno.env.set('SEND_PUSH_INVOKE_TOKEN', 'good-token');
  const { sb } = makeFakeSupabase({ notifications: [], profiles: [], push_tokens: [] });
  const res = await handle(
    makeRequest({ notification_id: '00000000-0000-0000-0000-000000000001' }, 'wrong'),
    {
      supabase: sb,
      sendExpoPushImpl: async () => [],
      nowDate: new Date(),
    },
  );
  assertEquals(res.status, 401);
});

Deno.test('handle: token DeviceNotRegistered se elimina', async () => {
  Deno.env.set('SEND_PUSH_INVOKE_TOKEN', 'good-token');
  const notifId = '00000000-0000-0000-0000-000000000001';
  const userId  = '11111111-1111-1111-1111-111111111111';
  const { sb, deletes, updates } = makeFakeSupabase({
    notifications: [{
      id: notifId, user_id: userId, type: 'new_like',
      payload: { liker_username: 'alex' }, sent_push_at: null,
    }],
    profiles: [{
      id: userId,
      notification_prefs: { quiet_start: '23:00', quiet_end: '08:00' },
      timezone: 'UTC',
      deleted_at: null,
    }],
    push_tokens: [
      { token: 'ExponentPushToken[bad]',  platform: 'ios' },
      { token: 'ExponentPushToken[good]', platform: 'android' },
    ],
  });

  const sendImpl = async (): Promise<ExpoTicket[]> => [
    { status: 'error', message: 'fail', details: { error: 'DeviceNotRegistered' } },
    { status: 'ok', id: 'r-1' },
  ];

  // Hora 12:00 UTC, fuera de quiet hours.
  const now = new Date('2026-04-25T12:00:00Z');
  const res = await handle(makeRequest({ notification_id: notifId }, 'good-token'), {
    supabase: sb,
    sendExpoPushImpl: sendImpl,
    nowDate: now,
  });

  assertEquals(res.status, 200);
  const removed = deletes.find((d) => d.table === 'push_tokens');
  assertExists(removed);
  // Sólo el token "bad" se borró.
  // deno-lint-ignore no-explicit-any
  assertEquals((removed!.where as any).token.in, ['ExponentPushToken[bad]']);
  // sent_push_at se setea.
  assertExists(updates.find((u) => u.table === 'notifications' && u.patch.sent_push_at));
});

Deno.test('handle: quiet_hours setea push_error y no envía', async () => {
  Deno.env.set('SEND_PUSH_INVOKE_TOKEN', 'good-token');
  const notifId = '00000000-0000-0000-0000-000000000001';
  const userId  = '22222222-2222-2222-2222-222222222222';
  const { sb, updates } = makeFakeSupabase({
    notifications: [{
      id: notifId, user_id: userId, type: 'new_dm',
      payload: { sender_username: 'maria', preview: 'hola' }, sent_push_at: null,
    }],
    profiles: [{
      id: userId,
      notification_prefs: { quiet_start: '23:00', quiet_end: '08:00' },
      timezone: 'UTC',
      deleted_at: null,
    }],
    push_tokens: [{ token: 'ExponentPushToken[x]', platform: 'ios' }],
  });

  // 02:00 UTC → en quiet_hours.
  const now = new Date('2026-04-25T02:00:00Z');
  let called = false;
  const res = await handle(makeRequest({ notification_id: notifId }, 'good-token'), {
    supabase: sb,
    sendExpoPushImpl: async () => {
      called = true;
      return [];
    },
    nowDate: now,
  });

  assertEquals(res.status, 200);
  assertEquals(called, false);
  const upd = updates.find((u) =>
    u.table === 'notifications' && u.patch.push_error === 'quiet_hours',
  );
  assertExists(upd);
});
