-- Add subscription/payment tier columns to profiles
-- Supports: free, subscription ($9.99/mo or $79.99/yr), one_time ($79.99)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'subscription', 'one_time')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT
    CHECK (subscription_status IS NULL OR subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'expired')),
  ADD COLUMN IF NOT EXISTS tier_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMPTZ;

-- Index for Stripe webhook lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- RLS: users can read their own tier columns (already covered by existing row-level policy)
-- Only service_role can write tier columns — enforce via Supabase client on the server side
