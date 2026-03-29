import { useState, useRef, useCallback } from 'react';
import supabase from '@lib/supabase';
import type { Win } from '@utils/goalUtils';
import { notifyError, notifySuccess } from '@components/ToastyNotification';

export default function useGoalExtras() {
  const [wins, setWins] = useState<Win[]>([]);
  const [isWinLoading, setIsWinLoading] = useState(false);
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);
  const [isEditWinModalOpen, setIsEditWinModalOpen] = useState(false);
  const [selectedWin, setSelectedWin] = useState<Win | null>(null);
  const [winCountMap, setWinCountMap] = useState<Record<string, number>>({});

  const [notes, setNotes] = useState<Array<{ id: string; content: string; created_at: string; updated_at: string }>>([]);
  const [notesCountMap, setNotesCountMap] = useState<Record<string, number>>({});
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  
  const [tasksCountMap, setTasksCountMap] = useState<Record<string, number>>({});

  const userIdRef = useRef<string | null>(null);
  const userIdAttemptedRef = useRef<boolean>(false);
  const notesCountCacheRef = useRef<Record<string, { count: number; expiresAt: number }>>({});
  const winsCountCacheRef = useRef<Record<string, { count: number; expiresAt: number }>>({});
  const tasksCountCacheRef = useRef<Record<string, { count: number; expiresAt: number }>>({});
  const inFlightNotesRef = useRef<Record<string, Promise<number | null>>>({});
  const inFlightWinsRef = useRef<Record<string, Promise<number | null>>>({});
  const inFlightBatchRef = useRef<Record<string, Promise<{ notes: Record<string, number>; wins: Record<string, number> } | null>>>({});
  const NOTES_COUNT_TTL_MS = 30 * 1000;
  const WIN_COUNT_TTL_MS = 30 * 1000;
  const TASKS_COUNT_TTL_MS = 30 * 1000;

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

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    } catch (e) {
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
        const token = await getToken();
        if (!token) return null;
        const res = await fetch(`/api/getNotes?goal_id=${idToUse}&count_only=1`, { headers: { Authorization: `Bearer ${token}` } });
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

  const fetchWinsCount = useCallback(async (goalId?: string) => {
    const idToUse = goalId;
    if (!idToUse) return null;
    const cached = winsCountCacheRef.current[idToUse];
    if (cached && cached.expiresAt > Date.now()) {
      setWinCountMap((s) => (s[idToUse] === cached.count ? s : ({ ...s, [idToUse]: cached.count })));
      return cached.count;
    }

    const existing = inFlightWinsRef.current[idToUse];
    if (existing) return await existing;

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('accomplishments')
          .select('id,goal_id')
          .eq('goal_id', idToUse);
        if (error) throw error;
        const count = (data && Array.isArray(data) ? data.length : 0) as number;
        winsCountCacheRef.current[idToUse] = { count, expiresAt: Date.now() + WIN_COUNT_TTL_MS };
        setWinCountMap((s) => (s[idToUse] === count ? s : ({ ...s, [idToUse]: count })));
        return count;
      } catch (err) {
        console.error('useGoalExtras.fetchWinsCount error', err);
        return null;
      } finally {
        try { delete inFlightWinsRef.current[idToUse]; } catch (e) { /* ignore */ }
      }
    })();

    inFlightWinsRef.current[idToUse] = promise;
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
        const token = await getToken();
        if (!token) return null;
        const res = await fetch('/.netlify/functions/getCounts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ goal_ids: goalIds }) });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();

        const notes: Record<string, number> = json?.notes || {};
        const wins: Record<string, number> = json?.wins || {};
        const tasks: Record<string, number> = json?.tasks || {};

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

        setWinCountMap((s) => {
          const next = { ...s };
          for (const id of goalIds) {
            const count = typeof wins[id] === 'number' ? wins[id] : (next[id] ?? 0);
            winsCountCacheRef.current[id] = { count, expiresAt: now + WIN_COUNT_TTL_MS };
            next[id] = count;
          }
          return next;
        });

        setTasksCountMap((s) => {
          const next = { ...s };
          for (const id of goalIds) {
            const count = typeof tasks[id] === 'number' ? tasks[id] : (next[id] ?? 0);
            tasksCountCacheRef.current[id] = { count, expiresAt: now + TASKS_COUNT_TTL_MS };
            next[id] = count;
          }
          return next;
        });

        return { notes, wins, tasks };
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

  const fetchWins = useCallback(async (goalId?: string) => {
    try {
      const idToUse = goalId;
      if (!idToUse) return;
      if (typeof idToUse === 'string' && idToUse.startsWith('temp-')) {
        setWins([]);
        return;
      }
      setIsWinLoading(true);
      const { data, error } = await supabase
        .from('accomplishments')
        .select('*')
        .eq('goal_id', idToUse)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWins(data || []);
    } catch (err) {
      console.error('useGoalExtras.fetchWins error', err);
    } finally {
      setIsWinLoading(false);
    }
  }, []);

  const deleteWin = useCallback(async (id: string, goalId?: string) => {
    // Skip DB call for optimistic temp records that never persisted
    if (id.startsWith('temp-')) {
      setWins((s) => s.filter((a) => a.id !== id));
      return;
    }
    try {
      setIsWinLoading(true);
      const { error } = await supabase.from('accomplishments').delete().eq('id', id);
      if (error) throw error;
      if (goalId) {
        // Use centralized refresh helper to keep behavior consistent (fire-and-forget)
        void refreshWinsAndCount(goalId);
        // decrement count (update cache/state only if changed) -- helpers already attempt to set accurate count,
        // but keep this conservative decrement to preserve optimistic UX in case the server removes immediately
        setWinCountMap((s) => {
          const prev = s[goalId] ?? 0;
          const next = Math.max(0, prev - 1);
          winsCountCacheRef.current[goalId] = { count: next, expiresAt: Date.now() + WIN_COUNT_TTL_MS };
          return s[goalId] === next ? s : { ...s, [goalId]: next };
        });
      }
    } catch (err) {
      console.error('useGoalExtras.deleteWin error', err);
    } finally {
      setIsWinLoading(false);
    }
  }, [fetchWins]);

  const createWin = useCallback(async (goalId: string, payload: { title: string; description?: string; impact?: string }) => {
    const { title, description, impact } = payload;
    const tempId = `temp-${Date.now()}`;
    const temp = { id: tempId, title, description, impact: impact || '', created_at: new Date().toISOString() } as Win;
    setWins((s) => [temp, ...s]);
    setIsWinLoading(true);
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
      // Refresh list and counts asynchronously via centralized helper
      void refreshWinsAndCount(goalId);
      // bump count optimistically
      setWinCountMap((s) => {
        const next = (s[goalId] ?? 0) + 1;
        winsCountCacheRef.current[goalId] = { count: next, expiresAt: Date.now() + WIN_COUNT_TTL_MS };
        return s[goalId] === next ? s : { ...s, [goalId]: next };
      });
    } catch (err) {
      console.error('useGoalExtras.createWin error', err);
      setWins((s) => s.filter((a) => a.id !== tempId));
    } finally {
      setIsWinLoading(false);
    }
  }, [fetchWins]);

  const saveEditedWin = useCallback(async (winId: string, updated: { title?: string; description?: string; impact?: string }, goalId?: string) => {
    try {
      setIsWinLoading(true);
      const { error } = await supabase
        .from('accomplishments')
        .update({
          title: updated.title,
          description: updated.description && updated.description.trim() ? updated.description : null,
          impact: updated.impact || null,
        })
        .eq('id', winId);
      if (error) throw error;
      if (goalId) void refreshWinsAndCount(goalId);
      notifySuccess('Win updated successfully.');
    } catch (err) {
      console.error('useGoalExtras.saveEditedWin error', err);
      notifyError('Error saving edited win.');
    } finally {
      setIsWinLoading(false);
    }
  }, [fetchWins]);

  const openWins = useCallback((goal: any) => {
    setIsWinModalOpen(true);
    fetchWins(goal?.id);
    // fetch count so badges are accurate
    fetchWinsCount(goal?.id).catch(() => {});
  }, [fetchWins]);

  const closeWins = useCallback(() => {
    setIsWinModalOpen(false);
    setWins([]);
    setSelectedWin(null);
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
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/getNotes?goal_id=${idToUse}`, { headers: { Authorization: `Bearer ${token}` } });
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
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/.netlify/functions/createNote', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ goal_id: goalId, content: tempNote.content }) });
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
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/.netlify/functions/updateNote', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: noteId, content }) });
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
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`/api/deleteNote?note_id=${noteId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
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

  // Helper: refresh wins list and count for a goal
  const refreshWinsAndCount = useCallback(async (goalId?: string) => {
    if (!goalId) return;
    try {
      await fetchWins(goalId);
    } catch (e) {
      // ignore
    }
    try {
      await fetchWinsCount(goalId);
    } catch (e) {
      // ignore
    }
  }, [fetchWins, fetchWinsCount]);

  return {
    wins,
    winCountMap,
    isWinLoading,
    isWinModalOpen,
    isEditWinModalOpen,
    selectedWin,
    setSelectedWin,
    setIsEditWinModalOpen,
    fetchWins,
    deleteWin,
    createWin,
    saveEditedWin,
    openWins,
    closeWins,
    fetchWinsCount,
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
    refreshWinsAndCount,
    bumpNotesCount,
    decrementNotesCount,
    tasksCountMap,
  };
}
