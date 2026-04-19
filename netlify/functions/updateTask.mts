import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, withCors, getUserTier, tierLimitResponse } from './lib/auth';

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

    // ── Tier check: active goal limit when activating a task ─────────────────
    // A goal becomes "active" when it has a task set to 'In progress' or given a scheduled_date.
    // Free users are limited to max_active_goals concurrently active goals.
    const isActivatingByStatus = status === 'In progress';
    const isActivatingBySchedule = scheduled_date !== undefined && scheduled_date !== null;
    if (isActivatingByStatus || isActivatingBySchedule) {
      const { limits } = await getUserTier(userId);
      if (limits.max_active_goals !== null) {
        // Fetch the current task to check its goal_id and existing state
        const { data: currentTask } = await supabase
          .from('tasks')
          .select('goal_id, status, scheduled_date')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();

        if (currentTask) {
          const alreadyInProgress = currentTask.status === 'In progress';
          const alreadyScheduled = !!currentTask.scheduled_date;
          // Only check if this action would NEW-LY activate the goal
          const wouldActivateGoal =
            (isActivatingByStatus && !alreadyInProgress) ||
            (isActivatingBySchedule && !alreadyScheduled);

          if (wouldActivateGoal) {
            // Check if this goal is already active (has other in-progress/scheduled tasks)
            const { data: activeTasksForGoal } = await supabase
              .from('tasks')
              .select('id')
              .eq('goal_id', currentTask.goal_id)
              .neq('id', id)
              .or('status.eq.In progress,scheduled_date.not.is.null');
            const goalAlreadyActive = (activeTasksForGoal ?? []).length > 0;

            if (!goalAlreadyActive) {
              // This would activate a new goal — count current active goals
              const { data: userGoalIds } = await supabase
                .from('goals')
                .select('id')
                .eq('user_id', userId);
              const goalIdList = (userGoalIds ?? []).map((g: { id: string }) => g.id);
              let activeCount = 0;
              if (goalIdList.length > 0) {
                const { data: activeTasks } = await supabase
                  .from('tasks')
                  .select('goal_id')
                  .in('goal_id', goalIdList)
                  .neq('id', id)
                  .or('status.eq.In progress,scheduled_date.not.is.null');
                activeCount = new Set((activeTasks ?? []).map((t: { goal_id: string }) => t.goal_id)).size;
              }
              if (activeCount >= limits.max_active_goals) {
                return tierLimitResponse(
                  `Free plan allows ${limits.max_active_goals} active goals at a time. Upgrade to work on more goals simultaneously.`
                );
              }
            }
          }
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────
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
