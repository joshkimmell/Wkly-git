import { Handler } from '@netlify/functions';
// import supabase from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);


export const handler: Handler = async (event) => {
  // const body = JSON.parse(event.body || '{}');
  // const { id } = body;
  // const goalId = event.queryStringParameters?.goal_id;
  // const userId = event.queryStringParameters?.user_id;
  const { goal_id, user_id } = event.queryStringParameters || {};
  if (!goal_id || !user_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing goal_id or user_id' }),
    };
  }

  try {
    // First, delete related accomplishments
    const { error: accError } = await supabase
      .from('accomplishments')
      .delete()
      .eq('goal_id', goal_id);

    if (accError) {
      console.error('Supabase error:', accError.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: accError.message }),
      };
    }

    // Then, delete the goal
    const { error } = await supabase
      .from('goals')
      .delete()
      .match({ id: goal_id, user_id });

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
};