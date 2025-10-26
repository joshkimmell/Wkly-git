import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '@lib/supabase';
import { fetchAllGoals } from '@utils/functions';
import type { Goal as GoalType } from '@utils/goalUtils';

type Goal = GoalType;

interface GoalsContextProps {
  goals: Goal[];
  refreshGoals: () => Promise<void>;
  addGoalToCache: (g: Goal) => void;
  updateGoalInCache: (g: Goal) => void;
  replaceGoalInCache: (oldId: string, newGoal: Goal) => void;
  subscribeToTempId: (tempId: string, cb: (newId: string) => void) => () => void;
  removeGoalFromCache: (id: string) => void;
  isRefreshing: boolean;
  lastUpdated?: number;
}

const GoalsContext = createContext<GoalsContextProps | undefined>(undefined);

export const GoalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | undefined>(undefined);

  const refreshGoals = async () => {
    try {
      setIsRefreshing(true);
      const fetched = await fetchAllGoals();
      setGoals(fetched || []);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('Failed to refresh goals', err);
    }
    finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // initial load
    refreshGoals();

    // subscribe to realtime changes in goals table and patch local cache
    // Using supabase Realtime v2 channel API
    // Guard subscription: only in browser and when VITE_SUPABASE_URL is set
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    if (typeof window === 'undefined' || !supabaseUrl) {
      return;
    }

    let channel: any = null;
    const subscribeDelay = 200; // initial ms
    let retryTimer: number | undefined;

    const subscribeWithRetry = (attempt = 0) => {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30_000); // exponential backoff up to 30s
      retryTimer = window.setTimeout(async () => {
        try {
          channel = supabase
            .channel('public:goals')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, (payload: any) => {
              const row = payload.new ?? payload.old;
              if (!row) return;
              if (payload.eventType === 'INSERT') {
                setGoals((prev) => [row, ...prev]);
              } else if (payload.eventType === 'UPDATE') {
                setGoals((prev) => prev.map((g) => (g.id === row.id ? row : g)));
              } else if (payload.eventType === 'DELETE') {
                setGoals((prev) => prev.filter((g) => g.id !== row.id));
              }
            })
            .subscribe();

          // If subscribed successfully, no further retries
        } catch (e) {
          console.warn(`Realtime subscription attempt ${attempt} failed, will retry after ${delay}ms`, e);
          // schedule next retry
          subscribeWithRetry(attempt + 1);
        }
      }, attempt === 0 ? subscribeDelay : delay);
    };

    // start the subscription attempts
    subscribeWithRetry(0);

    return () => {
      // clear pending timers
      try {
        if (retryTimer) clearTimeout(retryTimer);
      } catch (e) {
        // ignore
      }

      if (channel) {
        try {
          (supabase.removeChannel as any)(channel).catch((err: any) => {
            console.debug('Supabase removeChannel failed (ignored):', err?.message || err);
          });
        } catch (err) {
          console.debug('Error while attempting to remove Supabase channel (ignored):', err);
        }
      }
    };
  }, []);

  // internal map of listeners waiting for tempId -> newId resolution
  const tempListenersRef = React.useRef<Record<string, Array<(newId: string) => void>>>({});

  const addGoalToCache = (g: Goal) => setGoals((prev) => [g, ...prev]);
  const updateGoalInCache = (g: Goal) => setGoals((prev) => prev.map((p) => (p.id === g.id ? g : p)));

  const replaceGoalInCache = (oldId: string, newGoal: Goal) => {
    setGoals((prev) => prev.map((p) => (p.id === oldId ? newGoal : p)));
    // notify listeners waiting for this temp id
    const listeners = tempListenersRef.current[oldId];
    if (listeners && listeners.length > 0) {
      listeners.forEach((cb) => {
        try {
          cb(newGoal.id);
        } catch (e) {
          console.error('Error in tempId listener', e);
        }
      });
      delete tempListenersRef.current[oldId];
    }
  };

  const subscribeToTempId = (tempId: string, cb: (newId: string) => void) => {
    if (!tempListenersRef.current[tempId]) tempListenersRef.current[tempId] = [];
    tempListenersRef.current[tempId].push(cb);
    return () => {
      const arr = tempListenersRef.current[tempId] || [];
      tempListenersRef.current[tempId] = arr.filter((c) => c !== cb);
      if (tempListenersRef.current[tempId].length === 0) delete tempListenersRef.current[tempId];
    };
  };

  const removeGoalFromCache = (id: string) => setGoals((prev) => prev.filter((p) => p.id !== id));

  return (
    <GoalsContext.Provider value={{ goals, refreshGoals, addGoalToCache, updateGoalInCache, replaceGoalInCache, subscribeToTempId, removeGoalFromCache, isRefreshing, lastUpdated }}>
      {children}
    </GoalsContext.Provider>
  );
};

export const useGoalsContext = () => {
  const context = useContext(GoalsContext);
  if (!context) throw new Error('useGoalsContext must be used within a GoalsProvider');
  return context;
};