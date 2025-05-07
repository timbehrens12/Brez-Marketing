import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for consistent page data refresh behavior
 * 
 * This hook ensures that:
 * 1. Data is immediately loaded when a page is mounted
 * 2. Data is refreshed when revisiting a page (even quickly)
 * 3. Prevents excessive API calls with a minimum refresh interval
 */
export function usePageDataRefresh<T>(
  fetchFunction: () => Promise<T>,
  initialState: T,
  minRefreshInterval: number = 2000 // Minimum milliseconds between refreshes
) {
  const [data, setData] = useState<T>(initialState);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track page visibility and last refresh time
  const isVisibleRef = useRef<boolean>(true);
  const lastRefreshTimeRef = useRef<number>(0);
  const refreshPendingRef = useRef<boolean>(false);
  
  // Refresh function that respects the minimum interval
  const refresh = useCallback(async (force: boolean = false) => {
    // If a refresh is already pending, don't schedule another one
    if (refreshPendingRef.current && !force) return;
    
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    
    // If we're under the minimum interval and not forcing, schedule a delayed refresh
    if (!force && timeSinceLastRefresh < minRefreshInterval) {
      console.log('Page refresh scheduled - too soon since last refresh');
      refreshPendingRef.current = true;
      
      setTimeout(() => {
        if (isVisibleRef.current) {
          refresh(true); // Force refresh after delay
        }
        refreshPendingRef.current = false;
      }, minRefreshInterval - timeSinceLastRefresh);
      return;
    }
    
    // Proceed with the refresh
    try {
      setLoading(true);
      setError(null);
      lastRefreshTimeRef.current = now;
      
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, minRefreshInterval]);
  
  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      isVisibleRef.current = isVisible;
      
      // If becoming visible and it's been longer than minRefreshInterval since last refresh
      if (isVisible) {
        console.log('Page became visible, refreshing data');
        refresh();
      }
    };
    
    // Update visibility status and add listener
    isVisibleRef.current = document.visibilityState === 'visible';
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial fetch when component mounts
    refresh(true);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refresh]);
  
  return { data, loading, error, refresh };
} 