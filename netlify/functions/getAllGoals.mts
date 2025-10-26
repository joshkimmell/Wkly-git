import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';

export const handler: Handler = async (event) => {
  const user_id = event.queryStringParameters?.user_id;
  const week_start = event.queryStringParameters?.week_start;

  // Validate required parameters
    if (!user_id) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ error: 'User ID is required.' }),
    };
  }

  try {
  // Build the Supabase query - select only needed fields to reduce payload
  const selectFields = 'id,title,description,category,week_start,user_id,created_at,status,status_notes';
  let query = supabase.from('goals').select(selectFields).eq('user_id', user_id);
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
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify({ error: 'Failed to fetch goals.' }),
      };
    }

    // If no data is found, return an empty array with 200 so clients can handle it uniformly
    const responseData = data || [];

    // Return successful response with short caching headers for CDN
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Or specify the allowed origin
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
      },
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ error: 'An unexpected error occurred.' }),
    };
  }
};