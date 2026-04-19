import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { TIER_LIMITS, currentWeekStart, currentDayStart, type SubscriptionTier, type TierLimits } from './tierLimits';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Shared admin client used only for JWT verification — never passed to callers
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

type AuthSuccess = { userId: string; error: null };
type AuthFailure = { userId: null; error: { statusCode: number; headers: Record<string, string>; body: string } };
export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Returns the verified userId, or a ready-to-return error response.
 * Also handles CORS preflight (OPTIONS) automatically.
 *
 * Usage:
 *   const auth = await requireAuth(event);
 *   if (auth.error) return auth.error;
 *   const { userId } = auth;
 */
export async function requireAuth(event: HandlerEvent): Promise<AuthResult> {
  // Handle CORS preflight — return early before any auth logic
  if (event.httpMethod === 'OPTIONS') {
    return {
      userId: null,
      error: { statusCode: 204, headers: CORS_HEADERS, body: '' },
    };
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s*/i, '').trim();

  if (!token) {
    return {
      userId: null,
      error: { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) },
    };
  }

  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token);

  if (error || !user) {
    return {
      userId: null,
      error: { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) },
    };
  }

  return { userId: user.id, error: null };
}

/**
 * Higher-order function that wraps a Netlify handler to automatically:
 * - Handle CORS preflight OPTIONS requests (returns 204 with CORS headers)
 * - Inject `Access-Control-Allow-Origin: *` into ALL responses
 *
 * Usage:
 *   export const handler = withCors(async (event) => { ... });
 */
export function withCors(fn: Handler): Handler {
  return async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }
    const response = (await fn(event, context)) as HandlerResponse;
    response.headers = { ...CORS_HEADERS, ...(response.headers ?? {}) };
    return response;
  };
}

// ── Tier helpers ───────────────────────────────────────────────────────

export interface UserTierInfo {
  tier: SubscriptionTier;
  limits: TierLimits;
  subscription_status: string | null;
  tier_expires_at: string | null;
}

/**
 * Looks up a user's subscription tier from the profiles table.
 * Returns the tier, its limits, and status metadata.
 */
export async function getUserTier(userId: string): Promise<UserTierInfo> {
  const { data, error } = await adminClient
    .from('profiles')
    .select('subscription_tier, subscription_status, tier_expires_at, is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    // Default to free if profile not found
    return { tier: 'free', limits: TIER_LIMITS.free, subscription_status: null, tier_expires_at: null };
  }

  // Admins always get full subscription access
  if (data.is_admin === true) {
    return { tier: 'subscription', limits: TIER_LIMITS.subscription, subscription_status: 'active', tier_expires_at: null };
  }

  let tier: SubscriptionTier = (data.subscription_tier as SubscriptionTier) || 'free';

  // Check if one_time tier has expired
  if (tier === 'one_time' && data.tier_expires_at) {
    if (new Date(data.tier_expires_at) < new Date()) {
      tier = 'free';
    }
  }

  // Check if subscription is in a non-active state
  if (tier === 'subscription' && data.subscription_status && !['active', 'trialing'].includes(data.subscription_status)) {
    tier = 'free';
  }

  return {
    tier,
    limits: TIER_LIMITS[tier],
    subscription_status: data.subscription_status,
    tier_expires_at: data.tier_expires_at,
  };
}

/**
 * Check whether a user has exceeded a usage limit for a given feature in the current week.
 * Returns true if still within limit, false if at/over limit.
 */
export async function checkUsageLimit(userId: string, feature: string, limit: number | null): Promise<boolean> {
  // null limit = unlimited
  if (limit === null) return true;

  const weekStart = currentWeekStart();

  const { data, error } = await adminClient
    .from('usage_tracking')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('period_start', weekStart)
    .maybeSingle();

  if (error) {
    console.error('[checkUsageLimit] error:', error);
    return true; // fail open — don't block on DB errors
  }

  const current = data?.count ?? 0;
  return current < limit;
}

/**
 * Increment the usage counter for a feature in the current week.
 * Uses upsert (insert on conflict update) to avoid race conditions.
 */
export async function incrementUsage(userId: string, feature: string): Promise<void> {
  const weekStart = currentWeekStart();

  const { error } = await adminClient.rpc('increment_usage', {
    p_user_id: userId,
    p_feature: feature,
    p_period_start: weekStart,
  });

  // Fallback to manual upsert if RPC doesn't exist
  if (error) {
    const { data: existing } = await adminClient
      .from('usage_tracking')
      .select('id, count')
      .eq('user_id', userId)
      .eq('feature', feature)
      .eq('period_start', weekStart)
      .maybeSingle();

    if (existing) {
      await adminClient
        .from('usage_tracking')
        .update({ count: existing.count + 1, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await adminClient
        .from('usage_tracking')
        .insert({ user_id: userId, feature, period_start: weekStart, count: 1 });
    }
  }
}

/** Build a 403 response for tier limit violations */
export function tierLimitResponse(message: string) {
  return {
    statusCode: 403,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'tier_limit', message }),
  };
}

/**
 * Check whether a user has exceeded a usage limit for a given feature today.
 * Returns true if still within limit, false if at/over limit.
 */
export async function checkDailyUsageLimit(userId: string, feature: string, limit: number | null): Promise<boolean> {
  if (limit === null) return true;
  const today = currentDayStart();
  const { data, error } = await adminClient
    .from('usage_tracking')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('period_start', today)
    .maybeSingle();
  if (error) {
    console.error('[checkDailyUsageLimit] error:', error);
    return true; // fail open
  }
  return (data?.count ?? 0) < limit;
}

/**
 * Increment the daily usage counter for a feature (uses today's date as period).
 */
export async function incrementDailyUsage(userId: string, feature: string): Promise<void> {
  const today = currentDayStart();
  const { error } = await adminClient.rpc('increment_usage', {
    p_user_id: userId,
    p_feature: feature,
    p_period_start: today,
  });
  if (error) {
    const { data: existing } = await adminClient
      .from('usage_tracking')
      .select('id, count')
      .eq('user_id', userId)
      .eq('feature', feature)
      .eq('period_start', today)
      .maybeSingle();
    if (existing) {
      await adminClient
        .from('usage_tracking')
        .update({ count: existing.count + 1, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await adminClient
        .from('usage_tracking')
        .insert({ user_id: userId, feature, period_start: today, count: 1 });
    }
  }
}
