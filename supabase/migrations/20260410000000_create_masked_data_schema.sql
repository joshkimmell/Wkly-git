-- =============================================================================
-- PRIVACY: Masked data schema
--
-- Purpose
-- -------
-- Create a `masked` schema with per-table views that obfuscate personal
-- content for any user other than the currently identified viewer.
-- Structural / identifying fields (ids, dates, emails) remain visible so
-- admins can inventory users and validate row counts without reading content.
--
-- How it works
-- ------------
-- 1. The caller sets a session variable before querying:
--
--      SET app.current_viewer_id = '<your-supabase-user-uuid>';
--
-- 2. Queries run against `masked.*` views.  Rows where `user_id` matches
--    the session variable show real data; all other rows show '[hidden]'
--    (text) or NULL (jsonb/boolean).
--
-- 3. A `data_viewer` role is created.  It has SELECT only on `masked` views
--    and cannot read any `public` table directly.  Grant this role to any
--    team member or contractor who needs read access via psql / Supabase
--    SQL editor without seeing other users' content.
--
-- Usage in Supabase SQL editor
-- ----------------------------
--    -- Replace with your own user UUID (auth.users.id)
--    SET app.current_viewer_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
--
--    SELECT * FROM masked.user_profiles;    -- all users, identifying info only
--    SELECT * FROM masked.goals;            -- own goals full, others hidden
--    SELECT * FROM masked.tasks;
--    SELECT * FROM masked.focus_sessions;
--    -- … etc.
--
-- Limitations
-- -----------
-- * The postgres superuser and any role with BYPASSRLS can still query
--   public tables directly.  This schema does not replace physical access
--   controls; it provides a safe-viewing interface and a restricted role.
-- * Netlify functions continue to use service_role but already filter every
--   query by `user_id` at the application level.
-- =============================================================================

-- ── Schema ───────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS masked;

-- ── Helper function ──────────────────────────────────────────────────────────

-- Returns true when the row belongs to the session's current viewer.
-- Returns false (not an error) when the variable is unset.
CREATE OR REPLACE FUNCTION masked.is_own_row(row_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT row_user_id = NULLIF(current_setting('app.current_viewer_id', true), '')::uuid;
$$;

-- ── User profiles ─────────────────────────────────────────────────────────────
-- Identifying data only — safe to show for every user.

CREATE OR REPLACE VIEW masked.user_profiles AS
SELECT
  u.id                                          AS user_id,
  u.email,
  u.phone,
  u.created_at,
  u.confirmed_at,
  u.last_sign_in_at,
  u.raw_user_meta_data->>'display_name'         AS display_name,
  u.raw_user_meta_data->>'full_name'            AS full_name,
  u.raw_user_meta_data->>'avatar_url'           AS avatar_url,
  u.is_super_admin,
  u.role
FROM auth.users u;

COMMENT ON VIEW masked.user_profiles IS
  'Identifying profile fields for every user. Safe to view without restriction.';

-- ── goals ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW masked.goals AS
SELECT
  id,
  user_id,
  week_start,
  status,
  status_set_at,
  is_archived,
  created_at,
  updated_at,
  -- content columns
  CASE WHEN masked.is_own_row(user_id) THEN title       ELSE '[hidden]' END AS title,
  CASE WHEN masked.is_own_row(user_id) THEN description ELSE '[hidden]' END AS description,
  CASE WHEN masked.is_own_row(user_id) THEN category    ELSE '[hidden]' END AS category,
  CASE WHEN masked.is_own_row(user_id) THEN status_notes ELSE '[hidden]' END AS status_notes
FROM public.goals;

COMMENT ON VIEW masked.goals IS
  'Goals with content columns masked for non-owner rows.';

-- ── tasks ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW masked.tasks AS
SELECT
  id,
  goal_id,
  user_id,
  status,
  scheduled_date,
  scheduled_time,
  reminder_enabled,
  reminder_datetime,
  order_index,
  created_at,
  updated_at,
  -- content columns
  CASE WHEN masked.is_own_row(user_id) THEN title       ELSE '[hidden]' END AS title,
  CASE WHEN masked.is_own_row(user_id) THEN description ELSE '[hidden]' END AS description
FROM public.tasks;

COMMENT ON VIEW masked.tasks IS
  'Tasks with content columns masked for non-owner rows.';

-- ── goal_notes ────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW masked.goal_notes AS
SELECT
  id,
  goal_id,
  user_id,
  created_at,
  updated_at,
  CASE WHEN masked.is_own_row(user_id) THEN content ELSE '[hidden]' END AS content
FROM public.goal_notes;

-- ── task_notes ────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW masked.task_notes AS
SELECT
  id,
  task_id,
  user_id,
  created_at,
  updated_at,
  CASE WHEN masked.is_own_row(user_id) THEN content ELSE '[hidden]' END AS content
FROM public.task_notes;

-- ── summaries ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW masked.summaries AS
SELECT
  summary_id,
  user_id,
  summary_type,
  week_start,
  scope,
  created_at,
  CASE WHEN masked.is_own_row(user_id) THEN title       ELSE '[hidden]' END AS title,
  CASE WHEN masked.is_own_row(user_id) THEN content     ELSE '[hidden]' END AS content,
  CASE WHEN masked.is_own_row(user_id) THEN description ELSE '[hidden]' END AS description
FROM public.summaries;

-- ── accomplishments ───────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW masked.accomplishments AS
SELECT
  id,
  user_id,
  goal_id,
  week_start,
  created_at,
  CASE WHEN masked.is_own_row(user_id) THEN title       ELSE '[hidden]' END AS title,
  CASE WHEN masked.is_own_row(user_id) THEN description ELSE '[hidden]' END AS description,
  CASE WHEN masked.is_own_row(user_id) THEN impact      ELSE '[hidden]' END AS impact
FROM public.accomplishments;

-- ── focus_sessions ────────────────────────────────────────────────────────────
-- Chat messages and AI suggestions are especially sensitive.

CREATE OR REPLACE VIEW masked.focus_sessions AS
SELECT
  id,
  task_id,
  user_id,
  timer_state,
  created_at,
  updated_at,
  -- keep timing metadata for own rows; strip AI/chat content for others
  CASE WHEN masked.is_own_row(user_id) THEN elapsed_seconds ELSE 0         END AS elapsed_seconds,
  CASE WHEN masked.is_own_row(user_id) THEN chat_messages   ELSE 'null'::jsonb END AS chat_messages,
  CASE WHEN masked.is_own_row(user_id) THEN suggested_tasks ELSE 'null'::jsonb END AS suggested_tasks,
  CASE WHEN masked.is_own_row(user_id) THEN added_task_titles ELSE 'null'::jsonb END AS added_task_titles,
  CASE WHEN masked.is_own_row(user_id) THEN pending_chat_tasks ELSE 'null'::jsonb END AS pending_chat_tasks,
  CASE WHEN masked.is_own_row(user_id) THEN pending_chat_links ELSE 'null'::jsonb END AS pending_chat_links
FROM public.focus_sessions;

-- ── notification_preferences ──────────────────────────────────────────────────

CREATE OR REPLACE VIEW masked.notification_preferences AS
SELECT
  user_id,
  created_at,
  updated_at,
  CASE WHEN masked.is_own_row(user_id) THEN settings ELSE 'null'::jsonb END AS settings
FROM public.notification_preferences;

-- ── categories ────────────────────────────────────────────────────────────────
-- Default categories (user_id IS NULL) are always visible.

CREATE OR REPLACE VIEW masked.categories AS
SELECT
  cat_id,
  user_id,
  is_default,
  created_at,
  CASE WHEN is_default OR masked.is_own_row(user_id) THEN name ELSE '[hidden]' END AS name
FROM public.categories;

-- ── saved_affirmations ────────────────────────────────────────────────────────
-- Which affirmations a user has saved is personal.

CREATE OR REPLACE VIEW masked.saved_affirmations AS
SELECT
  id,
  user_id,
  saved_at,
  CASE WHEN masked.is_own_row(user_id) THEN affirmation_id ELSE NULL END AS affirmation_id
FROM public.saved_affirmations;

-- ── affirmation_preferences ───────────────────────────────────────────────────

CREATE OR REPLACE VIEW masked.affirmation_preferences AS
SELECT
  id,
  user_id,
  updated_at,
  CASE WHEN masked.is_own_row(user_id) THEN daily_notification  ELSE NULL  END AS daily_notification,
  CASE WHEN masked.is_own_row(user_id) THEN notification_time   ELSE NULL  END AS notification_time,
  CASE WHEN masked.is_own_row(user_id) THEN preferred_categories ELSE NULL END AS preferred_categories
FROM public.affirmation_preferences;

-- ── affirmations ──────────────────────────────────────────────────────────────
-- Shared/public content — no masking needed; expose as-is.

CREATE OR REPLACE VIEW masked.affirmations AS
SELECT * FROM public.affirmations;

-- ── access_requests ───────────────────────────────────────────────────────────
-- Admin-facing table. Mask message/notes body for non-own entries.

CREATE OR REPLACE VIEW masked.access_requests AS
SELECT
  id,
  email,
  name,
  status,
  requested_at,
  reviewed_at,
  reviewed_by,
  created_at,
  updated_at,
  CASE
    WHEN email = (current_setting('app.current_viewer_id', true))
      OR masked.is_own_row(reviewed_by)
    THEN message ELSE '[hidden]' END AS message,
  CASE
    WHEN masked.is_own_row(reviewed_by)
    THEN notes ELSE '[hidden]' END AS notes
FROM public.access_requests;

-- ── approved_users ────────────────────────────────────────────────────────────
-- Identifying only — safe to view as-is.

CREATE OR REPLACE VIEW masked.approved_users AS
SELECT * FROM public.approved_users;

-- =============================================================================
-- data_viewer role
-- =============================================================================
-- A restricted PostgreSQL role that:
--   1. Is bound by RLS (no BYPASSRLS attribute)
--   2. Can only SELECT from the masked schema
--   3. Has no access to public tables directly
--
-- To grant this role to a login user (e.g. a contractor):
--   GRANT data_viewer TO "<their-supabase-db-username>";
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'data_viewer') THEN
    CREATE ROLE data_viewer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

-- Access only to the masked schema
GRANT USAGE ON SCHEMA masked TO data_viewer;
GRANT SELECT ON ALL TABLES IN SCHEMA masked TO data_viewer;

-- Allow the role to resolve auth.users (needed for user_profiles view)
GRANT USAGE ON SCHEMA auth TO data_viewer;
GRANT SELECT ON auth.users TO data_viewer;

-- Explicitly revoke direct access to public tables from data_viewer
-- (by default new roles have no public table access, but make it explicit)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM data_viewer;

-- ── Convenience function for admins ──────────────────────────────────────────
-- Call this at the start of any admin SQL session before querying masked views.
--
--   SELECT masked.set_viewer('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
--   SELECT * FROM masked.goals;

CREATE OR REPLACE FUNCTION masked.set_viewer(viewer_id uuid)
RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.current_viewer_id', viewer_id::text, false);
  RETURN 'Viewer set to ' || viewer_id::text || '. Query masked.* views safely.';
END;
$$;

COMMENT ON FUNCTION masked.set_viewer IS
  'Set the current admin viewer ID for the session. '
  'After calling this, masked.* views will show full data for your own rows '
  'and [hidden] for all other users'' content.';
