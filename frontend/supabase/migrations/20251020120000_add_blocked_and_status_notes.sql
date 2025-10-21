-- Migration: add 'Blocked' value to goal_status enum and add status_notes and status_set_at columns
BEGIN;

-- Add 'Blocked' value to the enum if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'goal_status' AND e.enumlabel = 'Blocked'
  ) THEN
    ALTER TYPE goal_status ADD VALUE 'Blocked';
  END IF;
END$$;

-- Add status_notes and status_set_at columns to goals (if not present)
ALTER TABLE IF EXISTS goals
  ADD COLUMN IF NOT EXISTS status_notes text;

ALTER TABLE IF EXISTS goals
  ADD COLUMN IF NOT EXISTS status_set_at timestamptz;

COMMIT;
