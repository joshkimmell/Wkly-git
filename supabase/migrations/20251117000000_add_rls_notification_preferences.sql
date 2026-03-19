-- Migration: enable RLS and create owner policy for notification_preferences
-- Ensures each authenticated user can only access and modify their own preferences

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to select/insert/update/delete only rows where user_id = auth.uid()
CREATE POLICY "Users manage their own notification preferences"
  ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: Supabase's client will pass JWT so auth.uid() returns the user's UUID.
-- If you need broader admin access, consider creating separate policies for service_role or admin roles.
