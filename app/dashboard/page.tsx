"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PlatformTabs } from "@/components/dashboard/PlatformTabs"
import { DateRangePicker } from "@/components/DateRangePicker"
import { DateRange } from "react-day-picker"
import { ShopifyContent } from "@/components/dashboard/platforms/ShopifyContent"
import { MetaContent } from "@/components/dashboard/platforms/MetaContent"
import { supabase } from "@/lib/supabaseClient"
import BrandSelector from '@/components/BrandSelector'

interface BrandSelectedEvent extends CustomEvent {
  detail: {
    brandId: string;
    connections: Array<{ platform_type: string; store_url?: string }>;
  }
}

export default function DashboardPage() {
  const { userId } = useAuth()
  const [selectedStore, setSelectedStore] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [metrics, setMetrics] = useState(defaultMetrics)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [connections, setConnections] = useState<any[]>([])

  useEffect(() => {
    const handleBrandSelected = async (event: BrandSelectedEvent) => {
      const { brandId, connections } = event.detail
      setConnections(connections || [])
      
      // Clear existing metrics
      setMetrics(defaultMetrics)
      
      // Find Shopify connection
      const shopifyConnection = connections.find(c => c.platform_type === 'shopify')
      if (shopifyConnection) {
        setSelectedStore(shopifyConnection.store_url || '')
      } else {
        setSelectedStore('')
      }
    }

    window.addEventListener('brandSelected', handleBrandSelected as unknown as EventListener)
    return () => {
      window.removeEventListener('brandSelected', handleBrandSelected as unknown as EventListener)
    }
  }, [])

  useEffect(() => {
    if (selectedStore && dateRange && userId) {
      loadMetrics()
    }
  }, [selectedStore, dateRange, userId])

  const loadMetrics = async () => {
    setLoading(true)
    setError("")
    
    try {
      // Get metrics for the specific user and store
      const { data: metricsData, error: metricsError } = await supabase
        .from('metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('store_url', selectedStore)
        .single()

      if (metricsError) throw metricsError

      setMetrics(metricsData || defaultMetrics)
    } catch (error) {
      console.error('Error loading metrics:', error)
      setError("Failed to load metrics")
      setMetrics(defaultMetrics)
    } finally {
      setLoading(false)
    }
  }

  const hasShopify = connections.some(c => c.platform_type === 'shopify')
  const hasMeta = connections.some(c => c.platform_type === 'meta')

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <BrandSelector />
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

      {loading ? (
        <div>Loading metrics...</div>
      ) : (
        <Tabs defaultValue={hasShopify ? "shopify" : hasMeta ? "meta" : undefined}>
          <PlatformTabs 
            dateRange={dateRange}
            metrics={metrics}
            isLoading={loading}
          />
          
          {hasShopify && (
            <TabsContent value="shopify">
              <ShopifyContent metrics={metrics} dateRange={dateRange} />
            </TabsContent>
          )}
          
          {hasMeta && (
            <TabsContent value="meta">
              <MetaContent metrics={{
                totalSales: metrics.totalSales,
                salesGrowth: metrics.salesGrowth,
                averageOrderValue: metrics.averageOrderValue,
                aovGrowth: metrics.aovGrowth,
                ordersPlaced: metrics.ordersPlaced,
                ordersGrowth: 0,
                unitsSold: metrics.unitsSold,
                unitsGrowth: 0,
                conversionRate: metrics.conversionRate,
                conversionGrowth: 0,
                customerRetentionRate: metrics.customerRetentionRate,
                retentionGrowth: 0,
                returnRate: metrics.returnRate,
                returnGrowth: 0,
                inventoryLevels: metrics.inventoryLevels,
                inventoryGrowth: 0,
                topProducts: metrics.topProducts
              }} dateRange={dateRange} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  )
}

const defaultMetrics = {
  totalSales: 0,
  salesGrowth: 0,
  averageOrderValue: 0,
  aovGrowth: 0,
  salesData: [],
  ordersPlaced: 0,
  previousOrdersPlaced: 0,
  unitsSold: 0,
  previousUnitsSold: 0,
  orderCount: 0,
  previousOrderCount: 0,
  topProducts: [],
  customerRetentionRate: 0,
  revenueByDay: [],
  sessionCount: 0,
  sessionGrowth: 0,
  sessionData: [],
  conversionRate: 0,
  conversionRateGrowth: 0,
  conversionData: [],
  retentionRateGrowth: 0,
  retentionData: [],
  currentWeekRevenue: [],
  inventoryLevels: 0,
  returnRate: 0,
  inventoryData: [],
  returnData: [],
  customerLifetimeValue: 0,
  clvData: [],
  averageTimeToFirstPurchase: 0,
  timeToFirstPurchaseData: [],
  categoryPerformance: [],
  categoryData: [],
  shippingZones: [],
  shippingData: [],
  paymentMethods: [],
  paymentData: [],
  discountPerformance: [],
  discountData: [],
  customerSegments: { newCustomers: 0, returningCustomers: 0 },
  firstTimeVsReturning: {
    firstTime: { orders: 0, revenue: 0 },
    returning: { orders: 0, revenue: 0 }
  },
  customerSegmentData: [],
  ordersGrowth: 0,
  unitsGrowth: 0,
  conversionGrowth: 0,
  retentionGrowth: 0,
  returnGrowth: 0,
  inventoryGrowth: 0
}
