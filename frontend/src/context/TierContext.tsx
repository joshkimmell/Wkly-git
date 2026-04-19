import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import supabase from '@lib/supabase';

// ── Types (mirrors server-side tierLimits.ts) ──

export type SubscriptionTier = 'free' | 'subscription' | 'one_time';

export interface TierLimits {
  max_active_goals: number | null;
  max_tasks_per_goal: number | null;
  task_scheduling_days: number | null;
  plan_generations_per_goal: number | null;
  goal_refinements_per_day: number | null;
  summaries_per_week: number | null;
  summary_scopes: string[];
  affirmations: 'basic' | 'full';
  forgiveness: 'basic' | 'full';
  momentum_analytics: boolean;
  reflection_prompts: 'limited' | 'full';
  priority_support: boolean;
}

export interface TierStatus {
  tier: SubscriptionTier;
  limits: TierLimits;
  subscription_status: string | null;
  tier_expires_at: string | null;
  usage: Record<string, number>;
  daily_usage: Record<string, number>;
  active_goal_count: number;
}

const DEFAULT_LIMITS: TierLimits = {
  max_active_goals: 3,
  max_tasks_per_goal: 6,
  task_scheduling_days: 7,
  plan_generations_per_goal: 1,
  goal_refinements_per_day: 3,
  summaries_per_week: 1,
  summary_scopes: ['week'],
  affirmations: 'basic',
  forgiveness: 'basic',
  momentum_analytics: false,
  reflection_prompts: 'limited',
  priority_support: false,
};

const DEFAULT_STATUS: TierStatus = {
  tier: 'free',
  limits: DEFAULT_LIMITS,
  subscription_status: null,
  tier_expires_at: null,
  usage: {},
  daily_usage: {},
  active_goal_count: 0,
};

// ── Context ──

export interface TierContextValue {
  status: TierStatus;
  isLoading: boolean;
  isPaid: boolean;
  isFree: boolean;
  refresh: () => Promise<void>;
}

export const TierContext = createContext<TierContextValue>({
  status: DEFAULT_STATUS,
  isLoading: true,
  isPaid: false,
  isFree: true,
  refresh: async () => {},
});

// ── Provider ──

export const TierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<TierStatus>(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedOnce = useRef(false);

  const fetchTierStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setStatus(DEFAULT_STATUS);
        return;
      }

      const res = await fetch('/.netlify/functions/getTierStatus', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(data as TierStatus);
      }
    } catch (err) {
      console.error('[TierProvider] Failed to fetch tier status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;
    fetchTierStatus();
  }, [fetchTierStatus]);

  // Re-fetch when auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchTierStatus();
      } else {
        setStatus(DEFAULT_STATUS);
        setIsLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchTierStatus]);

  // Listen for realtime profile changes (tier updates from Stripe webhook)
  useEffect(() => {
    let active = true;
    let unsub: (() => void) | undefined;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;
      if (!userId || !active) return;

      const channel = supabase
        .channel('tier-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            const newTier = payload.new?.subscription_tier;
            if (newTier) {
              fetchTierStatus();
            }
          }
        )
        .subscribe();

      unsub = () => { supabase.removeChannel(channel); };
    };

    setup();
    return () => {
      active = false;
      unsub?.();
    };
  }, [fetchTierStatus]);

  const isPaid = status.tier === 'subscription' || status.tier === 'one_time';
  const isFree = status.tier === 'free';

  return (
    <TierContext.Provider value={{ status, isLoading, isPaid, isFree, refresh: fetchTierStatus }}>
      {children}
    </TierContext.Provider>
  );
};
