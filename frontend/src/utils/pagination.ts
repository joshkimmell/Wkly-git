// Small helper utilities for mapping pages between scopes (week/month/year)
// and computing sensible defaults.
export type Scope = 'week' | 'month' | 'year';

export const storageKey = 'wkly:pageByScope';

import { getWeekStartDate } from './functions';

export const computeDefaultForScope = (scope: Scope, now = new Date()): string => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  if (scope === 'week') {
    // Use shared helper so week default matches other code paths
    return getWeekStartDate(now);
  }
  if (scope === 'month') return `${y}-${m}`;
  return `${y}`;
};

// Try to map a previously-selected page from prevScope into a desired targetScope using available pages.
export const mapPageForScope = (
  prevSelected: string | undefined,
  targetScope: Scope,
  pages: string[],
  now = new Date()
): string | undefined => {
  // If there's an explicit remembered page for target scope, caller should check pageByScope first.
  if (!prevSelected) return undefined;

  // prevSelected format: week -> YYYY-MM-DD, month -> YYYY-MM, year -> YYYY
  const isWeek = /^\d{4}-\d{2}-\d{2}$/.test(prevSelected);
  const isMonth = /^\d{4}-\d{2}$/.test(prevSelected);
  const isYear = /^\d{4}$/.test(prevSelected);

  if (targetScope === 'month') {
    if (isWeek) return prevSelected.slice(0, 7);
    if (isMonth) return prevSelected;
    if (isYear) return `${prevSelected}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  if (targetScope === 'year') {
    if (isYear) return prevSelected;
    if (isMonth) return prevSelected.slice(0, 4);
    if (isWeek) return prevSelected.slice(0, 4);
  }

  if (targetScope === 'week') {
    // If prev is week already
    if (isWeek) return prevSelected;
    // If prev is month, attempt to find the latest week in that month from pages
    if (isMonth) {
      const monthPrefix = prevSelected; // YYYY-MM
      const found = pages.find((p) => p.startsWith(monthPrefix));
      return found;
    }
    // If prev is year, find the latest week in that year
    if (isYear) {
      const found = pages.find((p) => p.startsWith(`${prevSelected}-`));
      return found;
    }
  }

  return undefined;
};

export const loadPageByScope = (): Record<string, string> | null => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

export const savePageByScope = (payload: Record<string, string>) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (e) {
    // ignore
  }
};
