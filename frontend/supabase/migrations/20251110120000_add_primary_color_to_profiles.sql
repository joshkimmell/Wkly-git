-- Migration: add primary_color column to profiles
BEGIN;

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS primary_color text;

COMMIT;
