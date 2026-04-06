import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Archive, Heart, ThumbsUp, Wind } from 'lucide-react';

const navItems = [
  { to: '/affirmations', label: 'Today', icon: ThumbsUp, end: true },
  { to: '/affirmations/archive', label: 'Archive', icon: Archive },
  { to: '/affirmations/saved', label: 'Saved', icon: Heart },
  { to: '/affirmations/submit', label: 'Submit', icon: Wind },
//   { to: '/affirmations/settings', label: 'Settings', icon: Settings },
];

const AffirmationsLayout: React.FC = () => {
  return (
    <div className="flex min-h-[calc(100vh-80px)] -mx-4 sm:-mx-8 lg:-mx-16 -my-8">
      {/* Desktop Sidebar / Mobile Tabs */}
      <div className="relative flex w-auto shrink-1 border-0 md:px-6 py-0 md:py-8">
        
        <nav className="fixed z-10 flex flex-row w-full justify-end md:justify-start md:w-auto top-34 md:flex-col gap-0 flex-1 bg-gradient-to-t from-background to-background/10 backdrop-blur-md md:bg-transparent pt-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col w-auto md:w-auto md:flex-row items-center gap-0 md:gap-1 px-3 pt-3.5 pb-1.5 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'text-brand-60 dark:text-brand-30 bg-brand-20 dark:bg-brand-90 border-b-2 border-r-0 md:border-r-2 md:border-b-0 border-brand-60 dark:border-brand-30'
                    : 'text-secondary-text border-b-1 border-gray-20 dark:border-gray-80 md:border-b-0 hover:text-brand-60 dark:hover:text-brand-20 hover:bg-brand-20/70 dark:hover:bg-brand-80/30 transition-colors duration-200 border-0'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 px-4 md:px-24 py-24 md:py-16 pb-24 lg:pb-8">
          <Outlet />
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      {/* <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40  bg-gray-20/50 dark:bg-gray-90/50 backdrop-blur-xl border-t border-secondary-border">
        <div className="flex items-center justify-around px-2 py-2 pb-[env(safe-area-inset-bottom)]">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-brand-60 dark:text-brand-30 scale-105'
                    : 'text-secondary-text opacity-60 hover:opacity-100'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav> */}
    </div>
  );
};

export default AffirmationsLayout;
