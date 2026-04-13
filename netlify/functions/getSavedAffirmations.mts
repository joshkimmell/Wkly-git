import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const { data, error } = await supabase
      .from('saved_affirmations')
      .select(`
        id,
        saved_at,
        affirmation:affirmations (*)
      `)
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('Supabase error getSavedAffirmations:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch saved affirmations' }) };
    }

    // Enrich author from submitter profile when missing and not anonymous
    const affs = (data || []).map((s: any) => s.affirmation).filter(Boolean);
    const needsAuthor = affs.filter((a: any) => !a.author && !a.is_anonymous && a.submitted_by);
    if (needsAuthor.length > 0) {
      const ids = [...new Set(needsAuthor.map((a: any) => a.submitted_by))];
      const { data: profiles } = await supabase.from('profiles').select('id, username, email').in('id', ids);
      const profileMap: Record<string, string> = {};
      for (const p of profiles || []) {
        profileMap[p.id] = p.username || p.email || '';
      }
      for (const s of data || []) {
        const a = (s as any).affirmation;
        if (a && !a.author && !a.is_anonymous && a.submitted_by && profileMap[a.submitted_by]) {
          a.author = profileMap[a.submitted_by];
        }
      }
    }

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err: any) {
    console.error('Unexpected error getSavedAffirmations:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
