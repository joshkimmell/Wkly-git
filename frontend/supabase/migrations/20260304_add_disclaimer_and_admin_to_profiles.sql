-- Migration: Add disclaimer acceptance and admin fields to profiles
-- Tracks POC disclaimer acknowledgment and admin privileges

BEGIN;

-- Add disclaimer acceptance tracking fields
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS disclaimer_accepted boolean DEFAULT false;

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS disclaimer_accepted_at timestamptz;

-- Add admin flag for access control
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set your email as admin (replace with your actual email)
-- This is a safe operation that won't fail if the profile doesn't exist yet
UPDATE profiles 
SET is_admin = true 
WHERE email = 'jkimmell@gmail.com';

COMMIT;
