import { useState, useEffect } from 'react';
import supabase from '@lib/supabase';

const useAuth = () => {
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Fetch user profile
    const fetchProfile = async () => {
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*', { head: false, count: 'exact' })
          .eq('id', session.user.id)
          .single();

        if (!error) {
          setProfile(data);
        }
      }
    };

    fetchProfile();
  }, [session]);

  return { session, profile, isLoading };
};

export default useAuth;