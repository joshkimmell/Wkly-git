import { getSessionToken } from '@utils/functions';
import type { Affirmation, AffirmationsPage, SavedAffirmation, AffirmationPreferences } from '../types/affirmations';

export async function fetchDailyAffirmation(): Promise<Affirmation> {
  const token = await getSessionToken();
  const localDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const res = await fetch(`/api/getDailyAffirmation?date=${localDate}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch daily affirmation');
  return res.json();
}

export async function fetchAffirmations(params?: {
  category?: string;
  page?: number;
  limit?: number;
}): Promise<AffirmationsPage> {
  const token = await getSessionToken();
  const search = new URLSearchParams();
  if (params?.category) search.set('category', params.category);
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));

  const res = await fetch(`/api/getAffirmations?${search}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch affirmations');
  return res.json();
}

export async function submitAffirmation(data: {
  text: string;
  category: string;
  is_anonymous: boolean;
}): Promise<Affirmation> {
  const token = await getSessionToken();
  const res = await fetch('/api/submitAffirmation', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Submit failed' }));
    throw new Error(err.error || 'Failed to submit');
  }
  return res.json();
}

export async function fetchSavedAffirmations(): Promise<SavedAffirmation[]> {
  const token = await getSessionToken();
  const res = await fetch('/api/getSavedAffirmations', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch saved affirmations');
  return res.json();
}

export async function toggleSaveAffirmation(
  affirmation_id: string,
  action: 'save' | 'unsave'
): Promise<{ saved: boolean }> {
  const token = await getSessionToken();
  const res = await fetch('/api/saveAffirmation', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ affirmation_id, action }),
  });
  if (!res.ok) throw new Error('Failed to toggle save');
  return res.json();
}

export async function fetchAffirmationPreferences(): Promise<AffirmationPreferences> {
  const token = await getSessionToken();
  const res = await fetch('/api/affirmationPreferences', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch preferences');
  return res.json();
}

export async function updateAffirmationPreferences(
  prefs: Partial<AffirmationPreferences>
): Promise<AffirmationPreferences> {
  const token = await getSessionToken();
  const res = await fetch('/api/affirmationPreferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error('Failed to update preferences');
  return res.json();
}

export async function fetchPendingAffirmations(status = 'pending'): Promise<Affirmation[]> {
  const token = await getSessionToken();
  const res = await fetch(`/api/getPendingAffirmations?status=${status}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch pending affirmations');
  return res.json();
}

export async function moderateAffirmation(
  affirmationId: string,
  action: 'approve' | 'reject' | 'toggle_anonymous' | 'delete'
): Promise<Affirmation> {
  const token = await getSessionToken();
  const res = await fetch('/api/moderateAffirmation', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ affirmationId, action }),
  });
  if (!res.ok) throw new Error(`Failed to ${action} affirmation`);
  return res.json();
}
