import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, withCors } from './lib/auth';

export const handler = withCors(async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    // Fetch all tasks with their associated goal information
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        goal:goals (
          id,
          title,
          category,
          status,
          is_archived
        )
      `)
      .eq('user_id', userId)
      .order('scheduled_date', { ascending: true, nullsFirst: false })
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching all tasks:', error);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
      },
      body: JSON.stringify(data || []),
    };
  } catch (err: any) {
    console.error('Unexpected error in getAllTasks:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ error: 'Failed to fetch tasks.' }),
    };
  }
});
