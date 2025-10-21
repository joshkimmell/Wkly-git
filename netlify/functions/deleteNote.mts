import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'DELETE') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const userId = authHeader.replace(/^Bearer\s*/i, '');
    if (!userId) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

    const note_id = event.queryStringParameters?.note_id;
    if (!note_id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing note_id' }) };

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    console.log('deleteNote resolving supabase envs', { supabaseUrlPresent: !!supabaseUrl, supabaseKeyPresent: !!supabaseKey });
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase env not set in deleteNote:', { supabaseUrl, supabaseKey });
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase configuration missing in server environment' }) };
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase.from('goal_notes').select('user_id').eq('id', note_id).single();
    if (fetchErr || !existing) return { statusCode: 404, body: JSON.stringify({ error: 'Note not found' }) };
    if (existing.user_id !== userId) return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };

    const { data, error } = await supabase.from('goal_notes').delete().eq('id', note_id);
    if (error) {
      console.error('Supabase error deleteNote:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete note' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
  } catch (err: any) {
    console.error('Unexpected error deleteNote:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
