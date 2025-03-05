"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DateRange } from "react-day-picker"
import { ShopifyTab } from "./tabs/ShopifyTab"
import { MetaTab } from "./tabs/MetaTab"
import { TikTokTab } from "./tabs/TikTokTab"
import { GoogleAdsTab } from "./tabs/GoogleAdsTab"
import type { Metrics } from "@/types/metrics"
import { transformToMetaMetrics } from "@/lib/transforms"
import { PlatformConnection } from "@/types/platformConnection"
import { useEffect, useState } from "react"
import { useSupabase } from '@/lib/hooks/useSupabase'
import { defaultMetrics } from "@/lib/defaultMetrics"
import { ShoppingBag, Facebook } from "lucide-react"
import Image from "next/image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PlatformTabsProps {
  platforms: {
    shopify: boolean
    meta: boolean
    tiktok?: boolean
    googleads?: boolean
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
      <TabsList className="flex justify-center items-center space-x-4 w-full max-w-[600px] h-16 mx-auto mb-10 bg-[#1A1A1A] border border-[#333] rounded-lg p-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="shopify" 
                disabled={!platforms.shopify}
                className="rounded-md w-24 h-12 data-[state=active]:bg-[#2A2A2A] data-[state=active]:border-[#444] data-[state=active]:border text-gray-300 data-[state=active]:text-white transition-all duration-300 ease-in-out"
              >
                <div className="flex items-center justify-center">
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <Image 
                      src="https://i.imgur.com/cnCcupx.png" 
                      alt="Shopify logo" 
                      width={36} 
                      height={36} 
                      className="object-contain hover:scale-110 transition-transform duration-200"
                    />
                  </div>
                </div>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Shopify</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="meta" 
                disabled={!platforms.meta}
                className="rounded-md w-24 h-12 data-[state=active]:bg-[#2A2A2A] data-[state=active]:border-[#444] data-[state=active]:border text-gray-300 data-[state=active]:text-white transition-all duration-300 ease-in-out"
              >
                <div className="flex items-center justify-center">
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <Image 
                      src="https://i.imgur.com/6hyyRrs.png" 
                      alt="Meta logo" 
                      width={36} 
                      height={36} 
                      className="object-contain hover:scale-110 transition-transform duration-200"
                    />
                  </div>
                </div>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Meta</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="tiktok" 
                disabled={!platforms.tiktok}
                className="rounded-md w-24 h-12 data-[state=active]:bg-[#2A2A2A] data-[state=active]:border-[#444] data-[state=active]:border text-gray-300 data-[state=active]:text-white transition-all duration-300 ease-in-out"
              >
                <div className="flex items-center justify-center">
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <Image 
                      src="https://i.imgur.com/Jpip3Yl.png" 
                      alt="TikTok logo" 
                      width={36} 
                      height={36} 
                      className="object-contain hover:scale-110 transition-transform duration-200"
                    />
                  </div>
                </div>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>TikTok</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="googleads" 
                disabled={!platforms.googleads}
                className="rounded-md w-24 h-12 data-[state=active]:bg-[#2A2A2A] data-[state=active]:border-[#444] data-[state=active]:border text-gray-300 data-[state=active]:text-white transition-all duration-300 ease-in-out"
              >
                <div className="flex items-center justify-center">
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <Image 
                      src="https://i.imgur.com/vMJRtDT.png" 
                      alt="Google Ads logo" 
                      width={36} 
                      height={36} 
                      className="object-contain hover:scale-110 transition-transform duration-200"
                    />
                  </div>
                </div>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Google Ads</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TabsList>

      <TabsContent value="shopify" className="mt-8">
        {platforms.shopify ? (
          <ShopifyTab 
            connection={selectedConnection!} 
            dateRange={dateRange} 
            brandId={brandId}
            metrics={safeMetrics}
            isLoading={isLoading}
            isRefreshingData={isRefreshingData}
          />
        ) : (
          <div className="flex items-center justify-center p-12 bg-[#111111] border border-[#222222] rounded-lg">
            <p className="text-gray-400">Shopify not connected</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="meta" className="mt-8">
        {platforms.meta ? (
          <MetaTab 
            dateRange={dateRange} 
            metrics={metrics}
            isLoading={isLoading}
            isRefreshingData={isRefreshingData}
            brandId={brandId}
          />
        ) : (
          <div className="flex items-center justify-center p-12 bg-[#111111] border border-[#222222] rounded-lg">
            <p className="text-gray-400">Meta not connected</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="tiktok" className="mt-8">
        {platforms.tiktok ? (
          <TikTokTab 
            dateRange={dateRange} 
            metrics={metrics}
            isLoading={isLoading}
            isRefreshingData={isRefreshingData}
            brandId={brandId}
          />
        ) : (
          <div className="flex items-center justify-center p-12 bg-[#111111] border border-[#222222] rounded-lg">
            <p className="text-gray-400">TikTok not connected</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="googleads" className="mt-8">
        {platforms.googleads ? (
          <GoogleAdsTab 
            dateRange={dateRange} 
            metrics={metrics}
            isLoading={isLoading}
            isRefreshingData={isRefreshingData}
            brandId={brandId}
          />
        ) : (
          <div className="flex items-center justify-center p-12 bg-[#111111] border border-[#222222] rounded-lg">
            <p className="text-gray-400">Google Ads not connected</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}