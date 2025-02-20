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
      // Get store connection details from Supabase
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('access_token, store_url')
        .eq('platform_type', 'shopify')
        .eq('store_url', selectedStore)
        .single()

      if (!connection) {
        throw new Error("Store connection not found")
      }

      // Use the correct endpoint from your backend
      const response = await fetch(`https://brez-marketing-dashboard-bf.herokuapp.com/api/shopify/sales?shop=${connection.store_url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error("Failed to fetch metrics")
      }

      const data = await response.json()
      // Transform the response data into our metrics format
      const transformedMetrics = {
        totalSales: data.totalSales || 0,
        salesGrowth: 0, // Calculate if available
        averageOrderValue: data.totalSales / data.orders.length || 0,
        aovGrowth: 0, // Calculate if available
        ordersPlaced: data.orders.length || 0,
        ordersGrowth: 0, // Calculate if available
        unitsSold: data.orders.reduce((acc, order) => acc + (order.line_items?.length || 0), 0),
        unitsGrowth: 0, // Calculate if available
        conversionRate: 0, // Calculate if available
        conversionGrowth: 0,
        customerRetentionRate: data.customerSegments.returningCustomers / 
          (data.customerSegments.returningCustomers + data.customerSegments.newCustomers) * 100 || 0,
        retentionGrowth: 0,
        returnRate: 0, // Calculate if available
        returnGrowth: 0,
        inventoryLevels: 0, // Calculate if available
        inventoryGrowth: 0,
        topProducts: data.products || []
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
          <MetaContent metrics={metrics} dateRange={dateRange} />
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
  ordersPlaced: 0,
  ordersGrowth: 0,
  unitsSold: 0,
  unitsGrowth: 0,
  conversionRate: 0,
  conversionGrowth: 0,
  customerRetentionRate: 0,
  retentionGrowth: 0,
  returnRate: 0,
  returnGrowth: 0,
  inventoryLevels: 0,
  inventoryGrowth: 0,
  topProducts: []
}
