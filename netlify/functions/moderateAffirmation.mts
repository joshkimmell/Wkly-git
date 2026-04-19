import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';
import { requireAuth, withCors } from './lib/auth';

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', userId)
    .maybeSingle();

  return data?.is_admin === true || data?.email === 'jkimmell@gmail.com';
}

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
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { affirmationId, action } = body;

    if (!affirmationId || !action) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'affirmationId and action are required' }) };
    }

    const validActions = ['approve', 'reject', 'toggle_anonymous', 'delete'];
    if (!validActions.includes(action)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: `action must be one of: ${validActions.join(', ')}` }) };
    }

    // Handle delete
    if (action === 'delete') {
      const { error } = await supabase
        .from('affirmations')
        .delete()
        .eq('id', affirmationId);

      if (error) {
        console.error('Supabase error deleteAffirmation:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete affirmation' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ deleted: true }) };
    }

    // Handle toggle anonymous
    if (action === 'toggle_anonymous') {
      // Fetch current state
      const { data: current, error: fetchErr } = await supabase
        .from('affirmations')
        .select('id, is_anonymous, submitted_by, status')
        .eq('id', affirmationId)
        .single();

      if (fetchErr || !current) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Affirmation not found' }) };
      }

      const newAnonymous = !current.is_anonymous;
      const updateFields: any = {
        is_anonymous: newAnonymous,
        updated_at: new Date().toISOString(),
      };

      // Update author field based on new anonymous state (only if already approved)
      if (current.status === 'approved') {
        if (newAnonymous) {
          updateFields.author = null;
        } else if (current.submitted_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, email')
            .eq('id', current.submitted_by)
            .maybeSingle();
          updateFields.author = profile?.username || profile?.email || null;
        }
      }

      const { data, error } = await supabase
        .from('affirmations')
        .update(updateFields)
        .eq('id', affirmationId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error toggleAnonymous:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to toggle anonymous' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // Handle approve/reject
    const updateFields: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      updated_at: new Date().toISOString(),
    };

    // When approving a non-anonymous submission, set the author to the submitter's username/email
    if (action === 'approve') {
      const { data: aff } = await supabase
        .from('affirmations')
        .select('submitted_by, is_anonymous')
        .eq('id', affirmationId)
        .single();

      if (aff && !aff.is_anonymous && aff.submitted_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, email')
          .eq('id', aff.submitted_by)
          .maybeSingle();
        updateFields.author = profile?.username || profile?.email || null;
      }
    }

    const { data, error } = await supabase
      .from('affirmations')
      .update(updateFields)
      .eq('id', affirmationId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error moderateAffirmation:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to moderate affirmation' }) };
    }

    if (!data) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Affirmation not found' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err: any) {
    console.error('Unexpected error moderateAffirmation:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
});
