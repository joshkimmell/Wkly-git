import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';

export const handler: Handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const { id, title, description, category, week_start, status, status_notes, status_set_at } = body;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Goal ID is required.' }),
    };
  }

  try {
    // Build update payload dynamically
    const updatePayload: any = { title, description, category, week_start };

    if (typeof status !== 'undefined') {
      updatePayload.status = status;
      // If the client provided a timestamp, use it; otherwise set now
      updatePayload.status_set_at = status_set_at || new Date().toISOString();
    }
    if (typeof status_notes !== 'undefined') {
      updatePayload.status_notes = status_notes;
    }

    const { data, error } = await supabase
      .from('goals')
      .update(updatePayload)
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