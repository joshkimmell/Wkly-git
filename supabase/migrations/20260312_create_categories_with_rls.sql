/*
  # Create Categories Table with RLS

  1. New Table
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique per user)
      - `user_id` (uuid, references auth.users, nullable for default categories)
      - `is_default` (boolean, for system-wide categories)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Users can only see their own categories and default categories
    - Users can only create/update/delete their own categories
    - Default categories are read-only for regular users
*/

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  -- Unique constraint: category name must be unique per user
  CONSTRAINT unique_category_per_user UNIQUE (name, user_id)
);

-- Create unique index for default categories (where user_id is NULL)
CREATE UNIQUE INDEX unique_default_category_name 
  ON categories (name) 
  WHERE user_id IS NULL;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own categories and default categories
CREATE POLICY "Users can view own and default categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR is_default = true
  );

-- Policy: Users can insert their own categories
CREATE POLICY "Users can insert own categories"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND is_default = false
  );

-- Policy: Users can update their own categories (not default ones)
CREATE POLICY "Users can update own categories"
  ON categories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_default = false)
  WITH CHECK (auth.uid() = user_id AND is_default = false);

-- Policy: Users can delete their own categories (not default ones)
CREATE POLICY "Users can delete own categories"
  ON categories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_default = false);

-- Insert default categories if they don't exist
INSERT INTO categories (name, is_default) 
VALUES 
  ('General', true),
  ('Technical skills', true),
  ('Business', true),
  ('Eminence', true),
  ('Concepts', true),
  ('Community', true)
ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
