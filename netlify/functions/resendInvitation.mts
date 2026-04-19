import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, withCors } from './lib/auth';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await adminClient
    .from('profiles')
    .select('is_admin, email')
    .eq('id', userId)
    .maybeSingle();

  return data?.is_admin === true || data?.email === 'jkimmell@gmail.com';
}

/**
 * Admin-only endpoint to resend an invitation magic link to an approved user.
 * POST body: { approvedUserId: string, email: string }
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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = await requireAuth(event);
  if (auth.error) return { ...auth.error, headers };
  const { userId } = auth;

  const adminCheck = await isAdmin(userId);
  if (!adminCheck) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: Admin access required' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { approvedUserId, email } = body;

    if (!approvedUserId || !email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'approvedUserId and email are required' }) };
    }

    // Verify this user exists in approved_users
    const { data: approvedUser, error: lookupError } = await adminClient
      .from('approved_users')
      .select('id, email')
      .eq('id', approvedUserId)
      .maybeSingle();

    if (lookupError || !approvedUser) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Approved user not found' }) };
    }

    const mailerApiKey = process.env.MAILER_API_KEY;
    if (!mailerApiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfigured: missing MAILER_API_KEY' }) };
    }

    // Generate a Supabase magic link (signup type for new users)
    const genUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/generate_link`;
    const genRes = await fetch(genUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({ type: 'magiclink', email }),
    });

    if (!genRes.ok) {
      const text = await genRes.text();
      console.error('[resendInvitation] Supabase generate_link error:', text);
      return { statusCode: 502, headers, body: JSON.stringify({ error: `Failed to generate magic link: ${text}` }) };
    }

    const genJson = await genRes.json();
    const actionLink = genJson?.action_link || genJson?.link || genJson?.url;
    if (!actionLink) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Supabase did not return an action link' }) };
    }

    // Send the invitation email
    const appUrl = process.env.URL || 'https://wkly.netlify.app';
    const emailRes = await fetch(`${appUrl}/api/sendEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': mailerApiKey,
      },
      body: JSON.stringify({
        email,
        name: '',
        url: actionLink,
        type: 'approval',
      }),
    });

    if (!emailRes.ok) {
      const text = await emailRes.text();
      console.error('[resendInvitation] Email send error:', text);
      return { statusCode: 502, headers, body: JSON.stringify({ error: `Failed to send email: ${text}` }) };
    }

    console.log('[resendInvitation] Magic link resent to:', email);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    console.error('[resendInvitation] Unexpected error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err?.message || 'Internal server error' }) };
  }
});
