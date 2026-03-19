-- Migration: Add timezone support to profiles
-- Allows users to set their preferred timezone for date/time display

BEGIN;

-- Add timezone column to profiles
-- Default to UTC, users can update to their local timezone
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- Add comment for documentation
COMMENT ON COLUMN profiles.timezone IS 'User timezone in IANA format (e.g., America/New_York, Europe/London, Asia/Tokyo)';

COMMIT;
