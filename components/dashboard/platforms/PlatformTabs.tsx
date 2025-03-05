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
  const [activeTab, setActiveTab] = useState<string>('shopify')
  const shopifyConnection = connections.find(c => c.platform_type === 'shopify')
  const metaConnection = connections.find(c => c.platform_type === 'meta')
  
  useEffect(() => {
    // Set initial tab based on available platforms
    if (platforms.shopify) {
      setActiveTab('shopify')
    } else if (platforms.meta) {
      setActiveTab('meta')
    } else if (platforms.tiktok) {
      setActiveTab('tiktok')
    } else if (platforms.googleads) {
      setActiveTab('googleads')
    }
  }, [platforms])

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

  const handleValueChange = (value: string) => {
    setActiveTab(value)
    if (onTabChange) {
      onTabChange(value)
    }
  }

  return (
    <Tabs defaultValue="shopify" value={activeTab} onValueChange={handleValueChange} className="w-full">
      <TabsList className="flex justify-center mb-10 bg-[#111111] border border-[#222222] p-1 rounded-lg">
        {platforms.shopify && (
          <TabsTrigger 
            value="shopify" 
            className="relative flex items-center justify-center w-12 h-12 p-0 data-[state=active]:bg-[#1a1a1a] rounded-md transition-all duration-200 hover:scale-105"
            title="Shopify"
          >
            <div className={`relative w-8 h-8 ${activeTab === 'shopify' ? 'drop-shadow-[0_0_8px_rgba(95,199,104,0.5)]' : ''}`}>
              <Image 
                src="https://i.imgur.com/cnCcupx.png" 
                alt="Shopify" 
                width={32} 
                height={32} 
                className="object-contain"
              />
            </div>
            {activeTab === 'shopify' && (
              <div className="absolute -bottom-1 w-6 h-0.5 bg-[#5fc768] rounded-full"></div>
            )}
          </TabsTrigger>
        )}
        {platforms.meta && (
          <TabsTrigger 
            value="meta" 
            className="relative flex items-center justify-center w-12 h-12 p-0 data-[state=active]:bg-[#1a1a1a] rounded-md transition-all duration-200 hover:scale-105"
            title="Meta"
          >
            <div className={`relative w-8 h-8 ${activeTab === 'meta' ? 'drop-shadow-[0_0_8px_rgba(24,119,242,0.5)]' : ''}`}>
              <Image 
                src="https://i.imgur.com/6hyyRrs.png" 
                alt="Meta" 
                width={32} 
                height={32} 
                className="object-contain"
              />
            </div>
            {activeTab === 'meta' && (
              <div className="absolute -bottom-1 w-6 h-0.5 bg-[#1877f2] rounded-full"></div>
            )}
          </TabsTrigger>
        )}
        {platforms.tiktok && (
          <TabsTrigger 
            value="tiktok" 
            className="relative flex items-center justify-center w-12 h-12 p-0 data-[state=active]:bg-[#1a1a1a] rounded-md transition-all duration-200 hover:scale-105"
            title="TikTok"
          >
            <div className={`relative w-8 h-8 ${activeTab === 'tiktok' ? 'drop-shadow-[0_0_8px_rgba(238,29,82,0.5)]' : ''}`}>
              <Image 
                src="https://i.imgur.com/VVSgLPI.png" 
                alt="TikTok" 
                width={32} 
                height={32} 
                className="object-contain"
              />
            </div>
            {activeTab === 'tiktok' && (
              <div className="absolute -bottom-1 w-6 h-0.5 bg-[#ee1d52] rounded-full"></div>
            )}
          </TabsTrigger>
        )}
        {platforms.googleads && (
          <TabsTrigger 
            value="googleads" 
            className="relative flex items-center justify-center w-12 h-12 p-0 data-[state=active]:bg-[#1a1a1a] rounded-md transition-all duration-200 hover:scale-105"
            title="Google Ads"
          >
            <div className={`relative w-8 h-8 ${activeTab === 'googleads' ? 'drop-shadow-[0_0_8px_rgba(66,133,244,0.5)]' : ''}`}>
              <Image 
                src="https://i.imgur.com/Ht9NkXt.png" 
                alt="Google Ads" 
                width={32} 
                height={32} 
                className="object-contain"
              />
            </div>
            {activeTab === 'googleads' && (
              <div className="absolute -bottom-1 w-6 h-0.5 bg-[#4285f4] rounded-full"></div>
            )}
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="shopify" className="mt-8">
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
      
      <TabsContent value="meta" className="mt-8">
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

      <TabsContent value="tiktok" className="mt-8">
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

      <TabsContent value="googleads" className="mt-8">
        <div className="p-8 bg-[#1A1A1A] border border-[#333] rounded-lg text-center">
          <div className="mb-4">
            <Image 
              src="https://i.imgur.com/TavV4UJ.png" 
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