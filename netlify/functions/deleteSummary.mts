import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, CORS_HEADERS, withCors } from './lib/auth';

export const handler = withCors(async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'DELETE') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const summary_id = event.queryStringParameters?.summary_id;
    if (!summary_id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing summary_id' }) };

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase.from('summaries').select('user_id').eq('summary_id', summary_id).single();
    if (fetchErr || !existing) return { statusCode: 404, body: JSON.stringify({ error: 'Summary not found' }) };
    if (existing.user_id !== userId) return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };

    const { data, error } = await supabase.from('summaries').delete().eq('summary_id', summary_id);
    if (error) {
      console.error('Supabase error deleteSummary:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete summary' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
  } catch (err: any) {
    console.error('Unexpected error deleteSummary:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
});
