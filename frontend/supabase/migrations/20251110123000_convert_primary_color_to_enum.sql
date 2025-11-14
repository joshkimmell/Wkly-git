-- Migration: create an enum for primary_color and convert the profiles.primary_color column
BEGIN;

-- Create enum type for allowed palette keys if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'primary_color_enum') THEN
    CREATE TYPE primary_color_enum AS ENUM ('red','orange','teal','green','blue','indigo','purple');
  END IF;
END$$;

-- If profiles table has the column and it's text, convert it safely to the enum.
-- Use USING to cast existing values; invalid values will fail the ALTER if present.
ALTER TABLE IF EXISTS profiles
  ALTER COLUMN primary_color TYPE primary_color_enum USING (
    CASE
      WHEN primary_color IN ('red','orange','teal','green','blue','indigo','purple') THEN primary_color::primary_color_enum
      ELSE NULL
    END
  );

COMMIT;

-- Note: This migration will convert known values to the enum and set any unknowns to NULL.
-- If you want to enforce that the column must be non-null, add a separate migration to set a default and add NOT NULL.
