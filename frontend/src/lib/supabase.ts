import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Key is missing. Check your .env file.');
}

// export const supabase = createClient(supabaseUrl, supabaseKey);
const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;