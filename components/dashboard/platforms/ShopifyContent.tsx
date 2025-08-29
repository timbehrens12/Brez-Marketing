"use client"

import { useEffect } from "react"
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
  
  // Trigger refresh when Shopify content is mounted/brandId changes
  useEffect(() => {
    if (brandId) {
      console.log('[ShopifyContent] Page loaded/brand changed - forcing fresh data refresh')
      
      // Small delay to ensure components are mounted
      const timer = setTimeout(async () => {
        // FIRST: Trigger force fresh sync to get latest data from Shopify
        console.log('[ShopifyContent] Triggering force fresh sync from Shopify API')
        try {
          const syncResponse = await fetch('/api/shopify/force-fresh-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId })
          })
          
          const syncResult = await syncResponse.json()
          if (syncResponse.ok) {
            console.log(`[ShopifyContent] ✅ Fresh sync completed: ${syncResult.ordersProcessed} orders processed`)
          } else {
            console.warn('[ShopifyContent] ⚠️ Fresh sync failed:', syncResult.error)
          }
        } catch (syncError) {
          console.error('[ShopifyContent] ❌ Fresh sync error:', syncError)
        }

        // SECOND: Force date range refresh to trigger widget updates
        window.dispatchEvent(new CustomEvent('force-date-range-refresh', {
          detail: { 
            brandId, 
            timestamp: Date.now(), 
            forceRefresh: true,
            source: 'shopify-page-navigation-post-sync'
          }
        }))
        
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
              source: 'shopify-page-navigation' 
            }
          }))
        })
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [brandId]) // Re-run when brandId changes
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
    />
  )
}