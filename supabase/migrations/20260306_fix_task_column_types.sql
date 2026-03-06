/*
  # Fix task column types

  This migration ensures all task columns have the correct data types.
  The error "invalid input syntax for type json" suggests a column was
  created with the wrong type (jsonb instead of the intended type).

  1. Changes
    - Ensure scheduled_time is type TIME (not json/jsonb)
    - Ensure reminder_enabled is type BOOLEAN (not json/jsonb)
    - Ensure reminder_datetime is type TIMESTAMPTZ (not json/jsonb)
    - Ensure notes is type TEXT (not json/jsonb)
    - Ensure closing_rationale is type TEXT (not json/jsonb)
*/

-- Fix scheduled_time if it's not the correct type
DO $$ 
BEGIN
  -- Drop and recreate with correct type if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'scheduled_time' 
    AND data_type NOT IN ('time without time zone', 'time')
  ) THEN
    ALTER TABLE tasks ALTER COLUMN scheduled_time TYPE time USING NULL;
  END IF;
END $$;

-- Fix reminder_enabled if it's not the correct type
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'reminder_enabled' 
    AND data_type != 'boolean'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN reminder_enabled TYPE boolean USING (reminder_enabled::text::boolean);
    ALTER TABLE tasks ALTER COLUMN reminder_enabled SET DEFAULT false;
  END IF;
END $$;

-- Fix reminder_datetime if it's not the correct type
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'reminder_datetime' 
    AND data_type NOT IN ('timestamp with time zone', 'timestamptz')
  ) THEN
    ALTER TABLE tasks ALTER COLUMN reminder_datetime TYPE timestamptz USING NULL;
  END IF;
END $$;

-- Fix notes if it's not the correct type
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'notes' 
    AND data_type != 'text'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN notes TYPE text USING (notes::text);
  END IF;
END $$;

-- Fix closing_rationale if it's not the correct type
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'closing_rationale' 
    AND data_type != 'text'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN closing_rationale TYPE text USING (closing_rationale::text);
  END IF;
END $$;
