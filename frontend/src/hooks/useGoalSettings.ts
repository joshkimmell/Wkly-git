/**
 * useGoalSettings
 * Persists goal-workflow preferences to localStorage.
 *
 * Stored settings:
 *  - activeGoalLimit:          3 | 5 | null  (null = no limit; free tier capped to 3)
 *  - weeklyResetEnabled:       boolean
 *  - weeklyResetDay:           0–6 (Sunday=0 … Saturday=6; default Monday=1)
 *  - weeklyReflectionEnabled:  boolean
 */
import { useState, useCallback } from 'react';

export type ActiveGoalLimit = 3 | 5 | null;

export interface GoalSettings {
  activeGoalLimit: ActiveGoalLimit;
  weeklyResetEnabled: boolean;
  weeklyResetDay: number; // 0 = Sunday … 6 = Saturday
  weeklyReflectionEnabled: boolean;
}

const STORAGE_KEY = 'wkly_goal_settings';

const DEFAULTS: GoalSettings = {
  activeGoalLimit: 3,
  weeklyResetEnabled: false,
  weeklyResetDay: 1, // Monday
  weeklyReflectionEnabled: false,
};

function load(): GoalSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(s: GoalSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export function useGoalSettings() {
  const [settings, setSettingsState] = useState<GoalSettings>(load);

  const updateSettings = useCallback((patch: Partial<GoalSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}

/** Read-only snapshot — for use outside React. */
export function getGoalSettings(): GoalSettings {
  return load();
}
