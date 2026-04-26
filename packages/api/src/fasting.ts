import { supabase } from './client';
import {
  FastingProtocolInputSchema,
  type FastingProtocol,
  type FastingProtocolInput,
  type FastingStatus,
} from '@beproud/validation';

export type FastingProtocolRow = {
  user_id: string;
  protocol: FastingProtocol;
  eat_start: string | null;     // 'HH:MM:SS' (Postgres time)
  eat_end:   string | null;
  low_cal_days: string[] | null;
  notify_before_close: boolean;
  notify_on_complete:  boolean;
  enabled: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type FastingLog = {
  id: string;
  user_id: string;
  protocol: FastingProtocol;
  started_at: string;
  ended_at: string;
  planned_duration_min: number;
  actual_duration_min: number;
  status: FastingStatus;
  notes: string | null;
  created_at: string;
};

export type FastingStats = {
  totalCompleted: number;
  totalBroken:    number;
  longestMin:     number;
  totalMin:       number;
  currentStreak:  number;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('not_authenticated');
  return id;
}

function toTime(value: string): string {
  // Acepta 'HH:MM' o 'HH:MM:SS'; Postgres acepta ambos.
  return value.length === 5 ? `${value}:00` : value;
}

export async function fetchMyProtocol(): Promise<FastingProtocolRow | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('fasting_protocols')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as FastingProtocolRow | null) ?? null;
}

export async function upsertMyProtocol(
  input: FastingProtocolInput,
): Promise<FastingProtocolRow> {
  const parsed = FastingProtocolInputSchema.parse(input);
  const userId = await requireUserId();
  const payload = {
    user_id: userId,
    protocol: parsed.protocol,
    eat_start: parsed.eat_start ? toTime(parsed.eat_start) : null,
    eat_end:   parsed.eat_end   ? toTime(parsed.eat_end)   : null,
    low_cal_days: parsed.low_cal_days ?? null,
    notify_before_close: parsed.notify_before_close,
    notify_on_complete:  parsed.notify_on_complete,
    timezone: parsed.timezone,
    enabled: true,
  };
  const { data, error } = await supabase
    .from('fasting_protocols')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as FastingProtocolRow;
}

export async function disableMyProtocol(): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('fasting_protocols')
    .update({ enabled: false })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function logBreakEarly(input: {
  startedAt: string;
  endedAt:   string;
  protocol:  FastingProtocol;
  plannedMin: number;
  actualMin:  number;
  notes?: string;
}): Promise<FastingLog> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('fasting_logs')
    .insert({
      user_id: userId,
      protocol: input.protocol,
      started_at: input.startedAt,
      ended_at:   input.endedAt,
      planned_duration_min: Math.max(1, Math.round(input.plannedMin)),
      actual_duration_min:  Math.max(0, Math.round(input.actualMin)),
      status: 'broken_early',
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as FastingLog;
}

/** RPC idempotente. Devuelve nº de logs insertados (0 o 1). */
export async function closeCompletedFasts(): Promise<number> {
  const { data, error } = await supabase.rpc('close_completed_fasts');
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function fetchFastingHistory(limit = 30): Promise<FastingLog[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('fasting_logs')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FastingLog[];
}

export async function fetchFastingStats(): Promise<FastingStats> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('fasting_logs')
    .select('status, actual_duration_min, started_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    status: FastingStatus;
    actual_duration_min: number;
    started_at: string;
  }>;

  let totalCompleted = 0;
  let totalBroken = 0;
  let longestMin = 0;
  let totalMin = 0;
  for (const r of rows) {
    if (r.status === 'completed') {
      totalCompleted += 1;
      totalMin += r.actual_duration_min;
      if (r.actual_duration_min > longestMin) longestMin = r.actual_duration_min;
    } else {
      totalBroken += 1;
    }
  }

  // Racha actual: ayunos completados consecutivos desde el más reciente.
  let currentStreak = 0;
  for (const r of rows) {
    if (r.status === 'completed') currentStreak += 1;
    else break;
  }

  return { totalCompleted, totalBroken, longestMin, totalMin, currentStreak };
}
