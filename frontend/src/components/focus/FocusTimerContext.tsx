/**
 * FocusTimerContext
 *
 * A global timer that outlives the TaskFocusMode overlay.
 * Uses a stored start-timestamp so elapsed is accurate after
 * component unmount, navigation, or page refresh.
 */
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
export type TimerState = 'idle' | 'running' | 'paused';

const BG_TIMER_KEY = 'wkly_bg_timer';

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

  // ── Timer mutators ──────────────────────────────────────────────────────────

  const initTimer = useCallback((taskId: string, accumulatedSeconds: number) => {
    const t: StoredTimer = { taskId, accumulatedSeconds, startedAt: null };
    saveTimer(t);
    setTimer(t);
    setElapsed(accumulatedSeconds);
  }, []);

  const startTimer = useCallback((taskId: string, accumulatedSeconds = 0) => {
    const t: StoredTimer = { taskId, accumulatedSeconds, startedAt: Date.now() };
    saveTimer(t);
    setTimer(t);
    setElapsed(accumulatedSeconds);
  }, []);

  const pauseTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev) return prev;
      const acc = compute(prev);
      const updated: StoredTimer = { ...prev, accumulatedSeconds: acc, startedAt: null };
      saveTimer(updated);
      setElapsed(acc);
      return updated;
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev) return prev;
      const updated: StoredTimer = { ...prev, startedAt: Date.now() };
      saveTimer(updated);
      return updated;
    });
  }, []);

  const resetTimer = useCallback(() => {
    removeTimer();
    setTimer(null);
    setElapsed(0);
  }, []);

  const clearTimer = useCallback(() => {
    removeTimer();
    setTimer(null);
    setElapsed(0);
  }, []);

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
      }
    };
    window.addEventListener('task:updated', handleTaskUpdated as EventListener);
    return () => window.removeEventListener('task:updated', handleTaskUpdated as EventListener);
  }, []);

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
