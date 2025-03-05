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
import Image from "next/image"

interface PlatformTabsProps {
  platforms: {
    shopify: boolean
    meta: boolean
  }
  dateRange: { from: Date; to: Date }
  metrics: Metrics
  isLoading: boolean
  isRefreshingData?: boolean
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
  isRefreshingData = false,
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
      <TabsList className="grid grid-cols-2 w-full max-w-md bg-[#1A1A1A] border border-[#333] rounded-lg p-1">
        <TabsTrigger 
          value="shopify" 
          disabled={!platforms.shopify}
          className="rounded-md data-[state=active]:bg-[#2A2A2A] data-[state=active]:border-[#444] data-[state=active]:border text-gray-300 data-[state=active]:text-white"
        >
          <div className="flex items-center justify-center gap-2">
            <span>Shopify</span>
            <div className="relative w-5 h-5 flex items-center justify-center">
              <Image 
                src="https://i.imgur.com/cnCcupx.png" 
                alt="Shopify logo" 
                width={20} 
                height={20} 
                className="object-contain"
              />
            </div>
          </div>
        </TabsTrigger>
        <TabsTrigger 
          value="meta" 
          disabled={!platforms.meta}
          className="rounded-md data-[state=active]:bg-[#2A2A2A] data-[state=active]:border-[#444] data-[state=active]:border text-gray-300 data-[state=active]:text-white"
        >
          <div className="flex items-center justify-center gap-2">
            <span>Meta Ads</span>
            <div className="relative w-5 h-5 flex items-center justify-center">
              <Image 
                src="https://i.imgur.com/6hyyRrs.png" 
                alt="Meta logo" 
                width={20} 
                height={20} 
                className="object-contain"
              />
            </div>
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
            isRefreshingData={isRefreshingData}
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
          isRefreshingData={isRefreshingData}
          brandId={brandId}
        />
      </TabsContent>
    </Tabs>
  )
}