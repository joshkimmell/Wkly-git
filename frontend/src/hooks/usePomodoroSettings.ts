/**
 * usePomodoroSettings
 * Persists Pomodoro/timer preferences to localStorage.
 */
import { useState, useCallback } from 'react';

export type TimerMode = 'pomodoro' | 'basic';

export interface PomodoroSettings {
  timerMode: TimerMode;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number; // sessions before long break
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

const STORAGE_KEY = 'wkly_pomodoro_settings';

const DEFAULTS: PomodoroSettings = {
  timerMode: 'pomodoro',
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  soundEnabled: true,
  notificationsEnabled: true,
};

function load(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(s: PomodoroSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export function usePomodoroSettings() {
  const [settings, setSettingsState] = useState<PomodoroSettings>(load);

  const updateSettings = useCallback((patch: Partial<PomodoroSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}

/** Read-only snapshot — for use outside React (e.g. in timer logic). */
export function getPomodoroSettings(): PomodoroSettings {
  return load();
}
