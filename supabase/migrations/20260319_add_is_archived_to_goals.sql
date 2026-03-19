-- Add is_archived column to goals table for soft-archiving goals.
-- Archived goals are hidden from all normal views but remain in the DB
-- so summary generation can include them when they fall within the summary scope.

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Index to make filtering non-archived goals fast
CREATE INDEX IF NOT EXISTS idx_goals_is_archived ON public.goals (user_id, is_archived);
