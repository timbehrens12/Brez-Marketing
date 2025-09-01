"use client"

import { useEffect, useState } from "react"
import { ShopifyTab } from "./tabs/ShopifyTab"
import { PlatformConnection } from "@/types/platformConnection"

interface ShopifyContentProps {
  brandId: string | null
  dateRange: {
    from: Date
    to: Date
  }
  connections: PlatformConnection[]
  metrics: any
  isLoading: boolean
  brands: any[]
}

export function ShopifyContent({ brandId, dateRange, connections, metrics, isLoading, brands }: ShopifyContentProps) {
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  
  // Trigger refresh when Shopify content is mounted/brandId changes
  useEffect(() => {
    if (brandId) {
      console.log('[ShopifyContent] Page loaded/brand changed - forcing fresh data refresh')
      
      // Small delay to ensure components are mounted
      const timer = setTimeout(async () => {
        console.log('[ShopifyContent] Page loaded - starting NUCLEAR SYNC SEQUENCE')
        
        // STEP 1: Set refreshing state for MetricCards
        setIsRefreshingData(true)
        
        // STEP 2: Block widget loading during sync
        window.dispatchEvent(new CustomEvent('shopify-sync-starting', {
          detail: { brandId, source: 'page-navigation' }
        }))
        
        // STEP 3: NUCLEAR OPTION - Hard refresh from Shopify API  
        try {
          console.log('🔥 [ShopifyContent] NUCLEAR SYNC STARTING...')
          const syncResponse = await fetch('/api/shopify/hard-refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId })
          })
          
          const syncResult = await syncResponse.json()
          if (syncResponse.ok) {
            console.log(`🔥 [ShopifyContent] NUCLEAR SYNC SUCCESS: ${syncResult.newOrders} new orders found!`)
            console.log(`🔥 [ShopifyContent] Total processed: ${syncResult.ordersProcessed} orders`)
          } else {
            console.error('🔥 [ShopifyContent] NUCLEAR SYNC FAILED:', syncResult.error)
          }
        } catch (syncError) {
          console.error('🔥 [ShopifyContent] NUCLEAR SYNC ERROR:', syncError)
        }

        // STEP 4: Wait a moment for any data to update
        await new Promise(resolve => setTimeout(resolve, 500))

        // STEP 5: Force metrics refresh and clear refreshing state
        console.log('🔥 [ShopifyContent] NUCLEAR SYNC COMPLETE - Triggering metrics refresh')
        
        // Force refresh of parent metrics data
        window.dispatchEvent(new CustomEvent('force-metrics-refresh', {
          detail: { 
            brandId, 
            timestamp: Date.now(), 
            forceRefresh: true,
            source: 'nuclear-sync-complete'
          }
        }))
        
        // Wait a moment for metrics to update
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Clear refreshing state and refresh widgets
        setIsRefreshingData(false)
        console.log('🔥 [ShopifyContent] Refreshing widgets with fresh data')
        window.dispatchEvent(new CustomEvent('force-widget-refresh', {
          detail: { 
            brandId, 
            timestamp: Date.now(), 
            forceRefresh: true,
            source: 'shopify-page-navigation-post-nuclear',
            syncCompleted: true
          }
        }))
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [brandId]) // Re-run when brandId changes
  
  // Listen for refresh button events
  useEffect(() => {
    const handleGlobalRefresh = async () => {
      console.log('[ShopifyContent] Refresh button detected - setting loading state')
      setIsRefreshingData(true)
      
      // Wait for nuclear sync to complete (listen for completion event)
      const handleSyncComplete = () => {
        console.log('[ShopifyContent] Refresh button sync complete - triggering metrics refresh')
        
        // Force refresh of parent metrics data
        window.dispatchEvent(new CustomEvent('force-metrics-refresh', {
          detail: { 
            brandId, 
            timestamp: Date.now(), 
            forceRefresh: true,
            source: 'refresh-button-complete'
          }
        }))
        
        setTimeout(() => {
          console.log('[ShopifyContent] Refresh button sync complete - clearing loading state')
          setIsRefreshingData(false)
        }, 1000) // Give more time for metrics to update
        
        window.removeEventListener('force-widget-refresh', handleSyncComplete)
      }
      
      window.addEventListener('force-widget-refresh', handleSyncComplete)
    }
    
    // Listen for global refresh button (when it starts nuclear sync)
    window.addEventListener('shopify-sync-starting', handleGlobalRefresh)
    
    return () => {
      window.removeEventListener('shopify-sync-starting', handleGlobalRefresh)
    }
  }, [])
  if (!brandId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Please select a brand to view Shopify data</p>
      </div>
    )
  }

  const shopifyConnection = connections?.find(c => 
    c.platform_type === 'shopify' && c.status === 'active' && c.brand_id === brandId
  )

  if (!shopifyConnection) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">No Shopify connection found for this brand</p>
      </div>
    )
  }

  return (
    <ShopifyTab 
      connection={shopifyConnection}
      brandId={brandId}
      dateRange={dateRange}
      metrics={metrics}
      isLoading={isLoading}
      isRefreshingData={isRefreshingData}
    />
  )
}