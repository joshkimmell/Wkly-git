import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    const body = event.body ? JSON.parse(event.body) : {};
    const goalIds: string[] = Array.isArray(body.goal_ids) ? body.goal_ids : [];

    if (!goalIds || goalIds.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing goal_ids in request body' }) };
    }

    // Limit number of ids to protect DB (reasonable default for UI batches)
    if (goalIds.length > 200) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Too many goal_ids requested' }) };
    }

    // Fallback to server-side Supabase client queries.
    // Fetch only `goal_id` for matching rows and count in JS to produce per-goal counts.
    const { data: noteRows, error: noteError } = await supabase
      .from('goal_notes')
      .select('goal_id')
      .in('goal_id', goalIds);

    if (noteError) {
      console.error('getCounts noteError', noteError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch note counts' }) };
    }

    const notes: Record<string, number> = {};
    for (const id of goalIds) notes[id] = 0;
    (noteRows || []).forEach((r: any) => { const gid = r?.goal_id; if (!gid) return; notes[gid] = (notes[gid] || 0) + 1; });

    const { data: accRows, error: accError } = await supabase
      .from('accomplishments')
      .select('goal_id')
      .in('goal_id', goalIds);

    if (accError) {
      console.error('getCounts accError', accError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch accomplishment counts' }) };
    }

    const accomplishments: Record<string, number> = {};
    for (const id of goalIds) accomplishments[id] = 0;
    (accRows || []).forEach((r: any) => { const gid = r?.goal_id; if (!gid) return; accomplishments[gid] = (accomplishments[gid] || 0) + 1; });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ notes, accomplishments }),
    };
  } catch (err: any) {
    console.error('Unexpected getCounts error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Unexpected error' }) };
  }
};
