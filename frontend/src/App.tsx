import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { GoalsProvider } from '@context/GoalsContext';
import { classTabItem } from '@styles/classes';
import ToastNotification, { notifySuccess, notifyError } from '@components/ToastyNotification';
// import WeeklyGoals from '@components/WeeklyGoals';
import AllGoals from '@components/AllGoals';
import Header from '@components/Header';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from '@lib/supabase';
import useAuth from '@hooks/useAuth';
import Auth from '@components/Auth';
import AllSummaries from '@components/AllSummaries';
import AllAccomplishments from '@components/AllAccomplishments';
import { Award, LogOut, Home, Text } from 'lucide-react';
import LoadingSpinner from '@components/LoadingSpinner';



const App: React.FC = () => {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'theme-dark' | 'theme-light'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light'
  );
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
  if (theme === 'theme-dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
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
  
  if (isLoading) return <LoadingSpinner />; 
  if (!session) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  return (
    <SessionContextProvider supabaseClient={supabase}>
    <div className={`${current}`}>
      <div className={`min-h-screen bg-gray-10 dark:bg-gray-90 text-gray-90 dark:text-gray-10`}>
        <Header   
          theme={theme}
          toggleTheme={toggleTheme}
          isOpen={isOpen}
          handleLogout={handleLogout}
          />
        <GoalsProvider>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="hidden sm:flex">
              <div className="tabs w-full justify-between">
                <div className="border-b border-gray-20 dark:border-gray-70">
                    <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                        <li className="tabs-container--list--item">
                            <a href="/" className={`${classTabItem} ${window.location.pathname === '/' ? ' active' : ''}`}>
                              <Home className="w-5 h-5 mr-2" />
                              Goals
                            </a>
                        </li>
                        <li className="me-2">
                            <a href="/accomplishments" className={`${classTabItem} ${window.location.pathname === '/accomplishments' ? ' active' : ''}`} aria-current="page">
                              <Award className="w-5 h-5 mr-2" />
                              Accomplishments
                            </a>
                        </li>
                        <li className="me-2">
                            <a href="/summaries" className={`${classTabItem} ${window.location.pathname === '/summaries' ? ' active' : ''}`} aria-current="page">
                              <Text className="w-5 h-5 mr-2" />
                              Summaries
                            </a>
                        </li>
                    </ul>
                </div>
                <div className="me-2 align-flex-end justify-end flex no-wrap">
                    <a href="#" onClick={handleLogout} className="btn-ghost align-flex-end justify-end flex items-center px-3 py-2 text-sm font-medium text-brand-80 dark:text-brand-10 hover:text-brand-90 dark:hover:text-brand-20 hover:bg-gray-20 dark:hover:bg-gray-80 focus:outline-none active:bg-gray-30 active:border-transparent dark:active:bg-gray-70">
                      <LogOut className="w-5 h-5 mr-2" />
                      <span className='whitespace-nowrap'>Log out</span>
                    </a>
                </div>
              </div>
            </div>
            <Routes>
              {/* <Route path="/" element={<WeeklyGoals />} /> */}
              <Route path="/" element={<AllGoals />} />
              <Route path="/accomplishments" element={<AllAccomplishments />} />
              <Route path="/summaries" element={<AllSummaries />} />
              <Route path="/auth" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </GoalsProvider>
        <ToastNotification theme={theme} />
      </div>
    </div>
    </SessionContextProvider>
  );
}

export default App;

