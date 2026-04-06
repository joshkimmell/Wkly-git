import React from 'react';
import Logo from '@components/Logo';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-brand-20 dark:border-brand-80 mt-16 mb-10 md:mb-0 py-8 px-4 sm:px-8 lg:px-16">
      <div className="max-w-8xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo useTheme className="h-5 w-auto opacity-40" />
        </div>

        <p className="text-xs text-secondary-text/50">
          &copy; {year} Wkly. All rights reserved.
        </p>

        <div className="flex items-center gap-4">
          <a href="/terms" className="text-xs text-secondary-text/50 hover:text-secondary-text transition-colors duration-200">
            Terms
          </a>
          <a href="/privacy" className="text-xs text-secondary-text/50 hover:text-secondary-text transition-colors duration-200">
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
