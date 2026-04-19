import { useContext } from 'react';
import { TierContext, type TierContextValue } from '@context/TierContext';

export function useTier(): TierContextValue & {
  canCreateGoal: boolean;
  canGeneratePlan: boolean;
  canCreateSummary: boolean;
  canUseFocusChat: boolean;
  canRefineGoal: boolean;
  remainingGoals: number | null;
} {
  const ctx = useContext(TierContext);
  const { status, isFree } = ctx;
  const { limits, usage, active_goal_count, daily_usage } = status;

  const canCreateGoal =
    limits.max_active_goals === null || active_goal_count < limits.max_active_goals;

  const canGeneratePlan =
    limits.plan_generations_per_goal === null ||
    (usage.plan_generation ?? 0) < limits.plan_generations_per_goal;

  const canCreateSummary =
    limits.summaries_per_week === null ||
    (usage.summary_generation ?? 0) < limits.summaries_per_week;

  const canUseFocusChat = !isFree;

  const canRefineGoal =
    limits.goal_refinements_per_day === null ||
    (daily_usage?.goal_refinement ?? 0) < limits.goal_refinements_per_day;

  const remainingGoals =
    limits.max_active_goals === null
      ? null
      : Math.max(0, limits.max_active_goals - active_goal_count);

  return {
    ...ctx,
    canCreateGoal,
    canGeneratePlan,
    canCreateSummary,
    canUseFocusChat,
    canRefineGoal,
    remainingGoals,
  };
}
