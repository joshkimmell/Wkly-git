import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

export const handler: Handler = async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  const week_start = event.queryStringParameters?.week_start;
  const include_archived = event.queryStringParameters?.include_archived === 'true';

  if (!week_start) {
    return { statusCode: 400, body: JSON.stringify({ error: 'week_start is required.' }) };
  }

  try {
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', week_start);

    if (!include_archived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch goals.' }) };
    }

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'An unexpected error occurred.' }) };
  }
};
