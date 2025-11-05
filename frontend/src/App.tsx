import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { GoalsProvider } from '@context/GoalsContext';
import { classTabItem } from '@styles/classes';
import ToastNotification, { notifySuccess, notifyError } from '@components/ToastyNotification';
// import WeeklyGoals from '@components/WeeklyGoals';
import AllGoals from '@components/AllGoals';
import Header, { isMenuHidden } from '@components/Header';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from '@lib/supabase';
import useAuth from '@hooks/useAuth';
import Auth from '@components/Auth';
import AllSummaries from '@components/AllSummaries';
import AllAccomplishments from '@components/AllAccomplishments';
import { Award, Home, Text } from 'lucide-react';
import LoadingSpinner from '@components/LoadingSpinner';
import ProfileManagement from '@components/ProfileManagement';
import AppMuiThemeProvider from './mui/muiTheme';
import MuiCompareDemo from '@components/MuiCompareDemo';



const App: React.FC = () => {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'theme-dark' | 'theme-light'>(() => {
    // Prefer an explicit user preference saved in localStorage, then fall
    // back to the OS preference. Keep values in the form expected by the
    // rest of the app: 'theme-dark' | 'theme-light'.
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (stored === 'theme-dark' || stored === 'theme-light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light';
  });
  const [isOpen, /*setIsOpen*/] = useState(false);

  const toggleTheme = () => setTheme(prev => (prev === 'theme-dark' ? 'theme-light' : 'theme-dark'));

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
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
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


  
  
  // All hooks are called above, now conditionally render UI:
   // Redirect to "/" after login if currently on "/auth"
  useEffect(() => {
    if (session && window.location.pathname === '/auth') {
      navigate('/');
    }
  }, [session, navigate]);
  
  // Goals are fetched by the GoalsProvider on mount; no need to fetch here.
  
  if (isLoading) return 
    <div className="fixed top-0 mt-0 h-[100vh] w-full bg-gray-10 dark:bg-gray-90 flex justify-center items-center">
      <div className="loader"><LoadingSpinner /></div>
      {/* <span className="ml-2">Generating plan...</span> */}
    </div>
  if (!session) {
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
      <div className={`min-h-screen bg-gray-10 dark:bg-gray-90 text-gray-90 dark:text-gray-10`}>
        <Header   
          theme={theme}
          toggleTheme={toggleTheme}
          isOpen={isOpen}
          handleLogout={handleLogout}
          />
        <GoalsProvider>
          <main className="max-w-8xl mx-auto px-4 sm:px-8 lg:px-16 py-8">
            <div className="hidden sm:flex">

              {!isMenuHidden() && (
                <div className="tabs w-full justify-between">
                  <div className="border-b border-gray-20 dark:border-gray-70">
                      <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                          <li className="tabs-container--list--item">
                              <a href="/" className={`${classTabItem} ${window.location.pathname === '/' ? ' active' : ''}`}>
                                <Home className="w-5 h-5 mr-2" />
                                Goals
                              </a>
                          </li>
                          {/* <li className="me-2">
                              <a href="/accomplishments" className={`${classTabItem} ${window.location.pathname === '/accomplishments' ? ' active' : ''}`} aria-current="page">
                                <Award className="w-5 h-5 mr-2" />
                                Accomplishments
                              </a>
                          </li> */}
                          <li className="me-2">
                              <a href="/summaries" className={`${classTabItem} ${window.location.pathname === '/summaries' ? ' active' : ''}`} aria-current="page">
                                <Text className="w-5 h-5 mr-2" />
                                Summaries
                              </a>
                          </li>
                      </ul>
                  </div>
                  {/* <div className="me-2 align-flex-end justify-end flex no-wrap">
                      <a href="#" onClick={handleLogout} className="btn-ghost align-flex-end justify-end flex items-center px-3 py-2 text-sm font-medium text-brand-80 dark:text-brand-10 hover:text-brand-90 dark:hover:text-brand-20 hover:bg-gray-20 dark:hover:bg-gray-80 focus:outline-none active:bg-gray-30 active:border-transparent dark:active:bg-gray-70">
                        <LogOut className="w-5 h-5 mr-2" />
                        <span className='whitespace-nowrap'>Log out</span>
                      </a>
                  </div> */}
                </div>
              )}
            </div>
            <Routes>
              {/* <Route path="/" element={<WeeklyGoals />} /> */}
              <Route path="/" element={<AllGoals />} />
              {/* <Route path="/mui-demo" element={<MuiCompareDemo />} /> */}
              {/* <Route path="/accomplishments" element={<AllAccomplishments />} /> */}
              <Route path="/summaries" element={<AllSummaries />} />
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

