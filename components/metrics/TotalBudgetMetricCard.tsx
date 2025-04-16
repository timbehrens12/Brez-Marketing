'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { MetricCard } from './MetricCard'

interface TotalBudgetMetricCardProps {
  brandId: string
  isManuallyRefreshing?: boolean
}

export function TotalBudgetMetricCard({ brandId, isManuallyRefreshing = false }: TotalBudgetMetricCardProps) {
  const [totalBudget, setTotalBudget] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [adSetCount, setAdSetCount] = useState(0)

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

  const fetchTotalBudget = useCallback(async () => {
    if (!brandId) return
    
    try {
      setIsLoading(true)
      console.log(`[TotalMetaBudget] Fetching budget data for brand ${brandId} with activeOnly=true`)
      const response = await fetch(`/api/meta/total-budget?brandId=${brandId}&activeOnly=true`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch total budget')
      }
      
      const data = await response.json()
      console.log(`[TotalMetaBudget] Received data:`, data)
      
      if (data.success) {
        setTotalBudget(data.totalBudget)
        setAdSetCount(data.adSetCount)
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error fetching total budget:', error)
      toast.error('Failed to fetch total budget')
    } finally {
      setIsLoading(false)
    }
  }, [brandId])
  
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
  
  // Add event listener for budget updates from CampaignWidget
  useEffect(() => {
    if (!brandId) return;
    
    const handleBudgetUpdate = (event: CustomEvent) => {
      const detail = event.detail;
      
      // Ensure the event is for this brand
      if (detail.brandId !== brandId) return;
      
      console.log(`[TotalMetaBudget] Received budget update from ${detail.source}: ${detail.totalBudget}`);
      
      // Update the budget and ad set count
      setTotalBudget(detail.totalBudget || 0);
      
      // Mark as no longer loading
      setIsLoading(false);
    };
    
    // Add event listener for budget updates
    window.addEventListener('meta-total-budget-updated', handleBudgetUpdate as EventListener);
    
    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('meta-total-budget-updated', handleBudgetUpdate as EventListener);
    };
  }, [brandId]);
  
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
      value={totalBudget}
      data={[]}
      loading={isLoading || isManuallyRefreshing}
      hideChange={true}
      valueFormat="currency"
      prefix="$"
      hideGraph={true}
    />
  )
} 