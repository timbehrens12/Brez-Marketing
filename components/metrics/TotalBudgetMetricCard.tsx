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
}

export function TotalBudgetMetricCard({ brandId, isManuallyRefreshing = false, disableAutoFetch = false, unifiedLoading = false }: TotalBudgetMetricCardProps) {
  const [totalBudget, setTotalBudget] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [adSetCount, setAdSetCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const hasInitialLoadRef = useRef(false)

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
    
    try {
      // Set refreshing state if force refresh
      if (forceRefresh) {
        setIsRefreshing(true)
      }
      
      // Only set loading if we're not in unified loading mode and this is the initial load
      if (!unifiedLoading && !hasInitialLoadRef.current) {
      setIsLoading(true)
      }
      
      // console.log(`[TotalMetaBudget] Fetching budget data for brand ${brandId} with activeOnly=true, forceRefresh=${forceRefresh}`)
      
      // Add cache busting for fresh data when refreshing
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
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error fetching total budget:', error)
      if (!unifiedLoading) {
      toast.error('Failed to fetch total budget')
      }
    } finally {
      if (!unifiedLoading) {
      setIsLoading(false)
      }
      setIsRefreshing(false)
    }
  }, [brandId, unifiedLoading])
  
  // Fetch on initial load and when isManuallyRefreshing changes
  useEffect(() => {
    // Don't auto-fetch if disableAutoFetch is true (unified loading in control)
    if (disableAutoFetch) {
      // console.log("[TotalMetaBudget] Auto-fetch disabled, skipping initial fetch");
      return;
    }
    
    if (brandId && !hasInitialLoadRef.current) {
      // Always force refresh on initial load to get fresh data
      fetchTotalBudget(true)
    }
  }, [brandId, disableAutoFetch])

  // Handle unified loading completion - fetch when unified loading finishes
  useEffect(() => {
    // When unified loading was true and now becomes false, fetch fresh data
    if (unifiedLoading === false && disableAutoFetch && brandId) {
      // console.log("[TotalMetaBudget] Unified loading completed, fetching fresh budget data");
      // Use a small delay to ensure other data fetches complete first
      setTimeout(() => {
        fetchTotalBudget(true); // Force refresh to get latest data
      }, 500);
    }
  }, [unifiedLoading, disableAutoFetch, brandId])
  
  // Add a listener for the metaDataRefreshed event
  useEffect(() => {
    // Define the event handlers
    const handleMetaDataRefreshed = (event: CustomEvent) => {
      // Check if this event is for our brand
      if (event.detail?.brandId === brandId) {
        // console.log("[TotalMetaBudget] Received metaDataRefreshed event, refreshing budget data")
        fetchTotalBudget(true) // Force refresh for event-based updates
      }
    }
    
    const handleCampaignStatusChanged = (event: CustomEvent) => {
      // Campaign status changed, refresh budget
      if (event.detail?.brandId === brandId) {
        // console.log("[TotalMetaBudget] Received campaignStatusChanged event, refreshing budget data")
        fetchTotalBudget(true) // Force refresh for status changes
      }
    }
    
    const handleAdSetStatusChanged = (event: CustomEvent) => {
      // Ad set status changed, refresh budget
      if (event.detail?.brandId === brandId) {
        // console.log("[TotalMetaBudget] Received adSetStatusChanged event, refreshing budget data")
        fetchTotalBudget(true) // Force refresh for status changes
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
  }, [brandId])
  
  return (
    <MetricCard
      title={
        <div className="flex items-center gap-1.5 w-full">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="ml-0.5">Total Meta Budget</span>
            {adSetCount > 0 && <span className="text-xs text-gray-400 ml-1">({adSetCount} ad sets)</span>}
        </div>
      }
      value={totalBudget ?? 0}
      data={[]}
      loading={isLoading || isManuallyRefreshing || unifiedLoading || isRefreshing}
      hideChange={true}
      valueFormat="currency"
      prefix="$"
      hideGraph={true}
      infoTooltip="Shows the total budget for all active Meta ad sets. This value automatically updates when campaigns or ad sets change."
      className="h-full bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
      nullChangeText="N/A"
      nullChangeTooltip="No data for previous period"
    />
  )
} 