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

export default function DashboardPage() {
  const { userId } = useAuth()
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [metrics, setMetrics] = useState(defaultMetrics)
  const [loading, setLoading] = useState(false)
  const [connections, setConnections] = useState<any[]>([])

  useEffect(() => {
    const handleBrandSelected = async (event: CustomEvent) => {
      const { brandId, connections } = event.detail
      console.log('Selected brand connections:', connections) // Debug log
      setSelectedBrandId(brandId)
      setConnections(connections || [])
      
      // Fetch fresh connections data
      const { data: freshConnections } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', brandId)
      
      if (freshConnections) {
        console.log('Fresh connections:', freshConnections) // Debug log
        setConnections(freshConnections)
      }
    }

    window.addEventListener('brandSelected', handleBrandSelected as unknown as EventListener)
    return () => {
      window.removeEventListener('brandSelected', handleBrandSelected as unknown as EventListener)
    }
  }, [])

  const hasShopify = connections.some(c => c.platform_type === 'shopify')
  const hasMeta = connections.some(c => c.platform_type === 'meta')

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <BrandSelector />
        <DateRangePicker 
          date={dateRange} 
          onDateChange={setDateRange} 
        />
      </div>

      {!selectedBrandId ? (
        <div className="text-center p-8 text-gray-400">
          Select a brand to view analytics
        </div>
      ) : loading ? (
        <div className="text-center p-8">Loading metrics...</div>
      ) : (
        <Tabs defaultValue={hasShopify ? "shopify" : hasMeta ? "meta" : undefined}>
          {(hasShopify || hasMeta) ? (
            <>
              <PlatformTabs showShopify={hasShopify} showMeta={hasMeta} />
              
              {hasShopify && (
                <TabsContent value="shopify">
                  <ShopifyContent metrics={metrics} dateRange={dateRange} />
                </TabsContent>
              )}
              
              {hasMeta && (
                <TabsContent value="meta">
                  <MetaContent metrics={metrics} dateRange={dateRange} />
                </TabsContent>
              )}
            </>
          ) : (
            <div className="text-center p-8 text-gray-400">
              No platforms connected to this brand. Go to Settings to connect platforms.
            </div>
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
