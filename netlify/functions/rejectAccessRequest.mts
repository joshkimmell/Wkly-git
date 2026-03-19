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
 * Admin-only endpoint to reject an access request
 * POST body: { requestId: string, notes?: string }
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

  if (event.httpMethod !== 'POST') {
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
    const body = JSON.parse(event.body || '{}');
    const { requestId, notes } = body;

    if (!requestId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'requestId is required' }),
      };
    }

    // Update the access request status
    const { data, error } = await adminClient
      .from('access_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        notes: notes || null,
      })
      .eq('id', requestId)
      .select()
      .maybeSingle();

    if (error || !data) {
      console.error('[rejectAccessRequest] Error:', error);
      return {
        statusCode: error ? 500 : 404,
        headers,
        body: JSON.stringify({ error: error ? 'Failed to reject access request' : 'Access request not found' }),
      };
    }

    console.log('[rejectAccessRequest] Rejected:', { requestId, email: data.email });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Access request rejected',
        email: data.email,
      }),
    };
  } catch (err: any) {
    console.error('[rejectAccessRequest] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
};
