-- Enable Row Level Security on goal_notes table
ALTER TABLE goal_notes ENABLE ROW LEVEL SECURITY;

-- Users can only select their own notes
CREATE POLICY "goal_notes_select_own" ON goal_notes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert notes for themselves
CREATE POLICY "goal_notes_insert_own" ON goal_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own notes
CREATE POLICY "goal_notes_update_own" ON goal_notes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own notes
CREATE POLICY "goal_notes_delete_own" ON goal_notes
  FOR DELETE USING (auth.uid() = user_id);
