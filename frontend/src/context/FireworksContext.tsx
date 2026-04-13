import React, { createContext, useContext, useState, useCallback } from 'react';
import FocusFireworks from '@components/focus/FocusFireworks';

interface FireworksContextValue {
  triggerFireworks: () => void;
}

const FireworksContext = createContext<FireworksContextValue>({ triggerFireworks: () => {} });

export const useFireworks = () => useContext(FireworksContext);

export const FireworksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showFireworks, setShowFireworks] = useState(false);

  const triggerFireworks = useCallback(() => {
    setShowFireworks(true);
  }, []);

  const handleDone = useCallback(() => {
    setShowFireworks(false);
  }, []);

  return (
    <FireworksContext.Provider value={{ triggerFireworks }}>
      {children}
      {showFireworks && <FocusFireworks onDone={handleDone} />}
    </FireworksContext.Provider>
  );
};
