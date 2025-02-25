"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Search, Pin } from "lucide-react"
import { DateRange } from "react-day-picker"
import { ShopifyTab } from "./tabs/ShopifyTab"
import { MetaTab } from "./tabs/MetaTab"
import type { Metrics, MetaMetrics } from "@/types/metrics"
import { transformToMetaMetrics } from "@/lib/transforms"
import type { WidgetData } from "@/types/widget"
import { MetaContent } from "../platforms/MetaContent"

interface PlatformTabsProps {
  platforms: {
    shopify: boolean
    meta: boolean
  }
  dateRange: DateRange | undefined
  metrics: Metrics
  isLoading: boolean
  data?: WidgetData | null
}

export function PlatformTabs({ platforms, dateRange, metrics, isLoading, data }: PlatformTabsProps) {
  return (
    <Tabs defaultValue="shopify" className="w-full">
      <TabsList className="grid w-full grid-cols-6 mb-8 bg-[#111111] border-[#222222]">
        {platforms.shopify && (
          <TabsTrigger value="shopify" className="flex items-center gap-2 text-white data-[state=active]:bg-[#222222]">
            <img 
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Di8NeCzywloJqM3PWXj5VGVChVgmxi.png" 
              alt="Shopify" 
              className="h-4 w-4" 
            />
            <span className="hidden md:inline">Shopify</span>
            <ShopifyTab 
              metrics={metrics}
              dateRange={dateRange}
              isLoading={isLoading}
            />
          </TabsTrigger>
        )}
        {platforms.meta && (
          <TabsTrigger value="meta" className="flex items-center gap-2 text-white data-[state=active]:bg-[#222222]">
            <img 
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-xNnLSFG1hEPttp3zbiVUSkeeKN3EXY.png" 
              alt="Meta" 
              className="h-4 w-4" 
            />
            <span className="hidden md:inline">Meta Ads</span>
            <MetaTab 
              metrics={transformToMetaMetrics(metrics)}
              dateRange={dateRange}
              isLoading={isLoading}
            />
          </TabsTrigger>
        )}
        {/* Other platform tabs */}
      </TabsList>

      <div className="mt-6">
        <TabsContent value="shopify" className="space-y-4">
          <ShopifyTab 
            metrics={metrics} 
            dateRange={dateRange}
            isLoading={isLoading}
          />
        </TabsContent>
        <TabsContent value="meta">
          <MetaContent 
            metrics={transformToMetaMetrics(metrics)} 
            dateRange={dateRange} 
          />
        </TabsContent>
      </div>
    </Tabs>
  )
}