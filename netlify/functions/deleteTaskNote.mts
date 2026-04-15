import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, CORS_HEADERS } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'DELETE') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const noteId = event.queryStringParameters?.note_id;
    
    if (!noteId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing note_id' }) };
    }

    const { error } = await supabase
      .from('task_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);
      
    if (error) {
      console.error('Supabase error deleteTaskNote:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete task note' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err: any) {
    console.error('Unexpected error deleteTaskNote:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
