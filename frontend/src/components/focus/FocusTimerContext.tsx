/**
 * FocusTimerContext
 *
 * A global timer that outlives the TaskFocusMode overlay.
 * Uses a stored start-timestamp so elapsed is accurate after
 * component unmount, navigation, or page refresh.
 *
 * Cross-device sync strategy:
 *  - On every mutation (start/pause/resume/reset), the timer state is
 *    immediately pushed to the DB via updateTimerState.
 *  - On mount, if no local running timer exists, the DB is queried for
 *    any running session and it is restored — so opening the same task
 *    on a second device shows the same live timer.
 *  - A 30-second poll checks for remote changes (start/pause from another
 *    device) and adopts them if the DB row is newer than our last local
 *    mutation.
 */
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import supabase from '@lib/supabase';
export type TimerState = 'idle' | 'running' | 'paused';

const BG_TIMER_KEY = 'wkly_bg_timer';
const POLL_INTERVAL_MS = 30_000;

interface StoredTimer {
  taskId: string;
  accumulatedSeconds: number;
  /** Unix ms timestamp when the timer was last started; null = not running */
  startedAt: number | null;
}

interface FocusTimerContextValue {
  activeTaskId: string | null;
  /** Live elapsed seconds for the active task, updated every second when running */
  elapsed: number;
  timerState: TimerState;
  /** True when this task currently owns the active timer */
  isActiveFor: (taskId: string) => boolean;
  /** Load an existing elapsed value as paused (restoring from session) */
  initTimer: (taskId: string, accumulatedSeconds: number) => void;
  /** Start the timer from 0 (or a given base) */
  startTimer: (taskId: string, accumulatedSeconds?: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  /** Remove the timer entirely (task completed / discarded) */
  clearTimer: () => void;
  /** Read the current elapsed without subscribing – for use in save callbacks */
  getElapsedSnapshot: () => number;
}

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null);

export function useFocusTimer(): FocusTimerContextValue {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) throw new Error('useFocusTimer must be used within FocusTimerProvider');
  return ctx;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function loadTimer(): StoredTimer | null {
  try {
    const raw = localStorage.getItem(BG_TIMER_KEY);
    return raw ? (JSON.parse(raw) as StoredTimer) : null;
  } catch {
    return null;
  }
}

function saveTimer(t: StoredTimer): void {
  try {
    localStorage.setItem(BG_TIMER_KEY, JSON.stringify(t));
  } catch {}
}

function removeTimer(): void {
  try {
    localStorage.removeItem(BG_TIMER_KEY);
  } catch {}
}

function compute(t: StoredTimer): number {
  if (t.startedAt != null) {
    return t.accumulatedSeconds + Math.floor((Date.now() - t.startedAt) / 1000);
  }
  return t.accumulatedSeconds;
}

// ── DB session type (subset returned by getAllFocusSessions / getFocusSession) ─

interface DbTimerRow {
  task_id: string;
  timer_state: string;
  accumulated_seconds?: number;
  elapsed_seconds: number;
  started_at: string | null;
  updated_at: string;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function FocusTimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useState<StoredTimer | null>(loadTimer);
  const [elapsed, setElapsed] = useState<number>(() => {
    const t = loadTimer();
    return t ? compute(t) : 0;
  });

  // Ref kept in sync so the interval can read without stale closures
  const timerRef = useRef<StoredTimer | null>(timer);
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  // Track when we last mutated locally so the poll doesn't clobber fresh changes
  const lastLocalMutationRef = useRef<number>(0);

  // Single always-on interval – only updates state when timer is running
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = timerRef.current;
      if (t?.startedAt != null) {
        setElapsed(compute(t));
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── DB sync helper ────────────────────────────────────────────────────────

  const syncTimerToDb = useCallback(async (payload: {
    task_id: string;
    timer_state: 'running' | 'paused' | 'idle';
    accumulated_seconds: number;
    started_at: string | null;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      fetch('/.netlify/functions/updateTimerState', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch { /* non-critical */ }
  }, []);

  // ── On mount: restore running timer from DB if none is running locally ────

  useEffect(() => {
    (async () => {
      try {
        const localTimer = loadTimer();
        if (localTimer?.startedAt != null) return; // Already running locally — trust it

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch('/.netlify/functions/getAllFocusSessions', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const sessions: DbTimerRow[] = await res.json();

        const running = sessions.find(s => s.timer_state === 'running' && s.started_at);
        if (!running) return;

        // Don't overwrite a local paused timer for a different task
        if (localTimer && localTimer.taskId !== running.task_id) return;

        const startedAtMs = new Date(running.started_at!).getTime();
        const t: StoredTimer = {
          taskId: running.task_id,
          accumulatedSeconds: running.accumulated_seconds ?? 0,
          startedAt: startedAtMs,
        };
        saveTimer(t);
        setTimer(t);
        setElapsed(compute(t));
      } catch { /* non-critical */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Poll every 30s to adopt changes made on another device ───────────────

  useEffect(() => {
    const poll = async () => {
      const t = timerRef.current;
      if (!t) return;
      // Skip if we mutated recently (our local state is authoritative)
      if (Date.now() - lastLocalMutationRef.current < POLL_INTERVAL_MS) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch(
          `/.netlify/functions/getFocusSession?task_id=${t.taskId}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        if (!res.ok) return;
        const db: DbTimerRow | null = await res.json();
        if (!db) return;

        const dbUpdatedMs = new Date(db.updated_at).getTime();
        if (dbUpdatedMs <= lastLocalMutationRef.current) return; // Our state is newer

        if (db.timer_state === 'running' && db.started_at && t.startedAt == null) {
          // Another device started the timer
          const updated: StoredTimer = {
            taskId: t.taskId,
            accumulatedSeconds: db.accumulated_seconds ?? 0,
            startedAt: new Date(db.started_at).getTime(),
          };
          saveTimer(updated);
          setTimer(updated);
          setElapsed(compute(updated));
        } else if (db.timer_state !== 'running' && t.startedAt != null) {
          // Another device paused or stopped the timer
          const acc = db.accumulated_seconds ?? db.elapsed_seconds;
          if (db.timer_state === 'idle') {
            removeTimer();
            setTimer(null);
            setElapsed(0);
          } else {
            const updated: StoredTimer = { taskId: t.taskId, accumulatedSeconds: acc, startedAt: null };
            saveTimer(updated);
            setTimer(updated);
            setElapsed(acc);
          }
        }
      } catch { /* non-critical */ }
    };

    const id = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Timer mutators ──────────────────────────────────────────────────────────

  const initTimer = useCallback((taskId: string, accumulatedSeconds: number) => {
    const t: StoredTimer = { taskId, accumulatedSeconds, startedAt: null };
    saveTimer(t);
    setTimer(t);
    setElapsed(accumulatedSeconds);
    // initTimer is used for restoring a paused session; no DB push needed
    // (the DB already has the paused state from when it was saved)
  }, []);

  const startTimer = useCallback((taskId: string, accumulatedSeconds = 0) => {
    const startedAt = Date.now();
    const t: StoredTimer = { taskId, accumulatedSeconds, startedAt };
    saveTimer(t);
    setTimer(t);
    setElapsed(accumulatedSeconds);
    lastLocalMutationRef.current = startedAt;
    syncTimerToDb({
      task_id: taskId,
      timer_state: 'running',
      accumulated_seconds: accumulatedSeconds,
      started_at: new Date(startedAt).toISOString(),
    });
  }, [syncTimerToDb]);

  const pauseTimer = useCallback(() => {
    const prev = timerRef.current;
    if (!prev) return;
    const acc = compute(prev);
    const updated: StoredTimer = { ...prev, accumulatedSeconds: acc, startedAt: null };
    saveTimer(updated);
    setTimer(updated);
    setElapsed(acc);
    lastLocalMutationRef.current = Date.now();
    syncTimerToDb({
      task_id: updated.taskId,
      timer_state: 'paused',
      accumulated_seconds: acc,
      started_at: null,
    });
  }, [syncTimerToDb]);

  const resumeTimer = useCallback(() => {
    const prev = timerRef.current;
    if (!prev) return;
    const startedAt = Date.now();
    const updated: StoredTimer = { ...prev, startedAt };
    saveTimer(updated);
    setTimer(updated);
    lastLocalMutationRef.current = startedAt;
    syncTimerToDb({
      task_id: updated.taskId,
      timer_state: 'running',
      accumulated_seconds: updated.accumulatedSeconds,
      started_at: new Date(startedAt).toISOString(),
    });
  }, [syncTimerToDb]);

  const resetTimer = useCallback(() => {
    const taskId = timerRef.current?.taskId;
    removeTimer();
    setTimer(null);
    setElapsed(0);
    lastLocalMutationRef.current = Date.now();
    if (taskId) syncTimerToDb({ task_id: taskId, timer_state: 'idle', accumulated_seconds: 0, started_at: null });
  }, [syncTimerToDb]);

  const clearTimer = useCallback(() => {
    const taskId = timerRef.current?.taskId;
    removeTimer();
    setTimer(null);
    setElapsed(0);
    lastLocalMutationRef.current = Date.now();
    if (taskId) syncTimerToDb({ task_id: taskId, timer_state: 'idle', accumulated_seconds: 0, started_at: null });
  }, [syncTimerToDb]);

  const isActiveFor = useCallback(
    (taskId: string) => timer?.taskId === taskId,
    [timer],
  );

  const getElapsedSnapshot = useCallback(() => {
    const t = timerRef.current;
    return t ? compute(t) : 0;
  }, []);

  // ── Reset timer when the active task's status leaves "In progress" ──────────
  useEffect(() => {
    const handleTaskUpdated = (e: Event) => {
      const { taskId, status, updates } = (e as CustomEvent).detail ?? {};
      const activeId = timerRef.current?.taskId;
      if (!activeId || taskId !== activeId) return;
      const newStatus = status ?? updates?.status;
      if (newStatus !== undefined && newStatus !== 'In progress') {
        removeTimer();
        setTimer(null);
        setElapsed(0);
        lastLocalMutationRef.current = Date.now();
        syncTimerToDb({ task_id: activeId, timer_state: 'idle', accumulated_seconds: 0, started_at: null });
      }
    };
    window.addEventListener('task:updated', handleTaskUpdated as EventListener);
    return () => window.removeEventListener('task:updated', handleTaskUpdated as EventListener);
  }, [syncTimerToDb]);

  // ── Derived timer state ─────────────────────────────────────────────────────

  const timerState: TimerState =
    timer == null
      ? 'idle'
      : timer.startedAt != null
        ? 'running'
        : timer.accumulatedSeconds > 0
          ? 'paused'
          : 'idle';

  return (
    <FocusTimerContext.Provider
      value={{
        activeTaskId: timer?.taskId ?? null,
        elapsed,
        timerState,
        isActiveFor,
        initTimer,
        startTimer,
        pauseTimer,
        resumeTimer,
        resetTimer,
        clearTimer,
        getElapsedSnapshot,
      }}
    >
      {children}
    </FocusTimerContext.Provider>
  );
}

