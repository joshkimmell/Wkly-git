import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

export const handler: Handler = async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  const week_start = event.queryStringParameters?.week_start;

  try {
    // Build the Supabase query
    let query = supabase.from('accomplishments').select('*').eq('user_id', userId);
    if (week_start) query = query.eq('week_start', week_start);

    const { data, error } = await query.order('created_at', { ascending: true });

    // Handle errors from Supabase
    if (error) {
      console.error('Error fetching accomplishments:', error);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Failed to fetch accomplishments.' }),
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
        body: JSON.stringify({ error: 'No accomplishments found for the specified user.' }),
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