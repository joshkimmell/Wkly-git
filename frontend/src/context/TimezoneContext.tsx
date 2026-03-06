/**
 * TimezoneContext provides the user's timezone throughout the app
 * This allows all date/time operations to respect the user's preferences
 */

import React, { createContext, useContext, ReactNode } from 'react';
import useAuth from '@hooks/useAuth';
import { getBrowserTimezone } from '@utils/timezone';

interface TimezoneContextType {
  timezone: string;
  userTimezone: string; // From profile
  browserTimezone: string; // From browser
}

const TimezoneContext = createContext<TimezoneContextType>({
  timezone: 'UTC',
  userTimezone: 'UTC',
  browserTimezone: 'UTC',
});

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};

interface TimezoneProviderProps {
  children: ReactNode;
}

export const TimezoneProvider: React.FC<TimezoneProviderProps> = ({ children }) => {
  const { profile } = useAuth();
  const browserTimezone = getBrowserTimezone();
  const userTimezone = profile?.timezone || browserTimezone;
  
  // Prefer user's saved timezone, fallback to browser timezone, then UTC
  const timezone = userTimezone || browserTimezone || 'UTC';

  return (
    <TimezoneContext.Provider value={{ timezone, userTimezone, browserTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
};

export default TimezoneContext;
