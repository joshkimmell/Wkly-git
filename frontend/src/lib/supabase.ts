import { createClient } from '@supabase/supabase-js';
// import dotenv from 'dotenv';
// dotenv.config();
// import 'dotenv/config';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY;
export const supabaseRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
// export const supabaseUrl = process.env.SUPABASE_URL;
// export const supabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or anon key is missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.');
}

// On the browser we must use the anon/public key. The service role key must never be exposed to the client.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;

