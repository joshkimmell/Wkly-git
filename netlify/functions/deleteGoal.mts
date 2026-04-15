import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, withCors } from './lib/auth';

export const handler = withCors(async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  const { goal_id } = event.queryStringParameters || {};
  if (!goal_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing goal_id' }),
    };
  }

  try {
    // Verify the goal belongs to the authenticated user before deleting anything
    const { data: goal, error: fetchErr } = await supabase
      .from('goals')
      .select('id')
      .eq('id', goal_id)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !goal) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Goal not found' }),
      };
    }

    // Delete related accomplishments (ownership already verified above)
    const { error: accError } = await supabase
      .from('accomplishments')
      .delete()
      .eq('goal_id', goal_id)
      .eq('user_id', userId);

    if (accError) {
      console.error('Supabase error:', accError.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: accError.message }),
      };
    }

    // Delete the goal
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goal_id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error:', error.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Goal deleted successfully' }),
    };
  } catch (err: any) {
    console.error('Server error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
});
