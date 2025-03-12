"use client"

import { PlatformTabs } from "@/components/dashboard/platforms/PlatformTabs"
import { useMetrics } from "@/lib/hooks/useMetrics"
import { DateRange } from "react-day-picker"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { PlatformConnection } from "@/types/platformConnection"
import { Metrics } from "@/types/metrics"
import { MetricCard } from "@/components/metrics/MetricCard"
import { DollarSign, TrendingUp, Eye, MousePointer, ShoppingBag, Users } from "lucide-react"
import Image from "next/image"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { RevenueCalendarNew } from "@/components/dashboard/RevenueCalendarNew"
import { SalesByProduct } from "@/components/dashboard/SalesByProduct"
import { CustomerGeographicMap } from "@/components/dashboard/CustomerGeographicMap"
import { CustomerSegmentation } from "@/components/dashboard/CustomerSegmentation"
import { CustomerLifetimeValue } from "@/components/dashboard/CustomerLifetimeValue"
import { ProductPerformanceWidget } from "@/components/dashboard/ProductPerformanceWidget"
import { ProductPerformanceSyncButton } from "@/components/dashboard/ProductPerformanceSyncButton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface WidgetManagerProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  brandId: string;
  metrics: Metrics;
  isLoading: boolean;
  isRefreshingData?: boolean;
  platformStatus: {
    shopify: boolean;
    meta: boolean;
  };
  existingConnections: PlatformConnection[];
  children?: React.ReactNode;
}

export function WidgetManager({ 
  dateRange, 
  brandId, 
  metrics, 
  isLoading,
  isRefreshingData = false,
  platformStatus,
  existingConnections,
  children
}: WidgetManagerProps) {
  const { metrics: contextMetrics, isLoading: contextIsLoading } = useMetrics()
  const [activeTab, setActiveTab] = useState<string>("shopify")
  const [connections, setConnections] = useState<PlatformConnection[]>(existingConnections || [])
  const [customerDataTab, setCustomerDataTab] = useState<string>("geography")

  useEffect(() => {
    if (existingConnections?.length > 0) {
      setConnections(existingConnections)
    }
  }, [existingConnections])

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', brandId)
      
      if (error) {
        console.error('Error loading connections:', error)
        return
      }
      
      if (data) {
        setConnections(data)
      }
    } catch (error) {
      console.error('Error loading connections:', error)
    }
  }

  useEffect(() => {
    if (brandId) {
      loadConnections()
    }
  }, [brandId])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  return (
    <>
      <PlatformTabs
        platforms={platformStatus}
        dateRange={dateRange}
        metrics={metrics}
        isLoading={isLoading}
        isRefreshingData={isRefreshingData}
        brandId={brandId}
        connections={connections}
        onTabChange={handleTabChange}
      >
        <MetricCard
          title={
            <div className="flex items-center gap-1.5">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={18} 
                  height={18} 
                  className="object-contain"
                />
              </div>
              <span className="ml-0.5">Ad Spend</span>
              <DollarSign className="h-4 w-4" />
            </div>
          }
          value={`$${(metrics.adSpend || 0).toFixed(2)}`}
          change={metrics.adSpendGrowth || 0}
          loading={isLoading}
          refreshing={isRefreshingData}
          data={[]}
          platform="meta"
        />

        <MetricCard
          title={
            <div className="flex items-center gap-1.5">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={18} 
                  height={18} 
                  className="object-contain"
                />
              </div>
              <span className="ml-0.5">ROAS</span>
              <TrendingUp className="h-4 w-4" />
            </div>
          }
          value={`${(metrics.roas || 0).toFixed(1)}x`}
          change={metrics.roasGrowth || 0}
          loading={isLoading}
          refreshing={isRefreshingData}
          data={[]}
          platform="meta"
        />

        <MetricCard
          title={
            <div className="flex items-center gap-1.5">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={18} 
                  height={18} 
                  className="object-contain"
                />
              </div>
              <span className="ml-0.5">Impressions</span>
              <Eye className="h-4 w-4" />
            </div>
          }
          value={(metrics.impressions || 0).toLocaleString()}
          change={metrics.impressionGrowth || 0}
          loading={isLoading}
          refreshing={isRefreshingData}
          data={[]}
          platform="meta"
        />

        <MetricCard
          title={
            <div className="flex items-center gap-1.5">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={18} 
                  height={18} 
                  className="object-contain"
                />
              </div>
              <span className="ml-0.5">CTR</span>
              <MousePointer className="h-4 w-4" />
            </div>
          }
          value={`${(metrics.ctr || 0).toFixed(1)}%`}
          change={metrics.ctrGrowth || 0}
          loading={isLoading}
          refreshing={isRefreshingData}
          data={[]}
          platform="meta"
        />
      </PlatformTabs>
      
      {/* Only show Meta widgets when Meta tab is active */}
      {activeTab === "meta" && children}
      
      {/* Customer Data Widgets - Only show when Shopify tab is active */}
      {activeTab === "shopify" && platformStatus.shopify && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Customer Insights</h2>
            <Tabs value={customerDataTab} onValueChange={setCustomerDataTab} className="w-auto">
              <TabsList className="bg-[#2A2A2A]">
                <TabsTrigger value="geography" className="data-[state=active]:bg-blue-600">Geography</TabsTrigger>
                <TabsTrigger value="segments" className="data-[state=active]:bg-blue-600">Segments</TabsTrigger>
                <TabsTrigger value="lifetime" className="data-[state=active]:bg-blue-600">Lifetime Value</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {customerDataTab === "geography" && (
              <CustomerGeographicMap 
                brandId={brandId} 
                isRefreshing={isRefreshingData} 
              />
            )}
            
            {customerDataTab === "segments" && (
              <CustomerSegmentation 
                brandId={brandId} 
                isRefreshing={isRefreshingData} 
              />
            )}
            
            {customerDataTab === "lifetime" && (
              <CustomerLifetimeValue 
                brandId={brandId} 
                isRefreshing={isRefreshingData} 
              />
            )}
          </div>
        </div>
      )}

      {/* Product Performance Widgets - Only show when Shopify tab is active */}
      {activeTab === "shopify" && platformStatus.shopify && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">Product Performance</h2>
              <ProductPerformanceSyncButton 
                connectionId={connections.find(c => c.platform_type === 'shopify' && c.status === 'active')?.id || ''} 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <ProductPerformanceWidget 
              brandId={brandId} 
              isRefreshing={isRefreshingData} 
            />
          </div>
        </div>
      )}
    </>
  )
} 