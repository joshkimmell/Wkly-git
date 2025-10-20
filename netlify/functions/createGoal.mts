import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';

export const handler: Handler = async (event) => {

  const body = JSON.parse(event.body || '{}');
  const { title, description, category, week_start, user_id, status, status_notes, status_set_at } = body;

  if (!title || !description || !category || !week_start || !user_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'All fields are required.' }),
    };
  }

  console.log('Payload received:', body);

  try {
    // Prepare insert payload and include optional status fields
    const insertPayload: any = { title, description, category, week_start, user_id };
    if (status) insertPayload.status = status;
    if (status_notes) insertPayload.status_notes = status_notes;
    // If client provided a status_set_at use it, otherwise if status provided set to now
    if (status_set_at) insertPayload.status_set_at = status_set_at;
    else if (status) insertPayload.status_set_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('goals')
      .insert([insertPayload]);

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