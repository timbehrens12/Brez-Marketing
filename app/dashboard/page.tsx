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
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
  const { selectedBrandId } = useBrandContext()
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics)
  const [platforms, setPlatforms] = useState({ shopify: false, meta: false })
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  // Load initial connections when component mounts with selectedBrandId
  useEffect(() => {
    async function loadConnections() {
      if (!selectedBrandId) {
        console.log('No brand selected yet')
        return
      }
      
      console.log('Loading connections for brand:', selectedBrandId)
      try {
        const { data, error } = await supabase
          .from('platform_connections')
          .select('*')
          .eq('brand_id', selectedBrandId)

        if (error) throw error

        console.log('Loaded connections:', data)
        if (data && data.length > 0) {
          setConnections(data)
          setPlatforms({
            shopify: data.some(c => c.platform_type === 'shopify' && c.status === 'active'),
            meta: data.some(c => c.platform_type === 'meta' && c.status === 'active')
          })
        }
      } catch (error) {
        console.error('Error loading connections:', error)
      }
    }

    loadConnections()
  }, [selectedBrandId, supabase])

  // Debug logging
  useEffect(() => {
    console.log('Current state:', {
      selectedBrandId,
      connections,
      platforms
    })
  }, [selectedBrandId, connections, platforms])

  useEffect(() => {
    const handleBrandSelected = async (event: CustomEvent) => {
      const brandId = event.detail.brandId
      console.log('Selected brand:', brandId)

      // Fetch platform connections from Supabase
      const { data: connections, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', brandId)

      if (error) {
        console.error('Error fetching connections:', error)
        return
      }

      console.log('Platform connections:', connections)

      // Update platforms state based on connections from database
      const hasShopify = connections.some((c: PlatformConnection) => 
        c.platform_type === 'shopify' && c.status === 'active'
      )
      const hasMeta = connections.some((c: PlatformConnection) => 
        c.platform_type === 'meta' && c.status === 'active'
      )

      setPlatforms({
        shopify: hasShopify,
        meta: hasMeta
      })

      // If Shopify is connected, set the store
      const shopifyConnection = connections.find(c => 
        c.platform_type === 'shopify' && c.status === 'active'
      )
      if (hasShopify && shopifyConnection?.shop) {
        setSelectedStore(shopifyConnection.shop)
      }
    }

    window.addEventListener('brandSelected', handleBrandSelected as unknown as EventListener)
    return () => {
      window.removeEventListener('brandSelected', handleBrandSelected as unknown as EventListener)
    }
  }, [supabase, setSelectedStore])

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
            <pre className="mt-4 text-left text-xs">
              {JSON.stringify({ selectedBrandId, connections, platforms }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  )
}
