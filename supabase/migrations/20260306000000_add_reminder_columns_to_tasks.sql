/*
  # Add reminder columns to tasks table (if not already present)

  1. Changes
    - Add `reminder_enabled` column (boolean) - Default false
    - Add `reminder_datetime` column (timestamptz) - Nullable

  2. Migration is safe
    - Uses DO blocks to check if columns exist before adding
    - Won't fail if columns already exist from previous migration
*/

-- Add reminder_enabled column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'reminder_enabled'
  ) THEN
    ALTER TABLE tasks ADD COLUMN reminder_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add reminder_datetime column if it doesn't exist  
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'reminder_datetime'
  ) THEN
    ALTER TABLE tasks ADD COLUMN reminder_datetime timestamptz;
  END IF;
END $$;
