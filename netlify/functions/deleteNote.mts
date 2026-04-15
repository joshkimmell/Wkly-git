import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, CORS_HEADERS } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'DELETE') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const note_id = event.queryStringParameters?.note_id;
    if (!note_id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing note_id' }) };

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase.from('goal_notes').select('user_id').eq('id', note_id).single();
    if (fetchErr || !existing) return { statusCode: 404, body: JSON.stringify({ error: 'Note not found' }) };
    if (existing.user_id !== userId) return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };

    const { data, error } = await supabase.from('goal_notes').delete().eq('id', note_id);
    if (error) {
      console.error('Supabase error deleteNote:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete note' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
  } catch (err: any) {
    console.error('Unexpected error deleteNote:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
