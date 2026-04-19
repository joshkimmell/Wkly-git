-- Usage tracking table — counts per-user feature usage for tier limit enforcement
-- Period is weekly (ISO week start = Monday)

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  period_start DATE NOT NULL,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_usage_per_user_feature_period UNIQUE (user_id, feature, period_start)
);

-- Index for fast lookups by user + feature
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_feature ON usage_tracking (user_id, feature, period_start);

-- RLS: users can read own usage; only service_role can write
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy for authenticated users — only service_role writes
