import type { Handler } from '@netlify/functions';
import { requireAuth, withCors } from './lib/auth';
import { supabase } from './lib/supabase';

export const handler = withCors(async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  const task_id = event.queryStringParameters?.task_id;
  if (!task_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing task_id' }) };
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('task_id', task_id)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data ?? null),
  };
});
