"use client"

import { MetricCard } from "@/components/metrics/MetricCard"
import { TopProducts } from "@/components/dashboard/TopProducts"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { CustomerSegmentsWidget } from "@/components/widgets/CustomerSegments"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { Metrics, CustomerSegment, MetricCardProps } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { Activity, ShoppingBag, Users, DollarSign, TrendingUp, Package, RefreshCcw, ShoppingCart, Store } from "lucide-react"
import type { PlatformConnection } from "@/types/platformConnection"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { calculateMetrics } from "@/utils/metrics"
import { StoreConnectButton } from "../StoreConnectButton"
import { defaultMetrics } from "@/types/metrics"

interface RevenueData {
  date: string;
  revenue: number;
}

interface Product {
  id: string;
  title: string;
  quantity: number;
  revenue: number;
}

interface ShopifyTabProps {
  connection: PlatformConnection | null
  dateRange: DateRange
  brandId: string
}

export function ShopifyTab({ connection, dateRange, brandId }: ShopifyTabProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<Metrics>(defaultMetrics)

  useEffect(() => {
    async function fetchShopifyData() {
      console.log('Connection state:', connection)
      console.log('Brand ID:', brandId)
      console.log('Date range:', dateRange)

      if (!connection) {
        console.log('No connection found')
        return
      }

      try {
        setIsLoading(true)
        const response = await fetch(`/api/shopify/metrics?brandId=${brandId}&connectionId=${connection.id}&from=${dateRange?.from?.toISOString()}&to=${dateRange?.to?.toISOString()}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('API Error:', errorData)
          throw new Error(errorData.message || 'Failed to fetch metrics')
        }
        
        const data = await response.json()
        console.log('Fetched metrics:', data)
        setMetrics(data)
      } catch (error) {
        console.error('Error fetching Shopify data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchShopifyData()
  }, [connection, brandId, dateRange])

  if (!connection) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#1A1A1A] rounded-lg border border-[#333333]">
        <Store className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Connect your Shopify store</h3>
        <p className="text-gray-400 text-sm mb-4 text-center max-w-md">
          Connect your Shopify store to see your sales data, orders, and customer insights.
        </p>
        <StoreConnectButton brandId={brandId} />
      </div>
    )
  }

  if (isLoading) {
    return <div className="flex items-center justify-center p-6">Loading metrics...</div>
  }

  const customerSegments: CustomerSegment[] = [
    { name: 'New Customers', value: metrics.customerSegments.newCustomers },
    { name: 'Returning Customers', value: metrics.customerSegments.returningCustomers }
  ]

  return (
    <div className="space-y-6">
      {/* Key Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sales"
          value={metrics.totalSales}
          change={metrics.salesGrowth}
          icon={<DollarSign className="h-4 w-4" />}
          format="currency"
          prefix="$"
        />
        <MetricCard
          title="Orders"
          value={metrics.ordersPlaced}
          change={metrics.ordersGrowth}
          icon={<ShoppingCart className="h-4 w-4" />}
          format="number"
        />
        <MetricCard
          title="Average Order Value"
          value={metrics.averageOrderValue}
          change={metrics.aovGrowth}
          icon={<TrendingUp className="h-4 w-4" />}
          format="currency"
          prefix="$"
        />
        <MetricCard
          title="Units Sold"
          value={metrics.unitsSold}
          change={metrics.unitsGrowth}
          icon={<Package className="h-4 w-4" />}
          format="number"
        />
      </div>

      {/* Customer Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Conversion Rate"
          value={metrics.conversionRate}
          change={metrics.conversionRateGrowth}
          icon={<Activity className="h-4 w-4" />}
          format="percentage"
          suffix="%"
        />
        <MetricCard
          title="Customer Retention"
          value={metrics.customerRetentionRate}
          change={metrics.retentionGrowth}
          icon={<RefreshCcw className="h-4 w-4" />}
          format="percentage"
          suffix="%"
        />
        <MetricCard
          title="Return Rate"
          value={metrics.returnRate}
          change={metrics.returnGrowth}
          icon={<ShoppingBag className="h-4 w-4" />}
          format="percentage"
          suffix="%"
        />
        <MetricCard
          title="Active Customers"
          value={metrics.customerSegments.newCustomers + metrics.customerSegments.returningCustomers || 0}
          change={0}
          icon={<Users className="h-4 w-4" />}
          format="number"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#111111] border-[#222222]">
          <CardHeader>
            <CardTitle className="text-white">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <RevenueByDay data={metrics.revenueByDay} dateRange={dateRange} />
          </CardContent>
        </Card>

        <Card className="bg-[#111111] border-[#222222]">
          <CardHeader>
            <CardTitle className="text-white">Customer Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerSegmentsWidget segments={customerSegments} />
          </CardContent>
        </Card>
      </div>

      {/* Products Section */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-[#111111] border-[#222222]">
          <CardHeader>
            <CardTitle className="text-white">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topProducts.length > 0 ? (
              <TopProducts products={metrics.topProducts || []} />
            ) : (
              <div className="text-gray-400">No product data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 