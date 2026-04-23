-- Add cross-device timer sync columns to focus_sessions.
-- started_at: ISO timestamp when the current run began (null when paused/idle).
--   Devices compute elapsed = accumulated_seconds + (now - started_at) for live accuracy.
-- accumulated_seconds: base seconds before the current run started.
--   Stays constant while running; updated to current elapsed on pause.

ALTER TABLE focus_sessions
  ADD COLUMN IF NOT EXISTS started_at         timestamptz NULL,
  ADD COLUMN IF NOT EXISTS accumulated_seconds integer     NOT NULL DEFAULT 0;
