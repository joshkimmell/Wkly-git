import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', userId)
    .maybeSingle();

  return data?.is_admin === true || data?.email === 'jkimmell@gmail.com';
}

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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = await requireAuth(event);
  if (auth.error) return { ...auth.error, headers };
  const { userId } = auth;

  const adminCheck = await isAdmin(userId);
  if (!adminCheck) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
  }

  try {
    const status = event.queryStringParameters?.status || 'pending';

    let query = supabase
      .from('affirmations')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error getPendingAffirmations:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch affirmations' }) };
    }

    // Look up submitter profiles for display
    const submitterIds = [...new Set((data || []).map((a: any) => a.submitted_by).filter(Boolean))];
    let profileMap: Record<string, { username: string | null; email: string | null }> = {};
    if (submitterIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', submitterIds);
      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = { username: p.username, email: p.email };
        }
      }
    }

    const enriched = (data || []).map((aff: any) => ({
      ...aff,
      submitter_username: profileMap[aff.submitted_by]?.username || null,
      submitter_email: profileMap[aff.submitted_by]?.email || null,
    }));

    return { statusCode: 200, headers, body: JSON.stringify(enriched) };
  } catch (err: any) {
    console.error('Unexpected error getPendingAffirmations:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
