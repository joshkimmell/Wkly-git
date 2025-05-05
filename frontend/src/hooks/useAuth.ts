import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@lib/supabase';

const useAuth = () => {  // Correct custom hook
    const [user, setUser] = useState<Session | null>(null); // Hook call inside a custom hook
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
    return { user };
};

export default useAuth;


// import { useEffect, useState } from 'react';
// import { Session } from '@supabase/supabase-js';
// import { supabase } from '@lib/supabase';

// const [session, setSession] = useState<Session | null>(null);

// export default function useAuth() {

//   useEffect(() => {
//     // Get initial session
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       setSession(session);
//     });

//     // Listen for auth changes
//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange((_event, session) => {
//       setSession(session);
//     });

//     return () => subscription.unsubscribe();
//   }, []);

//   return { session };
// }