import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { GoalsProvider } from '@context/GoalsContext';
import { classTabItem } from '@styles/classes';
import ToastNotification, { notifySuccess, notifyError } from '@components/ToastyNotification';
import WeeklyGoals from '@components/WeeklyGoals';
import Header from '@components/Header';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from '@lib/supabase';
import useAuth from '@hooks/useAuth';
import Auth from '@components/Auth';
import AllSummaries from '@components/AllSummaries';
import AllAccomplishments from '@components/AllAccomplishments';
import { Award, LogOut, Home, Text } from 'lucide-react';
import LoadingSpinner from '@components/LoadingSpinner';



function App() {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'theme-dark' | 'theme-light'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light'
  );
  const [isOpen, setIsOpen] = useState(false);

  const toggleTheme = () => setTheme(prev => (prev === 'theme-dark' ? 'theme-light' : 'theme-dark'));

  const handleToast = () => {
    notifySuccess('Action completed successfully!');
    notifyError('Something went wrong!');
  };
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

//     const handleClick = () => {
//       // Toggle the menu open/close state
//       if (!isOpen) {
//         setIsOpen(true);
//         // setIcon('icon-close');
//       } else {
//         setIsOpen(false);
//         // setIcon('icon-menu');
//       }
//       // Call the onClick prop to trigger the menu toggle
//       // onClick();
//     };

  useEffect(() => {
  if (theme === 'theme-dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}, [theme]);

// const toggleTheme = () => {
//   setTheme(prev => (prev === 'theme-dark' ? 'theme-light' : 'theme-dark'));
// };

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
        {/* <div className="header flex items-center"> 
          <div className="header-brand">
            <div className='header-brand--logo-container relative pr-6'>
              <button
                onClick={toggleTheme}
                className="ml-4 p-2 rounded absolute top-0 right-0"
                aria-label="Toggle theme"
              >
                {theme === 'theme-dark' ? <Sun className="w-5 h-5 stroke-gray-10 hover:stroke-gray-30 focus:outline-none" /> : <Moon className="w-5 h-5 stroke-gray-10 hover:stroke-gray-30 focus:outline-none" />}
              </button>
              <Link
                to="/"
                className="header-brand--logo pr-2 overflow-hidden w-full sm:w-auto h-12 sm:h-16 flex items-center justify-center"
                >
                <img src="/images/logo-large.svg" className='mask-clip-border' />
              </Link>
            </div>
            <div className="block sm:hidden">  
              <MenuBtn 
                className="header-brand--menu-btn" 
                onClick={handleClick} //  => setIsOpen(!isOpen) 
                // children= "string"
              />
            </div>
          </div>
          { isOpen && (
            <div className="menu block sm:hidden">
              <div className={`menu-container bg-white dark:bg-gray-100 text-brand-80 dark:text-brand-10 align-right`}>
                <div className="menu-container--list align-flex-end justify-end flex flex-col space-y-2">
                  <Link
                  to="/"
                  className={`${classMenuItem}`}
                  >
                  <Home className="w-5 h-5 mr-2" />
                  Goals
                  </Link>
                  <Link
                  to="/accomplishments"
                  className={`${classMenuItem}`}
                  >
                  <Award className="w-5 h-5 mr-2" />
                  Accomplishments
                  </Link>
                  <Link
                  to="/summaries"
                  className={`${classMenuItem}`}
                  >
                  <Text className="w-5 h-5 mr-2" />
                  Summaries
                  </Link>
                  <Link
                      to="#"
                      onClick={handleLogout}
                      className={`${classMenuItem}`}
                  >
                      <LogOut className="w-5 h-5 mr-2" />
                      Log out
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div> */}
        <GoalsProvider>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="hidden sm:flex">
              <div className="tabs w-full justify-between">
                <div className="border-b border-gray-20 dark:border-gray-70">
                    <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                        <li className="me-2">
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
              <Route path="/" element={<WeeklyGoals />} />
              <Route path="/accomplishments" element={<AllAccomplishments />} />
              <Route path="/summaries" element={<AllSummaries />} />
              <Route path="/auth" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </GoalsProvider>
        <ToastNotification />
      </div>
    </div>
    </SessionContextProvider>
  );
}

export default App;

