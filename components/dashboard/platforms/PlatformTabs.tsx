"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DateRange } from "react-day-picker"
import { ShopifyTab } from "./tabs/ShopifyTab"
import { MetaTab } from "./tabs/MetaTab"
import type { Metrics } from "@/types/metrics"
import { transformToMetaMetrics } from "@/lib/transforms"
import { PlatformConnection } from "@/types/platformConnection"
import { useEffect, useState } from "react"

interface PlatformTabsProps {
  platforms: {
    shopify: boolean
    meta: boolean
  }
  dateRange: DateRange | undefined
  metrics: Metrics
  isLoading: boolean
  brandId: string
  connections: PlatformConnection[]
}

export function PlatformTabs({ platforms, dateRange, metrics: initialMetrics, isLoading, brandId, connections }: PlatformTabsProps) {
  const [selectedConnection, setSelectedConnection] = useState<PlatformConnection | undefined>(
    connections.find(c => c.platform_type === 'shopify')
  )
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics)

  const fetchShopifyData = async (connection: PlatformConnection, dateRange: DateRange) => {
    if (!dateRange.from || !dateRange.to) return null;
    
    const response = await fetch(`/api/shopify/metrics?` + new URLSearchParams({
      shop: connection.shop!,
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString()
    }))
    
    return response.json()
  }

  useEffect(() => {
    if (selectedConnection?.platform_type === 'shopify' && dateRange?.from && dateRange?.to) {
      fetchShopifyData(selectedConnection, dateRange)
        .then(data => setMetrics(data))
    }
  }, [selectedConnection, dateRange])

  return (
    <Tabs defaultValue="shopify" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#111111] border-[#222222]">
        {platforms.shopify && (
          <TabsTrigger 
            value="shopify" 
            className="flex items-center gap-2 text-white data-[state=active]:bg-[#222222]"
          >
            <img 
              src="/shopify-icon.png" 
              alt="Shopify" 
              className="h-4 w-4" 
            />
            Shopify
          </TabsTrigger>
        )}
        {platforms.meta && (
          <TabsTrigger 
            value="meta" 
            className="flex items-center gap-2 text-white data-[state=active]:bg-[#222222]"
          >
            <img 
              src="/meta-icon.png" 
              alt="Meta" 
              className="h-4 w-4" 
            />
            Meta Ads
          </TabsTrigger>
        )}
      </TabsList>

      <div className="mt-6">
        {platforms.shopify && (
          <TabsContent value="shopify">
            <ShopifyTab 
              metrics={metrics} 
              dateRange={dateRange}
              isLoading={isLoading}
              brandId={brandId}
              connection={selectedConnection}
            />
          </TabsContent>
        )}
        {platforms.meta && (
          <TabsContent value="meta">
            <MetaTab 
              metrics={transformToMetaMetrics(metrics)}
              dateRange={dateRange}
              isLoading={isLoading}
            />
          </TabsContent>
        )}
      </div>
    </Tabs>
  )
}