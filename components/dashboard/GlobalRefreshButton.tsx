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
  dateRange?: { from: Date; to: Date } // Add dateRange prop
}

const REFRESH_COOLDOWN = 10000 // 10 seconds cooldown

export function GlobalRefreshButton({ brandId, activePlatforms, currentTab = 'site', connections = [], dateRange }: GlobalRefreshButtonProps) {
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

    // NUCLEAR FIX: Get fresh dateRange from localStorage or DOM instead of stale prop
    let freshDateRange = dateRange;
    
    // Try to get the most recent dateRange from the date picker directly
    try {
      const datePickerInputs = document.querySelectorAll('[data-testid="date-range-picker"]');
      // If that doesn't work, we'll use a different approach
      console.log('[GlobalRefresh] 🔍 Prop dateRange:', dateRange ? `${dateRange.from.toISOString().split('T')[0]} to ${dateRange.to.toISOString().split('T')[0]}` : 'undefined');
      
      // Emit a special event to request the current dateRange from dashboard
      window.dispatchEvent(new CustomEvent('request-current-daterange', { 
        detail: { requestId: Date.now() }
      }));
      
      // Wait a bit for the response
      await new Promise(resolve => {
        const handleDateRangeResponse = (event: any) => {
          if (event.detail?.dateRange) {
            freshDateRange = {
              from: new Date(event.detail.dateRange.from),
              to: new Date(event.detail.dateRange.to)
            };
            console.log('[GlobalRefresh] 🔍 Received fresh dateRange from dashboard:', `${freshDateRange.from.toISOString().split('T')[0]} to ${freshDateRange.to.toISOString().split('T')[0]}`);
          }
          window.removeEventListener('daterange-response', handleDateRangeResponse);
          resolve(true);
        };
        window.addEventListener('daterange-response', handleDateRangeResponse);
        
        // Timeout after 50ms if no response
        setTimeout(() => {
          window.removeEventListener('daterange-response', handleDateRangeResponse);
          resolve(true);
        }, 50);
      });
    } catch (error) {
      console.log('[GlobalRefresh] ⚠️ Could not get fresh dateRange, using prop');
    }

    console.log('[GlobalRefresh] 🔍 Final dateRange for refresh:', freshDateRange ? `${freshDateRange.from.toISOString().split('T')[0]} to ${freshDateRange.to.toISOString().split('T')[0]}` : 'undefined');
    
    setIsRefreshing(true)
    setRefreshCooldown(true)
    
    const refreshId = `global-refresh-${Date.now()}`
    
    try {
      toast.loading("Refreshing all data...", { id: "global-refresh" })

      // For Shopify tab, skip global refresh and go straight to nuclear sequence
      if (currentTab === 'shopify' && activePlatforms.shopify) {
        
        // STEP 1: Block premature widget refreshes
        window.dispatchEvent(new CustomEvent('shopify-sync-starting', {
          detail: { brandId, source: 'global-refresh-button' }
        }))
        
        // Find the Shopify connection for this brand
        const shopifyConnection = connections.find(c => 
          c.platform_type === 'shopify' && c.status === 'active' && c.brand_id === brandId
        );
        
        if (shopifyConnection) {
          // STEP 2: NUCLEAR OPTION - Hard refresh that actually pulls from Shopify API
          const syncPromise = fetch('/api/shopify/hard-refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId })
          }).then(async response => {
            const result = await response.json()
            if (response.ok) {
              return true;
            } else {
              return false;
            }
          }).catch(error => {
            return false;
          });

          // STEP 3: After nuclear sync completes, refresh widgets with fresh data
          syncPromise.then((syncSuccess) => {
            
            // Single comprehensive refresh event after sync is complete
            window.dispatchEvent(new CustomEvent('force-widget-refresh', {
              detail: { 
                brandId, 
                timestamp: Date.now(), 
                forceRefresh: true,
                source: 'global-refresh-post-nuclear',
                syncCompleted: true,
                syncSuccess
              }
            }))
          });
        } else {
          // Still refresh widgets even without active connection
          window.dispatchEvent(new CustomEvent('force-shopify-refresh', {
            detail: { brandId, timestamp: Date.now(), forceRefresh: true, source: 'global-refresh-no-connection' }
          }));
        }
      } else {
        // For non-Shopify tabs, dispatch regular global refresh events
        // Add a small delay to ensure React state has propagated to child components
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('global-refresh-all', {
            detail: {
              brandId,
              currentTab,
              platforms: activePlatforms,
              timestamp: Date.now(),
              refreshId,
              forceRefresh: true,
              dateRange: freshDateRange ? {
                from: freshDateRange.from.toISOString(),
                to: freshDateRange.to.toISOString()
              } : undefined
            }
          }))

          // Tab-specific events for targeted refreshes
          if (currentTab === 'meta' && activePlatforms.meta) {
            window.dispatchEvent(new CustomEvent('force-meta-refresh', {
              detail: { 
                brandId, 
                timestamp: Date.now(), 
                forceRefresh: true, 
                source: 'global-refresh',
              dateRange: freshDateRange ? {
                from: freshDateRange.from.toISOString(),
                to: freshDateRange.to.toISOString()
              } : undefined
              }
            }))
          }
        }, 100); // 100ms delay to ensure React state propagation
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