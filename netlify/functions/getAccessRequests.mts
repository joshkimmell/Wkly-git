import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, withCors } from './lib/auth';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Check if a user is an admin by looking up their profile
 */
async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await adminClient
    .from('profiles')
    .select('is_admin, email')
    .eq('id', userId)
    .maybeSingle();

  // Allow by profile flag or hardcoded admin email as fallback
  return data?.is_admin === true || data?.email === 'jkimmell@gmail.com';
}

/**
 * Admin-only endpoint to fetch access requests
 * Query params: status (optional: pending/approved/rejected/all)
 */
export const handler = withCors(async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Authenticate user
  const auth = await requireAuth(event);
  if (auth.error) return { ...auth.error, headers };
  const { userId } = auth;

  // Check if user is admin
  const adminCheck = await isAdmin(userId);
  if (!adminCheck) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden: Admin access required' }),
    };
  }

  try {
    const status = event.queryStringParameters?.status || 'pending';
    
    let query = adminClient
      .from('access_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    // Filter by status unless 'all' is requested
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getAccessRequests] Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch access requests' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data || []),
    };
  } catch (err: any) {
    console.error('[getAccessRequests] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
});
