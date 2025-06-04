import { useState, useEffect } from 'react';
// import { Session } from '@supabase/supabase-js';
import supabase from '@lib/supabase';

const useAuth = () => {  // Correct custom hook
    const [session, setSession] = useState<any | null>(null); // Hook call inside a custom hook

        useEffect(() => {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    }, []);

    return { session };
}

export default useAuth;