import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Public endpoint for users to request access to Wkly.
 * No authentication required - this is for prospective users.
 */
export const handler = withCors(async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, name, message } = body;

    if (!email || typeof email !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' }),
      };
    }

    // Check if email already has a pending or approved request
    const { data: existingRequest } = await adminClient
      .from('access_requests')
      .select('id, status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: 'An access request for this email is already pending review',
            status: 'pending',
          }),
        };
      }
      if (existingRequest.status === 'approved') {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: 'This email has already been approved. You can register now!',
            status: 'approved',
          }),
        };
      }
      // If rejected, allow resubmission
    }

    // Check if email is already in approved_users (might have been pre-approved)
    const { data: approvedUser } = await adminClient
      .from('approved_users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (approvedUser) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'This email is already approved. You can register now!',
          status: 'approved',
        }),
      };
    }

    // Insert or update the access request
    const { data, error } = await adminClient
      .from('access_requests')
      .upsert(
        {
          email: normalizedEmail,
          name: name?.trim() || null,
          message: message?.trim() || null,
          status: 'pending',
          requested_at: new Date().toISOString(),
        },
        {
          onConflict: 'email',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[requestAccess] Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to submit access request' }),
      };
    }

    console.log('[requestAccess] Request created:', { email: normalizedEmail, id: data?.id });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Access request submitted successfully',
        id: data?.id,
      }),
    };
  } catch (err: any) {
    console.error('[requestAccess] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
});
