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
      console.log('[ShopifyContent] Page loaded/brand changed - triggering fresh data refresh like date change')
      
      // Small delay to ensure components are mounted
      const timer = setTimeout(() => {
        // Trigger database-level refresh (like date changes do)
        window.dispatchEvent(new CustomEvent('force-shopify-database-refresh', {
          detail: { 
            brandId, 
            timestamp: Date.now(), 
            forceRefresh: true, 
            source: 'shopify-page-load' 
          }
        }))
        
        // Also trigger widget refresh
        window.dispatchEvent(new CustomEvent('force-shopify-refresh', {
          detail: { 
            brandId, 
            timestamp: Date.now(), 
            forceRefresh: true, 
            source: 'shopify-page-load' 
          }
        }))
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