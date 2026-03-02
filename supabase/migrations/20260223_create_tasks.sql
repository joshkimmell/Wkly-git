/*
  # Tasks Table for Goal Management

  1. New Table
    - `tasks`
      - `id` (uuid, primary key)
      - `goal_id` (uuid, references goals)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `description` (text)
      - `status` (enum - not started, in progress, done)
      - `scheduled_date` (date)
      - `scheduled_time` (time)
      - `reminder_enabled` (boolean)
      - `reminder_datetime` (timestamptz)
      - `order_index` (integer) - for custom ordering
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on tasks table
    - Add policies for authenticated users to manage their own tasks
*/

-- Create enum for task status
CREATE TYPE task_status AS ENUM (
  'Not started',
  'In progress',
  'Done'
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES goals ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  description text,
  status task_status DEFAULT 'Not started',
  scheduled_date date,
  scheduled_time time,
  reminder_enabled boolean DEFAULT false,
  reminder_datetime timestamptz,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on goal_id for faster queries
CREATE INDEX idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_scheduled_date ON tasks(scheduled_date);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
