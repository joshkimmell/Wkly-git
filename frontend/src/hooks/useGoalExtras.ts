import { useState, useRef, useCallback } from 'react';
import supabase from '@lib/supabase';
import type { Accomplishment } from '@utils/goalUtils';
import { notifyError, notifySuccess } from '@components/ToastyNotification';

export default function useGoalExtras() {
  const [accomplishments, setAccomplishments] = useState<Accomplishment[]>([]);
  const [isAccomplishmentLoading, setIsAccomplishmentLoading] = useState(false);
  const [isAccomplishmentModalOpen, setIsAccomplishmentModalOpen] = useState(false);
  const [isEditAccomplishmentModalOpen, setIsEditAccomplishmentModalOpen] = useState(false);
  const [selectedAccomplishment, setSelectedAccomplishment] = useState<Accomplishment | null>(null);
  const [accomplishmentCountMap, setAccomplishmentCountMap] = useState<Record<string, number>>({});

  const [notes, setNotes] = useState<Array<{ id: string; content: string; created_at: string; updated_at: string }>>([]);
  const [notesCountMap, setNotesCountMap] = useState<Record<string, number>>({});
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  const userIdRef = useRef<string | null>(null);
  const userIdAttemptedRef = useRef<boolean>(false);
  const notesCountCacheRef = useRef<Record<string, { count: number; expiresAt: number }>>({});
  const accomplishmentsCountCacheRef = useRef<Record<string, { count: number; expiresAt: number }>>({});
  const inFlightNotesRef = useRef<Record<string, Promise<number | null>>>({});
  const inFlightAccomplishmentsRef = useRef<Record<string, Promise<number | null>>>({});
  const inFlightBatchRef = useRef<Record<string, Promise<{ notes: Record<string, number>; accomplishments: Record<string, number> } | null>>>({});
  const NOTES_COUNT_TTL_MS = 30 * 1000;
  const ACCOMPLISHMENT_COUNT_TTL_MS = 30 * 1000;

  const getCachedUserId = useCallback(async () => {
    if (userIdRef.current) return userIdRef.current;
    if (userIdAttemptedRef.current) return null; // avoid repeated failing attempts
    try {
      userIdAttemptedRef.current = true;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userIdRef.current = user.id;
        return user.id;
      }
      return null;
    } catch (e) {
      // network or auth failure; mark attempted to prevent repeated calls
      userIdAttemptedRef.current = true;
      return null;
    }
  }, []);

  const fetchNotesCount = useCallback(async (goalId?: string) => {
    const idToUse = goalId;
    if (!idToUse) return null;
    if (typeof idToUse === 'string' && idToUse.startsWith('temp-')) {
      // treat temp goals as zero without updating maps
      return 0;
    }
    const cached = notesCountCacheRef.current[idToUse];
    if (cached && cached.expiresAt > Date.now()) {
      // only update map if changed
      setNotesCountMap((s) => (s[idToUse] === cached.count ? s : ({ ...s, [idToUse]: cached.count })));
      return cached.count;
    }

    // dedupe in-flight requests
    const existing = inFlightNotesRef.current[idToUse];
    if (existing) return await existing;

    const promise = (async () => {
      try {
        const userId = await getCachedUserId();
        if (!userId) return null;
        const res = await fetch(`/api/getNotes?goal_id=${idToUse}&count_only=1`, { headers: { Authorization: `Bearer ${userId}` } });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        const count = typeof json?.count === 'number' ? json.count : Number(json) || 0;
        notesCountCacheRef.current[idToUse] = { count, expiresAt: Date.now() + NOTES_COUNT_TTL_MS };
        setNotesCountMap((s) => (s[idToUse] === count ? s : ({ ...s, [idToUse]: count })));
        return count;
      } catch (err) {
        console.error('useGoalExtras.fetchNotesCount error', err);
        return null;
      } finally {
        try { delete inFlightNotesRef.current[idToUse]; } catch (e) { /* ignore */ }
      }
    })();

    inFlightNotesRef.current[idToUse] = promise;
    return await promise;
  }, [getCachedUserId]);

  const fetchAccomplishmentsCount = useCallback(async (goalId?: string) => {
    const idToUse = goalId;
    if (!idToUse) return null;
    const cached = accomplishmentsCountCacheRef.current[idToUse];
    if (cached && cached.expiresAt > Date.now()) {
      setAccomplishmentCountMap((s) => (s[idToUse] === cached.count ? s : ({ ...s, [idToUse]: cached.count })));
      return cached.count;
    }

    const existing = inFlightAccomplishmentsRef.current[idToUse];
    if (existing) return await existing;

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('accomplishments')
          .select('id,goal_id')
          .eq('goal_id', idToUse);
        if (error) throw error;
        const count = (data && Array.isArray(data) ? data.length : 0) as number;
        accomplishmentsCountCacheRef.current[idToUse] = { count, expiresAt: Date.now() + ACCOMPLISHMENT_COUNT_TTL_MS };
        setAccomplishmentCountMap((s) => (s[idToUse] === count ? s : ({ ...s, [idToUse]: count })));
        return count;
      } catch (err) {
        console.error('useGoalExtras.fetchAccomplishmentsCount error', err);
        return null;
      } finally {
        try { delete inFlightAccomplishmentsRef.current[idToUse]; } catch (e) { /* ignore */ }
      }
    })();

    inFlightAccomplishmentsRef.current[idToUse] = promise;
    return await promise;
  }, []);

  const fetchCountsForMany = useCallback(async (goalIds: string[]) => {
    if (!Array.isArray(goalIds) || goalIds.length === 0) return null;
    // normalize key for deduping concurrent identical batch requests
    const key = [...goalIds].sort().join(',');
    const existing = inFlightBatchRef.current[key];
    if (existing) return await existing;
    try {
      const promise = (async () => {
        const res = await fetch('/api/getCounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal_ids: goalIds }) });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();

        const notes: Record<string, number> = json?.notes || {};
        const accomplishments: Record<string, number> = json?.accomplishments || {};

        const now = Date.now();

        setNotesCountMap((s) => {
          const next = { ...s };
          for (const id of goalIds) {
            const count = typeof notes[id] === 'number' ? notes[id] : (next[id] ?? 0);
            notesCountCacheRef.current[id] = { count, expiresAt: now + NOTES_COUNT_TTL_MS };
            next[id] = count;
          }
          return next;
        });

        setAccomplishmentCountMap((s) => {
          const next = { ...s };
          for (const id of goalIds) {
            const count = typeof accomplishments[id] === 'number' ? accomplishments[id] : (next[id] ?? 0);
            accomplishmentsCountCacheRef.current[id] = { count, expiresAt: now + ACCOMPLISHMENT_COUNT_TTL_MS };
            next[id] = count;
          }
          return next;
        });

        return { notes, accomplishments };
      })();

      inFlightBatchRef.current[key] = promise;
      const json = await promise;
      delete inFlightBatchRef.current[key];
      return json;
    } catch (err) {
      console.error('useGoalExtras.fetchCountsForMany error', err);
      return null;
    }
  }, []);

  const fetchAccomplishments = useCallback(async (goalId?: string) => {
    try {
      const idToUse = goalId;
      if (!idToUse) return;
      if (typeof idToUse === 'string' && idToUse.startsWith('temp-')) {
        setAccomplishments([]);
        return;
      }
      setIsAccomplishmentLoading(true);
      const { data, error } = await supabase
        .from('accomplishments')
        .select('*')
        .eq('goal_id', idToUse)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAccomplishments(data || []);
    } catch (err) {
      console.error('useGoalExtras.fetchAccomplishments error', err);
    } finally {
      setIsAccomplishmentLoading(false);
    }
  }, []);

  const deleteAccomplishment = useCallback(async (id: string, goalId?: string) => {
    try {
      setIsAccomplishmentLoading(true);
      const { error } = await supabase.from('accomplishments').delete().eq('id', id);
      if (error) throw error;
      if (goalId) {
        // Use centralized refresh helper to keep behavior consistent
        await refreshAccomplishmentsAndCount(goalId);
        // decrement count (update cache/state only if changed) -- helpers already attempt to set accurate count,
        // but keep this conservative decrement to preserve optimistic UX in case the server removes immediately
        setAccomplishmentCountMap((s) => {
          const prev = s[goalId] ?? 0;
          const next = Math.max(0, prev - 1);
          accomplishmentsCountCacheRef.current[goalId] = { count: next, expiresAt: Date.now() + ACCOMPLISHMENT_COUNT_TTL_MS };
          return s[goalId] === next ? s : { ...s, [goalId]: next };
        });
      }
    } catch (err) {
      console.error('useGoalExtras.deleteAccomplishment error', err);
    } finally {
      setIsAccomplishmentLoading(false);
    }
  }, [fetchAccomplishments]);

  const createAccomplishment = useCallback(async (goalId: string, payload: { title: string; description?: string; impact?: string }) => {
    const { title, description, impact } = payload;
    const tempId = `temp-${Date.now()}`;
    const temp = { id: tempId, title, description, impact: impact || '', created_at: new Date().toISOString() } as Accomplishment;
    setAccomplishments((s) => [temp, ...s]);
    setIsAccomplishmentLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase.from('accomplishments').insert({
        title,
        description,
        impact: impact || null,
        goal_id: goalId,
        user_id: user.id,
      }).select();
      if (error) throw error;
      // Refresh list and counts via centralized helper
      await refreshAccomplishmentsAndCount(goalId);
      // bump count optimistically
      setAccomplishmentCountMap((s) => {
        const next = (s[goalId] ?? 0) + 1;
        accomplishmentsCountCacheRef.current[goalId] = { count: next, expiresAt: Date.now() + ACCOMPLISHMENT_COUNT_TTL_MS };
        return s[goalId] === next ? s : { ...s, [goalId]: next };
      });
    } catch (err) {
      console.error('useGoalExtras.createAccomplishment error', err);
      setAccomplishments((s) => s.filter((a) => a.id !== tempId));
    } finally {
      setIsAccomplishmentLoading(false);
    }
  }, [fetchAccomplishments]);

  const saveEditedAccomplishment = useCallback(async (accomplishmentId: string, updated: { title?: string; description?: string; impact?: string }, goalId?: string) => {
    try {
      setIsAccomplishmentLoading(true);
      const { error } = await supabase
        .from('accomplishments')
        .update({
          title: updated.title,
          description: updated.description && updated.description.trim() ? updated.description : null,
          impact: updated.impact || null,
        })
        .eq('id', accomplishmentId);
      if (error) throw error;
      if (goalId) await fetchAccomplishments(goalId);
      notifySuccess('Accomplishment updated successfully.');
    } catch (err) {
      console.error('useGoalExtras.saveEditedAccomplishment error', err);
      notifyError('Error saving edited accomplishment.');
    } finally {
      setIsAccomplishmentLoading(false);
    }
  }, [fetchAccomplishments]);

  const openAccomplishments = useCallback((goal: any) => {
    setIsAccomplishmentModalOpen(true);
    fetchAccomplishments(goal?.id);
    // fetch count so badges are accurate
    fetchAccomplishmentsCount(goal?.id).catch(() => {});
  }, [fetchAccomplishments]);

  const closeAccomplishments = useCallback(() => {
    setIsAccomplishmentModalOpen(false);
    setAccomplishments([]);
    setSelectedAccomplishment(null);
  }, []);

  // Notes
  const fetchNotes = useCallback(async (goalId?: string) => {
    try {
      const idToUse = goalId;
      if (!idToUse) return;
      if (typeof idToUse === 'string' && idToUse.startsWith('temp-')) {
        setNotes([]);
        return;
      }
      setIsNotesLoading(true);
      const userId = await getCachedUserId();
      if (!userId) return;
      const res = await fetch(`/api/getNotes?goal_id=${idToUse}`, { headers: { Authorization: `Bearer ${userId}` } });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setNotes(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error('useGoalExtras.fetchNotes error', err);
    } finally {
      setIsNotesLoading(false);
    }
  }, [getCachedUserId]);

  const openNotes = useCallback(async (goal: any) => {
    setIsNotesModalOpen(true);
    setIsNotesLoading(true);
    try {
      await fetchNotes(goal?.id);
      await fetchNotesCount(goal?.id);
    } catch (err) {
      console.error('useGoalExtras.openNotes error', err);
    } finally {
      setIsNotesLoading(false);
    }
  }, [fetchNotes, fetchNotesCount]);

  // Helper: refresh notes list and count for a goal (centralized to avoid duplication)
  const refreshNotesAndCount = useCallback(async (goalId?: string) => {
    if (!goalId) return;
    try {
      await fetchNotes(goalId);
    } catch (e) {
      // ignore individual failure; still attempt count
    }
    try {
      await fetchNotesCount(goalId);
    } catch (e) {
      // ignore
    }
  }, [fetchNotes, fetchNotesCount]);

  const closeNotes = useCallback(() => {
    setIsNotesModalOpen(false);
    setNotes([]);
    setNewNoteContent('');
    setEditingNoteContent('');
    setEditingNoteId(null);
  }, []);

  const createNote = useCallback(async (goalId?: string) => {
    if (!newNoteContent.trim() || !goalId) return;
    setIsNotesLoading(true);
    const tempId = `temp-${Date.now()}`;
    const tempNote = { id: tempId, content: newNoteContent, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setNotes((s) => [tempNote, ...s]);
    setNewNoteContent('');
    try {
      const userId = await getCachedUserId();
      if (!userId) throw new Error('Not authenticated');
      const res = await fetch('/api/createNote', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userId}` }, body: JSON.stringify({ goal_id: goalId, content: tempNote.content }) });
      if (!res.ok) throw new Error(await res.text());
      // Use centralized helper to refresh notes and count
      await refreshNotesAndCount(goalId);
    } catch (err) {
      console.error('useGoalExtras.createNote error', err);
      setNotes((s) => s.filter((n) => n.id !== tempId));
    } finally {
      setIsNotesLoading(false);
    }
  }, [getCachedUserId, newNoteContent, fetchNotes, fetchNotesCount]);

  const updateNote = useCallback(async (noteId: string, content: string, goalId?: string) => {
    try {
      const userId = await getCachedUserId();
      if (!userId) throw new Error('Not authenticated');
      const res = await fetch('/api/updateNote', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userId}` }, body: JSON.stringify({ id: noteId, content }) });
      if (!res.ok) throw new Error(await res.text());
      if (goalId) await refreshNotesAndCount(goalId);
    } catch (err) {
      console.error('useGoalExtras.updateNote error', err);
    }
  }, [getCachedUserId, fetchNotes, fetchNotesCount]);

  const deleteNote = useCallback(async (noteId: string, goalId?: string) => {
    try {
      setIsNotesLoading(true);
      const userId = await getCachedUserId();
      if (!userId) throw new Error('Not authenticated');
      const res = await fetch(`/api/deleteNote?note_id=${noteId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${userId}` } });
      if (!res.ok) throw new Error(await res.text());
      if (goalId) await refreshNotesAndCount(goalId);
    } catch (err) {
      console.error('useGoalExtras.deleteNote error', err);
    } finally {
      setIsNotesLoading(false);
    }
  }, [getCachedUserId, fetchNotes, fetchNotesCount]);

  const bumpNotesCount = useCallback((goalId?: string) => {
    if (!goalId) return;
    setNotesCountMap((s) => {
      const next = (s[goalId] ?? 0) + 1;
      notesCountCacheRef.current[goalId] = { count: next, expiresAt: Date.now() + NOTES_COUNT_TTL_MS };
      return s[goalId] === next ? s : { ...s, [goalId]: next };
    });
  }, []);

  const decrementNotesCount = useCallback((goalId?: string) => {
    if (!goalId) return;
    setNotesCountMap((s) => {
      const prev = s[goalId] ?? 0;
      const next = Math.max(0, prev - 1);
      notesCountCacheRef.current[goalId] = { count: next, expiresAt: Date.now() + NOTES_COUNT_TTL_MS };
      return s[goalId] === next ? s : { ...s, [goalId]: next };
    });
  }, []);

  // Helper: refresh accomplishments list and count for a goal
  const refreshAccomplishmentsAndCount = useCallback(async (goalId?: string) => {
    if (!goalId) return;
    try {
      await fetchAccomplishments(goalId);
    } catch (e) {
      // ignore
    }
    try {
      await fetchAccomplishmentsCount(goalId);
    } catch (e) {
      // ignore
    }
  }, [fetchAccomplishments, fetchAccomplishmentsCount]);

  return {
    accomplishments,
    accomplishmentCountMap,
    isAccomplishmentLoading,
    isAccomplishmentModalOpen,
    isEditAccomplishmentModalOpen,
    selectedAccomplishment,
    setSelectedAccomplishment,
    setIsEditAccomplishmentModalOpen,
    fetchAccomplishments,
    deleteAccomplishment,
    createAccomplishment,
    saveEditedAccomplishment,
    openAccomplishments,
    closeAccomplishments,
    fetchAccomplishmentsCount,
    fetchCountsForMany,

  notes,
  notesCountMap,
    isNotesLoading,
    isNotesModalOpen,
    newNoteContent,
    setNewNoteContent,
    editingNoteId,
    setEditingNoteId,
    editingNoteContent,
    setEditingNoteContent,
    fetchNotes,
    openNotes,
    closeNotes,
    createNote,
    updateNote,
    deleteNote,
    fetchNotesCount,
    refreshNotesAndCount,
    refreshAccomplishmentsAndCount,
    bumpNotesCount,
    decrementNotesCount,
  };
}
