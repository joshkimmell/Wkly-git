import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  /** Pixels of pull needed to trigger a refresh (default: 80) */
  threshold?: number;
  /** Maximum visual pull distance (default: 120) */
  maxPull?: number;
  /** Resistance factor — lower = more resistance (default: 0.5) */
  resistance?: number;
}

export interface PullToRefreshState {
  /** Current pull distance in px (0–maxPull), for driving visual */
  pullDistance: number;
  /** True while the async onRefresh is running */
  isRefreshing: boolean;
}

/**
 * Adds pull-to-refresh behaviour to the page.
 *
 * Listens on `window` touchstart/touchmove/touchend.
 * Only activates when the page is scrolled to the top (scrollY === 0)
 * and the user pulls downward.
 *
 * Does NOT interfere with useTouchDrag because dragging requires a 400 ms
 * hold before activating; a downward swipe resolves well before that.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  resistance = 0.5,
}: UsePullToRefreshOptions): PullToRefreshState {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs so event handlers never go stale
  const isRefreshingRef = useRef(false);
  const startYRef = useRef<number | null>(null);
  const isAtTopRef = useRef(false);
  const isPullingRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const setPull = useCallback((value: number) => {
    pullDistanceRef.current = value;
    setPullDistance(value);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshingRef.current) return;
    if (window.scrollY === 0) {
      startYRef.current = e.touches[0].clientY;
      isAtTopRef.current = true;
    } else {
      isAtTopRef.current = false;
      startYRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isAtTopRef.current || startYRef.current === null || isRefreshingRef.current) return;

      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        // Scrolling up / not pulling
        return;
      }

      isPullingRef.current = true;
      // Prevent native overscroll bounce while we're handling the pull
      e.preventDefault();
      setPull(Math.min(delta * resistance, maxPull));
    },
    [maxPull, resistance, setPull],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    isAtTopRef.current = false;
    startYRef.current = null;

    const captured = pullDistanceRef.current;
    setPull(0);

    if (captured >= threshold) {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }
    }
  }, [onRefresh, threshold, setPull]);

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    // passive: false so we can call preventDefault and suppress overscroll
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing };
}
