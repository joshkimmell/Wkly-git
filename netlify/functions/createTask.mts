import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, withCors, getUserTier, tierLimitResponse } from './lib/auth';

export const handler = withCors(async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  const body = JSON.parse(event.body || '{}');
  const { goal_id, title, description, status, scheduled_date, scheduled_time, reminder_enabled, reminder_datetime, order_index } = body;

  if (!goal_id || !title) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'goal_id and title are required.' }),
    };
  }

  // ── Tier check: free users limited to 6 tasks per goal + 7-day scheduling ──
  const { tier, limits } = await getUserTier(userId);
  if (limits.max_tasks_per_goal !== null) {
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('goal_id', goal_id)
      .eq('user_id', userId);
    if ((count ?? 0) >= limits.max_tasks_per_goal) {
      return tierLimitResponse(
        `Free plan is limited to ${limits.max_tasks_per_goal} tasks per goal. Upgrade to add more.`
      );
    }
  }
  if (limits.task_scheduling_days !== null && scheduled_date) {
    const schedDate = new Date(scheduled_date);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + limits.task_scheduling_days);
    if (schedDate > maxDate) {
      return tierLimitResponse(
        `Free plan can only schedule tasks within ${limits.task_scheduling_days} days. Upgrade for unlimited scheduling.`
      );
    }
  }

  try {
    const insertPayload: any = { 
      goal_id, 
      title, 
      user_id: userId,
      description: description || null,
      status: status || 'Not started',
      scheduled_date: scheduled_date || null,
      scheduled_time: scheduled_time || null,
      reminder_enabled: reminder_enabled || false,
      reminder_datetime: reminder_datetime || null,
      order_index: order_index || 0
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 201,
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    console.error('Unexpected error in createTask:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create task.' }),
    };
  }
});
