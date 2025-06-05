import { Handler } from '@netlify/functions';
import supabase from '../../lib/supabase';

export const handler: Handler = async (event) => {
  // const supabaseUrl = process.env.VITE_SUPABASE_URL;
  // const supabaseRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const user_id = event.queryStringParameters?.user_id;
  const week_start = event.queryStringParameters?.week_start;

  if (!user_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'User ID is required.' }),
    };
  }

  try {
    let query = supabase.from('goals').select('*').eq('user_id', user_id);
    if (week_start) query = query.eq('week_start', week_start);

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch goals.' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An unexpected error occurred.' }),
    };
  }
};