import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { GoalsProvider } from '@context/GoalsContext';
import MenuBtn from '@components/menu-btn';
import WeeklyGoals from '@components/WeeklyGoals';
// import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from '@lib/supabase';
import Auth from '@components/Auth';
import useAuth from '@hooks/useAuth';
import AllGoals from '@components/AllGoals';
import AllSummaries from '@components/AllSummaries';
import AllAccomplishments from '@components/AllAccomplishments';
import { Calendar, Award, LogOut, Home, Text, Sun, Moon } from 'lucide-react';
// import { on } from 'events';

function App() {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  // const [icon, setIcon] = useState<'icon-menu' | 'icon-close'>(
  //   isOpen ? 'icon-close' : 'icon-menu'
  // );
  // Initialize theme based on user's preference
  const [theme, setTheme] = useState<'theme-dark' | 'theme-light'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light'
  );
  
  const handleLogout = async () => {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return;
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('User logged out successfully');
      window.location.href = '/auth'; // Redirect to the auth route
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

    const handleClick = () => {
      // Toggle the menu open/close state
      if (!isOpen) {
        setIsOpen(true);
        // setIcon('icon-close');
      } else {
        setIsOpen(false);
        // setIcon('icon-menu');
      }
      // Call the onClick prop to trigger the menu toggle
      // onClick();
    };

  useEffect(() => {
  if (theme === 'theme-dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}, [theme]);

const toggleTheme = () => {
  setTheme(prev => (prev === 'theme-dark' ? 'theme-light' : 'theme-dark'));
};

  const current = theme === 'theme-dark' ? 'dark' : 'light';
  // const themePrefix = theme === 'theme-dark' ? 'dark:' : '';

  const classMenuItem = `
    menu-container--list--item 
    text-brand-80 
    dark:text-brand-10 
    hover:text-brand-90 
    dark:hover:text-brand-20 
    hover:bg-gray-20 
    dark:hover:bg-gray-80 
    flex 
    items-center 
    px-3 
    py-2 
    text-sm 
    font-medium
  `;

  if (!session) {
    return <Auth />;
  }

  return (
    // <SessionContextProvider supabaseClient={supabase}>
    <div className={`${current}`}>
      <div className={`min-h-screen bg-gray-10 dark:bg-gray-90 text-gray-90 dark:text-gray-10`}>
        <div className="header flex items-center"> 
          <div className="header-brand">
            <div className='header-brand--logo-container relative pr-6'>
            {/* Theme Switcher */}
              <button
                onClick={toggleTheme}
                className="ml-4 p-2 rounded absolute top-0 right-0"
                aria-label="Toggle theme"
              >
                {theme === 'theme-dark' ? <Sun className="w-5 h-5 stroke-gray-10 hover:stroke-gray-30 focus:outline-none" /> : <Moon className="w-5 h-5 stroke-gray-10 hover:stroke-gray-30 focus:outline-none" />}
              </button>
              <Link
                to="/home"
                className="header-brand--logo pr-2 overflow-hidden"
                >
                <embed src="./src/images/logo-large.svg" className='mask-clip-border' />
              </Link>
            </div>
              
              <MenuBtn 
                className="header-brand--menu-btn" 
                onClick={handleClick} //  => setIsOpen(!isOpen) 
                // children= "string"
              />
          </div>
          { isOpen && (
            <div className="menu">
              <div className={`menu-container bg-white dark:bg-gray-100 text-brand-80 dark:text-brand-10 align-right`}>
                <div className="menu-container--list align-flex-end justify-end flex flex-col space-y-2">
                  <Link
                  to="/home"
                  className={`${classMenuItem}`}
                  >
                  <Home className="w-5 h-5 mr-2" />
                  Weekly Goals
                  </Link>
                  <Link
                  to="/goals"
                  className={`${classMenuItem}`}
                  >
                  <Calendar className="w-5 h-5 mr-2" />
                  All Goals
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
                  {/* <div className="flex space-x-8"> */}
                    <Link
                        to="/auth"
                        onClick={handleLogout}
                        className={`${classMenuItem}`}
                    >
                        <LogOut className="w-5 h-5 mr-2" />
                        Log out
                    </Link>
                  {/* </div> */}
                </div>
              </div>
            </div>
          )}
        </div>
        <GoalsProvider>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/home" element={<WeeklyGoals />} />
              <Route path="/goals" element={<AllGoals />} />
              <Route path="/accomplishments" element={<AllAccomplishments />} />
              <Route path="/summaries" element={<AllSummaries />} />
            </Routes>
          </main>
        </GoalsProvider>
      </div>
    </div>
    // </SessionContextProvider>
  );
}

export default App;

