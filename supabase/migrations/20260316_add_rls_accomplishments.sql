-- Enable Row Level Security on accomplishments table
ALTER TABLE accomplishments ENABLE ROW LEVEL SECURITY;

-- Users can only select their own accomplishments
CREATE POLICY "accomplishments_select_own" ON accomplishments
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert accomplishments for themselves
CREATE POLICY "accomplishments_insert_own" ON accomplishments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own accomplishments
CREATE POLICY "accomplishments_update_own" ON accomplishments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own accomplishments
CREATE POLICY "accomplishments_delete_own" ON accomplishments
  FOR DELETE USING (auth.uid() = user_id);
