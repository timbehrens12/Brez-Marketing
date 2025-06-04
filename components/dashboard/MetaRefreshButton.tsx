"use client"

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Info } from 'lucide-react'
import { toast } from 'sonner'

declare global {
  interface Window {
    _metaFetchLock?: boolean
    _activeFetchIds?: Set<number | string>
    _refreshMetaData?: (triggerBrandId: string) => Promise<boolean>
    _homeTabSyncMetaInsights?: () => Promise<void>
  }
}

interface GlobalRefreshButtonProps {
  brandId: string
  activePlatforms: {
    shopify: boolean
    meta: boolean
  }
  onRefreshStart?: () => void
  onRefreshComplete?: () => void
}

// Global utility functions for Meta fetch management
function isMetaFetchInProgress(): boolean {
  return window._metaFetchLock || false
}

function acquireMetaFetchLock(fetchId: number | string): boolean {
  if (window._metaFetchLock) {
    console.log(`[MetaRefresh] Failed to acquire lock - already locked`)
    return false
  }
  
  window._metaFetchLock = true
  window._activeFetchIds = window._activeFetchIds || new Set()
  window._activeFetchIds.add(fetchId)
  
  console.log(`[MetaRefresh] Acquired lock for fetch ID: ${fetchId}`)
  return true
}

function releaseMetaFetchLock(fetchId: number | string): void {
  if (window._activeFetchIds) {
    window._activeFetchIds.delete(fetchId)
  }
  
  window._metaFetchLock = false
  console.log(`[MetaRefresh] Released lock for fetch ID: ${fetchId}`)
}

const SMART_REFRESH_COOLDOWN = 30000 // 30 seconds

export function GlobalRefreshButton({ brandId, activePlatforms, onRefreshStart, onRefreshComplete }: GlobalRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshCooldown, setRefreshCooldown] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [timeAgoDisplay, setTimeAgoDisplay] = useState<string>('')
  const [dataFreshness, setDataFreshness] = useState({ status: 'loading', color: 'text-gray-500' })

  // Helper function to format time ago (like Meta's live timer)
  const getTimeAgo = useCallback((date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 30) return 'just now'
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ${Math.floor((diffInSeconds % 3600) / 60)}m ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }, [])

  // Helper to determine if data is getting stale (adjusted timing)
  const getDataFreshnessStatus = useCallback(() => {
    if (!lastUpdated) return { status: 'loading', color: 'text-gray-500' }
    
    const timeSinceUpdate = Date.now() - lastUpdated.getTime()
    const minutes = Math.floor(timeSinceUpdate / 60000)
    
    if (minutes < 30) return { status: 'fresh', color: 'text-gray-400' }
    if (minutes < 60) return { status: 'stale', color: 'text-orange-400' }
    return { status: 'very-stale', color: 'text-red-400' }
  }, [lastUpdated])

  // Live-updating time ago display (updates every 10 seconds like Meta)
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
    
    updateTimeAgo() // Initial update
    const interval = setInterval(updateTimeAgo, 10000) // Update every 10 seconds for live feel
    
    return () => clearInterval(interval)
  }, [lastUpdated, getTimeAgo, getDataFreshnessStatus])

  // Listen for data refresh events from other tabs/components
  useEffect(() => {
    const handleDataRefresh = (event: CustomEvent) => {
      console.log('[GlobalRefresh] Detected data refresh from other component:', event.detail)
      
      // Update the last updated time when data is refreshed from other sources
      if (event.detail?.brandId === brandId || event.detail?.source) {
        console.log('[GlobalRefresh] Updating last updated time due to external refresh')
        setLastUpdated(new Date())
      }
    }

    const handleMetaRefresh = (event: CustomEvent) => {
      console.log('[GlobalRefresh] Detected Meta refresh event:', event.detail)
      
      // Update last updated time when Meta data is refreshed
      if (event.detail?.brandId === brandId) {
        console.log('[GlobalRefresh] Updating last updated time due to Meta refresh')
        setLastUpdated(new Date())
      }
    }

    const handleShopifyRefresh = (event: CustomEvent) => {
      console.log('[GlobalRefresh] Detected Shopify refresh event:', event.detail)
      
      // Update last updated time when Shopify data is refreshed
      if (event.detail?.brandId === brandId) {
        console.log('[GlobalRefresh] Updating last updated time due to Shopify refresh')
        setLastUpdated(new Date())
      }
    }

    const handlePageRefresh = (event: CustomEvent) => {
      console.log('[GlobalRefresh] Detected page refresh event:', event.detail)
      
      // Update last updated time when page refresh occurs
      if (event.detail?.brandId === brandId) {
        console.log('[GlobalRefresh] Updating last updated time due to page refresh')
        setLastUpdated(new Date())
      }
    }

    // Listen for various refresh events
    window.addEventListener('metaDataRefreshed', handleMetaRefresh as EventListener)
    window.addEventListener('meta-data-refreshed', handleMetaRefresh as EventListener)
    window.addEventListener('force-shopify-refresh', handleShopifyRefresh as EventListener)
    window.addEventListener('page-refresh', handlePageRefresh as EventListener)
    window.addEventListener('refresh-metrics', handleDataRefresh as EventListener)
    window.addEventListener('refresh-all-widgets', handleDataRefresh as EventListener)
    
    return () => {
      window.removeEventListener('metaDataRefreshed', handleMetaRefresh as EventListener)
      window.removeEventListener('meta-data-refreshed', handleMetaRefresh as EventListener)
      window.removeEventListener('force-shopify-refresh', handleShopifyRefresh as EventListener)
      window.removeEventListener('page-refresh', handlePageRefresh as EventListener)
      window.removeEventListener('refresh-metrics', handleDataRefresh as EventListener)
      window.removeEventListener('refresh-all-widgets', handleDataRefresh as EventListener)
    }
  }, [brandId])

  // Main global refresh function for all platforms
  const refreshAllData = async (triggerBrandId: string): Promise<boolean> => {
    console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: refreshAllData() called with brandId: ${triggerBrandId}`)
    console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Active platforms:`, activePlatforms)
    
    // Skip if a fetch is already in progress
    if (isMetaFetchInProgress()) {
      console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: ⚠️ Global refresh skipped - fetch already in progress`)
      return false
    }
    
    // Generate a unique request ID for this refresh
    const refreshId = `global-refresh-${Date.now()}`
    
    // Acquire a global lock for this refresh operation
    if (!acquireMetaFetchLock(refreshId)) {
      console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: ⛔ Failed to acquire global lock for refresh`)
      return false
    }

    console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: 🚀 Starting global refresh (${refreshId})`)
    setIsRefreshing(true)
    onRefreshStart?.()
    
    try {
      console.log(`[GlobalRefresh] 🚀 Starting global refresh (${refreshId})`)
      
      const refreshPromises = []
      
      // Meta Platform Refresh
      if (activePlatforms.meta) {
        console.log(`[GlobalRefresh] 📱 Refreshing Meta platform`)
        
        const metaRefresh = async () => {
          console.log(`[GlobalRefresh] 🔄 Starting Meta refresh using HomeTab's unified loading system`)
          
          // PRIORITY 1: Use HomeTab's unified sync function if available
          // This ensures all Meta widgets load together with unified loading states
          if (typeof window !== 'undefined' && window._homeTabSyncMetaInsights) {
            console.log(`[GlobalRefresh] 🚀 Using HomeTab's syncMetaInsights function for unified loading`)
            
            try {
              await window._homeTabSyncMetaInsights()
              console.log(`[GlobalRefresh] ✅ HomeTab Meta unified sync completed successfully`)
              return // Exit early - HomeTab handles everything including events
            } catch (error) {
              console.error(`[GlobalRefresh] ❌ HomeTab Meta unified sync failed:`, error)
              throw error
            }
          }
          
          // FALLBACK 1: Use MetaTab's unified refresh function if HomeTab not available  
          if (typeof window !== 'undefined' && window._refreshMetaData) {
            console.log(`[GlobalRefresh] 🚀 Using MetaTab's refreshAllMetaData function for unified loading`)
            
            // Call the MetaTab's unified refresh function which handles:
            // 1. Unified loading state coordination
            // 2. Hard pull from Meta API
            // 3. Campaign data refresh  
            // 4. Ad set budget refresh
            // 5. Frontend state updates with coordinated loading
            try {
              const success = await window._refreshMetaData(triggerBrandId)
              if (success) {
                console.log(`[GlobalRefresh] ✅ Meta unified refresh completed successfully`)
              } else {
                console.warn(`[GlobalRefresh] ⚠️ Meta unified refresh completed with warnings`)
              }
            } catch (error) {
              console.error(`[GlobalRefresh] ❌ Meta unified refresh failed:`, error)
              throw error
            }
          } else {
            // FALLBACK 2: Manual API calls if neither unified system is available
            console.warn(`[GlobalRefresh] ⚠️ No unified refresh system available, falling back to manual API calls`)
            
          // Step 1: Fetch fresh data from Meta API and update database
          const syncResponse = await fetch(`/api/meta/sync?brandId=${triggerBrandId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Refresh-ID': refreshId
            }
          })
          
          if (!syncResponse.ok) {
            console.error(`[GlobalRefresh] Failed to sync Meta data from API: ${syncResponse.status}`)
            throw new Error("Failed to refresh Meta data from API")
          }
          
          console.log(`[GlobalRefresh] ✅ Meta API sync completed`)
          
          // Step 2: Refresh campaigns with latest data
          await fetch(`/api/meta/campaigns?brandId=${triggerBrandId}&forceRefresh=true`, {
            headers: {
              'Cache-Control': 'no-cache',
              'X-Refresh-ID': refreshId
            }
          })
          
          console.log(`[GlobalRefresh] ✅ Meta campaign data refreshed`)
          
          // Step 3: Try to refresh ad sets data (but don't fail if endpoint doesn't exist)
          try {
            const budgetResponse = await fetch(`/api/meta/campaign-budgets?brandId=${triggerBrandId}&forceRefresh=true`, {
              method: 'GET',
              headers: { 'Cache-Control': 'no-cache', 'X-Refresh-ID': refreshId }
            });
            
            if (budgetResponse.ok) {
              console.log(`[GlobalRefresh] ✅ Meta ad set budgets refreshed`)
            } else {
              console.warn(`[GlobalRefresh] ⚠️ Meta ad set budget refresh failed (${budgetResponse.status}), continuing`)
            }
          } catch (budgetError) {
            console.warn(`[GlobalRefresh] ⚠️ Meta ad set budget refresh error:`, budgetError, ', continuing')
          }
          
          // Step 4: Refresh metrics for the dashboard
          try {
            const metricsResponse = await fetch(`/api/metrics/meta?brandId=${triggerBrandId}&refresh=true&bypass_cache=true`, {
              headers: {
                'Cache-Control': 'no-cache',
                'X-Refresh-ID': refreshId
              }
            })
            
            if (metricsResponse.ok) {
              console.log(`[GlobalRefresh] ✅ Meta metrics refreshed`)
            } else {
              console.warn(`[GlobalRefresh] ⚠️ Meta metrics refresh failed (${metricsResponse.status})`)
            }
          } catch (metricsError) {
            console.warn(`[GlobalRefresh] ⚠️ Meta metrics refresh error:`, metricsError)
            }
          }
        }
        
        refreshPromises.push(metaRefresh())
      }
      
      // Shopify Platform Refresh
      if (activePlatforms.shopify) {
        console.log(`[GlobalRefresh] 🛒 Refreshing Shopify platform`)
        
        const shopifyRefresh = async () => {
          try {
            // Step 1: Try to sync Shopify orders (but don't fail if it doesn't work)
            try {
              const syncOrdersResponse = await fetch('/api/shopify/sync', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Refresh-ID': refreshId
                },
                body: JSON.stringify({ brandId: triggerBrandId })
              })
              
              if (syncOrdersResponse.ok) {
                console.log(`[GlobalRefresh] ✅ Shopify orders synced`)
              } else {
                console.warn(`[GlobalRefresh] ⚠️ Shopify orders sync failed (${syncOrdersResponse.status}), continuing with metrics refresh`)
              }
            } catch (syncError) {
              console.warn(`[GlobalRefresh] ⚠️ Shopify orders sync error:`, syncError, ', continuing with metrics refresh')
            }
            
            // Step 2: Try to sync inventory data (but don't fail if it doesn't work)
            try {
              const inventoryResponse = await fetch('/api/shopify/inventory/sync', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Refresh-ID': refreshId
                },
                body: JSON.stringify({ brandId: triggerBrandId })
              })
              
              if (inventoryResponse.ok) {
                console.log(`[GlobalRefresh] ✅ Shopify inventory synced`)
              } else {
                console.warn(`[GlobalRefresh] ⚠️ Shopify inventory sync failed (${inventoryResponse.status}), continuing`)
              }
            } catch (inventoryError) {
              console.warn(`[GlobalRefresh] ⚠️ Shopify inventory sync error:`, inventoryError, ', continuing')
            }
            
            // Step 3: Refresh Shopify metrics (this is the most important part)
            const cacheBuster = `t=${Date.now()}`
            const params = new URLSearchParams({
              brandId: triggerBrandId,
              force: 'true',
              bypass_cache: 'true',
              nocache: 'true',
              [cacheBuster]: ''
            })
            
            const metricsResponse = await fetch(`/api/metrics?${params.toString()}`, {
              headers: {
                'Cache-Control': 'no-cache',
                'X-Refresh-ID': refreshId
              }
            })
            
            if (metricsResponse.ok) {
              console.log(`[GlobalRefresh] ✅ Shopify metrics refreshed`)
            } else {
              console.warn(`[GlobalRefresh] ⚠️ Shopify metrics refresh failed (${metricsResponse.status})`)
            }
          } catch (error) {
            console.warn(`[GlobalRefresh] ⚠️ Shopify refresh had issues but continuing:`, error)
            // Don't throw - we want to continue with other platforms
          }
        }
        
        refreshPromises.push(shopifyRefresh())
      }
      
      // Execute all platform refreshes in parallel, but don't fail if one platform has issues
      const results = await Promise.allSettled(refreshPromises)
      
      // Log any failures but continue
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const platformName = index === 0 && activePlatforms.meta ? 'Meta' : 'Shopify'
          console.warn(`[GlobalRefresh] ⚠️ ${platformName} refresh had issues:`, result.reason)
        }
      })
      
      // Success! Dispatch events to notify all components
      if (typeof window !== 'undefined') {
        console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Dispatching global refresh events`)
        console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Active platforms:`, activePlatforms)
        console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Brand ID:`, triggerBrandId)
        
        // Check if HomeTab's unified system was used for Meta refresh
        const homeTabWasUsed = activePlatforms.meta && typeof window._homeTabSyncMetaInsights === 'function'
        
        // Dispatch Meta-specific events if Meta was refreshed AND HomeTab wasn't used
        // (HomeTab dispatches its own events, so we avoid duplicates)
        if (activePlatforms.meta && !homeTabWasUsed) {
          console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Dispatching Meta-specific events`)
          
          window.dispatchEvent(new CustomEvent('meta-data-refreshed', {
            detail: {
              success: true,
              refreshId,
              timestamp: new Date().toISOString()
            }
          }))
          
          window.dispatchEvent(new CustomEvent('metaDataRefreshed', {
            detail: {
              brandId: triggerBrandId,
              timestamp: Date.now(),
              forceRefresh: true,
              source: 'global-refresh'
            }
          }))
        } else if (homeTabWasUsed) {
          console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Skipping Meta events - HomeTab unified system handled refresh`)
        }
        
        // Dispatch Shopify-specific events if Shopify was refreshed
        if (activePlatforms.shopify) {
          console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Dispatching Shopify-specific events`)
          
          window.dispatchEvent(new CustomEvent('force-shopify-refresh', {
            detail: {
              brandId: triggerBrandId,
              timestamp: Date.now(),
              forceRefresh: true,
              source: 'global-refresh'
            }
          }))
        }
        
        // Only dispatch competing global events if HomeTab wasn't used
        // (These events can cause conflicts with HomeTab's unified loading)
        if (!homeTabWasUsed) {
          console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Dispatching global coordination events`)
          
          // Dispatch global events for all widgets
          console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Dispatching page-refresh event`)
          window.dispatchEvent(new CustomEvent('page-refresh', {
            detail: {
              brandId: triggerBrandId, 
              timestamp: Date.now(),
              source: 'global-refresh',
              forceRefresh: true,
              platforms: activePlatforms
            }
          }))
          
          console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Dispatching refresh-metrics event`)
          window.dispatchEvent(new CustomEvent('refresh-metrics', {
            detail: {
              brandId: triggerBrandId,
              timestamp: Date.now(),
              source: 'global-refresh'
            }
          }))
          
          // Dispatch event specifically for home page widgets
          console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Dispatching refresh-all-widgets event`)
          console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Event detail:`, {
            brandId: triggerBrandId,
            timestamp: Date.now(),
            platforms: activePlatforms,
            source: 'global-refresh'
          })
          
          window.dispatchEvent(new CustomEvent('refresh-all-widgets', {
            detail: {
              brandId: triggerBrandId,
              timestamp: Date.now(),
              platforms: activePlatforms,
              source: 'global-refresh'
            }
          }))
        } else {
          console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Skipping global coordination events - HomeTab unified system used`)
        }
        
        console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: All applicable events dispatched successfully`)
      }
      
      setLastUpdated(new Date())
      
      // Show success message based on what was attempted
      const attemptedPlatforms = []
      if (activePlatforms.meta) attemptedPlatforms.push('Meta')
      if (activePlatforms.shopify) attemptedPlatforms.push('Shopify')
      
      // Check if any platforms had issues
      const hasIssues = results.some(result => result.status === 'rejected')
      
      if (hasIssues) {
        toast.success(`${attemptedPlatforms.join(' & ')} refresh completed (some issues occurred - check console for details)`)
      } else {
        toast.success(`${attemptedPlatforms.join(' & ')} data refreshed successfully`)
      }
      return true
    } catch (error) {
      console.error(`[GlobalRefresh] Error during global refresh:`, error)
      toast.error("Failed to refresh data")
      return false
    } finally {
      setIsRefreshing(false)
      onRefreshComplete?.()
      releaseMetaFetchLock(refreshId)
    }
  }

  // Handle manual refresh with cooldown
  const handleRefresh = useCallback(async () => {
    console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Refresh button clicked!`)
    console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Refresh cooldown:`, refreshCooldown)
    console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Brand ID:`, brandId)
    console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Active platforms:`, activePlatforms)
    
    if (refreshCooldown) {
      console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Refresh blocked by cooldown`)
      toast.warning("Please wait", {
        description: "Refresh is on cooldown to prevent excessive API calls",
        duration: 3000
      })
      return
    }

    if (!brandId) {
      console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Refresh blocked - no brand ID`)
      toast.error("No brand selected")
      return
    }

    console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Starting refresh process...`)
    setRefreshCooldown(true)
    
    try {
      console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Calling refreshAllData()`)
      await refreshAllData(brandId)
      console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: refreshAllData() completed`)
    } finally {
      // Reset cooldown after delay
      setTimeout(() => {
        console.log(`🔥🔥🔥 [GlobalRefresh] MAJOR DEBUG: Cooldown reset`)
        setRefreshCooldown(false)
      }, SMART_REFRESH_COOLDOWN)
    }
  }, [brandId, refreshCooldown])

  // Keyboard shortcut for refresh (Ctrl+Shift+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        console.log('Keyboard shortcut triggered Meta refresh')
        handleRefresh()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleRefresh])

  // Initialize last updated time on mount
  useEffect(() => {
    setLastUpdated(new Date())
  }, [])

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
          ? `Data last updated ${timeAgoDisplay} (30+ min old) - consider refreshing`
          : `Data last updated ${timeAgoDisplay}. Refresh all connected platforms and widgets.`
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
        title={`Last updated: ${timeAgoDisplay}. The timestamp shows when your data was last refreshed and updates live. Color indicates freshness: Gray (0-30min), Orange (30-60min), Red (60+min). Refreshes all connected platforms (Meta, Shopify) and widgets. Use Ctrl+Shift+R for quick refresh.`}
      >
        <Info className="h-4 w-4" />
      </button>
    </div>
  )
} 