import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';

export const handler: Handler = async (event) => {
  const userId = event.queryStringParameters?.user_id;
  const summaryId = event.queryStringParameters?.summary_id;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'User ID is required.' }),
    };
  }

  try {
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch summaries.' }),
      };
    }

    // Map summary_id -> id and summary_type -> type for frontend
    const mapped = (data || []).map((summary) => ({
      ...summary,
      id: summary.summary_id, // map summary_id to id
      type: summary.summary_type || summary.type, // map summary_type to type
      title: summary.title, // map title or name to title
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(mapped),
    };
  } catch (error) {
    console.error('Server error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An unexpected error occurred.' }),
    };
  }
};