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

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedConnection || selectedConnection.platform_type !== 'shopify' || !dateRange?.from || !dateRange?.to || !brandId) {
        console.log('Missing required data:', { connection: selectedConnection, dateRange, brandId })
        return
      }

      try {
        console.log('Fetching Shopify data with:', {
          shop: selectedConnection.shop,
          from: dateRange.from,
          to: dateRange.to,
          brandId
        })

        const response = await fetch(`/api/shopify/metrics?` + new URLSearchParams({
          shop: selectedConnection.shop!,
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
          brandId
        }))

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('Shopify API Response:', data)
        setMetrics(data)
      } catch (err) {
        console.error('Fetch error:', err)
      }
    }

    fetchData()
  }, [selectedConnection, dateRange, brandId])

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