"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PlatformTabs } from "@/components/dashboard/PlatformTabs"
import { StoreSelector } from "@/components/StoreSelector"
import { DateRangePicker } from "@/components/DateRangePicker"
import { DateRange } from "react-day-picker"
import { ShopifyContent } from "@/components/dashboard/platforms/ShopifyContent"
import { MetaContent } from "@/components/dashboard/platforms/MetaContent"
import { supabase } from "@/utils/supabase"

export default function DashboardPage() {
  const [selectedStore, setSelectedStore] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [metrics, setMetrics] = useState(defaultMetrics)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (selectedStore && dateRange) {
      loadMetrics()
    }
  }, [selectedStore, dateRange])

  const loadMetrics = async () => {
    setLoading(true)
    setError("")
    
    try {
      console.log('Selected Store:', selectedStore) // Debug log

      // Get store connection details from Supabase
      const { data: connection, error: supabaseError } = await supabase
        .from('platform_connections')
        .select('*')  // Select all fields to debug
        .eq('platform_type', 'shopify')
        .eq('store_url', selectedStore)

      console.log('Supabase Response:', { connection, error: supabaseError }) // Debug log

      if (supabaseError) {
        throw new Error(`Supabase error: ${supabaseError.message}`)
      }

      if (!connection || connection.length === 0) {
        throw new Error("Store connection not found")
      }

      // Use first connection found
      const storeConnection = connection[0]

      // Use your correct backend URL
      const response = await fetch(`https://api.brezmarketingdashboard.com/api/shopify/sales?shop=${storeConnection.store_url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error("Failed to fetch metrics")
      }

      const data = await response.json()
      console.log('API Response:', data) // Add this to debug

      // Transform the response data into our metrics format with safeguards
      const transformedMetrics = {
        totalSales: data?.totalSales || 0,
        salesGrowth: 0,
        averageOrderValue: data?.orders?.length ? data.totalSales / data.orders.length : 0,
        aovGrowth: 0,
        salesData: [],
        ordersPlaced: data?.orders?.length || 0,
        previousOrdersPlaced: 0,
        unitsSold: data?.orders?.reduce((acc: number, order: { line_items?: any[] }) => 
          acc + (order.line_items?.length || 0), 0) || 0,
        previousUnitsSold: 0,
        orderCount: 0,
        previousOrderCount: 0,
        topProducts: data?.products || [],
        customerRetentionRate: data?.customerSegments ? 
          (data.customerSegments.returningCustomers / 
          (data.customerSegments.returningCustomers + data.customerSegments.newCustomers) * 100) || 0 : 0,
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
      
      setMetrics(transformedMetrics)
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : "Failed to load metrics")
      setMetrics(defaultMetrics)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex gap-4">
          <StoreSelector onStoreSelect={setSelectedStore} />
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        </div>
      </div>

      {error && (
        <div className="text-red-500 mb-4 p-4 bg-red-500/10 rounded">
          {error}
        </div>
      )}

      <Tabs defaultValue="shopify" className="w-full">
        <PlatformTabs dateRange={dateRange} metrics={metrics} isLoading={loading} />
        <TabsContent value="shopify">
          {selectedStore ? (
            <ShopifyContent metrics={metrics} dateRange={dateRange} />
          ) : (
            <div className="text-center text-gray-500 mt-8">
              Select a store to view metrics
            </div>
          )}
        </TabsContent>
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
      </Tabs>
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
  customerSegmentData: []
}
