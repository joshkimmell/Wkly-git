/*
  # Weekly Goals and Accomplishments Schema

  1. New Tables
    - `goals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `description` (text)
      - `category` (text)
      - `status` (text)
      - `week_start` (date)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `accomplishments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `goal_id` (uuid, references goals, nullable)
      - `title` (text)
      - `description` (text)
      - `impact` (text)
      - `category` (text)
      - `week_start` (date)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create enum for goal categories
CREATE TYPE goal_category AS ENUM (
  'Technical skills',
  'Business',
  'Eminence',
  'Concepts',
  'Community'
);

-- Create enum for goal status
CREATE TYPE goal_status AS ENUM (
  'Not started',
  'In progress',
  'Done'
);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  description text,
  category goal_category NOT NULL,
  status goal_status DEFAULT 'Not started',
  week_start date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create accomplishments table
CREATE TABLE IF NOT EXISTS accomplishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  goal_id uuid REFERENCES goals,
  title text NOT NULL,
  description text,
  impact text,
  category goal_category NOT NULL,
  week_start date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create summaries table
CREATE TABLE IF NOT EXISTS summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  goal_id uuid REFERENCES goals, -- Optional reference to a goal
  accomplishment_id uuid REFERENCES accomplishments, -- Optional reference to an accomplishment
  content text NOT NULL, -- The AI-generated summary
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE accomplishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own goals"
  ON goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own accomplishments"
  ON accomplishments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own summaries
CREATE POLICY "Users can view their own summaries"
  ON summaries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy to allow users to insert their own summaries
CREATE POLICY "Users can insert their own summaries"
  ON summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own summaries
CREATE POLICY "Users can update their own summaries"
  ON summaries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own summaries
CREATE POLICY "Users can delete their own summaries"
  ON summaries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);