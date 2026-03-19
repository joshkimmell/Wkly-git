import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, ChevronRight, Bot, Clock, FileText, Zap, AlertCircle, CalendarClock, Timer, Save, Loader2 } from 'lucide-react';
import FocusTimer, { TimerState, formatTime } from './FocusTimer';
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

const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes
type Panel = 'timer' | 'ai' | 'notes';

const TaskFocusMode: React.FC<Props> = ({ task, goalTitle, onClose, onMarkDone }) => {
  // Timer
  const [elapsed, setElapsed] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const intervalRef = useRef<number | null>(null);

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

  // Inactivity
  const inactivityTimerRef = useRef<number | null>(null);
  const [showInactivityPrompt, setShowInactivityPrompt] = useState(false);

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

  // Header save state
  const [isSaving, setIsSaving] = useState(false);

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

      // 2. Merge with localStorage session
      const stored = loadSession(task.id);
      if (stored && isSessionStale(stored)) {
        staleSessionRef.current = stored;
        setShowExpiryPrompt(true);
        // Show DB notes while user decides
        setNotes(dbNotes);
        setSavedNoteIds(dbNoteIds);
      } else if (stored) {
        createdAtRef.current = stored.createdAt;
        setElapsed(stored.elapsed);
        setTimerState(stored.elapsed > 0 ? 'paused' : 'idle');
        // Unsaved session notes (fn-xxx not yet in DB) stay; fn-xxx that were saved are
        // already in dbNotes with their UUID, so we drop them to avoid duplicates.
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
      setElapsed(stored.elapsed);
      setTimerState(stored.elapsed > 0 ? 'paused' : 'idle');
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

  // ── Explicit session save: localStorage + flush unsaved notes to DB ─
  const persistCurrentSession = useCallback(async (): Promise<void> => {
    saveSession({
      taskId: task.id,
      elapsed,
      timerState: timerState === 'running' ? 'paused' : timerState,
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
  }, [task.id, elapsed, timerState, notes, chatMessages, savedNoteIds, suggestedTasks, addedTaskTitles, pendingChatTasks, pendingChatLinks]);

  // ── Sync note edit to DB (UUID-id notes are DB-loaded; fn-xxx notes flushed on Save) ──
  const handleNoteEdited = useCallback(async (note: FocusNote) => {
    if (note.id.startsWith('fn-')) return; // Will be handled by persistCurrentSession flush
    try {
      const { data: { session: authSess } } = await supabase.auth.getSession();
      const token = authSess?.access_token;
      if (!token) return;
      await fetch('/.netlify/functions/updateTaskNote', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: note.id, content: note.content }),
      });
    } catch { /* non-critical */ }
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
      // Non-critical — silently skip, will retry on next save cycle isn't needed
    }
  }, [savedNoteIds, task.id]);

  // ── Timer controls ────────────────────────────────────────────────
  const startTick = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
  }, []);

  const stopTick = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const handleStart = () => { setTimerState('running'); startTick(); };
  const handlePause = () => { setTimerState('paused'); stopTick(); };
  const handleResume = () => { setTimerState('running'); startTick(); };
  const handleReset = () => { stopTick(); setElapsed(0); setTimerState('idle'); };

  useEffect(() => () => stopTick(), [stopTick]);

  // ── Close prompt handlers ────────────────────────────────────────
  const handleCloseRequest = useCallback(() => {
    // Only prompt to save if the user did something in this session
    const hasSessionActivity =
      elapsed > 0 ||
      chatMessages.length > 0 ||
      suggestedTasks.length > 0 ||
      notes.some((n) => n.id.startsWith('fn-'));
    if (!hasSessionActivity) {
      clearSession(task.id);
      onClose();
      return;
    }
    stopTick();
    setTimerState((s) => (s === 'running' ? 'paused' : s));
    setShowClosePrompt(true);
  }, [elapsed, notes, chatMessages.length, suggestedTasks.length, task.id, stopTick, onClose]);

  const handleSaveAndExit = async () => {
    await persistCurrentSession();
    setShowClosePrompt(false);
    onClose();
  };

  const handleDiscardAndExit = () => {
    clearSession(task.id);
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

  // ── Inactivity tracking ───────────────────────────────────────────
  const resetInactivity = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (timerState !== 'running') return;
    inactivityTimerRef.current = window.setTimeout(() => {
      setShowInactivityPrompt(true);
    }, INACTIVITY_MS);
  }, [timerState]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetInactivity, { passive: true }));
    resetInactivity();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivity]);

  const handleInactivityYes = () => {
    setShowInactivityPrompt(false);
    resetInactivity();
  };

  const handleInactivityNo = () => {
    setShowInactivityPrompt(false);
    handlePause();
    handleCloseRequest();
  };

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
      stopTick();
      setTimerState('paused');
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
    { id: 'timer', label: 'Timer', icon: <Clock className="w-4 h-4" /> },
    { id: 'ai', label: 'Assistant', icon: <Bot className="w-4 h-4" /> },
    { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <>
      {showFireworks && <FocusFireworks onDone={handleFireworksDone} />}

      {/* Session expiry prompt */}
      {showExpiryPrompt && (
        <div className="fixed inset-0 z-[10003] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-90 border border-gray-70 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
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
        <div className="fixed inset-0 z-[10003] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-90 border border-gray-70 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
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

      {/* Inactivity Prompt */}
      {showInactivityPrompt && (
        <div className="fixed inset-0 z-[10002] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-90 border border-gray-70 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-400 shrink-0" />
              <h3 className="text-base font-semibold text-primary-text">Still working?</h3>
            </div>
            <p className="text-sm text-secondary-text mb-5">
              No activity detected for 5 minutes. Are you still working on <strong className="text-primary-text">"{task.title}"</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleInactivityNo}
                className="btn-secondary"
              >
                No, pause & exit
              </button>
              <button
                onClick={handleInactivityYes}
                className="btn-primary"
              >
                Yes, I'm on it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main overlay */}
      <div className="fixed inset-0 z-[9999] bg-background flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 flex items-center gap-3 px-4 md:px-6 py-3 border-b border-gray-80 bg-gray-95/90 backdrop-blur">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Zap className="w-5 h-5 text-primary-icon shrink-0" />
            <div className="min-w-0">
              {goalTitle && (
                <div className="flex items-center gap-1 text-xs text-secondary-text truncate">
                  <span className="truncate max-w-[120px]">{goalTitle}</span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                </div>
              )}
              <h1 className="text-sm font-semibold text-primary-text truncate max-w-xs md:max-w-md lg:max-w-2xl">
                {task.title}
              </h1>
            </div>
          </div>

          {/* Timer compact pill (visible on md+) */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-80 border border-gray-70 text-sm font-mono text-primary-text">
            <Clock className="w-3.5 h-3.5 text-primary-icon" />
            <span className="tabular-nums">{formatTime(elapsed)}</span>
            <span className={`w-2 h-2 rounded-full ${timerState === 'running' ? 'bg-green-400 animate-pulse' : timerState === 'paused' ? 'bg-yellow-400' : 'bg-gray-60'}`} />
          </div>

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
            className="btn-ghost p-2 rounded-xl hover:bg-gray-80 text-secondary-text transition-colors shrink-0"
            title="Save session progress"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          </button>

          {/* Close */}
          <button
            onClick={handleCloseRequest}
            className="btn-ghost p-2 rounded-xl hover:bg-gray-80 text-secondary-text transition-colors shrink-0"
            title="Exit focus mode (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile tab bar */}
        <nav className="md:hidden flex border-b border-gray-80 shrink-0">
          {panelTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              className={`bg-transparent border-l-0 border-y-1 border-r-1 last:border-r-0 rounded-none flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm transition-colors focus:outline-none ${
                activePanel === tab.id
                  ? 'text-brand-40 border-b border-2 border-brand-30'
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
            md:flex md:flex-col md:w-[220px] lg:w-[260px] md:border-r md:border-gray-80 md:shrink-0
            ${activePanel === 'timer' ? 'flex flex-col w-full' : 'hidden'}
            bg-gray-90/40 overflow-y-auto
          `}>
            <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-gray-80 pb-2">
                <Timer className="w-4 h-4 text-brand-30" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">Focus Timer</h2>
            </div>
              <FocusTimer
                elapsed={elapsed}
                state={timerState}
                onStart={handleStart}
                onPause={handlePause}
                onResume={handleResume}
                onReset={handleReset}
              />

              {/* Task info */}
              {(task.description || task.scheduled_date) && (
                <div className="rounded-xl bg-gray-90 border border-gray-80 p-3 space-y-2">
                  {task.scheduled_date && (
                    <p className="text-xs text-secondary-text">
                      📅 <span className="text-primary-text">{new Date(task.scheduled_date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </p>
                  )}
                  {task.description && (
                    <p className="text-xs text-secondary-text line-clamp-4">{task.description}</p>
                  )}
                </div>
              )}

              {/* Tangential tasks queue */}
              {suggestedTasks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">Suggested Tasks</h3>
                  <ul className="space-y-2">
                    {suggestedTasks.map((st, i) => {
                      const added = addedTaskTitles.has(st.title);
                      const saving = addingTaskId === st.title;
                      return (
                        <li key={i} className="rounded-lg bg-gray-90 border border-gray-80 p-2.5 space-y-1">
                          <p className="text-xs font-medium text-primary-text leading-snug">{st.title}</p>
                          {st.description && <p className="text-[11px] text-secondary-text line-clamp-2">{st.description}</p>}
                          <button
                            onClick={() => saveTaskToGoal(st)}
                            disabled={added || saving}
                            className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors ${
                              added ? 'bg-gray-70 text-gray-50' : 'bg-green-70 hover:bg-green-60 text-white'
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
            border-r border-gray-80 bg-gradient-to-tl from-brand-90 to-background backdrop-blur
          `}>
            <div className="px-4 pt-4 pb-2 shrink-0 border-b border-gray-80 bg-gray-90/40">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-brand-40" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">Focus Assistant</h2>
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

          {/* ── Right: Notes panel ──────────────────────────────────── */}
          <aside className={`
            md:flex md:flex-col md:w-[240px] lg:w-[280px] md:shrink-0
            ${activePanel === 'notes' ? 'flex flex-col w-full' : 'hidden'}
            bg-gray-90/40 overflow-hidden
          `}>
            <div className="px-4 pt-4 pb-2 shrink-0 border-b border-gray-80">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-40" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">Session Notes</h2>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-hidden">
              <FocusNotes notes={notes} onChange={setNotes} onNoteAdded={handleNoteAdded} onNoteEdited={handleNoteEdited} />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default TaskFocusMode;
