import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';

export const handler: Handler = async (event) => {

  const body = JSON.parse(event.body || '{}');
  const { title, description, category, week_start, user_id } = body;

  if (!title || !description || !category || !week_start || !user_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'All fields are required.' }),
    };
  }

  console.log('Payload received:', body);

  try {
    const { data, error } = await supabase
      .from('goals')
      .insert([{ title, description, category, week_start, user_id }]);

    if (error) {
      console.error('Supabase error:', error);
      console.error('Supabase error details:', error.message, error.details, error.hint);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create goal.', details: error.message }),
      };
    }

    return {
      statusCode: 201,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An unexpected error occurred.', details: (error as Error).message }),
    };
  }
};