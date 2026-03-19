import { Handler } from '@netlify/functions';
import { v4 as uuidv4 } from 'uuid';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const body = JSON.parse(event.body || '{}');
    const { content, summary_type, week_start, title } = body;

    if (!content || !summary_type || !week_start || !title) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields.' }),
      };
    }

    const summary_id = uuidv4();

    const { data, error } = await supabase
      .from('summaries')
      .insert([{
        summary_id,
        user_id: userId,
        content,
        summary_type,
        week_start,
        title,
      }])
      .select('*')
      .single();

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    // Map summary_id to id and summary_type to type for frontend
    const mapped = {
      ...data,
      id: data.summary_id,
      type: data.summary_type,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(mapped),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};