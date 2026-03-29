-- Focus sessions table: persists timer state, chat history, and recommendations.
-- One session per (task_id, user_id) — upsert on save.
CREATE TABLE IF NOT EXISTS focus_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             uuid        NOT NULL,
  user_id             uuid        REFERENCES auth.users NOT NULL,
  elapsed_seconds     integer     NOT NULL DEFAULT 0,
  timer_state         text        NOT NULL DEFAULT 'idle',
  chat_messages       jsonb       NOT NULL DEFAULT '[]',
  suggested_tasks     jsonb       NOT NULL DEFAULT '[]',
  added_task_titles   jsonb       NOT NULL DEFAULT '[]',
  pending_chat_tasks  jsonb       NOT NULL DEFAULT '[]',
  pending_chat_links  jsonb       NOT NULL DEFAULT '[]',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "focus_sessions_select_own" ON focus_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "focus_sessions_insert_own" ON focus_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "focus_sessions_update_own" ON focus_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "focus_sessions_delete_own" ON focus_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_focus_sessions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER focus_sessions_updated_at
  BEFORE UPDATE ON focus_sessions
  FOR EACH ROW EXECUTE FUNCTION update_focus_sessions_updated_at();
