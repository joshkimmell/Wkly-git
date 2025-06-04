import { Handler } from '@netlify/functions';
import supabase from '../../backend/lib/supabaseClient.js';

export const handler: Handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const { id, title, description, category, week_start } = body;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Goal ID is required.' }),
    };
  }

  try {
    const { data, error } = await supabase
      .from('goals')
      .update({ title, description, category, week_start })
      .eq('id', id);

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to update goal.' }),
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