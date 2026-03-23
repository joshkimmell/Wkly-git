import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, ChevronRight, Clock, FileText, Zap, AlertCircle, CalendarClock, Timer, Save, Loader2, Sparkles } from 'lucide-react';
import FocusTimer, { formatTime } from './FocusTimer';
import PomodoroTimer, { type PomodoroPhase } from './PomodoroTimer';
import { useFocusTimer } from './FocusTimerContext';
import { usePomodoroSettings } from '@hooks/usePomodoroSettings';
import FocusAIChat, { SuggestedTask, SuggestedLink, ChatMessage } from './FocusAIChat';
import FocusNotes, { FocusNote } from './FocusNotes';
import FocusFireworks from './FocusFireworks';
import { Task } from '@utils/goalUtils';
import supabase from '@lib/supabase';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import { loadSession, saveSession, clearSession, isSessionStale, extendSession } from './useFocusSession';

interface Props {
  task: Task;
  goalTitle?: string;
  onClose: () => void;
  onMarkDone: (taskId: string) => Promise<void>;
}

const WORK_CHECK_INTERVAL_MS = 5 * 60 * 1000; // ask every 5 min of running time
const AUTO_CLOSE_COUNTDOWN_SEC = 120; // 2 min to respond before auto-close
type Panel = 'timer' | 'ai' | 'notes';

const TaskFocusMode: React.FC<Props> = ({ task, goalTitle, onClose, onMarkDone }) => {
  const focusTimer = useFocusTimer();
  const { settings: pomodoroSettings } = usePomodoroSettings();

  // Derived timer values from global context
  const elapsed = focusTimer.isActiveFor(task.id) ? focusTimer.elapsed : 0;
  const timerState = focusTimer.isActiveFor(task.id) ? focusTimer.timerState : 'idle';

  // Notes (synced to task notes)
  const [notes, setNotes] = useState<FocusNote[]>([]);
  const [savedNoteIds, setSavedNoteIds] = useState<Set<string>>(new Set());

  // AI chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Suggested tangential tasks queue (from AI)
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [addingTaskId, setAddingTaskId] = useState<string | null>(null);
  const [addedTaskTitles, setAddedTaskTitles] = useState<Set<string>>(new Set());

  // Last AI-response pending suggestions (lifted from FocusAIChat for persistence)
  const [pendingChatTasks, setPendingChatTasks] = useState<SuggestedTask[]>([]);
  const [pendingChatLinks, setPendingChatLinks] = useState<SuggestedLink[]>([]);

  // Heartbeat check refs
  const checkIntervalRef = useRef<number | null>(null);
  const autoCloseIntervalRef = useRef<number | null>(null);
  const [showInactivityPrompt, setShowInactivityPrompt] = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(AUTO_CLOSE_COUNTDOWN_SEC);

  // Completion
  const [showFireworks, setShowFireworks] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);

  // Mobile tab panel
  const [activePanel, setActivePanel] = useState<Panel>('ai');

  // Session persistence
  const createdAtRef = useRef<number>(Date.now());
  const [showExpiryPrompt, setShowExpiryPrompt] = useState(false);
  const [showClosePrompt, setShowClosePrompt] = useState(false);
  const staleSessionRef = useRef<ReturnType<typeof loadSession>>(null);
  const dbNotesRef = useRef<FocusNote[]>([]);

  // Pomodoro phase state (lifted from PomodoroTimer for header pill)
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('focus');
  const [pomodoroRemaining, setPomodoroRemaining] = useState(pomodoroSettings.focusMinutes * 60);

  // Resizable Notes panel
  const [notesWidth, setNotesWidth] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('wkly_focus_notes_width') || '280', 10); } catch { return 280; }
  });
  const notesWidthRef = useRef(280);
  useEffect(() => { notesWidthRef.current = notesWidth; }, [notesWidth]);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = notesWidthRef.current;
    const onMouseMove = (mv: MouseEvent) => {
      const newWidth = Math.max(160, Math.min(600, startWidth + (startX - mv.clientX)));
      setNotesWidth(newWidth);
      notesWidthRef.current = newWidth;
      try { localStorage.setItem('wkly_focus_notes_width', String(newWidth)); } catch {}
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  // Header save state
  const [isSaving, setIsSaving] = useState(false);

  // Mark #root as inert (blocks all clicks/keyboard behind overlay)
  // and portal the UI out to document.body so the inert doesn't trap the overlay itself
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) root.setAttribute('inert', '');
    return () => {
      if (root) root.removeAttribute('inert');
    };
  }, []);

  // ── Load session + DB notes on mount ────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      // 1. Fetch existing task notes from DB
      let dbNotes: FocusNote[] = [];
      try {
        const { data: { session: authSess } } = await supabase.auth.getSession();
        const token = authSess?.access_token;
        if (token) {
          const res = await fetch(`/.netlify/functions/getTaskNotes?task_id=${task.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const raw: Array<{ id: string; content: string; created_at: string }> = await res.json();
            dbNotes = raw.map((n) => ({
              id: n.id,
              content: n.content,
              createdAt: new Date(n.created_at).getTime(),
            }));
          }
        }
      } catch { /* non-critical */ }

      if (!isMounted) return;
      dbNotesRef.current = dbNotes;
      const dbNoteIds = new Set(dbNotes.map((n) => n.id));

      // 2. If the global timer is already active for this task, timer is running in background.
      //    Restore chat/notes from localStorage but skip re-initialising the timer.
      if (focusTimer.isActiveFor(task.id)) {
        const stored = loadSession(task.id);
        if (stored) {
          createdAtRef.current = stored.createdAt;
          const sessionSavedIds = new Set(stored.savedNoteIds ?? []);
          const unsavedSessionNotes = (stored.notes ?? []).filter((n) => !sessionSavedIds.has(n.id));
          setNotes([...unsavedSessionNotes, ...dbNotes]);
          setSavedNoteIds(new Set([...Array.from(sessionSavedIds), ...Array.from(dbNoteIds)]));
          setChatMessages(stored.chatMessages ?? []);
          setSuggestedTasks(stored.suggestedTasks ?? []);
          setAddedTaskTitles(new Set(stored.addedTaskTitles ?? []));
          setPendingChatTasks(stored.pendingChatTasks ?? []);
          setPendingChatLinks(stored.pendingChatLinks ?? []);
        } else {
          setNotes(dbNotes);
          setSavedNoteIds(dbNoteIds);
        }
        return;
      }

      // 3. Merge with localStorage session
      const stored = loadSession(task.id);
      if (stored && isSessionStale(stored)) {
        staleSessionRef.current = stored;
        setShowExpiryPrompt(true);
        // Show DB notes while user decides
        setNotes(dbNotes);
        setSavedNoteIds(dbNoteIds);
      } else if (stored) {
        createdAtRef.current = stored.createdAt;
        // Restore timer via context (always paused on restore — user resumes manually)
        if (stored.elapsed > 0) {
          focusTimer.initTimer(task.id, stored.elapsed);
        }
        const sessionSavedIds = new Set(stored.savedNoteIds ?? []);
        const unsavedSessionNotes = (stored.notes ?? []).filter((n) => !sessionSavedIds.has(n.id));
        setNotes([...unsavedSessionNotes, ...dbNotes]);
        setSavedNoteIds(new Set([...Array.from(sessionSavedIds), ...Array.from(dbNoteIds)]));
        setChatMessages(stored.chatMessages ?? []);
        setSuggestedTasks(stored.suggestedTasks ?? []);
        setAddedTaskTitles(new Set(stored.addedTaskTitles ?? []));
        setPendingChatTasks(stored.pendingChatTasks ?? []);
        setPendingChatLinks(stored.pendingChatLinks ?? []);
      } else {
        // No session — just show DB notes
        setNotes(dbNotes);
        setSavedNoteIds(dbNoteIds);
      }
    };
    init();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Expiry decisions ────────────────────────────────────────────
  const handleExtendSession = () => {
    const stored = staleSessionRef.current;
    if (stored) {
      createdAtRef.current = stored.createdAt;
      extendSession(task.id);
      if (stored.elapsed > 0) {
        focusTimer.initTimer(task.id, stored.elapsed);
      }
      const dbNotes = dbNotesRef.current;
      const dbNoteIds = new Set(dbNotes.map((n) => n.id));
      const sessionSavedIds = new Set(stored.savedNoteIds ?? []);
      const unsavedSessionNotes = (stored.notes ?? []).filter((n) => !sessionSavedIds.has(n.id));
      setNotes([...unsavedSessionNotes, ...dbNotes]);
      setSavedNoteIds(new Set([...Array.from(sessionSavedIds), ...Array.from(dbNoteIds)]));
      setChatMessages(stored.chatMessages ?? []);
      setSuggestedTasks(stored.suggestedTasks ?? []);
      setAddedTaskTitles(new Set(stored.addedTaskTitles ?? []));
      setPendingChatTasks(stored.pendingChatTasks ?? []);
      setPendingChatLinks(stored.pendingChatLinks ?? []);
    }
    setShowExpiryPrompt(false);
  };

  const handleClearStaleSession = () => {
    clearSession(task.id);
    setShowExpiryPrompt(false);
  };

  // ── Explicit session save: localStorage + DB + flush unsaved notes ──
  const persistCurrentSession = useCallback(async (): Promise<void> => {
    const currentElapsed = focusTimer.getElapsedSnapshot();
    const currentTimerState = focusTimer.isActiveFor(task.id) ? focusTimer.timerState : 'idle';
    const savedTimerState = currentTimerState === 'running' ? 'paused' : currentTimerState;

    saveSession({
      taskId: task.id,
      elapsed: currentElapsed,
      timerState: savedTimerState,
      notes,
      chatMessages,
      savedNoteIds: Array.from(savedNoteIds),
      suggestedTasks,
      addedTaskTitles: Array.from(addedTaskTitles),
      pendingChatTasks,
      pendingChatLinks,
      createdAt: createdAtRef.current,
      updatedAt: Date.now(),
    });

    // Persist full session to DB
    try {
      const { data: { session: authSess } } = await supabase.auth.getSession();
      const token = authSess?.access_token;
      if (token) {
        await fetch('/.netlify/functions/upsertFocusSession', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            task_id: task.id,
            elapsed_seconds: currentElapsed,
            timer_state: savedTimerState,
            chat_messages: chatMessages,
            suggested_tasks: suggestedTasks,
            added_task_titles: Array.from(addedTaskTitles),
            pending_chat_tasks: pendingChatTasks,
            pending_chat_links: pendingChatLinks,
          }),
        });
      }
    } catch { /* non-critical */ }

    // Flush any notes not yet persisted to the database
    const unsaved = notes.filter((n) => !savedNoteIds.has(n.id));
    if (unsaved.length === 0) return;
    try {
      const { data: { session: authSess } } = await supabase.auth.getSession();
      const token = authSess?.access_token;
      if (!token) return;
      await Promise.all(
        unsaved.map(async (note) => {
          const res = await fetch('/.netlify/functions/createTaskNote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ task_id: task.id, content: note.content }),
          });
          if (res.ok) setSavedNoteIds((prev) => new Set([...prev, note.id]));
        }),
      );
    } catch { /* non-critical */ }
  }, [task.id, focusTimer, notes, chatMessages, savedNoteIds, suggestedTasks, addedTaskTitles, pendingChatTasks, pendingChatLinks]);

  // ── Sync note edit to DB (UUID-id notes are DB-loaded; fn-xxx notes flushed on Save) ──
  const handleNoteEdited = useCallback(async (note: FocusNote) => {
    if (note.id.startsWith('fn-')) return; // Will be handled by persistCurrentSession flush
    try {
      const { data: { session: authSess } } = await supabase.auth.getSession();
      const token = authSess?.access_token;
      if (!token) return;
      const res = await fetch('/.netlify/functions/updateTaskNote', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: note.id, content: note.content }),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch {
      notifyError('Failed to save note edit');
    }
  }, []);

  // ── Delete a note from DB and local state ──────────────────────────
  const handleNoteRemoved = useCallback(async (note: FocusNote) => {
    setSavedNoteIds((prev) => { const next = new Set(prev); next.delete(note.id); return next; });
    if (note.id.startsWith('fn-')) return; // Never saved to DB, nothing to delete
    try {
      const { data: { session: authSess } } = await supabase.auth.getSession();
      const token = authSess?.access_token;
      if (!token) return;
      const res = await fetch(`/.netlify/functions/deleteTaskNote?note_id=${note.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
    } catch {
      notifyError('Failed to delete note');
    }
  }, []);

  // ── Save note as real task note ──────────────────────────────────
  const handleNoteAdded = useCallback(async (note: FocusNote) => {
    if (savedNoteIds.has(note.id)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/.netlify/functions/createTaskNote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ task_id: task.id, content: note.content }),
      });
      if (!res.ok) throw new Error('Failed to save note');
      setSavedNoteIds((prev) => new Set([...prev, note.id]));
    } catch {
      notifyError('Failed to save note');
    }
  }, [savedNoteIds, task.id]);

  // ── Timer controls — delegate to global context ───────────────────
  const handleStart = () => { focusTimer.startTimer(task.id, 0); };
  const handlePause = () => { focusTimer.pauseTimer(); };
  const handleResume = () => { focusTimer.resumeTimer(); };
  const handleReset = () => { focusTimer.resetTimer(); };

  // ── Close prompt handlers ────────────────────────────────────────
  const handleCloseRequest = useCallback(() => {
    const activeTimerState = focusTimer.isActiveFor(task.id) ? focusTimer.timerState : 'idle';
    const activeElapsed = focusTimer.isActiveFor(task.id) ? focusTimer.elapsed : 0;

    // If timer is actively running, auto-save and close — timer keeps going in background
    if (activeTimerState === 'running') {
      persistCurrentSession().then(() =>
        notifySuccess('Session saved — timer running in background'),
      );
      onClose();
      return;
    }

    // Only prompt to save if the user did something worth keeping
    const hasSessionActivity =
      activeElapsed > 0 ||
      chatMessages.length > 0 ||
      suggestedTasks.length > 0 ||
      notes.some((n) => n.id.startsWith('fn-'));
    if (!hasSessionActivity) {
      clearSession(task.id);
      onClose();
      return;
    }
    setShowClosePrompt(true);
  }, [notes, chatMessages.length, suggestedTasks.length, task.id, focusTimer, persistCurrentSession, onClose]);

  const handleSaveAndExit = async () => {
    await persistCurrentSession();
    notifySuccess('Session saved');
    setShowClosePrompt(false);
    onClose();
  };

  const handleDiscardAndExit = () => {
    // Do NOT clear the session — any previously saved localStorage state is preserved.
    // Only unsaved in-memory changes since the last Save are discarded.
    setShowClosePrompt(false);
    onClose();
  };

  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      await persistCurrentSession();
      notifySuccess('Session saved');
    } catch {
      notifyError('Failed to save session');
    } finally {
      setIsSaving(false);
    }
  };

  // ── 5-min heartbeat: ask "Still working?" every 5 min while timer runs ─────
  useEffect(() => {
    if (timerState === 'running') {
      checkIntervalRef.current = window.setInterval(() => {
        setShowInactivityPrompt(true);
      }, WORK_CHECK_INTERVAL_MS);
    } else {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    }
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [timerState]);

  // ── 2-min auto-close countdown while prompt is open ──────────────────────
  useEffect(() => {
    if (showInactivityPrompt) {
      setAutoCloseCountdown(AUTO_CLOSE_COUNTDOWN_SEC);
      autoCloseIntervalRef.current = window.setInterval(() => {
        setAutoCloseCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(autoCloseIntervalRef.current!);
            autoCloseIntervalRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (autoCloseIntervalRef.current) {
        clearInterval(autoCloseIntervalRef.current);
        autoCloseIntervalRef.current = null;
      }
    }
    return () => {
      if (autoCloseIntervalRef.current) {
        clearInterval(autoCloseIntervalRef.current);
        autoCloseIntervalRef.current = null;
      }
    };
  }, [showInactivityPrompt]);

  // Trigger auto-close when countdown hits 0
  useEffect(() => {
    if (autoCloseCountdown === 0 && showInactivityPrompt) {
      handleInactivityNoRef.current?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCloseCountdown, showInactivityPrompt]);

  // Stable ref so the countdown effect can call the handler without stale closures
  const handleInactivityNoRef = useRef<(() => void) | null>(null);

  const handleInactivityYes = useCallback(() => {
    setShowInactivityPrompt(false);
    // The interval keeps running; next check fires in 5 min
  }, []);

  const handleInactivityNo = useCallback(async () => {
    setShowInactivityPrompt(false);
    // Stop heartbeat interval immediately
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    focusTimer.pauseTimer();
    await persistCurrentSession();
    notifySuccess('Session saved — timer paused');
    onClose();
  }, [focusTimer, persistCurrentSession, onClose]);

  // Keep ref in sync for the countdown auto-close
  useEffect(() => {
    handleInactivityNoRef.current = handleInactivityNo;
  }, [handleInactivityNo]);

  // ── Suggested task → save to DB ───────────────────────────────────
  const handleAddSuggestedTask = (st: SuggestedTask) => {
    setSuggestedTasks((prev) => {
      if (prev.some((t) => t.title === st.title)) return prev;
      return [...prev, st];
    });
  };

  const saveTaskToGoal = async (st: SuggestedTask) => {
    const key = st.title;
    if (addedTaskTitles.has(key) || addingTaskId === key) return;
    setAddingTaskId(key);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/.netlify/functions/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          goal_id: task.goal_id,
          title: st.title,
          description: st.description || '',
          status: 'Not started',
          order_index: 999,
        }),
      });
      if (!res.ok) throw new Error('Failed to create task');
      setAddedTaskTitles((prev) => new Set([...prev, key]));
      notifySuccess(`Task "${st.title}" added to goal`);
    } catch (err) {
      notifyError('Failed to add task');
    } finally {
      setAddingTaskId(null);
    }
  };

  // ── Mark as Done ──────────────────────────────────────────────────
  const handleMarkDone = async () => {
    setMarkingDone(true);
    try {
      await onMarkDone(task.id);
      focusTimer.clearTimer();
      clearSession(task.id);
      setShowFireworks(true);
    } catch {
      notifyError('Failed to mark task as done');
    } finally {
      setMarkingDone(false);
    }
  };

  const handleFireworksDone = () => {
    setShowFireworks(false);
    setTimeout(onClose, 200);
  };

  // ── Keyboard close ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showFireworks && !showInactivityPrompt && !showExpiryPrompt && !showClosePrompt) handleCloseRequest();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showFireworks, showInactivityPrompt, showExpiryPrompt, showClosePrompt, handleCloseRequest]);

  const panelTabs: { id: Panel; label: string; icon: React.ReactNode }[] = [
    { id: 'timer', label: 'Timer', icon: <Timer className="w-4 h-4" /> },
    { id: 'ai', label: 'Assistant', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" /> },
  ];

  return createPortal(
    <>
      {showFireworks && <FocusFireworks onDone={handleFireworksDone} />}

      {/* Session expiry prompt */}
      {showExpiryPrompt && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-10 dark:bg-gray-90 border border-gray-30 dark:border-gray-70 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <CalendarClock className="w-6 h-6 text-brand-40 shrink-0" />
              <h3 className="text-base font-semibold text-primary-text">Previous session found</h3>
            </div>
            <p className="text-sm text-secondary-text mb-5">
              You have a saved focus session for <strong className="text-primary-text">"{task.title}"</strong> that is over 7 days old. Would you like to continue where you left off, or start fresh?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClearStaleSession}
                className="btn-secondary flex-1"
              >
                Start fresh
              </button>
              <button
                onClick={handleExtendSession}
                className="btn-primary flex-1"
              >
                Resume session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close / Preserve Prompt */}
      {showClosePrompt && (
        <div className="fixed inset-0 z-[198] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-10 dark:bg-gray-90 border border-gray-30 dark:border-gray-70 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-brand-40 shrink-0" />
              <h3 className="text-base font-semibold text-primary-text">Save your progress?</h3>
            </div>
            <p className="text-sm text-secondary-text mb-5">
              Do you want to save your focus session for <strong className="text-primary-text">"{task.title}"</strong>? Next time you open focus mode, you'll pick up right where you left off — timer, notes, and chat included.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClosePrompt(false)}
                className="btn-ghost px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardAndExit}
                className="btn-secondary"
              >
                Discard
              </button>
              <button
                onClick={handleSaveAndExit}
                className="btn-primary"
              >
                Save &amp; exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Heartbeat "Still working?" prompt */}
      {showInactivityPrompt && (
        <div className="fixed inset-0 z-[197] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-10 dark:bg-gray-90 border border-gray-30 dark:border-gray-70 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-400 shrink-0" />
              <h3 className="text-base font-semibold text-primary-text">Still working?</h3>
            </div>
            <p className="text-sm text-secondary-text mb-3">
              You've been on <strong className="text-primary-text">"{task.title}"</strong> for another 5 minutes. Are you still working on it?
            </p>
            <p className="text-xs text-secondary-text mb-5">
              Auto-pausing in{' '}
              <span className={`font-semibold tabular-nums ${
                autoCloseCountdown <= 30 ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {Math.floor(autoCloseCountdown / 60)}:{String(autoCloseCountdown % 60).padStart(2, '0')}
              </span>
              {' '}if no response.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleInactivityNo}
                className="btn-secondary"
              >
                No, pause &amp; exit
              </button>
              <button
                onClick={handleInactivityYes}
                className="btn-primary"
              >
                Yes, keep going!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main overlay */}
      <div className="fixed inset-0 z-[196] bg-background flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 flex items-center gap-3 px-4 md:px-6 py-3 border-b !border-border-subtle bg-background backdrop-blur">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Zap className="w-5 h-5 text-primary-icon shrink-0" />
            <div className="min-w-0">
              {goalTitle && (
                <div className="flex items-center gap-1 text-xs text-secondary-text truncate">
                  <span className="truncate max-w-1/2">{goalTitle}</span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                </div>
              )}
              <h1 className="text-sm font-semibold text-primary-text truncate max-w-xs md:max-w-md lg:max-w-2xl">
                {task.title}
              </h1>
            </div>
          </div>

          {/* Timer compact pill (visible on md+) */}
          {pomodoroSettings.timerMode === 'pomodoro' ? (
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-background-color border text-sm font-mono text-primary-text ${
              pomodoroPhase === 'focus' ? 'border-red-400/40 dark:border-red-500/30'
              : pomodoroPhase === 'short-break' ? 'border-blue-400/40 dark:border-blue-500/30'
              : 'border-violet-400/40 dark:border-violet-500/30'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${
                pomodoroPhase === 'focus' ? 'text-red-500'
                : pomodoroPhase === 'short-break' ? 'text-blue-500'
                : 'text-violet-500'
              }`} />
              <span className="tabular-nums">{formatTime(pomodoroRemaining)}</span>
              <span className={`w-2 h-2 rounded-full ${
                timerState !== 'running' ? 'bg-gray-40'
                : pomodoroPhase === 'focus' ? 'bg-red-500 animate-pulse'
                : pomodoroPhase === 'short-break' ? 'bg-blue-500 animate-pulse'
                : 'bg-violet-500 animate-pulse'
              }`} />
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-background-color border border-gray-20 dark:border-gray-80 text-sm font-mono text-primary-text">
              <Clock className="w-3.5 h-3.5 text-primary-icon" />
              <span className="tabular-nums">{formatTime(elapsed)}</span>
              <span className={`w-2 h-2 rounded-full ${timerState === 'running' ? 'bg-green-400 animate-pulse' : timerState === 'paused' ? 'bg-yellow-400' : 'bg-gray-60'}`} />
            </div>
          )}

          {/* Mark Done */}
          <button
            onClick={handleMarkDone}
            disabled={markingDone}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-60 hover:bg-green-70 disabled:opacity-50 text-white text-sm font-medium transition-colors shrink-0"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{markingDone ? 'Completing…' : 'Mark Done'}</span>
          </button>

          {/* Save progress */}
          <button
            onClick={handleSaveProgress}
            disabled={isSaving}
            className="btn-ghost p-2 rounded-xl hover:bg-gray-20 dark:hover:bg-gray-80 text-secondary-text transition-colors shrink-0"
            title="Save session progress"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          </button>

          {/* Close */}
          <button
            onClick={handleCloseRequest}
            className="btn-ghost p-2 rounded-xl hover:bg-gray-20 dark:hover:bg-gray-80 text-secondary-text transition-colors shrink-0"
            title="Exit focus mode (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile tab bar */}
        <nav className="md:hidden flex border-b border-gray-20 dark:border-gray-80 shrink-0">
          {panelTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              className={`bg-brand-10 dark:bg-brand-90 border-l-0 border-t-1 border-r-1 last:border-r-0 rounded-none flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm transition-colors focus:outline-none focus:shadow-none focus:ring-0 focus:ring-offset-0 ${
                activePanel === tab.id
                  ? '!text-brand-30 !border-b !border-b-2 !border-b-primary-icon !bg-brand-10 dark:!bg-brand-80'
                  : 'text-secondary-text hover:text-primary-text'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">

          {/* ── Left: Timer panel (desktop always visible; mobile tab) */}
          <aside className={`
            md:flex md:flex-col md:w-[220px] lg:w-[260px] md:border-r md:border-border-subtle md:shrink-0
            ${activePanel === 'timer' ? 'flex flex-col w-full' : 'hidden'}
            bg-background-color/40 dark:bg-background-color/40 overflow-y-auto
          `}>
            <div className="p-4 flex flex-col gap-4">
            <div className="hidden md:flex items-center gap-2 border-b border-border-subtle pb-2">
                <Timer className="w-4 h-4 text-primary-icon" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">Timer</h2>
            </div>
              {pomodoroSettings.timerMode === 'pomodoro' ? (
                <PomodoroTimer
                  taskId={task.id}
                  settings={pomodoroSettings}
                  onStart={handleStart}
                  onPause={handlePause}
                  onResume={handleResume}
                  onReset={handleReset}
                  externalTimerState={timerState}
                  onStateChange={(phase, _state, remaining) => {
                    setPomodoroPhase(phase);
                    setPomodoroRemaining(remaining);
                  }}
                />
              ) : (
                <FocusTimer
                  elapsed={elapsed}
                  state={timerState}
                  onStart={handleStart}
                  onPause={handlePause}
                  onResume={handleResume}
                  onReset={handleReset}
                />
              )}

              {/* Task info */}
              {(task.description || task.scheduled_date) && (
                  <>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">Task Info</h3>
                <div className="rounded-xl bg-gray-10 dark:bg-gray-90 border border-gray-20 dark:border-gray-80 p-3 space-y-2">
                  {task.scheduled_date && (
                    <p className="text-xs text-secondary-text">
                      📅 <span className="text-primary-text">{new Date(task.scheduled_date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </p>
                  )}
                  {task.description && (
                    <p className="text-xs text-secondary-text line-clamp-4">{task.description}</p>
                  )}
                </div>
                </>
              )}

              {/* Tangential tasks queue */}
              {suggestedTasks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">Captured Tasks</h3>
                  <ul className="space-y-2">
                    {suggestedTasks.map((st, i) => {
                      const added = addedTaskTitles.has(st.title);
                      const saving = addingTaskId === st.title;
                      return (
                        <li key={i} className="rounded-lg bg-gray-10 dark:bg-gray-90 border border-gray-20 dark:border-gray-80 p-2.5 space-y-1">
                          <p className="text-xs font-medium text-primary-text leading-snug">{st.title}</p>
                          {st.description && <p className="text-[11px] text-secondary-text line-clamp-2">{st.description}</p>}
                          <button
                            onClick={() => saveTaskToGoal(st)}
                            disabled={added || saving}
                            className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors ${
                              added ? 'bg-gray-30 dark:bg-gray-70 text-gray-50' : 'bg-green-70 hover:bg-green-60 text-white'
                            }`}
                          >
                            {saving ? 'Adding…' : added ? '✓ Added' : '+ Add to goal'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </aside>

          {/* ── Center: AI Chat ─────────────────────────────────────── */}
          <main className={`
            flex-1 min-w-0 flex flex-col
            md:flex
            ${activePanel === 'ai' ? 'flex' : 'hidden md:flex'}
            border-r border-border-subtle bg-gradient-to-tl from-brand-20 dark:from-brand-90 to-background backdrop-blur
          `}>
            <div className="hidden md:flex px-4 pt-4 pb-2 shrink-0 border-b border-border-subtle bg-background-color/40 dark:bg-background-color/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-40" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">Assistant</h2>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4">
              <FocusAIChat
                taskTitle={task.title}
                taskDescription={task.description}
                goalTitle={goalTitle}
                onAddSuggestedTask={handleAddSuggestedTask}
                initialMessages={chatMessages}
                onMessagesChange={setChatMessages}
                initialPendingTasks={pendingChatTasks}
                initialPendingLinks={pendingChatLinks}
                onPendingTasksChange={setPendingChatTasks}
                onPendingLinksChange={setPendingChatLinks}
              />
            </div>
          </main>

          {/* ── Drag handle: Assistant ↔ Notes ─────────────────── */}
          <div
            className="hidden md:flex w-1.5 cursor-col-resize items-center justify-center shrink-0 group hover:bg-brand-40/20 active:bg-brand-40/30 transition-colors relative select-none"
            onMouseDown={handleDividerMouseDown}
            title="Drag to resize"
          >
            <div className="w-0.5 h-10 rounded-full bg-border-subtle group-hover:bg-brand-40 group-active:bg-brand-50 transition-colors" />
          </div>

          {/* ── Right: Notes panel ──────────────────────────────────── */}
          <aside
            style={{ width: notesWidth }}
            className={`
            md:flex md:flex-col md:shrink-0
            ${activePanel === 'notes' ? 'flex flex-col w-full' : 'hidden md:flex'}
            bg-background-color/40 dark:bg-background-color/40 overflow-hidden
          `}>
            <div className="hidden md:flex px-4 pt-4 pb-2 shrink-0 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-40" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">Notes</h2>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-hidden">
              <FocusNotes notes={notes} onChange={setNotes} onNoteAdded={handleNoteAdded} onNoteEdited={handleNoteEdited} onNoteRemoved={handleNoteRemoved} />
            </div>
          </aside>
        </div>
      </div>
    </>,
    document.body,
  );
};

export default TaskFocusMode;
