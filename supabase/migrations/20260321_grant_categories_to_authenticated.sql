-- Grant the authenticated role the necessary privileges on the categories table.
-- The RLS policies already restrict what rows each user can see/modify,
-- but without these grants the Supabase REST API returns 403 even for valid sessions.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
