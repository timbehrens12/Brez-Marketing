'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { MetricCard } from './MetricCard'

interface TotalBudgetMetricCardProps {
  brandId: string
  isManuallyRefreshing?: boolean
  disableAutoFetch?: boolean
  unifiedLoading?: boolean
  forceRefresh?: boolean
}

export function TotalBudgetMetricCard({ brandId, isManuallyRefreshing = false, disableAutoFetch = false, unifiedLoading = false, forceRefresh = false }: TotalBudgetMetricCardProps) {
  const [totalBudget, setTotalBudget] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [adSetCount, setAdSetCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null)
  const [nextRetryAfter, setNextRetryAfter] = useState<string | null>(null)
  const hasInitialLoadRef = useRef(false)
  const fetchInProgressRef = useRef(false) // Prevent multiple simultaneous fetches

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

  const fetchTotalBudget = useCallback(async (forceRefresh = false) => {
    if (!brandId) return
    
    // Prevent multiple simultaneous fetches
    if (fetchInProgressRef.current) {
      // console.log("[TotalMetaBudget] Fetch already in progress, skipping duplicate call");
      return
    }
    
    fetchInProgressRef.current = true
    
    try {
      // Set refreshing state if force refresh
      if (forceRefresh) {
        setIsRefreshing(true)
      }
      
      // 🚨 FIXED: Set loading true for the actual fetch, regardless of unified loading
      if (!hasInitialLoadRef.current) {
        setIsLoading(true)
      }
      
      // console.log(`[TotalMetaBudget] Fetching budget data for brand ${brandId} with activeOnly=true, forceRefresh=${forceRefresh}`)
      
      // 🚨 FORCE REFRESH FIX: Always pass forceRefresh when requested to get fresh Meta API data
      const url = forceRefresh 
        ? `/api/meta/total-budget?brandId=${brandId}&activeOnly=true&forceRefresh=true&t=${Date.now()}`
        : `/api/meta/total-budget?brandId=${brandId}&activeOnly=true`
        
      const response = await fetch(url, {
        cache: forceRefresh ? 'no-store' : 'default',
        headers: forceRefresh ? {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        } : {}
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch total budget')
      }
      
      const data = await response.json()
      // console.log(`[TotalMetaBudget] Received data:`, data)
      
      if (data.success) {
        setTotalBudget(data.totalBudget)
        setAdSetCount(data.adSetCount)
        hasInitialLoadRef.current = true
        
        // Handle rate limit notifications (simplified - no toast spam)
        if (data.rateLimited) {
          setRateLimited(true)
          setRateLimitMessage(data.rateLimitMessage || 'Budget may be delayed if changes were made recently')
          setNextRetryAfter(data.nextRetryAfter)
        } else {
          // Clear rate limit state if successful
          setRateLimited(false)
          setRateLimitMessage(null)
          setNextRetryAfter(null)
        }
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error) {
      if (!unifiedLoading) {
      toast.error('Failed to fetch total budget')
      }
    } finally {
      // 🚨 FIXED: Always set loading to false after fetch completes
      setIsLoading(false)
      setIsRefreshing(false)
      fetchInProgressRef.current = false // Reset flag
    }
  }, [brandId, unifiedLoading])
  
  // 🚨 DISABLED: Automatic refresh on page load to prevent rate limiting
  // Use manual refresh button or background sync instead
  useEffect(() => {
    // Just fetch from database cache on page load (no Meta API call)
    if (brandId && !hasInitialLoadRef.current) {
      console.log('[TotalMetaBudget] 📊 Loading budget data from database cache');
      fetchTotalBudget(false); // false = use cached database data
    }
  }, [brandId])

  // Handle unified loading completion - use cached data
  useEffect(() => {
    // When unified loading was true and now becomes false, fetch from database
    if (unifiedLoading === false && disableAutoFetch && brandId) {
      // Use a small delay to ensure other data fetches complete first
      setTimeout(() => {
        fetchTotalBudget(false); // Use cached database data (no Meta API call)
      }, 500);
    }
  }, [unifiedLoading, disableAutoFetch, brandId])
  
  // 🚨 REMOVED: Annoying page focus refresh - only refresh on manual refresh button or mount
  // useEffect(() => {
  //   const handleFocus = () => {
  //     if (brandId && hasInitialLoadRef.current) {
  //       console.log('[TotalMetaBudget] Page focus - refreshing budget data');
  //       fetchTotalBudget(true);
  //     }
  //   };
  //   
  //   window.addEventListener('focus', handleFocus);
  //   return () => window.removeEventListener('focus', handleFocus);
  // }, [brandId])

  // Handle forceRefresh prop - fetch fresh data when forceRefresh is true
  // 🚨 FIXED: forceRefresh should work regardless of disableAutoFetch
  useEffect(() => {
    if (forceRefresh && brandId) {
      console.log('[TotalMetaBudget] forceRefresh=true, fetching fresh budget data with cache bust');
      // Force refresh with extra cache busting
      fetchTotalBudget(true);
    }
  }, [forceRefresh, brandId])
  
  // Add a listener for the metaDataRefreshed event
  useEffect(() => {
    // Define the event handlers
    const handleMetaDataRefreshed = (event: CustomEvent) => {
      // 🚨 DISABLED: To prevent rate limiting
      console.log("[TotalMetaBudget] metaDataRefreshed event IGNORED to prevent rate limits");
      return;
      
      // Check if this event is for our brand
      if (event.detail?.brandId === brandId) {
        // console.log("[TotalMetaBudget] Received metaDataRefreshed event, refreshing budget data")
        fetchTotalBudget(true) // Force refresh for event-based updates
      }
    }
    
    const handleCampaignStatusChanged = (event: CustomEvent) => {
      // 🚨 DISABLED: To prevent rate limiting
      console.log("[TotalMetaBudget] campaignStatusChanged event IGNORED to prevent rate limits");
      return;
      
      // Campaign status changed, refresh budget
      if (event.detail?.brandId === brandId) {
        // console.log("[TotalMetaBudget] Received campaignStatusChanged event, refreshing budget data")
        fetchTotalBudget(true) // Force refresh for status changes
      }
    }
    
    const handleAdSetStatusChanged = (event: CustomEvent) => {
      // 🚨 DISABLED: To prevent rate limiting
      console.log("[TotalMetaBudget] adSetStatusChanged event IGNORED to prevent rate limits");
      return;
      
      // Ad set status changed, refresh budget
      if (event.detail?.brandId === brandId) {
        // console.log("[TotalMetaBudget] Received adSetStatusChanged event, refreshing budget data")
        fetchTotalBudget(true) // Force refresh for status changes
      }
    }

    const handleGlobalRefresh = (event: CustomEvent) => {
      // 🚨 FIXED: Allow manual refresh button but ignore auto-refreshes to prevent rate limiting
      const source = event.detail?.source;
      if (source === 'manual-refresh-button' || source === 'global-refresh') {
        console.log("[TotalMetaBudget] Manual refresh button clicked - refreshing budget data", source);
        fetchTotalBudget(true); // Force refresh for manual button clicks
      } else {
        console.log("[TotalMetaBudget] global refresh event IGNORED to prevent rate limits:", event.type);
      }
    }

    // Add the event listeners
    window.addEventListener('metaDataRefreshed', handleMetaDataRefreshed as EventListener)
    window.addEventListener('campaignStatusChanged', handleCampaignStatusChanged as EventListener)
    window.addEventListener('adSetStatusChanged', handleAdSetStatusChanged as EventListener)
    // 🚨 FIX: Listen for the correct global refresh events
    window.addEventListener('global-refresh-all', handleGlobalRefresh as EventListener)
    window.addEventListener('force-meta-refresh', handleGlobalRefresh as EventListener)
    window.addEventListener('globalRefresh', handleGlobalRefresh as EventListener) // Keep legacy for compatibility

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('metaDataRefreshed', handleMetaDataRefreshed as EventListener)
      window.removeEventListener('campaignStatusChanged', handleCampaignStatusChanged as EventListener)
      window.removeEventListener('adSetStatusChanged', handleAdSetStatusChanged as EventListener)
      // 🚨 FIX: Remove the correct global refresh events
      window.removeEventListener('global-refresh-all', handleGlobalRefresh as EventListener)
      window.removeEventListener('force-meta-refresh', handleGlobalRefresh as EventListener)
      window.removeEventListener('globalRefresh', handleGlobalRefresh as EventListener) // Keep legacy for compatibility
    }
  }, [brandId])
  
  return (
    <MetricCard
      title={
        <div className="flex items-center gap-1.5 w-full">
            <DollarSign className={`h-4 w-4 ${rateLimited ? 'text-orange-500' : 'text-green-500'}`} />
            <span className="ml-0.5">Total Meta Budget</span>
            {rateLimited && <span className="text-xs text-orange-400 ml-1">(Rate Limited)</span>}
            {!rateLimited && adSetCount > 0 && <span className="text-xs text-gray-400 ml-1">({adSetCount} ad sets)</span>}
        </div>
      }
      value={totalBudget ?? 0}
      data={[]}
        loading={isLoading || isManuallyRefreshing || isRefreshing}
      hideChange={true}
      valueFormat="currency"
      prefix="$"
      hideGraph={true}
      infoTooltip={rateLimited 
        ? `${rateLimitMessage}`
        : "Shows the total budget for all active Meta ad sets. Budget may be delayed if changes were made recently."
      }
      className="h-full bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
      nullChangeText="N/A"
      nullChangeTooltip="No data for previous period"
    />
  )
} 