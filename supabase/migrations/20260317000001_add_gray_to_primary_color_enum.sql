-- Migration: add 'gray' to the primary_color_enum type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'primary_color_enum' AND e.enumlabel = 'gray'
  ) THEN
    ALTER TYPE primary_color_enum ADD VALUE 'gray';
  END IF;
END
$$;
