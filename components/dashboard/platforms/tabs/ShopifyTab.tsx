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
  const [dateRangePicker, setDateRangePicker] = useState<DateRange>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setDateRangePicker(range)
    }
  }

  const hasData = metrics && Object.keys(metrics).length > 0

  return (
    <div className="space-y-6">
      {/* Header with Date Range */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">Shopify Analytics</h2>
        <DateRangePicker 
          value={dateRangePicker}
          onChange={handleDateRangeChange}
        />
      </div>

      {/* Main metrics grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Sales"
          value={hasData ? metrics.totalSales : 0}
          change={hasData ? metrics.salesGrowth : 0}
          icon={<DollarSign className="h-4 w-4" />}
          prefix="$"
          valueFormat="currency"
          platform="shopify"
          data={hasData ? metrics.dailyData : []}
          dateRange={dateRangePicker}
        />
        <MetricCard
          title="Orders"
          value={hasData ? metrics.ordersPlaced : 0}
          change={hasData ? metrics.ordersGrowth : 0}
          icon={<ShoppingBag className="h-4 w-4" />}
          valueFormat="number"
          platform="shopify"
          data={hasData ? metrics.dailyData : []}
          dateRange={dateRangePicker}
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
          dateRange={dateRangePicker}
        />
        <MetricCard
          title="Units Sold"
          value={hasData ? metrics.unitsSold : 0}
          change={hasData ? metrics.unitsGrowth : 0}
          icon={<Package className="h-4 w-4" />}
          valueFormat="number"
          platform="shopify"
          data={hasData ? metrics.dailyData : []}
          dateRange={dateRangePicker}
        />
      </div>

      {/* Charts section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-[#111111] border-[#222222]">
          <CardHeader>
            <CardTitle className="text-white">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hasData ? metrics.dailyData : []}>
                  <XAxis dataKey="date" stroke="#888888" />
                  <YAxis stroke="#888888" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <RevenueByDay data={hasData ? metrics.revenueByDay : []} dateRange={dateRangePicker} />
      </div>

      {/* Customer insights section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CustomerSegmentsWidget segments={metrics.customerSegments} />
        <TopProducts products={hasData ? metrics.topProducts : []} />
      </div>

      {/* Additional metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Customer Retention"
          value={hasData ? metrics.customerRetentionRate : 0}
          change={hasData ? metrics.retentionGrowth : 0}
          icon={<Users className="h-4 w-4" />}
          suffix="%"
          valueFormat="number"
          platform="shopify"
          data={hasData ? metrics.dailyData : []}
          dateRange={dateRangePicker}
        />
        <MetricCard
          title="Return Rate"
          value={hasData ? metrics.returnRate : 0}
          change={hasData ? metrics.returnGrowth : 0}
          icon={<RefreshCcw className="h-4 w-4" />}
          suffix="%"
          valueFormat="number"
          platform="shopify"
          data={hasData ? metrics.dailyData : []}
          dateRange={dateRangePicker}
        />
        <MetricCard
          title="Conversion Rate"
          value={hasData ? metrics.conversionRate : 0}
          change={hasData ? metrics.conversionRateGrowth : 0}
          icon={<Activity className="h-4 w-4" />}
          suffix="%"
          valueFormat="number"
          platform="shopify"
          data={hasData ? metrics.dailyData : []}
          dateRange={dateRangePicker}
        />
      </div>
    </div>
  )
} 