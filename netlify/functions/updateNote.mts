import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, CORS_HEADERS } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'PUT') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const body = JSON.parse(event.body || '{}');
    const { id, content: rawContent } = body;
    const content = typeof rawContent === 'string' ? rawContent.trim() : '';
    if (!id || typeof rawContent === 'undefined' || !content) return { statusCode: 400, body: JSON.stringify({ error: 'Missing id or content' }) };
    if (content.length > 5000) return { statusCode: 400, body: JSON.stringify({ error: 'Content too long (max 5000 chars)' }) };

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase.from('goal_notes').select('user_id').eq('id', id).single();
    if (fetchErr || !existing) return { statusCode: 404, body: JSON.stringify({ error: 'Note not found' }) };
    if (existing.user_id !== userId) return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };

    const { data, error } = await supabase.from('goal_notes').update({ content, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      console.error('Supabase error updateNote:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update note' }) };
    }

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err: any) {
    console.error('Unexpected error updateNote:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
