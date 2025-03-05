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
      <TabsList className="flex justify-center items-center space-x-4 w-full max-w-[600px] h-16 mx-auto bg-[#1A1A1A] border border-[#333] rounded-lg p-2">
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
                      className="object-contain transition-transform duration-300 hover:scale-110"
                    />
                  </div>
                </div>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#222] border border-[#444] text-white text-xs">
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
                      className="object-contain transition-transform duration-300 hover:scale-110"
                    />
                  </div>
                </div>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#222] border border-[#444] text-white text-xs">
              <p>Meta Ads</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="tiktok" 
                disabled={false}
                className="rounded-md w-24 h-12 data-[state=active]:bg-[#2A2A2A] data-[state=active]:border-[#444] data-[state=active]:border text-gray-300 data-[state=active]:text-white transition-all duration-300 ease-in-out"
              >
                <div className="flex items-center justify-center">
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <Image 
                      src="https://i.imgur.com/AXHa9UT.png" 
                      alt="TikTok logo" 
                      width={36} 
                      height={36} 
                      className="object-contain transition-transform duration-300 hover:scale-110"
                    />
                  </div>
                </div>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#222] border border-[#444] text-white text-xs">
              <p>TikTok Ads</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="googleads" 
                disabled={false}
                className="rounded-md w-24 h-12 data-[state=active]:bg-[#2A2A2A] data-[state=active]:border-[#444] data-[state=active]:border text-gray-300 data-[state=active]:text-white transition-all duration-300 ease-in-out"
              >
                <div className="flex items-center justify-center">
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <Image 
                      src="https://i.imgur.com/t4E5ngO.png" 
                      alt="Google Ads logo" 
                      width={36} 
                      height={36} 
                      className="object-contain transition-transform duration-300 hover:scale-110"
                    />
                  </div>
                </div>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#222] border border-[#444] text-white text-xs">
              <p>Google Ads</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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

      <TabsContent value="tiktok">
        <div className="p-8 bg-[#1A1A1A] border border-[#333] rounded-lg text-center">
          <div className="mb-4">
            <Image 
              src="https://i.imgur.com/AXHa9UT.png" 
              alt="TikTok logo" 
              width={64} 
              height={64} 
              className="mx-auto"
            />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">TikTok Ads Integration</h2>
          <p className="text-gray-400 mb-4">
            This is a placeholder to demonstrate the dashboard's capability to integrate with TikTok Ads.
            In a production environment, this would connect to the TikTok Ads API to display your campaign metrics.
          </p>
          <div className="p-4 bg-[#222] border border-[#444] rounded-lg inline-block text-left">
            <p className="text-gray-300 text-sm">
              <span className="font-semibold">Features would include:</span>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Campaign performance metrics</li>
                <li>Ad spend tracking</li>
                <li>Audience insights</li>
                <li>Conversion tracking</li>
                <li>ROI analysis</li>
              </ul>
            </p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="googleads">
        <div className="p-8 bg-[#1A1A1A] border border-[#333] rounded-lg text-center">
          <div className="mb-4">
            <Image 
              src="https://i.imgur.com/t4E5ngO.png" 
              alt="Google Ads logo" 
              width={64} 
              height={64} 
              className="mx-auto"
            />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Google Ads Integration</h2>
          <p className="text-gray-400 mb-4">
            This is a placeholder to demonstrate the dashboard's capability to integrate with Google Ads.
            In a production environment, this would connect to the Google Ads API to display your campaign metrics.
          </p>
          <div className="p-4 bg-[#222] border border-[#444] rounded-lg inline-block text-left">
            <p className="text-gray-300 text-sm">
              <span className="font-semibold">Features would include:</span>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Campaign performance tracking</li>
                <li>Keyword analysis</li>
                <li>Ad spend monitoring</li>
                <li>Conversion tracking</li>
                <li>Quality score metrics</li>
              </ul>
            </p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}