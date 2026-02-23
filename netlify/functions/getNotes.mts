import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const goal_id = event.queryStringParameters?.goal_id;
    if (!goal_id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing goal_id' }) };

    const countOnly = event.queryStringParameters?.count_only === '1' || event.queryStringParameters?.count_only === 'true';

    if (countOnly) {
      const { data, error, count } = await supabase
        .from('goal_notes')
        .select('id', { count: 'exact', head: false })
        .eq('goal_id', goal_id)
        .eq('user_id', userId);

      if (error) {
        console.error('Supabase error getNotes (count-only):', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch notes count' }) };
      }

      return { statusCode: 200, body: JSON.stringify({ count: typeof count === 'number' ? count : (data?.length ?? 0) }) };
    }

    const { data, error } = await supabase
      .from('goal_notes')
      .select('*')
      .eq('goal_id', goal_id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error getNotes:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch notes' }) };
    }

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err: any) {
    console.error('Unexpected error getNotes:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
