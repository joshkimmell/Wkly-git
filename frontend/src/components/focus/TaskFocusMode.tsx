import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, ChevronRight, Bot, Clock, FileText, Zap, AlertCircle } from 'lucide-react';
import FocusTimer, { TimerState, formatTime } from './FocusTimer';
import FocusAIChat, { SuggestedTask } from './FocusAIChat';
import FocusNotes, { FocusNote } from './FocusNotes';
import FocusFireworks from './FocusFireworks';
import { Task } from '@utils/goalUtils';
import supabase from '@lib/supabase';
import { notifySuccess, notifyError } from '@components/ToastyNotification';

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

  // Notes (session-only)
  const [notes, setNotes] = useState<FocusNote[]>([]);

  // Suggested tangential tasks queue (from AI)
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [addingTaskId, setAddingTaskId] = useState<string | null>(null);
  const [addedTaskTitles, setAddedTaskTitles] = useState<Set<string>>(new Set());

  // Inactivity
  const inactivityTimerRef = useRef<number | null>(null);
  const [showInactivityPrompt, setShowInactivityPrompt] = useState(false);

  // Completion
  const [showFireworks, setShowFireworks] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);

  // Mobile tab panel
  const [activePanel, setActivePanel] = useState<Panel>('ai');

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
    onClose();
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
      if (e.key === 'Escape' && !showFireworks && !showInactivityPrompt) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showFireworks, showInactivityPrompt, onClose]);

  const panelTabs: { id: Panel; label: string; icon: React.ReactNode }[] = [
    { id: 'timer', label: 'Timer', icon: <Clock className="w-4 h-4" /> },
    { id: 'ai', label: 'Assistant', icon: <Bot className="w-4 h-4" /> },
    { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <>
      {showFireworks && <FocusFireworks onDone={handleFireworksDone} />}

      {/* Inactivity Prompt */}
      {showInactivityPrompt && (
        <div className="fixed inset-0 z-[10002] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
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
                className="flex-1 px-4 py-2 rounded-xl border border-gray-600 text-secondary-text hover:border-gray-500 text-sm transition-colors"
              >
                No, pause & exit
              </button>
              <button
                onClick={handleInactivityYes}
                className="flex-1 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
              >
                Yes, I'm on it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main overlay */}
      <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 flex items-center gap-3 px-4 md:px-6 py-3 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Zap className="w-5 h-5 text-violet-400 shrink-0" />
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
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-sm font-mono text-primary-text">
            <Clock className="w-3.5 h-3.5 text-violet-400" />
            <span className="tabular-nums">{formatTime(elapsed)}</span>
            <span className={`w-2 h-2 rounded-full ${timerState === 'running' ? 'bg-green-400 animate-pulse' : timerState === 'paused' ? 'bg-yellow-400' : 'bg-gray-600'}`} />
          </div>

          {/* Mark Done */}
          <button
            onClick={handleMarkDone}
            disabled={markingDone}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shrink-0"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{markingDone ? 'Completing…' : 'Mark Done'}</span>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-800 text-secondary-text transition-colors shrink-0"
            title="Exit focus mode (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile tab bar */}
        <div className="md:hidden flex border-b border-gray-800 shrink-0">
          {panelTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm transition-colors ${
                activePanel === tab.id
                  ? 'text-violet-400 border-b-2 border-violet-500'
                  : 'text-secondary-text hover:text-primary-text'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">

          {/* ── Left: Timer panel (desktop always visible; mobile tab) */}
          <aside className={`
            md:flex md:flex-col md:w-[220px] lg:w-[260px] md:border-r md:border-gray-800 md:shrink-0
            ${activePanel === 'timer' ? 'flex flex-col w-full' : 'hidden'}
            bg-gray-950 overflow-y-auto
          `}>
            <div className="p-4 flex flex-col gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">Focus Timer</h2>
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
                <div className="rounded-xl bg-gray-900 border border-gray-800 p-3 space-y-2">
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
                        <li key={i} className="rounded-lg bg-gray-900 border border-gray-800 p-2.5 space-y-1">
                          <p className="text-xs font-medium text-primary-text leading-snug">{st.title}</p>
                          {st.description && <p className="text-[11px] text-secondary-text line-clamp-2">{st.description}</p>}
                          <button
                            onClick={() => saveTaskToGoal(st)}
                            disabled={added || saving}
                            className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors ${
                              added ? 'bg-gray-700 text-gray-500' : 'bg-emerald-700 hover:bg-emerald-600 text-white'
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
            border-r border-gray-800 bg-gray-950
          `}>
            <div className="px-4 pt-4 pb-2 shrink-0 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">Focus Assistant</h2>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4">
              <FocusAIChat
                taskTitle={task.title}
                taskDescription={task.description}
                goalTitle={goalTitle}
                onAddSuggestedTask={handleAddSuggestedTask}
              />
            </div>
          </main>

          {/* ── Right: Notes panel ──────────────────────────────────── */}
          <aside className={`
            md:flex md:flex-col md:w-[240px] lg:w-[280px] md:shrink-0
            ${activePanel === 'notes' ? 'flex flex-col w-full' : 'hidden'}
            bg-gray-950 overflow-hidden
          `}>
            <div className="px-4 pt-4 pb-2 shrink-0 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">Session Notes</h2>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-hidden">
              <FocusNotes notes={notes} onChange={setNotes} />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default TaskFocusMode;
