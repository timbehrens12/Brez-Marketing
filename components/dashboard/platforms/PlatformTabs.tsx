"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DateRange } from "react-day-picker"
import { ShopifyTab } from "./tabs/ShopifyTab"
import { MetaTab } from "./tabs/MetaTab"
import type { Metrics } from "@/types/metrics"
import { transformToMetaMetrics } from "@/lib/transforms"

interface PlatformTabsProps {
  platforms: {
    shopify: boolean
    meta: boolean
  }
  dateRange: DateRange | undefined
  metrics: Metrics
  isLoading: boolean
}

export function PlatformTabs({ platforms, dateRange, metrics, isLoading }: PlatformTabsProps) {
  return (
    <Tabs defaultValue="shopify" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#111111] border-[#222222]">
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
      </TabsList>

      <div className="mt-6">
        <TabsContent value="shopify">
          <ShopifyTab 
            metrics={metrics} 
            dateRange={dateRange}
            isLoading={isLoading}
          />
        </TabsContent>
        <TabsContent value="meta">
          <MetaTab 
            metrics={transformToMetaMetrics(metrics)}
            dateRange={dateRange}
            isLoading={isLoading}
          />
        </TabsContent>
      </div>
    </Tabs>
  )
}