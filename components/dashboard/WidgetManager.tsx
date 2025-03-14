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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { WidgetLoadingOverlay } from "@/components/WidgetLoadingOverlay"

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
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="relative">
          <MetricCard
            title="Total Revenue"
            value={metrics.totalSales}
            change={metrics.salesGrowth}
            icon={<DollarSign className="h-4 w-4" />}
            brandId={brandId}
            data={[]}
          />
          <WidgetLoadingOverlay isLoading={isLoading} />
        </div>
        
        <div className="relative">
          <MetricCard
            title="Orders"
            value={metrics.ordersPlaced}
            change={metrics.ordersGrowth}
            icon={<ShoppingBag className="h-4 w-4" />}
            brandId={brandId}
            prefix=""
            data={[]}
          />
          <WidgetLoadingOverlay isLoading={isLoading} />
        </div>
        
        <div className="relative">
          <MetricCard
            title="Average Order Value"
            value={metrics.averageOrderValue}
            change={metrics.aovGrowth}
            icon={<TrendingUp className="h-4 w-4" />}
            brandId={brandId}
            data={[]}
          />
          <WidgetLoadingOverlay isLoading={isLoading} />
        </div>
        
        <div className="relative">
          <MetricCard
            title="Conversion Rate"
            value={metrics.conversionRate}
            change={metrics.conversionRateGrowth}
            icon={<MousePointer className="h-4 w-4" />}
            brandId={brandId}
            prefix=""
            suffix="%"
            data={[]}
          />
          <WidgetLoadingOverlay isLoading={isLoading} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="relative h-[400px]">
          <RevenueByDay 
            brandId={brandId}
            isRefreshing={isLoading}
          />
          <WidgetLoadingOverlay isLoading={isLoading} />
        </div>
        
        <div className="relative h-[400px]">
          <SalesByProduct 
            brandId={brandId}
            isRefreshing={isLoading}
            dateRange={dateRange}
          />
          <WidgetLoadingOverlay isLoading={isLoading} />
        </div>
      </div>

      <div className="mb-4">
        <Tabs defaultValue="geography" value={customerDataTab} onValueChange={setCustomerDataTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="geography">Customer Geography</TabsTrigger>
            <TabsTrigger value="segments">Customer Segments</TabsTrigger>
            <TabsTrigger value="lifetime">Lifetime Value</TabsTrigger>
          </TabsList>
          
          <TabsContent value="geography" className="relative">
            <CustomerGeographicMap 
              brandId={brandId}
              isRefreshing={isLoading}
            />
            <WidgetLoadingOverlay isLoading={isLoading} />
          </TabsContent>
          
          <TabsContent value="segments" className="relative">
            <CustomerSegmentation 
              brandId={brandId}
              isRefreshing={isLoading}
            />
            <WidgetLoadingOverlay isLoading={isLoading} />
          </TabsContent>
          
          <TabsContent value="lifetime" className="relative">
            <CustomerLifetimeValue 
              brandId={brandId}
              isRefreshing={isLoading}
            />
            <WidgetLoadingOverlay isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>

      {children}
    </>
  )
} 