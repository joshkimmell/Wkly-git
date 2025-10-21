import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const goal_id = event.queryStringParameters?.goal_id;
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const userId = authHeader.replace(/^Bearer\s*/i, '');

    console.log('getNotes called for goal_id=', goal_id, 'userId=', userId);

    if (!goal_id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing goal_id' }) };
    if (!userId) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

    // create supabase client from env at runtime
    // Support both SUPABASE_* and VITE_SUPABASE_* env var names for local dev
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    console.log('getNotes resolving supabase envs', { supabaseUrlPresent: !!supabaseUrl, supabaseKeyPresent: !!supabaseKey });
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase env not set in getNotes:', { supabaseUrl, supabaseKey });
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase configuration missing in server environment' }) };
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch notes for the goal
    const { data, error } = await supabase
      .from('goal_notes')
      .select('*')
      .eq('goal_id', goal_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error getNotes:', error);
      // Include message/details to help debugging in dev; avoid exposing secrets in production
      let details: any = error;
      try { details = JSON.parse(JSON.stringify(error)); } catch (e) { details = String(error); }
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch notes', details }) };
    }

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err: any) {
    console.error('Unexpected error getNotes:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
