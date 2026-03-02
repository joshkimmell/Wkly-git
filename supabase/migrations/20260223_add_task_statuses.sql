/*
  # Add Blocked and On hold statuses to task_status enum

  1. Changes
    - Add 'Blocked' and 'On hold' values to task_status enum
    
  Note: PostgreSQL doesn't support removing enum values easily,
  so we add the new values if they don't exist already.
*/

-- Add new task statuses to the enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'Blocked';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'On hold';
