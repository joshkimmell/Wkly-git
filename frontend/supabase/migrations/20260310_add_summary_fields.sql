-- Add missing fields to summaries table to match the Summary interface
-- This migration adds scope and description fields
-- Note: The actual database uses summary_id (not id) and summary_type (not type)
-- The backend maps these to id/type for the frontend

-- Add new columns to summaries table
ALTER TABLE summaries
ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'week',
ADD COLUMN IF NOT EXISTS description text;

-- Ensure these columns exist (they should already be there from createSummary.mts)
-- but adding them with IF NOT EXISTS for safety
ALTER TABLE summaries
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS week_start text,
ADD COLUMN IF NOT EXISTS summary_type text;

-- Remove the default from scope after backfilling (if needed)
-- In production, you might want to backfill existing rows first
-- ALTER TABLE summaries ALTER COLUMN scope DROP DEFAULT;

-- Add an index on week_start for faster queries
CREATE INDEX IF NOT EXISTS idx_summaries_week_start ON summaries(week_start);

-- Add an index on user_id and week_start for common queries
CREATE INDEX IF NOT EXISTS idx_summaries_user_week ON summaries(user_id, week_start);
