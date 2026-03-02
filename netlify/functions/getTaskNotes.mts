import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const taskId = event.queryStringParameters?.task_id;
    
    if (!taskId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing task_id' }) };
    }

    const { data, error } = await supabase
      .from('task_notes')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Supabase error getTaskNotes:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch task notes' }) };
    }

    return { statusCode: 200, body: JSON.stringify(data || []) };
  } catch (err: any) {
    console.error('Unexpected error getTaskNotes:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
