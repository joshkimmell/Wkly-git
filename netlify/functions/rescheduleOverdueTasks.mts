import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

/**
 * Finds all incomplete tasks with a scheduled_date before today
 * and updates their scheduled_date to today.
 */
export const handler: Handler = async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Find overdue, incomplete tasks
    const { data: overdue, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .not('status', 'eq', 'Done')
      .not('scheduled_date', 'is', null)
      .lt('scheduled_date', todayStr);

    if (fetchError) {
      console.error('Error fetching overdue tasks:', fetchError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: fetchError.message }),
      };
    }

    if (!overdue || overdue.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ rescheduled: 0 }),
      };
    }

    const ids = overdue.map((t) => t.id);

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ scheduled_date: todayStr })
      .in('id', ids)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error rescheduling overdue tasks:', updateError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: updateError.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ rescheduled: ids.length }),
    };
  } catch (err: any) {
    console.error('Unexpected error in rescheduleOverdueTasks:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to reschedule overdue tasks.' }),
    };
  }
};
