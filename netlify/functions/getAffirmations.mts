import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, CORS_HEADERS } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;

  try {
    const category = event.queryStringParameters?.category;
    const page = parseInt(event.queryStringParameters?.page || '1', 10);
    const limit = Math.min(parseInt(event.queryStringParameters?.limit || '20', 10), 50);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('affirmations')
      .select('*', { count: 'exact' })
      .eq('status', 'approved')
      .order('featured_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error getAffirmations:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch affirmations' }) };
    }

    // Enrich author from submitter profile when missing and not anonymous
    const needsAuthor = (data || []).filter((a: any) => !a.author && !a.is_anonymous && a.submitted_by);
    if (needsAuthor.length > 0) {
      const ids = [...new Set(needsAuthor.map((a: any) => a.submitted_by))];
      const { data: profiles } = await supabase.from('profiles').select('id, username, email').in('id', ids);
      const profileMap: Record<string, string> = {};
      for (const p of profiles || []) {
        profileMap[p.id] = p.username || p.email || '';
      }
      for (const a of data || []) {
        if (!a.author && !a.is_anonymous && a.submitted_by && profileMap[a.submitted_by]) {
          a.author = profileMap[a.submitted_by];
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ affirmations: data, total: count, page, limit }),
    };
  } catch (err: any) {
    console.error('Unexpected error getAffirmations:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
