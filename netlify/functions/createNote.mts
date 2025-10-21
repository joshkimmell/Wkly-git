import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const userId = authHeader.replace(/^Bearer\s*/i, '');
    if (!userId) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

    const body = JSON.parse(event.body || '{}');
  const { goal_id, content: rawContent } = body;
  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  if (!goal_id || !content) return { statusCode: 400, body: JSON.stringify({ error: 'Missing goal_id or content' }) };
  if (content.length > 5000) return { statusCode: 400, body: JSON.stringify({ error: 'Content too long (max 5000 chars)' }) };

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    console.log('createNote resolving supabase envs', { supabaseUrlPresent: !!supabaseUrl, supabaseKeyPresent: !!supabaseKey });
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase env not set in createNote:', { supabaseUrl, supabaseKey });
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase configuration missing in server environment' }) };
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.from('goal_notes').insert({ goal_id, user_id: userId, content });
    if (error) {
      console.error('Supabase error createNote:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create note' }) };
    }

    return { statusCode: 201, body: JSON.stringify(data) };
  } catch (err: any) {
    console.error('Unexpected error createNote:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
