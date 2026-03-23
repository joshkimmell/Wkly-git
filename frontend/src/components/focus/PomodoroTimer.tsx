/**
 * PomodoroTimer.tsx
 *
 * A Pomodoro-style countdown timer with:
 *  - Focus / short-break / long-break phases (configurable durations)
 *  - Color-coded ring: orange = focus, blue = break
 *  - Sound + browser notification on phase completion
 *  - Auto-advance when autoStart options are on
 *  - Inline-editable duration fields
 *  - Phase state persisted to localStorage so it survives open/close
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Settings } from 'lucide-react';
import type { TimerState } from './FocusTimerContext';
import type { PomodoroSettings } from '@hooks/usePomodoroSettings';
import { playTadaSound, playBreakEndSound, sendFocusNotification, requestNotificationPermission } from './focusNotify';

// ── helpers ───────────────────────────────────────────────────────

export type PomodoroPhase = 'focus' | 'short-break' | 'long-break';

interface PersistedPomodoroState {
  phase: PomodoroPhase;
  remaining: number; // seconds left in current phase
  sessionCount: number; // completed focus sessions
  timerState: TimerState;
  startedAt: number | null; // ms timestamp when countdown last started
}

function phaseKey(taskId: string) {
  return `wkly_pomo_${taskId}`;
}

function loadPhaseState(taskId: string): PersistedPomodoroState | null {
  try {
    const raw = localStorage.getItem(phaseKey(taskId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePhaseState(taskId: string, s: PersistedPomodoroState) {
  try {
    localStorage.setItem(phaseKey(taskId), JSON.stringify(s));
  } catch {}
}

function clearPhaseState(taskId: string) {
  try {
    localStorage.removeItem(phaseKey(taskId));
  } catch {}
}

function computeRemaining(stored: PersistedPomodoroState): number {
  if (stored.startedAt != null && stored.timerState === 'running') {
    const elapsed = Math.floor((Date.now() - stored.startedAt) / 1000);
    return Math.max(0, stored.remaining - elapsed);
  }
  return stored.remaining;
}

function phaseDurationSeconds(phase: PomodoroPhase, settings: PomodoroSettings): number {
  if (phase === 'focus') return settings.focusMinutes * 60;
  if (phase === 'short-break') return settings.shortBreakMinutes * 60;
  return settings.longBreakMinutes * 60;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── component ─────────────────────────────────────────────────────

interface Props {
  taskId: string;
  settings: PomodoroSettings;
  /** Called when the internal timer starts — syncs with FocusTimerContext */
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  /** Overall session timer state from FocusTimerContext (for re-hydration) */
  externalTimerState: TimerState;
}

const PHASE_LABELS: Record<PomodoroPhase, string> = {
  'focus': 'Focus',
  'short-break': 'Short break',
  'long-break': 'Long break',
};

const PHASE_COLORS: Record<PomodoroPhase, { ring: string; text: string; bg: string }> = {
  'focus':       { ring: '#ef4444', text: 'text-red-500',  bg: 'bg-red-50 dark:bg-red-950/30' },
  'short-break': { ring: '#3b82f6', text: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  'long-break':  { ring: '#8b5cf6', text: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
};

const PomodoroTimer: React.FC<Props> = ({
  taskId,
  settings,
  onStart,
  onPause,
  onResume,
  onReset,
  externalTimerState: _externalTimerState,
}) => {
  // ── Init state from localStorage ──────────────────────────────
  const initState = useCallback((): PersistedPomodoroState => {
    const stored = loadPhaseState(taskId);
    if (stored) {
      return {
        ...stored,
        remaining: computeRemaining(stored),
        // Always restore as paused — user must manually resume
        timerState: stored.timerState === 'running' ? 'paused' : stored.timerState,
        startedAt: null,
      };
    }
    return {
      phase: 'focus',
      remaining: settings.focusMinutes * 60,
      sessionCount: 0,
      timerState: 'idle',
      startedAt: null,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const [phase, setPhase] = useState<PomodoroPhase>(() => initState().phase);
  const [remaining, setRemaining] = useState<number>(() => initState().remaining);
  const [sessionCount, setSessionCount] = useState<number>(() => initState().sessionCount);
  const [timerState, setTimerState] = useState<TimerState>(() => {
    const s = initState();
    // If the global FocusTimerContext timer is already running (e.g. user re-opened
    // focus mode while timer was running in background), sync our countdown state.
    if (_externalTimerState === 'running' && s.timerState !== 'idle') return 'running';
    return s.timerState;
  });

  // Local durations — updated immediately on save so ring + button reflect changes
  // before the parent re-renders with the new settings prop.
  const [localDurations, setLocalDurations] = useState({
    focus: settings.focusMinutes,
    short: settings.shortBreakMinutes,
    long: settings.longBreakMinutes,
  });

  // Sync local durations when the prop changes from outside (e.g. Preferences panel)
  useEffect(() => {
    setLocalDurations({
      focus: settings.focusMinutes,
      short: settings.shortBreakMinutes,
      long: settings.longBreakMinutes,
    });
  }, [settings.focusMinutes, settings.shortBreakMinutes, settings.longBreakMinutes]);

  // Editing mode for durations
  const [editingDuration, setEditingDuration] = useState(false);
  const [draftFocus, setDraftFocus] = useState(settings.focusMinutes);
  const [draftShort, setDraftShort] = useState(settings.shortBreakMinutes);
  const [draftLong, setDraftLong] = useState(settings.longBreakMinutes);

  const tickRef = useRef<number | null>(null);
  const phaseRef = useRef(phase);
  const remainingRef = useRef(remaining);
  const sessionCountRef = useRef(sessionCount);
  const timerStateRef = useRef(timerState);
  const settingsRef = useRef(settings);
  const advancePhaseRef = useRef<(fromPhase: PomodoroPhase, fromSessionCount: number) => void>(() => {});

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { remainingRef.current = remaining; }, [remaining]);
  useEffect(() => { sessionCountRef.current = sessionCount; }, [sessionCount]);
  useEffect(() => { timerStateRef.current = timerState; }, [timerState]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // ── Persist state to localStorage ────────────────────────────
  useEffect(() => {
    const s: PersistedPomodoroState = {
      phase, remaining, sessionCount,
      timerState,
      startedAt: timerState === 'running' ? Date.now() : null,
    };
    savePhaseState(taskId, s);
  }, [taskId, phase, remaining, sessionCount, timerState]);

  // Request notification permission on mount
  useEffect(() => {
    if (settings.notificationsEnabled) {
      requestNotificationPermission();
    }
  }, [settings.notificationsEnabled]);

  // ── Phase advancement ─────────────────────────────────────────
  const advancePhase = useCallback((fromPhase: PomodoroPhase, fromSessionCount: number) => {
    const s = settingsRef.current;
    let nextPhase: PomodoroPhase;
    let nextSessionCount = fromSessionCount;

    if (fromPhase === 'focus') {
      nextSessionCount = fromSessionCount + 1;
      const isLongBreak = nextSessionCount % s.longBreakInterval === 0;
      nextPhase = isLongBreak ? 'long-break' : 'short-break';

      // Notify
      if (s.soundEnabled) playTadaSound();
      if (s.notificationsEnabled) {
        sendFocusNotification(
          '🎉 Focus session complete!',
          isLongBreak ? `${nextSessionCount} sessions done — enjoy a long break!` : 'Time for a short break.',
        );
      }
    } else {
      nextPhase = 'focus';
      // Notify
      if (s.soundEnabled) playBreakEndSound();
      if (s.notificationsEnabled) {
        sendFocusNotification('⏰ Break over!', 'Time to focus again.');
      }
    }

    const nextRemaining = phaseDurationSeconds(nextPhase, s);
    setPhase(nextPhase);
    setRemaining(nextRemaining);
    setSessionCount(nextSessionCount);

    const autoStart =
      (nextPhase !== 'focus' && s.autoStartBreaks) ||
      (nextPhase === 'focus' && s.autoStartFocus);

    if (autoStart) {
      setTimerState('running');
      if (nextPhase === 'focus') onStart();
      else onResume();
    } else {
      setTimerState('idle');
      onPause();
    }
  }, [onStart, onPause, onResume]);

  // Keep advancePhaseRef always pointing at the latest advancePhase
  useEffect(() => { advancePhaseRef.current = advancePhase; }, [advancePhase]);

  // ── Tick ─────────────────────────────────────────────────────
  // Empty deps: interval is created once on mount and never restarted.
  // advancePhaseRef ensures we always call the latest version.
  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      if (timerStateRef.current !== 'running') return;
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          advancePhaseRef.current(phaseRef.current, sessionCountRef.current);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ──────────────────────────────────────────────────
  const handleStart = () => {
    setTimerState('running');
    onStart();
  };

  const handlePause = () => {
    setTimerState('paused');
    onPause();
  };

  const handleResume = () => {
    setTimerState('running');
    onResume();
  };

  const handleReset = () => {
    setPhase('focus');
    setRemaining(settings.focusMinutes * 60);
    setSessionCount(0);
    setTimerState('idle');
    clearPhaseState(taskId);
    onReset();
  };

  const handleSkip = () => {
    advancePhase(phase, sessionCount);
  };

  // ── Duration editing ──────────────────────────────────────────
  const handleOpenEdit = () => {
    setDraftFocus(localDurations.focus);
    setDraftShort(localDurations.short);
    setDraftLong(localDurations.long);
    setEditingDuration(true);
  };

  const handleSaveDurations = () => {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const f = clamp(draftFocus, 1, 120);
    const s = clamp(draftShort, 1, 60);
    const l = clamp(draftLong, 1, 120);
    // Update remaining if it matches the current phase default
    if (phase === 'focus' && remaining === localDurations.focus * 60) {
      setRemaining(f * 60);
    } else if (phase === 'short-break' && remaining === localDurations.short * 60) {
      setRemaining(s * 60);
    } else if (phase === 'long-break' && remaining === localDurations.long * 60) {
      setRemaining(l * 60);
    }
    // Update local display state immediately — don't wait for prop round-trip
    setLocalDurations({ focus: f, short: s, long: l });
    // Also patch settingsRef so advancePhase uses new durations right away
    settingsRef.current = { ...settingsRef.current, focusMinutes: f, shortBreakMinutes: s, longBreakMinutes: l };
    // Persist via custom event so usePomodoroSettings state above updates
    try {
      const stored = localStorage.getItem('wkly_pomodoro_settings');
      const current = stored ? JSON.parse(stored) : {};
      localStorage.setItem('wkly_pomodoro_settings', JSON.stringify({
        ...current,
        focusMinutes: f,
        shortBreakMinutes: s,
        longBreakMinutes: l,
      }));
      window.dispatchEvent(new Event('wkly-settings-changed'));
    } catch {}
    setEditingDuration(false);
  };

  // ── Visual ────────────────────────────────────────────────────
  const phaseColors = PHASE_COLORS[phase];
  // Use localDurations so ring updates immediately after saving without waiting for prop
  const totalSeconds =
    phase === 'focus' ? localDurations.focus * 60
    : phase === 'short-break' ? localDurations.short * 60
    : localDurations.long * 60;
  const progress = remaining / totalSeconds; // 1 = full, 0 = empty
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={`flex flex-col items-center gap-4 py-4 rounded-lg transition-colors ${phaseColors.bg}`}>
      {/* Phase badge */}
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold uppercase tracking-wider ${phaseColors.text}`}>
          {PHASE_LABELS[phase]}
        </span>
        {sessionCount > 0 && (
          <span className="text-xs text-secondary-text">
            · session {Math.floor(sessionCount / settings.longBreakInterval) * settings.longBreakInterval + (sessionCount % settings.longBreakInterval) || settings.longBreakInterval} / {settings.longBreakInterval}
          </span>
        )}
      </div>

      {/* Countdown ring */}
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
            className="text-gray-20 dark:text-gray-70 opacity-30" />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={phaseColors.ring}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-mono font-bold text-gray-90 dark:text-white tabular-nums">
            {formatTime(remaining)}
          </span>
          <span className={`text-xs font-medium capitalize mt-0.5 ${phaseColors.text}`}>
            {timerState === 'idle' ? 'ready' : timerState}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {timerState === 'idle' && (
          <button onClick={handleStart} className="btn-primary flex items-center gap-1.5 rounded-full">
            <Play className="w-4 h-4" /> Start
          </button>
        )}
        {timerState === 'running' && (
          <button
            onClick={handlePause}
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-700 hover:!bg-yellow-800 text-white rounded-full text-sm font-medium transition-colors"
          >
            <Pause className="w-4 h-4" /> Pause
          </button>
        )}
        {timerState === 'paused' && (
          <button onClick={handleResume} className="btn-primary flex items-center gap-1.5 rounded-full">
            <Play className="w-4 h-4" /> Resume
          </button>
        )}
        {timerState !== 'idle' && (
          <button onClick={handleReset} title="Reset" className="btn-ghost p-2 rounded-full">
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        <button onClick={handleSkip} title="Skip to next phase" className="btn-ghost p-2 rounded-full">
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Session dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: settings.longBreakInterval }).map((_, i) => {
          const completed = sessionCount % settings.longBreakInterval;
          return (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < completed ? 'bg-red-500' : 'bg-gray-30 dark:bg-gray-60'
              }`}
            />
          );
        })}
        {sessionCount > 0 && (
          <span className="text-xs text-secondary-text ml-1">
            {sessionCount} done
          </span>
        )}
      </div>

      {/* Duration editor toggle */}
      {!editingDuration ? (
        <button
          onClick={handleOpenEdit}
          className="btn-ghost text-xs !text-primary-link hover:underline gap-2"
          >
            {localDurations.focus}/{localDurations.short}/{localDurations.long} min
            <Settings className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2 w-full px-4">
          <p className="text-xs text-secondary-text">Focus / Short / Long (minutes)</p>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={draftFocus}
              onChange={(e) => setDraftFocus(Number(e.target.value))}
              className="w-14 text-center border border-gray-30 dark:border-gray-60 bg-background-color rounded px-1 py-0.5 text-sm"
              min={1} max={120}
            />
            <span className="text-secondary-text">/</span>
            <input
              type="number"
              value={draftShort}
              onChange={(e) => setDraftShort(Number(e.target.value))}
              className="w-14 text-center border border-gray-30 dark:border-gray-60 bg-background-color rounded px-1 py-0.5 text-sm"
              min={1} max={60}
            />
            <span className="text-secondary-text">/</span>
            <input
              type="number"
              value={draftLong}
              onChange={(e) => setDraftLong(Number(e.target.value))}
              className="w-14 text-center border border-gray-30 dark:border-gray-60 bg-background-color rounded px-1 py-0.5 text-sm"
              min={1} max={120}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveDurations} className="btn-primary text-xs px-3 py-1 rounded">Save</button>
            <button onClick={() => setEditingDuration(false)} className="btn-secondary text-xs px-3 py-1 rounded">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;
