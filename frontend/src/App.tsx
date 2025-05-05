import { Routes, Route, Link } from 'react-router';
import { Calendar, Award, LogOut, Home, Text } from 'lucide-react';
import { GoalsProvider } from './context/GoalsContext';
import WeeklyGoals from './components/WeeklyGoals';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from './lib/supabase';
import Auth from '@components/Auth';
import useAuth from 'src/hooks/useAuth';
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
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex space-x-8">
              <Link
                  to="/home"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 hover:text-indigo-600"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Weekly Goals
                </Link>
                <Link
                  to="/goals"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 hover:text-indigo-600"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  All Goals
                </Link>
                <Link
                  to="/accomplishments"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 hover:text-indigo-600"
                >
                  <Award className="w-5 h-5 mr-2" />
                  Accomplishments
                </Link>
                <Link
                  to="/summaries"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 hover:text-indigo-600"
                >
                  <Text className="w-5 h-5 mr-2" />
                  Summaries
                </Link>
              </div>
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
        </nav>
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