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

interface WidgetManagerProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  brandId: string;
  metrics: Metrics;
  isLoading: boolean;
  isRefreshingData?: boolean;
  initialDataLoad?: boolean;
  platformStatus: {
    shopify: boolean;
    meta: boolean;
  };
  existingConnections: PlatformConnection[];
  children?: React.ReactNode;
  brands?: Array<{ id: string, name: string }>;
}

export function WidgetManager({ 
  dateRange, 
  brandId, 
  metrics, 
  isLoading,
  isRefreshingData = false,
  initialDataLoad = false,
  platformStatus,
  existingConnections,
  children,
  brands = []
}: WidgetManagerProps) {
  const { metrics: contextMetrics, isLoading: contextIsLoading } = useMetrics()
  const [activeTab, setActiveTab] = useState<string>("site")
  const [connections, setConnections] = useState<PlatformConnection[]>(existingConnections || [])
  const [customerDataTab, setCustomerDataTab] = useState<string>("geography")

  // Don't render anything during initial data load
  // This is redundant with the check in the dashboard page, but added as a safeguard
  if (initialDataLoad) {
    return null;
  }

  // Add a validation function to safely access metric values
  const safeMetricValue = (value: any, defaultValue: any = 0) => {
    return (value !== undefined && value !== null && !isNaN(value)) ? value : defaultValue;
  };

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
        initialDataLoad={initialDataLoad}
        brandId={brandId}
        connections={connections}
        onTabChange={handleTabChange}
        brands={brands}
      />
      
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
    </>
  )
} 