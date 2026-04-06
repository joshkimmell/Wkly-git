import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

export const handler: Handler = async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('affirmation_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error getAffirmationPreferences:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch preferences' }) };
    }

    // Return defaults if no row exists
    return {
      statusCode: 200,
      body: JSON.stringify(data || {
        daily_notification: true,
        notification_time: '09:00',
        preferred_categories: ['General'],
      }),
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { daily_notification, notification_time, preferred_categories } = body;

      const { data, error } = await supabase
        .from('affirmation_preferences')
        .upsert(
          {
            user_id: userId,
            daily_notification: daily_notification ?? true,
            notification_time: notification_time || '09:00',
            preferred_categories: preferred_categories || ['General'],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Supabase error updateAffirmationPreferences:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update preferences' }) };
      }

      return { statusCode: 200, body: JSON.stringify(data) };
    } catch (err: any) {
      console.error('Unexpected error updateAffirmationPreferences:', err);
      return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
