import { Handler } from '@netlify/functions';
import supabase from '../../lib/supabase';

export const handler: Handler = async (event) => {
  // const supabaseUrl = process.env.VITE_SUPABASE_URL;
  // const supabaseRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const body = JSON.parse(event.body || '{}');
  const { id } = body;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Goal ID is required.' }),
    };
  }

  try {
    const { data, error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to delete goal.' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Goal deleted.', data }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An unexpected error occurred.' }),
    };
  }
};