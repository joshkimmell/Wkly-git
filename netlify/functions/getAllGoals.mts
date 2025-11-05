import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';

export const handler: Handler = async (event) => {
  const user_id = event.queryStringParameters?.user_id;
  const week_start = event.queryStringParameters?.week_start;
  const scope = event.queryStringParameters?.scope; // 'week' | 'month' | 'year'
  const page = event.queryStringParameters?.page; // legacy: YYYY-MM or YYYY or YYYY-MM-DD
  const start = event.queryStringParameters?.start; // ISO date string inclusive
  const end = event.queryStringParameters?.end; // ISO date string exclusive

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

    // If caller passed explicit week_start, keep that behavior
    if (week_start) {
      query = query.eq('week_start', week_start);
    } else if (start || end) {
      // Use explicit start/end ISO date range filtering (start inclusive, end exclusive)
      if (start) query = query.gte('week_start', start);
      if (end) query = query.lt('week_start', end);
    } else if (scope && page) {
      // Legacy support: page param (YYYY-MM, YYYY, or exact YYYY-MM-DD)
      if (scope === 'week') {
        query = query.eq('week_start', page);
      } else if (scope === 'month') {
        const [y, m] = page.split('-');
        const mStart = `${y}-${m}-01`;
        const monthIndex = parseInt(m, 10);
        const nextMonth = monthIndex === 12 ? `${parseInt(y, 10) + 1}-01-01` : `${y}-${String(monthIndex + 1).padStart(2, '0')}-01`;
        query = query.gte('week_start', mStart).lt('week_start', nextMonth);
      } else if (scope === 'year') {
        const yStart = `${page}-01-01`;
        const nextYear = `${parseInt(page, 10) + 1}-01-01`;
        query = query.gte('week_start', yStart).lt('week_start', nextYear);
      }
    }

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