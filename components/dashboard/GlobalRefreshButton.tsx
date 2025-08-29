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
  connections?: any[]
}

const REFRESH_COOLDOWN = 10000 // 10 seconds cooldown

export function GlobalRefreshButton({ brandId, activePlatforms, currentTab = 'site', connections = [] }: GlobalRefreshButtonProps) {
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
    // Always return gray color regardless of time
    return { status: 'fresh', color: 'text-gray-400' }
  }, [])

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
      // console.log('[GlobalRefresh] Data refreshed, updating timestamp')
      setLastUpdated(new Date())
    }

    // Listen for various refresh completion events
    const events = [
      'metaDataRefreshed',
      'meta-data-refreshed', 
      'force-shopify-refresh',
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

    if (!brandId && currentTab !== "agency") {
      toast.error("No brand selected")
      return
    }

    // console.log(`[GlobalRefresh] Starting refresh for ${currentTab} tab with platforms:`, activePlatforms)
    
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
        // console.log('[GlobalRefresh] Triggering Meta refresh')
        window.dispatchEvent(new CustomEvent('force-meta-refresh', {
          detail: { brandId, timestamp: Date.now(), forceRefresh: true, source: 'global-refresh' }
        }))
      }

      if (currentTab === 'shopify' && activePlatforms.shopify) {
        console.log('[GlobalRefresh] Triggering comprehensive Shopify refresh')
        
        // Find the Shopify connection for this brand
        const shopifyConnection = connections.find(c => 
          c.platform_type === 'shopify' && c.status === 'active' && c.brand_id === brandId
        );
        
        if (shopifyConnection) {
          // First: Trigger FORCE FRESH SYNC to get absolute latest data from Shopify
          const syncPromise = fetch('/api/shopify/force-fresh-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              brandId
            })
          }).then(async response => {
            const result = await response.json()
            if (response.ok) {
              console.log('[GlobalRefresh] ✅ Force fresh sync completed:', result);
              console.log(`[GlobalRefresh] 📊 Processed ${result.ordersProcessed}/${result.totalOrdersFromShopify} orders`);
              return true;
            } else {
              console.warn('[GlobalRefresh] ⚠️ Force fresh sync failed:', result);
              return false;
            }
          }).catch(error => {
            console.error('[GlobalRefresh] ❌ Force fresh sync error:', error);
            return false;
          });

          // Second: After sync attempt, always refresh all widgets
          syncPromise.then(() => {
            console.log('[GlobalRefresh] 🔄 Forcing complete Shopify data refresh');
            
            // FORCE DATE RANGE REFRESH - This is what actually works!
            // Simulate the date change that forces widgets to fetch fresh data
            window.dispatchEvent(new CustomEvent('force-date-range-refresh', {
              detail: { 
                brandId, 
                timestamp: Date.now(), 
                forceRefresh: true,
                source: 'global-refresh-button-date-trick'
              }
            }));
            
            // Also dispatch other events for completeness
            const refreshEvents = [
              'force-shopify-refresh',
              'shopify-sync-completed', 
              'refresh-all-widgets',
              'global-refresh-all'
            ]
            
            refreshEvents.forEach(eventName => {
              window.dispatchEvent(new CustomEvent(eventName, {
                detail: { 
                  brandId, 
                  timestamp: Date.now(), 
                  forceRefresh: true,
                  forceCacheBust: true,
                  source: 'global-refresh-button' 
                }
              }))
            })
          });
        } else {
          console.warn('[GlobalRefresh] No active Shopify connection found for brand:', brandId);
          // Still refresh widgets even without active connection
          window.dispatchEvent(new CustomEvent('force-shopify-refresh', {
            detail: { brandId, timestamp: Date.now(), forceRefresh: true, source: 'global-refresh-no-connection' }
          }));
        }
      }

      if (currentTab === 'site') {
        // console.log('[GlobalRefresh] Triggering Home page refresh')
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
          : `Data last updated ${timeAgoDisplay}. Refresh all widgets on this page.`
        }
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#1A1A1A] hover:bg-[#222] border-[#333] text-gray-400 hover:text-white"
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
      
      <span className="text-xs flex items-center gap-1 text-gray-400">
        {isRefreshing && (
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        )}
        <span>{timeAgoDisplay}</span>
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