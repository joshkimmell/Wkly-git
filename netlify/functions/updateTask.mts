import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, withCors } from './lib/auth';

export const handler = withCors(async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  const body = JSON.parse(event.body || '{}');
  const { id, title, description, status, scheduled_date, scheduled_time, reminder_enabled, reminder_datetime, order_index, notes, closing_rationale } = body;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Task id is required.' }),
    };
  }

  try {
    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (status !== undefined) updatePayload.status = status;
    if (scheduled_date !== undefined) updatePayload.scheduled_date = scheduled_date;
    if (scheduled_time !== undefined) updatePayload.scheduled_time = scheduled_time;
    if (reminder_enabled !== undefined) updatePayload.reminder_enabled = reminder_enabled;
    if (reminder_datetime !== undefined) updatePayload.reminder_datetime = reminder_datetime;
    if (order_index !== undefined) updatePayload.order_index = order_index;
    if (notes !== undefined) updatePayload.notes = notes;
    if (closing_rationale !== undefined) updatePayload.closing_rationale = closing_rationale;

    console.log('updateTask payload:', { id, userId, updatePayload });

    const { data, error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    console.error('Unexpected error in updateTask:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update task.' }),
    };
  }
});
