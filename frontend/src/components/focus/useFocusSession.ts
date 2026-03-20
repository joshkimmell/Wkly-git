import type { FocusNote } from './FocusNotes';
import type { ChatMessage, SuggestedTask, SuggestedLink } from './FocusAIChat';
import type { TimerState } from './FocusTimer';

const STORAGE_PREFIX = 'wkly_focus_';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface FocusSessionData {
  taskId: string;
  elapsed: number;
  /** Saved as 'paused' when running; restored as 'paused' so user resumes manually */
  timerState: Exclude<TimerState, 'running'>;
  notes: FocusNote[];
  chatMessages: ChatMessage[];
  /** IDs of FocusNotes that have already been persisted as task notes */
  savedNoteIds: string[];
  /** Captured AI-suggested tasks queued in the sidebar */
  suggestedTasks: SuggestedTask[];
  /** Titles of suggested tasks already saved to the goal in DB */
  addedTaskTitles: string[];
  /** Last AI-response task suggestions still showing in the chat panel */
  pendingChatTasks: SuggestedTask[];
  /** Last AI-response resource links still showing in the chat panel */
  pendingChatLinks: SuggestedLink[];
  createdAt: number;
  updatedAt: number;
}

const storageKey = (taskId: string) => `${STORAGE_PREFIX}${taskId}`;

export function loadSession(taskId: string): FocusSessionData | null {
  try {
    const raw = localStorage.getItem(storageKey(taskId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FocusSessionData;
    // Basic schema guard
    if (!parsed.taskId || typeof parsed.elapsed !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(data: FocusSessionData): void {
  try {
    localStorage.setItem(
      storageKey(data.taskId),
      JSON.stringify({ ...data, updatedAt: Date.now() }),
    );
  } catch {
    // localStorage quota exceeded — silently ignore
  }
}

export function clearSession(taskId: string): void {
  try {
    localStorage.removeItem(storageKey(taskId));
  } catch {}
}

export function hasSession(taskId: string): boolean {
  try {
    return localStorage.getItem(storageKey(taskId)) !== null;
  } catch {
    return false;
  }
}

/** Returns true if the session's last update was > 7 days ago */
export function isSessionStale(data: FocusSessionData): boolean {
  return Date.now() - data.updatedAt > SESSION_TTL_MS;
}

/** Extend the session TTL by bumping updatedAt to now */
export function extendSession(taskId: string): void {
  const data = loadSession(taskId);
  if (data) saveSession({ ...data, updatedAt: Date.now() });
}
