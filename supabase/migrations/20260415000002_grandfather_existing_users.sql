-- Grandfather all existing users into the subscription tier
-- They get full access as a reward for being early adopters

UPDATE profiles
SET subscription_tier = 'subscription',
    subscription_status = 'active',
    tier_started_at = now()
WHERE subscription_tier = 'free'
   OR subscription_tier IS NULL;
