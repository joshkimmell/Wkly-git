import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './lib/auth';

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

  return data?.is_admin === true || data?.email === 'jkimmell@gmail.com';
}

/**
 * Admin-only endpoint to get all approved users
 * GET /api/getApprovedUsers
 */
export const handler: Handler = async (event) => {
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
    // Fetch approved users with profile information
    const { data: approvedUsers, error } = await adminClient
      .from('approved_users')
      .select(`
        id,
        email,
        approved_at,
        approved_by,
        invitation_method,
        created_at
      `)
      .order('approved_at', { ascending: false });

    if (error) {
      console.error('[getApprovedUsers] Error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch approved users' }),
      };
    }

    // Get profile info for each user (to check if they've registered)
    const enrichedUsers = await Promise.all(
      (approvedUsers || []).map(async (user) => {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id, username, full_name')
          .eq('email', user.email)
          .maybeSingle();

        return {
          ...user,
          hasProfile: !!profile,
          profileId: profile?.id,
          username: profile?.username,
          fullName: profile?.full_name,
        };
      })
    );

    console.log('[getApprovedUsers] Fetched:', enrichedUsers.length, 'approved users');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(enrichedUsers),
    };
  } catch (err: any) {
    console.error('[getApprovedUsers] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
};
