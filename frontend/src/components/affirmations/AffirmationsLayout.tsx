import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Sparkles, Archive, Send, Heart, ThumbsUp } from 'lucide-react';

const navItems = [
  { to: '/affirmations', label: 'Today', icon: ThumbsUp, end: true },
  { to: '/affirmations/archive', label: 'Archive', icon: Archive },
  { to: '/affirmations/submit', label: 'Submit', icon: Send },
  { to: '/affirmations/saved', label: 'Saved', icon: Heart },
//   { to: '/affirmations/settings', label: 'Settings', icon: Settings },
];

const AffirmationsLayout: React.FC = () => {
  return (
    <div className="relative flex min-h-[calc(100vh-80px)] -mx-4 sm:-mx-8 lg:-mx-16 -my-8">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-secondary-border bg-background-color/50 px-6 py-8">
        
        <nav className="fixed flex flex-col gap-1 flex-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'text-primary-text bg-brand-20 dark:bg-brand-80 border-l-2 border-brand-60 dark:border-brand-30'
                    : 'text-secondary-text hover:text-primary-text hover:bg-brand-0 dark:hover:bg-gray-80 transition-colors duration-200 border-0'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 px-4 sm:px-8 lg:px-12 py-8 pb-24 lg:pb-8">
          <Outlet />
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-secondary-border">
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
      </nav>
    </div>
  );
};

export default AffirmationsLayout;
