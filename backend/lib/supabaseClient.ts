import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Supabase configuration
// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseUrl = process.env.SUPABASE_URL || '';
export const supabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Ensure environment variables are set
if (!supabaseUrl || !supabaseRoleKey) {
  throw new Error('Missing Supabase URL or Service Role Key. Check your .env file.');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseRoleKey);