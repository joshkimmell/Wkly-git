import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const body = JSON.parse(event.body || '{}');
    const { text, category, is_anonymous } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Affirmation text is required' }) };
    }

    if (text.trim().length > 500) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Affirmation must be under 500 characters' }) };
    }

    const { data, error } = await supabase
      .from('affirmations')
      .insert({
        text: text.trim(),
        category: category || 'General',
        submitted_by: userId,
        is_anonymous: is_anonymous || false,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error submitAffirmation:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to submit affirmation' }) };
    }

    return { statusCode: 201, body: JSON.stringify(data) };
  } catch (err: any) {
    console.error('Unexpected error submitAffirmation:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
