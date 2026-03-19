-- Migration: Backfill existing users into approved_users table
-- This ensures all users who registered before the invite-only system was implemented
-- are added to the approved_users table so they remain in good standing.

INSERT INTO public.approved_users (email, approved_at, approved_by, invitation_method, created_at)
SELECT 
  p.email,
  p.created_at AS approved_at,
  NULL AS approved_by,
  'legacy_user' AS invitation_method,
  NOW() AS created_at
FROM public.profiles p
WHERE p.email IS NOT NULL
  AND p.email NOT IN (SELECT email FROM public.approved_users)
ON CONFLICT (email) DO NOTHING;
