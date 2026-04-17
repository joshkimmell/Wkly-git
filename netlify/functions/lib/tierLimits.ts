/**
 * Tier limit definitions for the 3-tier access system.
 *
 * FREE        — demonstrate value, build habit, drive upgrades
 * SUBSCRIPTION — $9.99/mo or $79.99/yr, full access
 * ONE_TIME    — $79.99 one-time, full access for 1 year of updates
 */

export type SubscriptionTier = 'free' | 'subscription' | 'one_time';

export interface TierLimits {
  max_active_goals: number | null;       // null = unlimited
  max_tasks_per_goal: number | null;
  task_scheduling_days: number | null;    // null = unlimited future scheduling
  plan_generations_per_goal: number | null;
  goal_refinements_per_day: number | null; // null = unlimited
  summaries_per_week: number | null;
  summary_scopes: string[];              // allowed scopes: 'week', 'month', 'year'
  affirmations: 'basic' | 'full';
  forgiveness: 'basic' | 'full';
  momentum_analytics: boolean;
  reflection_prompts: 'limited' | 'full';
  priority_support: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    max_active_goals: 3,
    max_tasks_per_goal: 6,
    task_scheduling_days: 7,
    plan_generations_per_goal: 1,
    goal_refinements_per_day: 3,
    summaries_per_week: 1,
    summary_scopes: ['week'],
    affirmations: 'basic',
    forgiveness: 'basic',
    momentum_analytics: false,
    reflection_prompts: 'limited',
    priority_support: false,
  },
  subscription: {
    max_active_goals: null,
    max_tasks_per_goal: null,
    task_scheduling_days: null,
    plan_generations_per_goal: null,
    goal_refinements_per_day: null,
    summaries_per_week: null,
    summary_scopes: ['week', 'month', 'year'],
    affirmations: 'full',
    forgiveness: 'full',
    momentum_analytics: true,
    reflection_prompts: 'full',
    priority_support: true,
  },
  one_time: {
    max_active_goals: null,
    max_tasks_per_goal: null,
    task_scheduling_days: null,
    plan_generations_per_goal: null,
    goal_refinements_per_day: null,
    summaries_per_week: null,
    summary_scopes: ['week', 'month', 'year'],
    affirmations: 'full',
    forgiveness: 'full',
    momentum_analytics: true,
    reflection_prompts: 'full',
    priority_support: false,
  },
};

/** Returns the Monday (ISO week start) of the current week as YYYY-MM-DD */
export function currentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split('T')[0];
}

/** Returns today's date as YYYY-MM-DD (UTC) */
export function currentDayStart(): string {
  return new Date().toISOString().split('T')[0];
}
