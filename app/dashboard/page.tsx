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
import { useBrandContext } from '@/lib/context/BrandContext'
import { defaultMetrics } from '@/lib/defaultMetrics'
import type { Metrics } from '@/types/metrics'
import type { MetaMetrics } from '@/types/metrics'
import { PlatformConnection } from '@/types/platformConnection'

// Add missing properties to defaultMetrics
const initialMetrics: Metrics = {
  ...defaultMetrics,
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
  customerSegmentData: []
}

function transformToMetaMetrics(metrics: Metrics): MetaMetrics {
  return {
    totalSales: metrics.totalSales,
    salesGrowth: metrics.salesGrowth,
    averageOrderValue: metrics.averageOrderValue,
    aovGrowth: metrics.aovGrowth,
    ordersPlaced: metrics.ordersPlaced,
    ordersGrowth: metrics.retentionRateGrowth || 0,
    unitsSold: metrics.unitsSold,
    unitsGrowth: metrics.salesGrowth || 0,
    conversionRate: metrics.conversionRate,
    conversionGrowth: metrics.conversionRateGrowth || 0,
    customerRetentionRate: metrics.customerRetentionRate,
    retentionGrowth: metrics.retentionRateGrowth || 0,
    returnRate: metrics.returnRate || 0,
    returnGrowth: 0,
    inventoryLevels: metrics.inventoryLevels || 0,
    inventoryGrowth: 0,
    topProducts: metrics.topProducts || [],
    dailyData: metrics.dailyData || [],
    chartData: metrics.chartData || []
  }
}

export default function DashboardPage() {
  const { userId } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [connections, setConnections] = useState<any[]>([])
  const { selectedBrandId } = useBrandContext()
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics)
  const [platforms, setPlatforms] = useState({ shopify: false, meta: false })
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadConnections() {
      if (!selectedBrandId) return
      
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', selectedBrandId)

      if (error) {
        console.error('Supabase error:', error)
        return
      }
      
      setConnections(data || [])
    }

    loadConnections()
  }, [selectedBrandId])

  useEffect(() => {
    const handleBrandSelected = (event: CustomEvent) => {
      const { brandId, connections } = event.detail
      console.log('Selected brand:', brandId)
      console.log('Platform connections:', connections)
      
      // Update platforms state based on connections
      const hasShopify = connections.some((c: PlatformConnection) => c.platform_type === 'shopify')
      const hasMeta = connections.some((c: PlatformConnection) => c.platform_type === 'meta')
      
      // Set platforms state
      setPlatforms({
        shopify: hasShopify,
        meta: hasMeta
      })

      // If Shopify is connected, set the store
      if (hasShopify && connections.find((c: PlatformConnection) => c.platform_type === 'shopify')?.shop) {
        setSelectedStore(connections.find((c: PlatformConnection) => c.platform_type === 'shopify')?.shop)
      }
    }

    window.addEventListener('brandSelected', handleBrandSelected as EventListener)
    return () => {
      window.removeEventListener('brandSelected', handleBrandSelected as EventListener)
    }
  }, [setSelectedStore])

  const hasShopify = connections.some(c => c.platform_type === 'shopify')
  const hasMeta = connections.some(c => c.platform_type === 'meta')

  return (
    <main className="flex flex-col w-full">
      <div className="flex items-center justify-between p-4 border-b">
        <BrandSelector onSelect={(brandId) => {
          console.log('Brand selected:', brandId)
        }} />
        <DateRangePicker 
          date={dateRange}
          onDateChange={setDateRange}
        />
      </div>

      <div className="p-8">
        {connections && connections.length > 0 ? (
          <Tabs defaultValue="overview" className="w-full">
            <PlatformTabs 
              platforms={platforms}
              dateRange={dateRange}
              metrics={metrics || defaultMetrics}
              isLoading={loading}
            />
            <TabsContent value="shopify">
              <ShopifyContent 
                metrics={metrics || defaultMetrics} 
                dateRange={dateRange} 
              />
            </TabsContent>
            <TabsContent value="meta">
              <MetaContent 
                metrics={transformToMetaMetrics(metrics)} 
                dateRange={dateRange} 
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            No platforms connected to this brand. Go to Settings to connect platforms.
          </div>
        )}
      </div>
    </main>
  )
}
