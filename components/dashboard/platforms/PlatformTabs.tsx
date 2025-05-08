"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DateRange } from "react-day-picker"
import { ShopifyTab } from "./tabs/ShopifyTab"
import { MetaTab } from "./tabs/MetaTab"
import { HomeTab } from "./tabs/HomeTab"
import type { Metrics } from "@/types/metrics"
import { transformToMetaMetrics } from "@/lib/transforms"
import { PlatformConnection } from "@/types/platformConnection"
import { useEffect, useState, useMemo, useRef } from "react"
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
  brandId: string
  connections: PlatformConnection[]
  children?: React.ReactNode
  onTabChange?: (value: string) => void
  brands?: Array<{ id: string, name: string }>
  isEditMode?: boolean
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
  isEditMode
}: PlatformTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("site")
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrder[]>([])
  const supabase = useSupabase()
  const [selectedConnection, setSelectedConnection] = useState<PlatformConnection | null>(null)
  
  // Add a state to track if we've already processed the metrics to prevent continuous recalculations
  const [metricsProcessed, setMetricsProcessed] = useState(false)
  // Use a ref to avoid triggering effects
  const processingRef = useRef(false)

  // Create a state to track if tab content is visible, to avoid unnecessary API calls
  const [tabVisibility, setTabVisibility] = useState({
    site: true,
    shopify: false,
    meta: false,
    tiktok: false,
    googleads: false
  });

  // Add this before the handleValueChange function
  // Track when we last dispatched a shopify refresh to prevent duplicates
  const lastShopifyRefreshRef = useRef<number>(0);

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
    
    // Check if we're using the "Last 30 days" preset and trigger a refresh
    if (dateRange && dateRange.from && dateRange.to) {
      const daysDiff = differenceInDays(dateRange.to, dateRange.from);
      const isLast30Days = daysDiff >= 25 && daysDiff <= 35;
      
      if (isLast30Days && shopifyConnection) {
        console.log('[PlatformTabs] Last 30 days preset detected with connection change');
        // Dispatch refresh events
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('force-shopify-refresh', { 
            detail: { 
              brandId, 
              timestamp: Date.now(),
              dateRange,
              forceFetch: true
            }
          }));
          window.dispatchEvent(new Event('refresh-metrics'));
        }, 500);
      }
    }
  }, [connections, dateRange, brandId]);
  
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
    setActiveTab(value);
    
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
      site: value === "site",
      shopify: value === "shopify",
      meta: value === "meta",
      tiktok: value === "tiktok",
      googleads: value === "googleads"
    });
    
    // If switching to Shopify tab with Last 30 days preset, dispatch refresh
    // but only if we haven't done so recently (debounce)
    if (value === "shopify" && dateRange && dateRange.from && dateRange.to) {
      const daysDiff = differenceInDays(dateRange.to, dateRange.from);
      const isLast30Days = daysDiff >= 25 && daysDiff <= 35;
      
      if (isLast30Days) {
        console.log('[PlatformTabs] Switching to Shopify tab with Last 30 days preset');
        
        // Prevent multiple refreshes within 2 seconds
        const now = Date.now();
        if (now - lastShopifyRefreshRef.current > 2000) {
          lastShopifyRefreshRef.current = now;
          
          // Add a small delay to ensure we don't fire events too quickly
          setTimeout(() => {
        // When using Last 30 days preset, ensure we're using the real last 30 days
        const today = new Date();
        const thirtyDaysAgo = subDays(today, 30);
        const exactDateRange = {
          from: startOfDay(thirtyDaysAgo),
          to: endOfDay(today)
        };
        
        // Dispatch shopify-tab-activated event with the exact date range
        window.dispatchEvent(new CustomEvent('shopify-tab-activated', {
          detail: {
                dateRange: exactDateRange,
                timestamp: now // Add timestamp to help track this specific event
          }
        }));
          }, 100);
        } else {
          console.log('[PlatformTabs] Skipped duplicate Shopify refresh (debounced)');
        }
      }
    }
    
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
      <MetaTab 
        dateRange={dateRange}
        metrics={safeMetrics}
        isLoading={isLoading}
        isRefreshingData={isRefreshingData}
        initialDataLoad={initialDataLoad}
        brandId={brandId}
      />
    );
  }

  return (
    <Tabs defaultValue="site" className="w-full" onValueChange={handleValueChange}>
      <TabsList className="flex justify-between sm:justify-center items-center sm:space-x-4 w-full max-w-[600px] h-14 mx-auto mb-10 bg-[#1A1A1A] backdrop-blur-lg border border-[#333] rounded-2xl p-2 shadow-lg">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="site" 
                className={`relative group rounded-xl w-full sm:w-24 h-10 text-gray-300 transition-all duration-200 ease-out overflow-hidden ${
                  activeTab === "site" 
                    ? "bg-gradient-to-b from-zinc-800/80 to-zinc-900/90 text-white shadow-md" 
                    : "hover:bg-zinc-800/20"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div 
                    className={`relative w-6 h-6 flex items-center justify-center z-10 ${
                      activeTab === "site" 
                        ? "text-white" 
                        : "text-gray-400 group-hover:text-gray-200"
                    }`}
                  >
                    <Image 
                      src="https://i.imgur.com/PZCtbwG.png" 
                      alt="Brez" 
                      width={24} 
                      height={24} 
                      className="object-contain drop-shadow-md"
                    />
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">Home</span>
                </div>
                {activeTab === "site" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30 rounded-full"></div>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs">
              <p>Dashboard Overview</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger 
                value="shopify" 
                disabled={!platforms.shopify}
                className={`relative group rounded-xl w-full sm:w-24 h-10 text-gray-300 transition-all duration-200 ease-out overflow-hidden ${
                  activeTab === "shopify" 
                    ? "bg-gradient-to-b from-green-950/40 to-zinc-900/90 text-white shadow-md" 
                    : "hover:bg-zinc-800/20"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div 
                    className={`relative w-6 h-6 flex items-center justify-center z-10 ${
                      activeTab === "shopify" 
                        ? "text-green-400" 
                        : "text-gray-400 group-hover:text-gray-200"
                    }`}
                  >
                    <Image 
                      src="https://i.imgur.com/cnCcupx.png" 
                      alt="Shopify" 
                      width={24} 
                      height={24} 
                      className="object-contain drop-shadow-md"
                    />
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">Store</span>
                </div>
                {activeTab === "shopify" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500/50 rounded-full"></div>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs">
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
                className={`relative group rounded-xl w-full sm:w-24 h-10 text-gray-300 transition-all duration-200 ease-out overflow-hidden ${
                  activeTab === "meta" 
                    ? "bg-gradient-to-b from-gray-900/80 to-zinc-900/90 text-white shadow-md" 
                    : "hover:bg-zinc-800/20"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div 
                    className={`relative w-6 h-6 flex items-center justify-center z-10 ${
                      activeTab === "meta" 
                        ? "text-gray-300" 
                        : "text-gray-400 group-hover:text-gray-200"
                    }`}
                  >
                    <Image 
                      src="https://i.imgur.com/6hyyRrs.png" 
                      alt="Meta" 
                      width={24} 
                      height={24} 
                      className="object-contain drop-shadow-md"
                    />
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">Meta</span>
                </div>
                {activeTab === "meta" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-500/50 rounded-full"></div>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs">
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
                className={`relative group rounded-xl w-full sm:w-24 h-10 text-gray-300 transition-all duration-200 ease-out overflow-hidden ${
                  activeTab === "tiktok" 
                    ? "bg-gradient-to-b from-pink-950/40 to-zinc-900/90 text-white shadow-md" 
                    : "hover:bg-zinc-800/20"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div 
                    className={`relative w-6 h-6 flex items-center justify-center z-10 ${
                      activeTab === "tiktok" 
                        ? "text-pink-400" 
                        : "text-gray-400 group-hover:text-gray-200"
                    }`}
                  >
                    <Image 
                      src="https://i.imgur.com/AXHa9UT.png" 
                      alt="TikTok" 
                      width={24} 
                      height={24} 
                      className="object-contain drop-shadow-md"
                    />
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">TikTok</span>
                </div>
                {activeTab === "tiktok" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500/50 rounded-full"></div>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs">
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
                className={`relative group rounded-xl w-full sm:w-24 h-10 text-gray-300 transition-all duration-200 ease-out overflow-hidden ${
                  activeTab === "googleads" 
                    ? "bg-gradient-to-b from-indigo-950/40 to-zinc-900/90 text-white shadow-md" 
                    : "hover:bg-zinc-800/20"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div 
                    className={`relative w-6 h-6 flex items-center justify-center z-10 ${
                      activeTab === "googleads" 
                        ? "text-indigo-400" 
                        : "text-gray-400 group-hover:text-gray-200"
                    }`}
                  >
                    <Image 
                      src="https://i.imgur.com/TavV4UJ.png" 
                      alt="Google Ads" 
                      width={24} 
                      height={24} 
                      className="object-contain drop-shadow-md"
                    />
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">Google</span>
                </div>
                {activeTab === "googleads" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500/50 rounded-full"></div>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs">
              <p>Google Ads Metrics</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TabsList>

      <TabsContent value="site" className="mt-8">
        <HomeTab
          brandId={brandId}
          brandName={brands.find(b => b.id === brandId)?.name || "Your Brand"}
          dateRange={dateRange}
          metrics={safeMetrics}
          isLoading={isLoading}
          isRefreshingData={isRefreshingData}
          platformStatus={platforms}
          connections={connections}
          brands={brands}
          isEditMode={isEditMode}
        />
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