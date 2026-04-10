import React from 'react';
import { usePullToRefresh } from '@hooks/usePullToRefresh';
import { RefreshCw } from 'lucide-react';
import { useGoalsContext } from '@context/GoalsContext';

const THRESHOLD = 80;
const MAX_PULL = 120;

/**
 * Drop-in wrapper that adds pull-to-refresh to the page on touch devices.
 * Must be rendered inside <GoalsProvider> so it can access refreshGoals.
 *
 * The indicator is fixed-position (z-index 50) so it appears over the
 * content but below the header (z-index 100).
 */
const PullToRefresh: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { refreshGoals } = useGoalsContext();

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await refreshGoals();
    },
    threshold: THRESHOLD,
    maxPull: MAX_PULL,
  });

  const isActive = pullDistance > 0 || isRefreshing;

  // Indicator slides down from top of viewport as pullDistance grows.
  // At pullDistance=0  → -48px (hidden above fold)
  // At pullDistance=80 → +20px (fully visible, threshold reached)
  const indicatorY = isRefreshing
    ? 20
    : pullDistance === 0
    ? -48
    : Math.round(pullDistance - 48);

  // 0→1 as pullDistance approaches threshold
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const opacity = isRefreshing ? 1 : progress;
  const iconRotation = isRefreshing ? 0 : Math.round(progress * 180);
  const atThreshold = pullDistance >= THRESHOLD;

  return (
    <>
      {/* Pull indicator */}
      {isActive && (
        <div
          role="status"
          aria-label={isRefreshing ? 'Refreshing…' : 'Pull to refresh'}
          aria-live="polite"
          style={{
            position: 'fixed',
            top: `${indicatorY}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            opacity,
            transition: isRefreshing ? 'top 0.15s ease, opacity 0.15s ease' : 'none',
            pointerEvents: 'none',
          }}
          className={`
            flex items-center justify-center
            w-10 h-10 rounded-full
            bg-background-color border border-gray-20 dark:border-gray-70
            shadow-lg
          `}
        >
          <RefreshCw
            className={`w-5 h-5 ${atThreshold || isRefreshing ? 'text-brand-50' : 'text-gray-50'} ${isRefreshing ? 'animate-spin' : ''}`}
            style={isRefreshing ? undefined : { transform: `rotate(${iconRotation}deg)` }}
          />
        </div>
      )}

      {children}
    </>
  );
};

export default PullToRefresh;
