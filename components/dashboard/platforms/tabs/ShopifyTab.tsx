"use client"

import { MetricCard } from "@/components/metrics/MetricCard"
import { TopProducts } from "@/components/dashboard/TopProducts"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { CustomerSegmentsWidget } from "@/components/widgets/CustomerSegments"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { Metrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { Activity, ShoppingBag, Users, DollarSign, TrendingUp, Package, RefreshCcw, ShoppingCart } from "lucide-react"
import { PlatformConnection } from "@/types/platformConnection"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { calculateMetrics } from "@/utils/metrics"

interface ShopifyTabProps {
  connection: PlatformConnection
  dateRange: { from: Date; to: Date }
  brandId: string
}

export function ShopifyTab({ connection, dateRange, brandId }: ShopifyTabProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    totalSales: 0,
    ordersPlaced: 0,
    averageOrderValue: 0,
    unitsSold: 0,
    revenueByDay: [],
    topProducts: [],
    salesGrowth: 0,
    ordersGrowth: 0,
    unitsGrowth: 0,
    aovGrowth: 0,
    conversionRate: 0,
    conversionRateGrowth: 0,
    customerSegments: [],
    customerRetentionRate: 0,
    retentionGrowth: 0,
    returnRate: 0,
    returnGrowth: 0,
    dailyData: [],
    adSpend: 0,
    adSpendGrowth: 0,
    roas: 0,
    roasGrowth: 0,
    impressions: 0,
    impressionGrowth: 0,
    ctr: 0,
    ctrGrowth: 0,
    clicks: 0,
    clickGrowth: 0,
    conversions: 0,
    conversionGrowth: 0,
    costPerResult: 0,
    cprGrowth: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useSupabase()

  useEffect(() => {
    async function fetchMetrics() {
      if (!connection?.id || !dateRange || !brandId) {
        console.log('Missing required data:', { connection, dateRange, brandId })
        return
      }

      try {
        setIsLoading(true)
        
        // Fetch orders for the date range
        const { data: orders, error } = await supabase
          .from('shopify_orders')
          .select('*')
          .eq('connection_id', connection.id)
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())

        if (error) {
          console.error('Error fetching orders:', error)
          return
        }

        // Calculate metrics from orders
        const calculatedMetrics = calculateMetrics(orders || [])
        console.log('Calculated metrics:', calculatedMetrics)
        
        setMetrics(calculatedMetrics)
      } catch (error) {
        console.error('Error fetching metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [connection?.id, dateRange?.from, dateRange?.to, brandId, supabase])

  if (!connection) {
    return <div>No Shopify connection found</div>
  }

  if (isLoading) {
    return <div className="flex items-center justify-center p-6">Loading metrics...</div>
  }

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
          value={metrics.customerSegments.newCustomers + metrics.customerSegments.returningCustomers}
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
            <CustomerSegmentsWidget segments={metrics.customerSegments} />
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
              <TopProducts products={metrics.topProducts} />
            ) : (
              <div className="text-gray-400">No product data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 