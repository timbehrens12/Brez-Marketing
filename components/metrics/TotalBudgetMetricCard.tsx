'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { MetricCard } from './MetricCard'

interface TotalBudgetMetricCardProps {
  brandId: string
  isManuallyRefreshing?: boolean
}

// Add Window interface to add the _budgetCache property
declare global {
  interface Window {
    _budgetCache?: {
      values: Map<string, number>;
      getByBrandId: (brandId: string) => number | null;
    };
  }
}

// Add a global cache for budget values that persists even during navigation
if (typeof window !== 'undefined' && !window._budgetCache) {
  window._budgetCache = {
    values: new Map<string, number>(),
    getByBrandId: (brandId: string) => window._budgetCache?.values.get(brandId) || null
  };
}

export function TotalBudgetMetricCard({ brandId, isManuallyRefreshing = false }: TotalBudgetMetricCardProps) {
  // Never initialize with zero to avoid flickering
  const [totalBudget, setTotalBudget] = useState(() => {
    // Try to get from cache first
    if (typeof window !== 'undefined' && window._budgetCache?.getByBrandId) {
      const cachedValue = window._budgetCache.getByBrandId(brandId);
      if (cachedValue && cachedValue > 0) {
        console.log(`[TotalBudgetMetricCard] Using cached budget: $${cachedValue}`);
        return cachedValue;
      }
    }
    return 0; // Only use 0 if no cache exists
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [adSetCount, setAdSetCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  
  // Store values in global cache when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && totalBudget > 0) {
      if (!window._budgetCache) {
        window._budgetCache = { values: new Map(), getByBrandId: () => null };
      }
      window._budgetCache.values.set(brandId, totalBudget);
    }
  }, [totalBudget, brandId]);
  
  // Helper function to format time ago for last updated timestamp
  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    
    if (diffSec < 60) return `${diffSec} sec ago`
    if (diffMin < 60) return `${diffMin} min ago`
    return `${diffHour} hr ago`
  }

  // Add a function to detect when a date change is happening
  useEffect(() => {
    // Listen for date change events
    const handleDateRangeChange = (event: Event) => {
      if (!event || !(event instanceof CustomEvent)) return;
      
      const { detail } = event;
      
      // Check if this is a date range change event
      if (detail?.type === 'dateRangeChange') {
        // Keep the loading state true until new data arrives
        setIsLoading(true);
        
        // Don't reset the totalBudget to zero during transitions
        // The existing value will be maintained until new data arrives
        
        console.log('[TotalBudgetMetricCard] Date range changing, maintaining current value during transition');
      }
    };
    
    window.addEventListener('date-range-change', handleDateRangeChange as EventListener);
    
    return () => {
      window.removeEventListener('date-range-change', handleDateRangeChange as EventListener);
    };
  }, []);

  // Modify fetchTotalBudget with NEVER-ZERO approach
  const fetchTotalBudget = useCallback(async () => {
    if (!brandId) return;
    
    let startTime = Date.now();
    console.log(`[TotalBudgetMetricCard] Starting fetch at ${startTime}`);
    
    try {
      // Don't hide current data while loading
      setIsLoading(true);
      
      // Store the current values before we fetch
      const previousBudget = totalBudget;
      const previousAdSetCount = adSetCount;
      
      try {
        // Add timestamp to avoid cache
        const response = await fetch(`/api/meta/total-budget?brandId=${brandId}&activeOnly=true&t=${Date.now()}`);
        
        if (!response.ok) {
          // If the request fails, maintain the previous values
          console.log(`[TotalBudgetMetricCard] Request failed, maintaining previous values: $${previousBudget}`);
          return;
        }
        
        const data = await response.json();
        
        // Log fetch time and results
        const fetchTime = Date.now() - startTime;
        console.log(`[TotalBudgetMetricCard] Fetch completed in ${fetchTime}ms with result:`, data);
        
        if (data.success) {
          // CRITICAL: Only update if we actually have real data and it's not zero
          if (data.totalBudget > 0) {
            setTotalBudget(data.totalBudget);
            setAdSetCount(data.adSetCount);
            setLastFetchTime(new Date());
            
            // Update global cache
            if (typeof window !== 'undefined') {
              if (!window._budgetCache) {
                window._budgetCache = { values: new Map(), getByBrandId: () => null };
              }
              window._budgetCache.values.set(brandId, data.totalBudget);
            }
            
            console.log(`[TotalBudgetMetricCard] Updated to new budget: $${data.totalBudget}`);
          } else if (previousBudget > 0) {
            // CRITICAL: If we get zero back but had a previous value, ALWAYS keep the previous value
            console.log(`[TotalBudgetMetricCard] Received zero budget but KEEPING previous value: $${previousBudget}`);
          }
        } else {
          // On API error, maintain previous non-zero values
          if (previousBudget > 0) {
            console.log(`[TotalBudgetMetricCard] API error, maintaining previous values: $${previousBudget}`);
          }
        }
      } catch (error) {
        // On fetch error, maintain previous values
        if (previousBudget > 0) {
          console.log(`[TotalBudgetMetricCard] Fetch error, maintaining previous values: $${previousBudget}`);
        }
        console.error('[TotalBudgetMetricCard] Error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [brandId, totalBudget, adSetCount]);
  
  // Fetch on initial load
  useEffect(() => {
    if (brandId) {
      fetchTotalBudget()
      
      // Set up auto-refresh every 5 minutes
      const intervalId = setInterval(() => {
        fetchTotalBudget()
      }, 5 * 60 * 1000)
      
      // Clean up on unmount
      return () => clearInterval(intervalId)
    }
  }, [brandId, fetchTotalBudget])
  
  // Add a listener for the metaDataRefreshed event
  useEffect(() => {
    // Define the event handlers
    const handleMetaDataRefreshed = (event: CustomEvent) => {
      // Check if this event is for our brand
      if (event.detail?.brandId === brandId) {
        console.log("[TotalMetaBudget] Received metaDataRefreshed event, refreshing budget data")
        fetchTotalBudget()
      }
    }
    
    const handleCampaignStatusChanged = (event: CustomEvent) => {
      // Campaign status changed, refresh budget
      if (event.detail?.brandId === brandId) {
        console.log("[TotalMetaBudget] Received campaignStatusChanged event, refreshing budget data")
        fetchTotalBudget()
      }
    }
    
    const handleAdSetStatusChanged = (event: CustomEvent) => {
      // Ad set status changed, refresh budget
      if (event.detail?.brandId === brandId) {
        console.log("[TotalMetaBudget] Received adSetStatusChanged event, refreshing budget data")
        fetchTotalBudget()
      }
    }

    // Add the event listeners
    window.addEventListener('metaDataRefreshed', handleMetaDataRefreshed as EventListener)
    window.addEventListener('campaignStatusChanged', handleCampaignStatusChanged as EventListener)
    window.addEventListener('adSetStatusChanged', handleAdSetStatusChanged as EventListener)

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('metaDataRefreshed', handleMetaDataRefreshed as EventListener)
      window.removeEventListener('campaignStatusChanged', handleCampaignStatusChanged as EventListener)
      window.removeEventListener('adSetStatusChanged', handleAdSetStatusChanged as EventListener)
    }
  }, [brandId, fetchTotalBudget])
  
  // Modify the event handling to prevent too many updates
  useEffect(() => {
    if (!brandId) return;
    
    const handleBudgetUpdate = (event: CustomEvent) => {
      const detail = event.detail;
      
      // Ensure the event is for this brand
      if (detail.brandId !== brandId) return;
      
      // console.log(`[TotalMetaBudget] Received budget update from ${detail.source}: ${detail.totalBudget}`);
      
      // Only update if the budget has actually changed
      if (Math.abs(totalBudget - (detail.totalBudget || 0)) > 0.01) {
        // Update the budget
        setTotalBudget(detail.totalBudget || 0);
        
        // Update ad set count if provided
        if (detail.adSetCount !== undefined) {
          setAdSetCount(detail.adSetCount);
        }
        
        // Mark as no longer loading
        setIsLoading(false);
      }
    };
    
    // Add event listener for budget updates
    window.addEventListener('meta-total-budget-updated', handleBudgetUpdate as EventListener);
    
    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('meta-total-budget-updated', handleBudgetUpdate as EventListener);
    };
  }, [brandId, totalBudget]);
  
  return (
    <MetricCard
      title={
        <div className="flex items-center gap-1.5 justify-between w-full">
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="ml-0.5">Total Meta Budget</span>
            {adSetCount > 0 && <span className="text-xs text-gray-400 ml-1">({adSetCount} ad sets)</span>}
          </div>
          <button 
            onClick={fetchTotalBudget} 
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isLoading}
            title="Refresh budget data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      }
      value={totalBudget === 0 && !isManuallyRefreshing ? null : totalBudget} // Never display zero
      data={[]}
      loading={isLoading || isManuallyRefreshing}
      hideChange={true}
      valueFormat="currency"
      prefix="$"
      hideGraph={true}
    />
  )
} 