import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const { data, error } = await supabase
      .from('saved_affirmations')
      .select(`
        id,
        saved_at,
        affirmation:affirmations (*)
      `)
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('Supabase error getSavedAffirmations:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch saved affirmations' }) };
    }

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err: any) {
    console.error('Unexpected error getSavedAffirmations:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
