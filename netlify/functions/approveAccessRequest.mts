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
 * Admin-only endpoint to approve an access request
 * POST body: { requestId: string } or { email: string }
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
    const { requestId, email, notes } = body;

    if (!requestId && !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Either requestId or email is required' }),
      };
    }

    // Fetch the access request
    let query = adminClient.from('access_requests').select('*');
    
    if (requestId) {
      query = query.eq('id', requestId);
    } else {
      query = query.eq('email', email.trim().toLowerCase());
    }

    const { data: request, error: fetchError } = await query.maybeSingle();

    if (fetchError || !request) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Access request not found' }),
      };
    }

    // Update the access request status
    const { error: updateError } = await adminClient
      .from('access_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        notes: notes || null,
      })
      .eq('id', request.id);

    if (updateError) {
      console.error('[approveAccessRequest] Update error:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update access request' }),
      };
    }

    // Add email to approved_users table
    const { error: approveError } = await adminClient
      .from('approved_users')
      .upsert(
        {
          email: request.email,
          approved_at: new Date().toISOString(),
          approved_by: userId,
          invitation_method: 'admin_approval',
        },
        { onConflict: 'email' }
      );

    if (approveError) {
      console.error('[approveAccessRequest] Approve error:', approveError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to add to approved users' }),
      };
    }

    console.log('[approveAccessRequest] Approved:', { email: request.email, requestId: request.id });

    // Check if user already has a profile
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', request.email)
      .maybeSingle();

    // Send approval email only if user doesn't have a profile yet
    if (!existingProfile) {
      try {
        const appUrl = process.env.URL || 'https://wkly.netlify.app';
        
        await fetch(`${process.env.URL || 'https://wkly.netlify.app'}/api/sendEmail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.MAILER_API_KEY || '',
          },
          body: JSON.stringify({
            email: request.email,
            name: request.name || '',
            url: appUrl,
            type: 'approval',
          }),
        });

        console.log('[approveAccessRequest] Approval email sent to:', request.email);
      } catch (emailError) {
        console.error('[approveAccessRequest] Failed to send email:', emailError);
        // Don't fail the approval if email fails
      }
    } else {
      console.log('[approveAccessRequest] User already has profile, skipping email');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Access request approved successfully',
        email: request.email,
        hasExistingProfile: !!existingProfile,
      }),
    };
  } catch (err: any) {
    console.error('[approveAccessRequest] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
};
