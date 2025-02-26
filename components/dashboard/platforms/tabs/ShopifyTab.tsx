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
import { useState } from "react"

interface ShopifyTabProps {
  metrics: Metrics
  dateRange?: DateRange
  isLoading: boolean
  brandId: string
  connection?: PlatformConnection
}

export function ShopifyTab({ metrics, dateRange, isLoading, brandId, connection }: ShopifyTabProps) {
  const hasData = metrics && Object.keys(metrics).length > 0

  return (
    <div className="space-y-6">
      {/* Main metrics grid */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Sales"
          value={hasData ? metrics.totalSales : 0}
          change={hasData ? metrics.salesGrowth : 0}
          icon={<DollarSign className="h-4 w-4" />}
          valueFormat="currency"
          platform="shopify"
          data={hasData ? metrics.dailyData : []}
          dateRange={dateRange}
        />
        <MetricCard
          title="Orders"
          value={hasData ? metrics.ordersPlaced : 0}
          change={hasData ? metrics.ordersGrowth : 0}
          icon={<ShoppingBag className="h-4 w-4" />}
          valueFormat="number"
          platform="shopify"
          data={hasData ? metrics.dailyData : []}
          dateRange={dateRange}
        />
        <MetricCard
          title="Average Order Value"
          value={hasData ? metrics.averageOrderValue : 0}
          change={hasData ? metrics.aovGrowth : 0}
          icon={<TrendingUp className="h-4 w-4" />}
          prefix="$"
          valueFormat="currency"
          platform="shopify"
          data={hasData ? metrics.dailyData : []}
          dateRange={dateRange}
        />
        <MetricCard
          title="Units Sold"
          value={hasData ? metrics.unitsSold : 0}
          change={hasData ? metrics.unitsGrowth : 0}
          icon={<Package className="h-4 w-4" />}
          valueFormat="number"
          platform="shopify"
          data={hasData ? metrics.dailyData : []}
          dateRange={dateRange}
        />
      </div>

      {/* Charts section - make it symmetrical */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-[#111111] border-[#222222]">
          <CardHeader>
            <CardTitle className="text-white">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <RevenueByDay data={hasData ? metrics.revenueByDay : []} dateRange={dateRange} />
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
                value={hasData ? metrics.customerRetentionRate : 0}
                change={hasData ? metrics.retentionGrowth : 0}
                icon={<Users className="h-4 w-4" />}
                suffix="%"
                platform="shopify"
                dateRange={dateRange}
                data={hasData ? metrics.dailyData : []}
              />
              <MetricCard
                title="Conversion Rate"
                value={hasData ? metrics.conversionRate : 0}
                change={hasData ? metrics.conversionRateGrowth : 0}
                icon={<Activity className="h-4 w-4" />}
                suffix="%"
                platform="shopify"
                dateRange={dateRange}
                data={hasData ? metrics.dailyData : []}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 