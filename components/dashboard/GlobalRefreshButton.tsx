"use client"

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Info } from 'lucide-react'
import { toast } from 'sonner'

interface GlobalRefreshButtonProps {
  brandId: string
  activePlatforms: {
    shopify: boolean
    meta: boolean
  }
  currentTab?: string
}

const REFRESH_COOLDOWN = 10000 // 10 seconds cooldown

export function GlobalRefreshButton({ brandId, activePlatforms, currentTab = 'site' }: GlobalRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshCooldown, setRefreshCooldown] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [timeAgoDisplay, setTimeAgoDisplay] = useState<string>('')
  const [dataFreshness, setDataFreshness] = useState({ status: 'loading', color: 'text-gray-500' })

  // Helper function to format time ago
  const getTimeAgo = useCallback((date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 30) return 'just now'
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ${Math.floor((diffInSeconds % 3600) / 60)}m ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }, [])

  // Helper to determine data freshness
  const getDataFreshnessStatus = useCallback(() => {
    if (!lastUpdated) return { status: 'loading', color: 'text-gray-500' }
    
    const timeSinceUpdate = Date.now() - lastUpdated.getTime()
    const minutes = Math.floor(timeSinceUpdate / 60000)
    
    if (minutes < 15) return { status: 'fresh', color: 'text-gray-400' }
    if (minutes < 60) return { status: 'stale', color: 'text-orange-400' }
    return { status: 'very-stale', color: 'text-red-400' }
  }, [lastUpdated])

  // Live-updating time display
  useEffect(() => {
    const updateTimeAgo = () => {
      if (lastUpdated) {
        setTimeAgoDisplay(getTimeAgo(lastUpdated))
        setDataFreshness(getDataFreshnessStatus())
      } else {
        setTimeAgoDisplay('Loading...')
        setDataFreshness({ status: 'loading', color: 'text-gray-500' })
      }
    }
    
    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 10000) // Update every 10 seconds
    
    return () => clearInterval(interval)
  }, [lastUpdated, getTimeAgo, getDataFreshnessStatus])

  // Listen for page navigation and data refresh events to update timestamp
  useEffect(() => {
    const updateLastUpdated = () => {
      console.log('[GlobalRefresh] Data refreshed, updating timestamp')
      setLastUpdated(new Date())
    }

    // Listen for various refresh completion events
    const events = [
      'metaDataRefreshed',
      'meta-data-refreshed', 
      'force-shopify-refresh',
      'site-tab-activated',
      'meta-tab-activated', 
      'shopify-tab-activated',
      'data-refresh-complete'
    ]

    events.forEach(event => {
      window.addEventListener(event, updateLastUpdated)
    })
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateLastUpdated)
      })
    }
  }, [])

  // Main refresh function - simple and effective
  const handleRefresh = useCallback(async () => {
    if (refreshCooldown) {
      toast.warning("Please wait", {
        description: "Refresh is on cooldown to prevent excessive requests",
        duration: 3000
      })
      return
    }

    if (!brandId) {
      toast.error("No brand selected")
      return
    }

    console.log(`[GlobalRefresh] Starting refresh for ${currentTab} tab with platforms:`, activePlatforms)
    
    setIsRefreshing(true)
    setRefreshCooldown(true)
    
    const refreshId = `global-refresh-${Date.now()}`
    
    try {
      toast.loading("Refreshing all data...", { id: "global-refresh" })

      // Dispatch a comprehensive refresh event that all widgets should listen to
      window.dispatchEvent(new CustomEvent('global-refresh-all', {
        detail: {
          brandId,
          currentTab,
          platforms: activePlatforms,
          timestamp: Date.now(),
          refreshId,
          forceRefresh: true
        }
      }))

      // Also dispatch tab-specific events for targeted refreshes
      if (currentTab === 'meta' && activePlatforms.meta) {
        console.log('[GlobalRefresh] Triggering Meta refresh')
        window.dispatchEvent(new CustomEvent('force-meta-refresh', {
          detail: { brandId, timestamp: Date.now(), forceRefresh: true, source: 'global-refresh' }
        }))
      }

      if (currentTab === 'shopify' && activePlatforms.shopify) {
        console.log('[GlobalRefresh] Triggering Shopify refresh')
        window.dispatchEvent(new CustomEvent('force-shopify-refresh', {
          detail: { brandId, timestamp: Date.now(), forceRefresh: true, source: 'global-refresh' }
        }))
      }

      if (currentTab === 'site') {
        console.log('[GlobalRefresh] Triggering Home page refresh')
        window.dispatchEvent(new CustomEvent('refresh-all-widgets', {
          detail: { brandId, timestamp: Date.now(), platforms: activePlatforms, source: 'global-refresh' }
        }))
      }

      // Wait a moment for components to start their refresh
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setLastUpdated(new Date())
      toast.success("All data refreshed successfully", { id: "global-refresh" })
      
    } catch (error) {
      console.error('[GlobalRefresh] Error during refresh:', error)
      toast.error("Failed to refresh data", { id: "global-refresh" })
    } finally {
      setIsRefreshing(false)
      // Reset cooldown after delay
      setTimeout(() => setRefreshCooldown(false), REFRESH_COOLDOWN)
    }
  }, [brandId, currentTab, activePlatforms, refreshCooldown])

  // Initialize last updated time on mount
  useEffect(() => {
    setLastUpdated(new Date())
  }, [])

  // Update timestamp when switching tabs
  useEffect(() => {
    setLastUpdated(new Date())
  }, [currentTab])

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRefresh}
        disabled={isRefreshing || refreshCooldown}
        title={refreshCooldown 
          ? "Refresh on cooldown" 
          : dataFreshness.status === 'very-stale'
          ? `Data last updated ${timeAgoDisplay} (1+ hour old) - refresh recommended`
          : dataFreshness.status === 'stale'
          ? `Data last updated ${timeAgoDisplay} (15+ min old) - consider refreshing`
          : `Data last updated ${timeAgoDisplay}. Refresh all widgets on this page.`
        }
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          dataFreshness.status === 'very-stale' 
            ? 'bg-red-900/20 border-red-500/50 text-red-300 hover:bg-red-900/30' 
            : dataFreshness.status === 'stale'
            ? 'bg-orange-900/20 border-orange-500/50 text-orange-300 hover:bg-orange-900/30'
            : 'bg-[#2A2A2A] hover:bg-[#333] border-[#444] text-gray-300 hover:text-white'
        }`}
      >
        {isRefreshing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Refreshing...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </>
        )}
      </button>
      
      <span className={`text-xs flex items-center gap-1 ${dataFreshness.color}`}>
        {isRefreshing && (
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        )}
        <span>{timeAgoDisplay}</span>
        {dataFreshness.status === 'very-stale' && (
          <span className="text-red-400 font-medium">⚠</span>
        )}
        {dataFreshness.status === 'stale' && (
          <span className="text-orange-400">⏰</span>
        )}
      </span>
      
      <button 
        className="text-gray-500 hover:text-gray-300 transition-colors"
        title={`Last updated: ${timeAgoDisplay}. Refreshes all widgets on the current page. Updates automatically when switching tabs.`}
      >
        <Info className="h-4 w-4" />
      </button>
    </div>
  )
} 