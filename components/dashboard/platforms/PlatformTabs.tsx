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
import { ShoppingBag, Facebook, DollarSign } from "lucide-react"
import Image from "next/image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MetricCard } from "@/components/metrics/MetricCard"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { GreetingWidget } from "@/components/dashboard/GreetingWidget"
import { CustomerGeographicMap } from "@/components/dashboard/CustomerGeographicMap"

// Define local interfaces to match GreetingWidget's expectations
interface GreetingWidgetMetrics {
  totalSales: number
  conversionRate: number
  averagePurchaseValue: number
  roas: number
  adSpend: number
  salesGrowth?: number
  aovGrowth?: number
  ordersPlaced?: number
  averageOrderValue?: number
  unitsSold?: number
  topProducts?: any[]
  customerSegments?: any[]
  [key: string]: any // Allow other properties
}

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
  initialDataLoad?: boolean
  brandId: string
  connections: PlatformConnection[]
  children?: React.ReactNode
  onTabChange?: (value: string) => void
  brands?: Array<{ id: string, name: string }>
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
  initialDataLoad = false,
  brandId, 
  connections, 
  children,
  onTabChange,
  brands = []
}: PlatformTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("site")
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrder[]>([])
  const supabase = useSupabase()
  const [selectedConnection, setSelectedConnection] = useState<PlatformConnection | null>(null)

  // Don't render anything during initial data load
  if (initialDataLoad) {
    return null;
  }

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

  // Create a fully safe metrics object with all properties initialized
  const safeMetrics = {
    // Shopify metrics
    totalSales: typeof metrics?.totalSales === 'number' ? metrics.totalSales : 0,
    salesGrowth: typeof metrics?.salesGrowth === 'number' ? metrics.salesGrowth : 0,
    conversionRate: typeof metrics?.conversionRate === 'number' ? metrics.conversionRate : 0,
    conversionRateGrowth: typeof metrics?.conversionRateGrowth === 'number' ? metrics.conversionRateGrowth : 0,
    averagePurchaseValue: typeof metrics?.averagePurchaseValue === 'number' ? metrics.averagePurchaseValue : 0,
    aovGrowth: typeof metrics?.aovGrowth === 'number' ? metrics.aovGrowth : 0,
    
    // Meta metrics
    adSpend: typeof metrics?.adSpend === 'number' ? metrics.adSpend : 0,
    adSpendGrowth: typeof metrics?.adSpendGrowth === 'number' ? metrics.adSpendGrowth : 0,
    roas: typeof metrics?.roas === 'number' ? metrics.roas : 0,
    roasGrowth: typeof metrics?.roasGrowth === 'number' ? metrics.roasGrowth : 0,
    impressions: typeof metrics?.impressions === 'number' ? metrics.impressions : 0,
    impressionGrowth: typeof metrics?.impressionGrowth === 'number' ? metrics.impressionGrowth : 0,
    clicks: typeof metrics?.clicks === 'number' ? metrics.clicks : 0,
    clickGrowth: typeof metrics?.clickGrowth === 'number' ? metrics.clickGrowth : 0,
    
    // Other properties with fallbacks
    ordersPlaced: typeof metrics?.ordersPlaced === 'number' ? metrics.ordersPlaced : 0,
    averageOrderValue: typeof metrics?.averageOrderValue === 'number' ? metrics.averageOrderValue : 0,
    unitsSold: typeof metrics?.unitsSold === 'number' ? metrics.unitsSold : 0,
    topProducts: Array.isArray(metrics?.topProducts) ? metrics.topProducts : [],
    customerSegments: Array.isArray(metrics?.customerSegments) ? metrics.customerSegments : [],
    dailyData: Array.isArray(metrics?.dailyData) ? metrics.dailyData : [],
    revenueByDay: Array.isArray(metrics?.revenueByDay) ? metrics.revenueByDay : [],
    customerRetentionRate: typeof metrics?.customerRetentionRate === 'number' ? metrics.customerRetentionRate : 0
  }

  // Create an adapter specifically for the GreetingWidget component
  const greetingWidgetMetrics: GreetingWidgetMetrics = {
    totalSales: safeMetrics.totalSales || 0,
    conversionRate: safeMetrics.conversionRate || 0,
    averagePurchaseValue: safeMetrics.averagePurchaseValue || 0,
    roas: safeMetrics.roas || 0,
    adSpend: safeMetrics.adSpend || 0,
    salesGrowth: safeMetrics.salesGrowth || 0,
    aovGrowth: safeMetrics.aovGrowth || 0,
    ordersPlaced: safeMetrics.ordersPlaced || 0,
    averageOrderValue: safeMetrics.averageOrderValue || 0,
    unitsSold: safeMetrics.unitsSold || 0,
    topProducts: safeMetrics.topProducts || [],
    revenueByDay: safeMetrics.revenueByDay || [],
    customerSegments: [], // An empty array as expected by GreetingWidget
    conversionRateGrowth: safeMetrics.conversionRateGrowth || 0,
    customerRetentionRate: safeMetrics.customerRetentionRate || 0
  };

  // Handle tab change
  const handleValueChange = (value: string) => {
    setActiveTab(value);
    if (onTabChange) {
      onTabChange(value);
    }
  };

  return (
    <Tabs defaultValue="site" className="w-full" onValueChange={handleValueChange}>
      <TabsList className="flex justify-center items-center space-x-4 w-full max-w-[600px] h-16 mx-auto mb-10 bg-[#1A1A1A] border border-[#333] rounded-lg p-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="site" 
                className={`group rounded-md w-24 h-12 text-gray-300 transition-all duration-300 ease-in-out ${
                  activeTab === "site" 
                    ? "bg-[#2A2A2A] border-[#444] border text-white animate-pulse-subtle" 
                    : "hover:bg-[#222]"
                }`}
              >
                <div className="flex items-center justify-center">
                  <div 
                    className={`relative w-10 h-10 flex items-center justify-center ${
                      activeTab === "site" 
                        ? "filter drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] animate-glow-pulse" 
                        : "transition-all duration-300 group-hover:filter group-hover:drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]"
                    }`}
                    style={activeTab === "site" ? { '--glow-color': '255, 255, 255' } as React.CSSProperties : {}}
                  >
                    <Image 
                      src="https://i.imgur.com/PZCtbwG.png" 
                      alt="Brez Logo" 
                      width={36} 
                      height={36} 
                      className={`object-contain transition-transform duration-300 hover:scale-110 ${activeTab === "site" ? "scale-110" : ""}`}
                    />
                  </div>
                </div>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#222] border border-[#444] text-white text-xs">
              <p>Brez</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="shopify" 
                disabled={!platforms.shopify}
                className={`group rounded-md w-24 h-12 text-gray-300 transition-all duration-300 ease-in-out ${
                  activeTab === "shopify" 
                    ? "bg-[#2A2A2A] border-[#444] border text-white animate-pulse-subtle" 
                    : "hover:bg-[#222]"
                }`}
              >
                <div className="flex items-center justify-center">
                  <div 
                    className={`relative w-10 h-10 flex items-center justify-center ${
                      activeTab === "shopify" 
                        ? "filter drop-shadow-[0_0_5px_rgba(150,191,72,0.8)] animate-glow-pulse" 
                        : "transition-all duration-300 group-hover:filter group-hover:drop-shadow-[0_0_3px_rgba(150,191,72,0.5)]"
                    }`}
                    style={activeTab === "shopify" ? { '--glow-color': '150, 191, 72' } as React.CSSProperties : {}}
                  >
                    <Image 
                      src="https://i.imgur.com/cnCcupx.png" 
                      alt="Shopify logo" 
                      width={36} 
                      height={36} 
                      className={`object-contain transition-transform duration-300 hover:scale-110 ${activeTab === "shopify" ? "scale-110" : ""}`}
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
                className={`group rounded-md w-24 h-12 text-gray-300 transition-all duration-300 ease-in-out ${
                  activeTab === "meta" 
                    ? "bg-[#2A2A2A] border-[#444] border text-white animate-pulse-subtle" 
                    : "hover:bg-[#222]"
                }`}
              >
                <div className="flex items-center justify-center">
                  <div 
                    className={`relative w-10 h-10 flex items-center justify-center ${
                      activeTab === "meta" 
                        ? "filter drop-shadow-[0_0_5px_rgba(24,119,242,0.8)] animate-glow-pulse" 
                        : "transition-all duration-300 group-hover:filter group-hover:drop-shadow-[0_0_3px_rgba(24,119,242,0.5)]"
                    }`}
                    style={activeTab === "meta" ? { '--glow-color': '24, 119, 242' } as React.CSSProperties : {}}
                  >
                    <Image 
                      src="https://i.imgur.com/6hyyRrs.png" 
                      alt="Meta logo" 
                      width={36} 
                      height={36} 
                      className={`object-contain transition-transform duration-300 hover:scale-110 ${activeTab === "meta" ? "scale-110" : ""}`}
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
                className={`group rounded-md w-24 h-12 text-gray-300 transition-all duration-300 ease-in-out ${
                  activeTab === "tiktok" 
                    ? "bg-[#2A2A2A] border-[#444] border text-white animate-pulse-subtle" 
                    : "hover:bg-[#222]"
                }`}
              >
                <div className="flex items-center justify-center">
                  <div 
                    className={`relative w-10 h-10 flex items-center justify-center ${
                      activeTab === "tiktok" 
                        ? "filter drop-shadow-[0_0_5px_rgba(255,0,80,0.8)] animate-glow-pulse" 
                        : "transition-all duration-300 group-hover:filter group-hover:drop-shadow-[0_0_3px_rgba(255,0,80,0.5)]"
                    }`}
                    style={activeTab === "tiktok" ? { '--glow-color': '255, 0, 80' } as React.CSSProperties : {}}
                  >
                    <Image 
                      src="https://i.imgur.com/AXHa9UT.png" 
                      alt="TikTok logo" 
                      width={36} 
                      height={36} 
                      className={`object-contain transition-transform duration-300 hover:scale-110 ${activeTab === "tiktok" ? "scale-110" : ""}`}
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
                className={`group rounded-md w-24 h-12 text-gray-300 transition-all duration-300 ease-in-out ${
                  activeTab === "googleads" 
                    ? "bg-[#2A2A2A] border-[#444] border text-white animate-pulse-subtle" 
                    : "hover:bg-[#222]"
                }`}
              >
                <div className="flex items-center justify-center">
                  <div 
                    className={`relative w-10 h-10 flex items-center justify-center ${
                      activeTab === "googleads" 
                        ? "filter drop-shadow-[0_0_5px_rgba(66,133,244,0.8)] animate-glow-pulse" 
                        : "transition-all duration-300 group-hover:filter group-hover:drop-shadow-[0_0_3px_rgba(66,133,244,0.5)]"
                    }`}
                    style={activeTab === "googleads" ? { '--glow-color': '66, 133, 244' } as React.CSSProperties : {}}
                  >
                    <Image 
                      src="https://i.imgur.com/TavV4UJ.png" 
                      alt="Google Ads logo" 
                      width={36} 
                      height={36} 
                      className={`object-contain transition-transform duration-300 hover:scale-110 ${activeTab === "googleads" ? "scale-110" : ""}`}
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

      <TabsContent value="site" className="mt-8">
        <div className="p-8 bg-[#1A1A1A] border border-[#333] rounded-lg">
          {/* Greeting Widget */}
          <GreetingWidget 
            brandId={brandId}
            brandName={brands.find(b => b.id === brandId)?.name || "Your Brand"}
            metrics={greetingWidgetMetrics} 
            connections={connections}
          />
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-white">Site Overview</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1 mb-4">
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <div className="relative w-4 h-4">
                    <Image 
                      src="https://i.imgur.com/PZCtbwG.png" 
                      alt="Brez logo" 
                      width={16} 
                      height={16} 
                      className="object-contain"
                    />
                  </div>
                  <span>Total Sales</span>
                  <DollarSign className="h-4 w-4" />
                </div>
              }
              value={safeMetrics.totalSales || 0}
              change={safeMetrics.salesGrowth || 0}
              prefix="$"
              valueFormat="currency"
              data={safeMetrics.dailyData || []}
              loading={isLoading}
              refreshing={isRefreshingData}
              platform="shopify"
              dateRange={dateRange}
              infoTooltip="Total revenue from all orders in the selected period"
              brandId={brandId}
            />
          </div>
          
          {/* Revenue Calendar - Full Width */}
          <div className="w-full mt-6">
            <Card className="bg-[#111111] border-[#222222]">
              <CardHeader className="py-2">
                <CardTitle className="text-white"></CardTitle>
              </CardHeader>
              <CardContent className="h-[520px]">
                <RevenueByDay 
                  data={(safeMetrics.revenueByDay || []).map(d => ({
                    date: d.date,
                    revenue: d.amount || 0
                  }))} 
                  brandId={brandId}
                  isRefreshing={isRefreshingData}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="shopify" className="mt-8">
        {selectedConnection ? (
          <ShopifyTab 
            connection={selectedConnection}
            dateRange={dateRange}
            brandId={brandId}
            metrics={safeMetrics}
            isLoading={isLoading}
            isRefreshingData={isRefreshingData}
            initialDataLoad={initialDataLoad}
          />
        ) : (
          <div className="text-center py-8 text-gray-400">
            No active Shopify connection found. Please connect your store.
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="meta" className="mt-8">
        <MetaTab 
          dateRange={dateRange}
          metrics={safeMetrics}
          isLoading={isLoading}
          isRefreshingData={isRefreshingData}
          initialDataLoad={initialDataLoad}
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