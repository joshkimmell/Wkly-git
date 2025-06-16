import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';

export const handler: Handler = async (event) => {
  // const supabaseUrl = process.env.VITE_SUPABASE_URL;
  // const supabaseRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  const body = JSON.parse(event.body || '{}');
  const { title, description, category, week_start, user_id } = body;

  if (!title || !description || !category || !week_start || !user_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'All fields are required.' }),
    };
  }

  try {
    const { data, error } = await supabase
      .from('goals')
      .insert([{ title, description, category, week_start, user_id }]);

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create goal.' }),
      };
    }

    return {
      statusCode: 201,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An unexpected error occurred.' }),
    };
  }
};