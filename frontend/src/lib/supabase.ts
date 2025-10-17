import { createClient } from '@supabase/supabase-js';
// import dotenv from 'dotenv';
// dotenv.config();
// import 'dotenv/config';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabaseRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
// export const supabaseUrl = process.env.SUPABASE_URL;
// export const supabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseRoleKey) {
  throw new Error('Supabase URL or Key is missing. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, supabaseRoleKey);

export default supabase;

