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
    const { affirmation_id, action } = body;

    if (!affirmation_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'affirmation_id is required' }) };
    }

    if (action === 'unsave') {
      const { error } = await supabase
        .from('saved_affirmations')
        .delete()
        .eq('user_id', userId)
        .eq('affirmation_id', affirmation_id);

      if (error) {
        console.error('Supabase error unsave:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to unsave affirmation' }) };
      }

      return { statusCode: 200, body: JSON.stringify({ saved: false }) };
    }

    // Default: save
    const { error } = await supabase
      .from('saved_affirmations')
      .upsert(
        { user_id: userId, affirmation_id },
        { onConflict: 'user_id,affirmation_id' }
      );

    if (error) {
      console.error('Supabase error saveAffirmation:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save affirmation' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ saved: true }) };
  } catch (err: any) {
    console.error('Unexpected error saveAffirmation:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
