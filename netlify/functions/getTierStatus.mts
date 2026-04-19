import { createClient } from '@supabase/supabase-js';
import { requireAuth, withCors, getUserTier } from './lib/auth';
import { TIER_LIMITS, currentWeekStart, currentDayStart, type SubscriptionTier } from './lib/tierLimits';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Returns the authenticated user's tier info, limits, and current usage.
 * Used by the frontend TierContext for client-side gating.
 */
export const handler = withCors(async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  const tierInfo = await getUserTier(userId);
  const weekStart = currentWeekStart();
  const today = currentDayStart();

  // Fetch all usage for the current week
  const { data: usageRows } = await supabase
    .from('usage_tracking')
    .select('feature, count')
    .eq('user_id', userId)
    .eq('period_start', weekStart);

  const usage: Record<string, number> = {};
  for (const row of usageRows || []) {
    usage[row.feature] = row.count;
  }

  // Fetch daily usage (e.g. goal refinements)
  const { data: dailyUsageRows } = await supabase
    .from('usage_tracking')
    .select('feature, count')
    .eq('user_id', userId)
    .eq('period_start', today);

  const daily_usage: Record<string, number> = {};
  for (const row of dailyUsageRows || []) {
    daily_usage[row.feature] = row.count;
  }

  // Active goal count: goals that have at least one task "In progress" or with a scheduled_date
  const { data: userGoalIds } = await supabase
    .from('goals')
    .select('id')
    .eq('user_id', userId);

  const goalIdList = (userGoalIds ?? []).map((g: { id: string }) => g.id);
  let activeGoalCount = 0;
  if (goalIdList.length > 0) {
    const { data: activeTasks } = await supabase
      .from('tasks')
      .select('goal_id')
      .in('goal_id', goalIdList)
      .or('status.eq.In progress,scheduled_date.not.is.null');
    activeGoalCount = new Set((activeTasks ?? []).map((t: { goal_id: string }) => t.goal_id)).size;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      tier: tierInfo.tier,
      limits: tierInfo.limits,
      subscription_status: tierInfo.subscription_status,
      tier_expires_at: tierInfo.tier_expires_at,
      usage,
      daily_usage,
      active_goal_count: activeGoalCount,
    }),
  };
});
