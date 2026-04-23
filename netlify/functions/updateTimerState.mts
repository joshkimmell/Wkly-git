/**
 * updateTimerState
 *
 * Lightweight upsert that only patches the three timer-related columns
 * (timer_state, accumulated_seconds, started_at) on a focus_session row.
 * All other columns (chat_messages, suggested_tasks, etc.) are left untouched
 * on conflict, so this can be called frequently without clobbering session data.
 */
import { requireAuth, withCors } from './lib/auth';
import { supabase } from './lib/supabase';

interface Body {
  task_id: string;
  /** 'running' | 'paused' | 'idle' */
  timer_state: string;
  /** Seconds accumulated before the current run started */
  accumulated_seconds: number;
  /** ISO timestamp when the current run started; null when not running */
  started_at: string | null;
}

export const handler = withCors(async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  let body: Body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { task_id, timer_state, accumulated_seconds, started_at } = body;
  if (!task_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing task_id' }) };
  }

  // elapsed_seconds = live total for backward-compat consumers
  const elapsedSeconds =
    started_at
      ? (accumulated_seconds ?? 0) + Math.floor((Date.now() - new Date(started_at).getTime()) / 1000)
      : (accumulated_seconds ?? 0);

  // Upsert with only timer columns — other columns use DB defaults on INSERT
  // and are NOT touched on UPDATE conflict (supabase only sets columns in the object).
  const { error } = await supabase.from('focus_sessions').upsert(
    {
      task_id,
      user_id: userId,
      timer_state: timer_state ?? 'idle',
      accumulated_seconds: accumulated_seconds ?? 0,
      started_at: started_at ?? null,
      elapsed_seconds: elapsedSeconds,
    },
    { onConflict: 'task_id,user_id' },
  );

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
});
