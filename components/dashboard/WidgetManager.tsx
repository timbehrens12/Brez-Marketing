"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MetaTab } from "./platforms/tabs/MetaTab"
import { ShopifyTab } from "./platforms/tabs/ShopifyTab"
import { useMetrics } from "@/lib/hooks/useMetrics"
import { DateRange } from "react-day-picker"

interface WidgetManagerProps {
  dateRange: DateRange | undefined
}

export function WidgetManager({ dateRange }: WidgetManagerProps) {
  const { metrics, isLoading } = useMetrics()

  return (
    <Tabs defaultValue="shopify" className="space-y-4">
      <TabsList>
        <TabsTrigger value="shopify">Shopify</TabsTrigger>
        <TabsTrigger value="meta">Meta Ads</TabsTrigger>
      </TabsList>
      <TabsContent value="shopify">
        <ShopifyTab metrics={metrics} dateRange={dateRange} isLoading={isLoading} />
      </TabsContent>
      <TabsContent value="meta">
        <MetaTab metrics={metrics} dateRange={dateRange} isLoading={isLoading} />
      </TabsContent>
    </Tabs>
  )
} 