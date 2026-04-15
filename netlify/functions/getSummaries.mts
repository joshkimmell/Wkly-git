import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, withCors } from './lib/auth';

export const handler = withCors(async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch summaries.' }),
      };
    }

    // Map summary_id -> id and summary_type -> type for frontend
    const mapped = (data || []).map((summary) => ({
      ...summary,
      id: summary.summary_id,
      type: summary.summary_type || summary.type,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(mapped),
    };
  } catch (error) {
    console.error('Server error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An unexpected error occurred.' }),
    };
  }
});