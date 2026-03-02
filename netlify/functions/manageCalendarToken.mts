import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './lib/auth';

const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  // GET — return the current token (null if none)
  if (event.httpMethod === 'GET') {
    const { data, error } = await adminClient
      .from('notification_preferences')
      .select('settings')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[manageCalendarToken] GET error:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ token: data?.settings?.calendarToken || null }),
    };
  }

  // POST — generate + store a new token, return it
  if (event.httpMethod === 'POST') {
    const body = event.body ? JSON.parse(event.body) : {};
    const token: string = body.token || generateToken();

    // Merge into existing settings to avoid overwriting other keys
    const { data: existing } = await adminClient
      .from('notification_preferences')
      .select('settings')
      .eq('user_id', userId)
      .maybeSingle();

    const merged = { ...(existing?.settings || {}), calendarToken: token };

    const { error } = await adminClient
      .from('notification_preferences')
      .upsert({ user_id: userId, settings: merged }, { onConflict: 'user_id' });

    if (error) {
      console.error('[manageCalendarToken] upsert error:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }

    console.log('[manageCalendarToken] saved token for userId:', userId.slice(0, 8) + '...');
    return { statusCode: 200, headers, body: JSON.stringify({ token }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

function generateToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}
