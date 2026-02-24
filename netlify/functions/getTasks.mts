import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

export const handler: Handler = async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  const goalId = event.queryStringParameters?.goal_id;

  if (!goalId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'goal_id query parameter is required.' }),
    };
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data || []),
    };
  } catch (err: any) {
    console.error('Unexpected error in getTasks:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch tasks.' }),
    };
  }
};
