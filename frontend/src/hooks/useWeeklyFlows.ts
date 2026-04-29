/**
 * useWeeklyFlows
 *
 * Determines whether the weekly-reset or weekly-reflection flow should be
 * shown today, and exposes helpers to mark them as seen.
 *
 * Storage keys (value = "YYYY-WW" ISO week string):
 *   wkly:weekly_reset_seen     — last week the reset was shown
 *   wkly:weekly_reflection_seen — last week the reflection was shown
 */

import { getGoalSettings } from '@hooks/useGoalSettings';

// ── ISO week helpers ─────────────────────────────────────────────────────────

/** Returns "YYYY-WW" for any Date (ISO 8601 week). */
function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}

const RESET_SEEN_KEY      = 'wkly:weekly_reset_seen';
const REFLECTION_SEEN_KEY = 'wkly:weekly_reflection_seen';

function getSeenKey(key: string): string {
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
}
function setSeenKey(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch {}
}

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Returns true if the weekly-reset flow should be shown today:
 *   – weeklyResetEnabled is on
 *   – today's day-of-week matches settings.weeklyResetDay
 *   – hasn't been shown yet this ISO week
 */
export function shouldShowWeeklyReset(): boolean {
  const settings = getGoalSettings();
  if (!settings.weeklyResetEnabled) return false;
  const today = new Date();
  if (today.getDay() !== settings.weeklyResetDay) return false;
  return getSeenKey(RESET_SEEN_KEY) !== isoWeekKey(today);
}

/**
 * Returns true if the weekly-reflection flow should be shown today:
 *   – weeklyReflectionEnabled is on
 *   – today is the day BEFORE the reset day (end-of-week)
 *   – hasn't been shown yet this ISO week
 */
export function shouldShowWeeklyReflection(): boolean {
  const settings = getGoalSettings();
  if (!settings.weeklyReflectionEnabled) return false;
  const today = new Date();
  // "day before" reset day (wrapping Sunday=0 → Saturday=6)
  const reflectionDay = (settings.weeklyResetDay + 6) % 7;
  if (today.getDay() !== reflectionDay) return false;
  return getSeenKey(REFLECTION_SEEN_KEY) !== isoWeekKey(today);
}

export function markWeeklyResetSeen(): void {
  setSeenKey(RESET_SEEN_KEY, isoWeekKey());
}

export function markWeeklyReflectionSeen(): void {
  setSeenKey(REFLECTION_SEEN_KEY, isoWeekKey());
}
