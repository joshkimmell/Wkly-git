-- Grant base privileges on accomplishments to authenticated and anon roles
-- RLS policies alone aren't sufficient without the underlying GRANT permissions

GRANT SELECT, INSERT, UPDATE, DELETE ON accomplishments TO authenticated;
GRANT SELECT ON accomplishments TO anon;

-- Ensure service_role bypasses RLS (default in Supabase but make explicit)
GRANT ALL ON accomplishments TO service_role;
