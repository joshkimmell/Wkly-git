/*
  # Add notes and closing_rationale columns to tasks table

  1. Changes
    - Add `notes` column (text) - for user annotations on tasks
    - Add `closing_rationale` column (text) - for optional completion notes when marking task as Done

  2. Migration is safe
    - Uses IF NOT EXISTS to avoid errors if columns already exist
    - Nullable columns won't break existing data
*/

-- Add notes column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'notes'
  ) THEN
    ALTER TABLE tasks ADD COLUMN notes text;
  END IF;
END $$;

-- Add closing_rationale column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'closing_rationale'
  ) THEN
    ALTER TABLE tasks ADD COLUMN closing_rationale text;
  END IF;
END $$;
