import { Handler } from '@netlify/functions';
import { v4 as uuidv4 } from 'uuid';
import supabase from './lib/supabase';
import { requireAuth, withCors, getUserTier, checkUsageLimit, incrementUsage, tierLimitResponse } from './lib/auth';

export const handler = withCors(async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const body = JSON.parse(event.body || '{}');
    const { content, summary_type, week_start, title } = body;

    if (!content || !summary_type || !week_start || !title) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields.' }),
      };
    }

    // ── Tier check: free users limited to 1 summary/week ──
    const { tier, limits } = await getUserTier(userId);
    if (limits.summaries_per_week !== null) {
      const withinLimit = await checkUsageLimit(userId, 'summary_generation', limits.summaries_per_week);
      if (!withinLimit) {
        return tierLimitResponse(
          `Free plan allows ${limits.summaries_per_week} summary per week. Upgrade for unlimited.`
        );
      }
    }

    const summary_id = uuidv4();

    const { data, error } = await supabase
      .from('summaries')
      .insert([{
        summary_id,
        user_id: userId,
        content,
        summary_type,
        week_start,
        title,
      }])
      .select('*')
      .single();

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    // Map summary_id to id and summary_type to type for frontend
    const mapped = {
      ...data,
      id: data.summary_id,
      type: data.summary_type,
    };

    // Track usage for free tier limits
    await incrementUsage(userId, 'summary_generation');

    return {
      statusCode: 200,
      body: JSON.stringify(mapped),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
});