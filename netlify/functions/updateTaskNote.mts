import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const body = JSON.parse(event.body || '{}');
    const { id, content: rawContent } = body;
    const content = typeof rawContent === 'string' ? rawContent.trim() : '';
    
    if (!id || !content) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing id or content' }) };
    }
    
    if (content.length > 5000) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Content too long (max 5000 chars)' }) };
    }

    const { data, error } = await supabase
      .from('task_notes')
      .update({ content })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
      
    if (error) {
      console.error('Supabase error updateTaskNote:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update task note' }) };
    }

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err: any) {
    console.error('Unexpected error updateTaskNote:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
