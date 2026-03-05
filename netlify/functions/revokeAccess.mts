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
 * Admin-only endpoint to revoke access for a user
 * POST body: { email: string } or { approvedUserId: string }
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
    const { email, approvedUserId } = body;

    if (!email && !approvedUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Either email or approvedUserId is required' }),
      };
    }

    // Delete from approved_users table
    let query = adminClient.from('approved_users').delete();
    
    if (approvedUserId) {
      query = query.eq('id', approvedUserId);
    } else {
      query = query.eq('email', email.trim().toLowerCase());
    }

    const { data, error } = await query.select();

    if (error) {
      console.error('[revokeAccess] Delete error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to revoke access' }),
      };
    }

    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Approved user not found' }),
      };
    }

    const revokedEmail = data[0].email;
    console.log('[revokeAccess] Revoked access for:', revokedEmail);

    // Reset the access request status back to pending
    const { error: resetError } = await adminClient
      .from('access_requests')
      .update({
        status: 'pending',
        reviewed_at: null,
        reviewed_by: null,
        notes: null,
      })
      .eq('email', revokedEmail);

    if (resetError) {
      console.error('[revokeAccess] Failed to reset access request:', resetError);
      // Don't fail the operation if reset fails, just log it
    } else {
      console.log('[revokeAccess] Reset access request to pending for:', revokedEmail);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Access revoked successfully',
        email: revokedEmail,
      }),
    };
  } catch (err: any) {
    console.error('[revokeAccess] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
};
