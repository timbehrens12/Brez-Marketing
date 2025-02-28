"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DateRange } from "react-day-picker"
import { ShopifyTab } from "./tabs/ShopifyTab"
import { MetaTab } from "./tabs/MetaTab"
import type { Metrics } from "@/types/metrics"
import { transformToMetaMetrics } from "@/lib/transforms"
import { PlatformConnection } from "@/types/platformConnection"
import { useEffect, useState } from "react"
import { useSupabase } from '@/lib/hooks/useSupabase'
import { defaultMetrics } from "@/lib/defaultMetrics"
import { ShoppingBag, Facebook } from "lucide-react"

interface PlatformTabsProps {
  platforms: {
    shopify: boolean
    meta: boolean
  }
  dateRange: { from: Date; to: Date }
  metrics: Metrics
  isLoading: boolean
  brandId: string
  connections: PlatformConnection[]
  children?: React.ReactNode
  onTabChange?: (value: string) => void
}

// Add type for Supabase order
interface ShopifyOrder {
  id: string;
  created_at: string;
  total_price: string;
  customer_id: string;
  line_items: Array<{
    quantity: number;
  }>;
}

export function PlatformTabs({ 
  platforms, 
  dateRange, 
  metrics, 
  isLoading, 
  brandId, 
  connections, 
  children,
  onTabChange 
}: PlatformTabsProps) {
  const supabase = useSupabase()
  const [selectedConnection, setSelectedConnection] = useState<PlatformConnection | null>(null)

  // Update selectedConnection when connections change
  useEffect(() => {
    const shopifyConnection = connections.find(c => 
      c.platform_type === 'shopify' && c.status === 'active'
    )
    setSelectedConnection(shopifyConnection || null)
    
    // Debug logging
    console.log('Connections updated:', {
      connections,
      shopifyConnection,
      platforms
    })
  }, [connections])

  // Ensure metrics is never undefined
  const safeMetrics = metrics || defaultMetrics

  // Handle tab change
  const handleValueChange = (value: string) => {
    if (onTabChange) {
      onTabChange(value);
    }
  };

  return (
    <Tabs defaultValue="shopify" className="w-full" onValueChange={handleValueChange}>
      <TabsList className="grid grid-cols-2 w-full max-w-md">
        <TabsTrigger value="shopify" disabled={!platforms.shopify}>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Shopify
          </div>
        </TabsTrigger>
        <TabsTrigger value="meta" disabled={!platforms.meta}>
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            Meta Ads
          </div>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="shopify">
        {selectedConnection ? (
          <ShopifyTab 
            connection={selectedConnection}
            dateRange={dateRange}
            brandId={brandId}
            metrics={safeMetrics}
            isLoading={isLoading}
          />
        ) : (
          <div className="text-center py-8 text-gray-400">
            No active Shopify connection found. Please connect your store.
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="meta">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {children}
        </div>
        <MetaTab 
          dateRange={dateRange}
          metrics={metrics}
          isLoading={isLoading}
          brandId={brandId}
        />
      </TabsContent>
    </Tabs>
  )
}