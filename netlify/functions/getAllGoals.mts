import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';

export const handler: Handler = async (event) => {
  const user_id = event.queryStringParameters?.user_id;
  const week_start = event.queryStringParameters?.week_start;

  // Validate required parameters
  if (!user_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'User ID is required.' }),
    };
  }

  try {
    // Build the Supabase query
    let query = supabase.from('goals').select('*').eq('user_id', user_id);
    if (week_start) query = query.eq('week_start', week_start);

    const { data, error } = await query.order('created_at', { ascending: true });

    // Handle errors from Supabase
    if (error) {
      console.error('Error fetching goals:', error);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Failed to fetch goals.' }),
      };
    }

    // Handle case where no data is found
    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'No goals found for the specified user.' }),
      };
    }

    // Return successful response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Or specify the allowed origin
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'An unexpected error occurred.' }),
    };
  }
};