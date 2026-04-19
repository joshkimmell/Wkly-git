import type { Handler } from '@netlify/functions';
import { requireAuth, withCors } from './lib/auth';
import { supabase } from './lib/supabase';

interface SessionBody {
  task_id: string;
  elapsed_seconds: number;
  timer_state: string;
  chat_messages: unknown[];
  suggested_tasks: unknown[];
  added_task_titles: string[];
  pending_chat_tasks: unknown[];
  pending_chat_links: unknown[];
}

export const handler = withCors(async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  let body: SessionBody;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const {
    task_id,
    elapsed_seconds,
    timer_state,
    chat_messages,
    suggested_tasks,
    added_task_titles,
    pending_chat_tasks,
    pending_chat_links,
  } = body;

  if (!task_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing task_id' }) };
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .upsert(
      {
        task_id,
        user_id: userId,
        elapsed_seconds: elapsed_seconds ?? 0,
        timer_state: timer_state ?? 'idle',
        chat_messages: chat_messages ?? [],
        suggested_tasks: suggested_tasks ?? [],
        added_task_titles: added_task_titles ?? [],
        pending_chat_tasks: pending_chat_tasks ?? [],
        pending_chat_links: pending_chat_links ?? [],
      },
      { onConflict: 'task_id,user_id' },
    )
    .select()
    .single();

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
});
