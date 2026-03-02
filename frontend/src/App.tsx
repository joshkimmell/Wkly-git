import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { GoalsProvider } from '@context/GoalsContext';
import ToastNotification, { notifySuccess, notifyError } from '@components/ToastyNotification';
// import WeeklyGoals from '@components/WeeklyGoals';
import AllGoals from '@components/AllGoals';
import HomePage from '@components/HomePage';
import Header from '@components/Header';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from '@lib/supabase';
import useAuth from '@hooks/useAuth';
import Auth from '@components/Auth';
import AllSummaries from '@components/AllSummaries';
// import AllAccomplishments from '@components/AllAccomplishments';
import LoadingSpinner from '@components/LoadingSpinner';
import ProfileManagement from '@components/ProfileManagement';
import NotificationsSettings from '@components/NotificationsSettings';
import AppMuiThemeProvider from './mui/muiTheme';
import appColors from '@styles/appColors';
import MuiCompareDemo from '@components/MuiCompareDemo';



const App: React.FC = () => {
  const { session, isLoading } = useAuth();
  // Allow E2E runs to bypass auth by passing ?test=1 or setting localStorage.WKLY_E2E_TEST = '1'
  const testing = typeof window !== 'undefined' && (window.location.search.includes('test=1') || typeof localStorage !== 'undefined' && localStorage.getItem('WKLY_E2E_TEST') === '1');
  const effectiveSession = testing ? {} : session;
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'theme-dark' | 'theme-light'>(() => {
    // Prefer an explicit user preference saved in localStorage, then fall
    // back to dark theme as the default.
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (stored === 'theme-dark' || stored === 'theme-light') return stored;
    return 'theme-dark';
  });
  const [isOpen, /*setIsOpen*/] = useState(false);

  const toggleTheme = () => setTheme(prev => {
    const next = prev === 'theme-dark' ? 'theme-light' : 'theme-dark';
    // Apply the class synchronously so CSS variables are updated before React
    // re-renders the MUI theme provider (which reads CSS vars at render time).
    if (next === 'theme-dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('theme', next); } catch {}
    return next;
  });

  // const handleToast = () => {
  //   notifySuccess('Action completed successfully!');
  //   notifyError('Something went wrong!');
  // };
  const handleLogout = async () => {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return;
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      notifySuccess('Logged out successfully');
      window.location.href = '/auth'; // Redirect to the auth route
    } catch (error) {
      notifyError('Error logging out.');
      console.error('Error logging out:', error);
    }
  };


  useEffect(() => {
    // Keep the DOM attributes & localStorage in sync with the app-level
    // theme so CSS variables and class-based styles update for both
    // Tailwind/class-based styling and the MUI theme provider.
    if (theme === 'theme-dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
      // ignore
    }
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const current = theme;

  // Apply user preferred palette (if any) on mount and when profile changes
  const { profile } = useAuth();
  useEffect(() => {
    try {
      if (profile?.primary_color) {
        appColors.applyPaletteToRoot(profile.primary_color);
      } else {
        const stored = appColors.getStoredPalette();
        if (stored) appColors.applyPaletteToRoot(stored);
      }
    } catch (e) {
      // ignore
    }
  }, [profile]);


  
  
  // All hooks are called above, now conditionally render UI:
   // Redirect to "/" after login if currently on "/auth"
  useEffect(() => {
    if (effectiveSession && window.location.pathname === '/auth') {
      navigate('/');
    }
  }, [effectiveSession, navigate]);
  
  // Goals are fetched by the GoalsProvider on mount; no need to fetch here.
  
  if (isLoading && !testing) return 
    <div className="fixed top-0 mt-0 h-[100vh] w-full bg-gray-10 dark:bg-gray-90 flex justify-center items-center">
      <div className="loader"><LoadingSpinner /></div>
      {/* <span className="ml-2">Generating plan...</span> */}
    </div>
  if (!effectiveSession) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  // no local loading placeholder; child components can show their own spinners

  return (
    <SessionContextProvider supabaseClient={supabase}>
    <AppMuiThemeProvider mode={theme}>
    <div className={`${current}`}>
      <div className={`min-h-screen bg-background text-primary-text ${current}`}>
        <Header   
          theme={theme}
          toggleTheme={toggleTheme}
          isOpen={isOpen}
          handleLogout={handleLogout}
          />
        <GoalsProvider>
          <main className="max-w-8xl mx-auto px-4 sm:px-8 lg:px-16 py-8">

            <Routes>
              {/* <Route path="/" element={<WeeklyGoals />} /> */}
              <Route path="/" element={<HomePage />} />
              <Route path="/goals" element={<AllGoals />} />
              <Route path="/mui-demo" element={<MuiCompareDemo />} />
              {/* <Route path="/accomplishments" element={<AllAccomplishments />} /> */}
              <Route path="/summaries" element={<AllSummaries />} />
              <Route path="/notifications" element={<NotificationsSettings />} />
              <Route path="/auth" element={<Navigate to="/" replace />} />
              <Route path="/profile" element={<ProfileManagement />} />
            </Routes>
          </main>
        </GoalsProvider>
      </div>
    </div>
    </AppMuiThemeProvider>
        <ToastNotification theme={theme} />
    </SessionContextProvider>
  );
}

export default App;

