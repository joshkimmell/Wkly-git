import { Routes, Route, Link } from 'react-router';
import { Calendar, Award, LogOut, Home, Text } from 'lucide-react';
import { GoalsProvider } from '@context/GoalsContext';
import MenuBtn from '@components/menu-btn';
import WeeklyGoals from '@components/WeeklyGoals';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from '@lib/supabase';
import Auth from '@components/Auth';
import useAuth from '@hooks/useAuth';
import AllGoals from '@components/AllGoals';
import AllSummaries from '@components/AllSummaries';
import AllAccomplishments from '@components/AllAccomplishments';


function App() {
  const { session } = useAuth();
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

  if (!session) {
    return <Auth />;
  }

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <div className="min-h-screen bg-gray-50">
              <div className="header flex items-center"> 
                <div className="header-brand">
                    <Link
                      to="/home"
                      className="header-brand--logo"
                      >
                      <img src="./src/images/logo-large.svg" alt="Logo" className="" />
                    </Link>
                    {/* <div className="header-brand--menu-btn"> */}
                      {/* <button
                        type="button"
                        // className="inline-flex items-center p-2 text-gray-500 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        aria-controls="mobile-menu"
                        aria-expanded="false"
                        >
                        Open main menu
                      </button> */}
                      <MenuBtn
                        onClick={() => {
                          const menu = document.querySelector('.menu');
                          if (menu) {
                            menu.classList.toggle('hidden');
                          }
                        }}
                      />
                    {/* </div> */}
                    {/* </div> */}
                  </div>
                
                <div className='menu'>
                  <div className="menu-container">
                    <div className="menu-container--list">
                      <Link
                        to="/goals"
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 hover:text-indigo-600 menu-container--menu-item"
                      >
                        <Calendar className="w-5 h-5 mr-2" />
                        All Goals
                      </Link>
                      <Link
                        to="/accomplishments"
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 hover:text-indigo-600 menu-container--menu-item"
                      >
                        <Award className="w-5 h-5 mr-2" />
                        Accomplishments
                      </Link>
                      <Link
                        to="/summaries"
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 hover:text-indigo-600 menu-container--menu-item"
                      >
                        <Text className="w-5 h-5 mr-2" />
                        Summaries
                      </Link>
                      <div className="flex space-x-8">
                        <button
                          onClick={handleLogout}
                          className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 hover:text-indigo-600"
                        >
                          <LogOut className="w-5 h-5 mr-2" />
                          Log out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
    </SessionContextProvider>
  );
}

export default App;