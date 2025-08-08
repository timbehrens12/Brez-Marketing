"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DateRange } from "react-day-picker"
import { ShopifyTab } from "./tabs/ShopifyTab"
import { MetaTab2 } from "./tabs/MetaTab2"

import { AgencyActionCenter } from "../AgencyActionCenter"
import type { Metrics } from "@/types/metrics"
import { transformToMetaMetrics } from "@/lib/transforms"
import { PlatformConnection } from "@/types/platformConnection"
import { useEffect, useState, useMemo, useRef } from "react"
import { useSupabase } from '@/lib/hooks/useSupabase'
import { useAuth } from '@clerk/nextjs'
import { defaultMetrics } from "@/lib/defaultMetrics"
import { ShoppingBag, Facebook, DollarSign, ClipboardList } from "lucide-react"

import Image from "next/image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MetricCard } from "@/components/metrics/MetricCard"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { GreetingWidget } from "@/components/dashboard/GreetingWidget"
import { CustomerGeographicMap } from "@/components/dashboard/CustomerGeographicMap"
import { differenceInDays, subDays, startOfDay, endOfDay } from "date-fns"

// Add Window interface to type the global properties
declare global {
  interface Window {
    _blockMetaApiCalls?: boolean;
  }
}

// Define local interfaces to match GreetingWidget's expectations
interface GreetingWidgetMetrics {
  totalSales: number
  conversionRate: number
  averageOrderValue: number
  roas: number
  adSpend: number
  salesGrowth?: number
  aovGrowth?: number
  ordersPlaced?: number
  unitsSold?: number
  topProducts?: any[]
  customerSegments?: any[]
  averagePurchaseValue?: number
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
  brandId: string | null
  connections: PlatformConnection[]
  children?: React.ReactNode
  onTabChange?: (value: string) => void
  brands?: Array<{ id: string, name: string }>
  isEditMode?: boolean
  activeTab?: string
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
  brands = [],
  isEditMode,
  activeTab = "agency"
}: PlatformTabsProps) {
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrder[]>([])
  const supabase = useSupabase()
  const [selectedConnection, setSelectedConnection] = useState<PlatformConnection | null>(null)
  
  const { userId } = useAuth()
  
  // Notification system removed
  

  
  // Add a state to track if we've already processed the metrics to prevent continuous recalculations
  const [metricsProcessed, setMetricsProcessed] = useState(false)
  // Use a ref to avoid triggering effects
  const processingRef = useRef(false)

  // Create a state to track if tab content is visible, to avoid unnecessary API calls
  const [tabVisibility, setTabVisibility] = useState({
    shopify: false,
    meta: false,
    tiktok: false,
    googleads: false,
    agency: true
  });

  // Add this before the handleValueChange function
  // Track when we last dispatched a shopify refresh to prevent duplicates
  const lastShopifyRefreshRef = useRef<number>(0);

  // If no brand is selected, don't render the tabs
  if (!brandId) {
    // This can be a placeholder or null
    return null;
  }

  // Update selectedConnection when connections change
  useEffect(() => {
    const shopifyConnection = connections?.find(c => 
      c.platform_type === 'shopify' && c.status === 'active'
    )
    setSelectedConnection(shopifyConnection || null)
  }, [connections]);
  
  // Memoize the safeMetrics object to prevent recalculation on every render
  const safeMetrics = useMemo(() => {
    // If metrics processing is already happening, don't trigger another calculation
    if (processingRef.current) {
      return metrics || defaultMetrics;
    }

    if (!metrics) {
      return defaultMetrics;
    }

    return metrics;
  }, [metrics]);
  
  // Reset the processed flag when metrics change
  useEffect(() => {
    setMetricsProcessed(false);
    processingRef.current = false;
  }, [metrics]);

  // Create an adapter specifically for the GreetingWidget component
  const greetingWidgetMetrics = useMemo(() => ({
    totalSales: safeMetrics.totalSales || 0,
    conversionRate: safeMetrics.conversionRate || 0,
    averageOrderValue: safeMetrics.averageOrderValue || 0,
    roas: safeMetrics.roas || 0,
    adSpend: safeMetrics.adSpend || 0,
    salesGrowth: safeMetrics.salesGrowth || 0,
    aovGrowth: safeMetrics.aovGrowth || 0,
    ordersPlaced: safeMetrics.ordersPlaced || 0,
    unitsSold: safeMetrics.unitsSold || 0,
    topProducts: safeMetrics.topProducts || [],
    revenueByDay: safeMetrics.revenueByDay || [],
    customerSegments: [], // An empty array as expected by GreetingWidget
    conversionRateGrowth: safeMetrics.conversionRateGrowth || 0,
    customerRetentionRate: safeMetrics.customerRetentionRate || 0,
    averagePurchaseValue: safeMetrics.averageOrderValue || 0
  }), [safeMetrics]);

  // Handle tab change with visibility tracking
  const handleValueChange = (value: string) => {
    // Use the onTabChange prop to update parent state instead of local state
    if (onTabChange) {
      onTabChange(value);
    }
    
    // If we're leaving the Meta tab, set the global block flag to stop API calls temporarily
    if (activeTab === "meta" && value !== "meta") {
      console.log("[PlatformTabs] Leaving Meta tab, enabling temporary blocking during transition");
      
      if (window._blockMetaApiCalls !== undefined) {
        // Only temporarily block Meta API calls
        window._blockMetaApiCalls = true;
        
        // Automatically clear the block flag after a brief delay
        // This ensures that when we navigate back, we can fetch immediately
        setTimeout(() => {
          window._blockMetaApiCalls = false;
          console.log("[PlatformTabs] Navigation transition complete, cleared API blocking flag");
            }, 1000);
          }
      }
    
    // If we're navigating TO the Meta tab, clear the block flag immediately
    if (value === "meta" && window._blockMetaApiCalls) {
      console.log("[PlatformTabs] Navigating to Meta tab, clearing API blocking flag");
      window._blockMetaApiCalls = false;
    }
    
    // Update visibility state for all tabs
    setTabVisibility({
      shopify: value === "shopify",
      meta: value === "meta",
      tiktok: value === "tiktok",
      googleads: value === "googleads",
      agency: value === "agency"
    });
    
    // Notify parent of tab change
    if (onTabChange) {
      onTabChange(value);
    }
  };

  // Don't render MetaTab at all if not visible, to prevent background API calls
  const renderMetaTabContent = () => {
    if (!tabVisibility.meta) {
      return null;
    }
    
    // Explicitly unblock Meta API calls when on the Meta tab
    if (typeof window !== 'undefined' && window._blockMetaApiCalls !== undefined) {
      window._blockMetaApiCalls = false;
    }
    
    return (
      <MetaTab2 
        brandId={brandId}
        brandName={brands?.find(b => b.id === brandId)?.name || "Your Brand"}
        dateRange={dateRange}
        connections={connections}
      />
    );
  }

  // Don't render anything during initial data load
  if (initialDataLoad) {
    return null;
  }

  return (
    <Tabs value={activeTab} className="w-full" onValueChange={handleValueChange}>
      <div className="flex justify-center w-full">
        <TabsList className="flex justify-center items-center space-x-4 max-w-[700px] h-28 mb-6 bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] backdrop-blur-xl border border-[#333] rounded-3xl p-6 shadow-2xl shadow-black/20">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="agency" 
                className={`relative group rounded-2xl w-28 h-20 transition-all duration-300 ease-out overflow-hidden ${
                  activeTab === "agency" 
                    ? "bg-gray-600/30 text-white shadow-lg border border-gray-500/50" 
                    : "text-gray-400 hover:bg-gray-700/30 hover:text-gray-200 hover:shadow-lg border border-transparent hover:border-gray-600/30"
                }`}
              >
                <div className="flex items-center justify-center relative">
                  <div 
                    className={`relative w-10 h-10 flex items-center justify-center z-10 ${
                      activeTab === "agency" 
                        ? "text-white" 
                        : "text-gray-400 group-hover:text-gray-200"
                    }`}
                  >
                    <ClipboardList 
                      size={32} 
                      className="drop-shadow-md"
                    />
                  </div>

                </div>
                {activeTab === "agency" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400/50 rounded-full"></div>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 text-zinc-200 text-xs shadow-xl">
              <p>Agency Management</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>



        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="shopify" 
                disabled={!platforms.shopify}
                className={`relative group rounded-2xl w-28 h-20 transition-all duration-300 ease-out overflow-hidden ${
                  activeTab === "shopify" 
                    ? "bg-gray-600/30 text-white shadow-lg border border-gray-500/50" 
                    : "text-gray-400 hover:bg-gray-700/30 hover:text-gray-200 hover:shadow-lg border border-transparent hover:border-gray-600/30"
                } ${!platforms.shopify ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-center">
                  <div 
                    className={`relative w-10 h-10 flex items-center justify-center z-10 ${
                      activeTab === "shopify" 
                        ? "text-white" 
                        : "text-gray-400 group-hover:text-gray-200"
                    }`}
                  >
                    <Image 
                      src="/shopify-icon.png" 
                      alt="Shopify" 
                      width={36} 
                      height={36} 
                      className="object-contain drop-shadow-md"
                    />
                  </div>
                </div>
                {activeTab === "shopify" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400/50 rounded-full"></div>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 text-zinc-200 text-xs shadow-xl">
              <p>Shopify Store Metrics</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="meta" 
                disabled={!platforms.meta}
                className={`relative group rounded-2xl w-28 h-20 transition-all duration-300 ease-out overflow-hidden ${
                  activeTab === "meta" 
                    ? "bg-gray-600/30 text-white shadow-lg border border-gray-500/50" 
                    : "text-gray-400 hover:bg-gray-700/30 hover:text-gray-200 hover:shadow-lg border border-transparent hover:border-gray-600/30"
                } ${!platforms.meta ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-center">
                  <div 
                    className={`relative w-10 h-10 flex items-center justify-center z-10 ${
                      activeTab === "meta" 
                        ? "text-white" 
                        : "text-gray-400 group-hover:text-gray-200"
                    }`}
                  >
                    <Image 
                      src="https://i.imgur.com/VAR7v4w.png" 
                      alt="Meta" 
                      width={40} 
                      height={40} 
                      className="object-contain drop-shadow-md"
                    />
                  </div>
                </div>
                {activeTab === "meta" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400/50 rounded-full"></div>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 text-zinc-200 text-xs shadow-xl">
              <p>Meta Ads Analytics</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>



        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="tiktok" 
                disabled={!platforms.tiktok}
                className={`relative group rounded-2xl w-28 h-20 transition-all duration-300 ease-out overflow-hidden ${
                  activeTab === "tiktok" 
                    ? "bg-gray-600/30 text-white shadow-lg border border-gray-500/50" 
                    : "text-gray-400 hover:bg-gray-700/30 hover:text-gray-200 hover:shadow-lg border border-transparent hover:border-gray-600/30"
                } ${!platforms.tiktok ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-center">
                  <div 
                    className={`relative w-10 h-10 flex items-center justify-center z-10 ${
                      activeTab === "tiktok" 
                        ? "text-white" 
                        : "text-gray-400 group-hover:text-gray-200"
                    }`}
                  >
                    <Image 
                      src="https://i.imgur.com/AXHa9UT.png" 
                      alt="TikTok" 
                      width={40} 
                      height={40} 
                      className="object-contain drop-shadow-md"
                    />
                  </div>
                </div>
                {activeTab === "tiktok" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400/50 rounded-full"></div>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 text-zinc-200 text-xs shadow-xl">
              <p>TikTok Ads Performance</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="googleads" 
                disabled={!platforms.googleads}
                className={`relative group rounded-2xl w-28 h-20 transition-all duration-300 ease-out overflow-hidden ${
                  activeTab === "googleads" 
                    ? "bg-gray-600/30 text-white shadow-lg border border-gray-500/50" 
                    : "text-gray-400 hover:bg-gray-700/30 hover:text-gray-200 hover:shadow-lg border border-transparent hover:border-gray-600/30"
                } ${!platforms.googleads ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-center">
                  <div 
                    className={`relative w-10 h-10 flex items-center justify-center z-10 ${
                      activeTab === "googleads" 
                        ? "text-white" 
                        : "text-gray-400 group-hover:text-gray-200"
                    }`}
                  >
                    <Image 
                      src="https://i.imgur.com/TavV4UJ.png" 
                      alt="Google Ads" 
                      width={40} 
                      height={40} 
                      className="object-contain drop-shadow-md"
                    />
                  </div>
                </div>
                {activeTab === "googleads" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400/50 rounded-full"></div>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 text-zinc-200 text-xs shadow-xl">
              <p>Google Ads Metrics</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TabsList>
      </div>

      <TabsContent value="agency" className="mt-8">
        <AgencyActionCenter dateRange={dateRange} />
      </TabsContent>



      <TabsContent value="shopify" className="mt-8">
        {tabVisibility.shopify && selectedConnection ? (
          <ShopifyTab 
            connection={selectedConnection}
            dateRange={dateRange}
            brandId={brandId}
            metrics={safeMetrics}
            isLoading={isLoading}
            isRefreshingData={isRefreshingData}
            initialDataLoad={initialDataLoad}
          />
        ) : tabVisibility.shopify ? (
          <div className="text-center py-8 text-gray-400">
            No active Shopify connection found. Please connect your store.
          </div>
        ) : null}
      </TabsContent>
      
      <TabsContent value="meta" className="mt-8">
        {renderMetaTabContent()}
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