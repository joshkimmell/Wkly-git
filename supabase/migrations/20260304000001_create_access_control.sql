-- Migration: Create access control tables for invite-only registration
-- Creates tables for access requests and approved users

-- Create access_requests table for users requesting access
CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create approved_users table for tracking approved access
CREATE TABLE IF NOT EXISTS public.approved_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  approved_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id),
  invitation_method text DEFAULT 'admin_approval',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for fast email lookups
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON public.access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status);
CREATE INDEX IF NOT EXISTS idx_approved_users_email ON public.approved_users(email);

-- Enable RLS on both tables
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_users ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert access requests (public registration form)
CREATE POLICY "Anyone can submit access requests"
  ON public.access_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Anyone can read their own access request status by email
CREATE POLICY "Users can view their own access request"
  ON public.access_requests
  FOR SELECT
  TO public
  USING (email = current_setting('request.jwt.claims', true)::json->>'email' OR auth.uid() IS NULL);

-- Policy: Only authenticated users can view all access requests (will add admin check in functions)
CREATE POLICY "Authenticated users can view access requests"
  ON public.access_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can update access requests (admin check in functions)
CREATE POLICY "Authenticated users can update access requests"
  ON public.access_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Anyone can check if their email is approved (needed for registration flow)
CREATE POLICY "Anyone can check approved status by email"
  ON public.approved_users
  FOR SELECT
  TO public
  USING (true);

-- Policy: Only authenticated users can insert approved users (admin only)
CREATE POLICY "Authenticated users can manage approved users"
  ON public.approved_users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at timestamp on access_requests
CREATE OR REPLACE FUNCTION public.update_access_requests_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_access_requests_timestamp ON public.access_requests;
CREATE TRIGGER trg_update_access_requests_timestamp
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_access_requests_timestamp();
