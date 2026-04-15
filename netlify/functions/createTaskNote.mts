import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, CORS_HEADERS } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const body = JSON.parse(event.body || '{}');
    const { task_id, content: rawContent } = body;
    const content = typeof rawContent === 'string' ? rawContent.trim() : '';
    
    if (!task_id || !content) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing task_id or content' }) };
    }
    
    if (content.length > 5000) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Content too long (max 5000 chars)' }) };
    }

    const { data, error } = await supabase
      .from('task_notes')
      .insert({ task_id, user_id: userId, content })
      .select()
      .single();
      
    if (error) {
      console.error('Supabase error createTaskNote:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create task note' }) };
    }

    return { statusCode: 201, body: JSON.stringify(data) };
  } catch (err: any) {
    console.error('Unexpected error createTaskNote:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
