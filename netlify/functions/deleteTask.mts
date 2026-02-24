import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

export const handler: Handler = async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  // Support both query parameter and POST body formats
  let taskId = event.queryStringParameters?.id;
  
  if (!taskId && event.body) {
    try {
      const body = JSON.parse(event.body);
      taskId = body.id;
    } catch (e) {
      // ignore parse errors
    }
  }

  if (!taskId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Task id is required (either as query parameter or in request body).' }),
    };
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting task:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Task deleted successfully.' }),
    };
  } catch (err: any) {
    console.error('Unexpected error in deleteTask:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete task.' }),
    };
  }
};
