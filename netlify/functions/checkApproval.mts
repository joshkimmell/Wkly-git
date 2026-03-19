import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Public endpoint to check if an email is approved for registration
 * Query param: email
 */
export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  try {
    const email = event.queryStringParameters?.email;

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email parameter is required' }),
      };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is in approved_users table
    const { data: approvedUser } = await adminClient
      .from('approved_users')
      .select('id, approved_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (approvedUser) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          approved: true,
          message: 'Email is approved for registration',
        }),
      };
    }

    // Check if there's a pending request
    const { data: pendingRequest } = await adminClient
      .from('access_requests')
      .select('id, status')
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingRequest) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          approved: false,
          pending: true,
          message: 'Access request is pending review',
        }),
      };
    }

    // Not approved and no pending request
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        approved: false,
        pending: false,
        message: 'Email is not approved for registration',
      }),
    };
  } catch (err: any) {
    console.error('[checkApproval] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
};
