-- Add missing fields to summaries table to match the Summary interface
-- This migration adds scope, title, description, type, and week_start fields

-- Add new columns to summaries table
ALTER TABLE summaries
ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'week',
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS week_start text;

-- Remove the default from scope after backfilling (if needed)
-- In production, you might want to backfill existing rows first
-- ALTER TABLE summaries ALTER COLUMN scope DROP DEFAULT;

-- Add an index on week_start for faster queries
CREATE INDEX IF NOT EXISTS idx_summaries_week_start ON summaries(week_start);

-- Add an index on user_id and week_start for common queries
CREATE INDEX IF NOT EXISTS idx_summaries_user_week ON summaries(user_id, week_start);
