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
import { Activity, ShoppingBag, Users, DollarSign, TrendingUp, Package, RefreshCcw } from "lucide-react"
import { PlatformConnection } from "@/types/platformConnection"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { calculateMetrics } from "@/utils/metrics"

interface ShopifyTabProps {
  connection: any
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
    topProducts: []
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

        if (error) throw error

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
  }, [connection?.id, dateRange, brandId, supabase])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Main metrics grid */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Sales"
          value={metrics.totalSales}
          format="currency"
        />
        <MetricCard
          title="Orders Placed"
          value={metrics.ordersPlaced}
          format="number"
        />
        <MetricCard
          title="Average Order Value"
          value={metrics.averageOrderValue}
          format="currency"
        />
        <MetricCard
          title="Units Sold"
          value={metrics.unitsSold}
          format="number"
        />
      </div>

      {/* Charts section - make it symmetrical */}
      <div className="grid grid-cols-2 gap-6">
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
            <CardTitle className="text-white">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-400">
              No product data available
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer insights section */}
      <div className="grid grid-cols-2 gap-6">
        <CustomerSegmentsWidget 
          segments={{
            newCustomers: metrics.customerSegments.find(s => s.name === 'new')?.value || 0,
            returningCustomers: metrics.customerSegments.find(s => s.name === 'returning')?.value || 0
          }} 
        />
        <Card className="bg-[#111111] border-[#222222]">
          <CardHeader>
            <CardTitle className="text-white">Customer Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                title="Customer Retention"
                value={metrics.customerRetentionRate}
                suffix="%"
              />
              <MetricCard
                title="Conversion Rate"
                value={metrics.conversionRate}
                suffix="%"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 