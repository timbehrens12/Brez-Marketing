"use client"
import { MetricCard } from "@/components/metrics/MetricCard"
import { TopProducts } from "@/components/dashboard/TopProducts"
import type { Metrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"

interface ShopifyTabProps {
  metrics: Metrics
  dateRange: DateRange | undefined
  isLoading: boolean
}

export function ShopifyTab({ metrics, dateRange, isLoading }: ShopifyTabProps) {
  if (isLoading) {
    return <div>Loading Shopify data...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard
          title="Total Sales"
          value={metrics.totalSales}
          change={metrics.salesGrowth}
          prefix="$"
          valueFormat="currency"
          platform="shopify"
          data={metrics.salesData || []}
        />
        <MetricCard
          title="Average Order Value"
          value={metrics.averageOrderValue}
          change={metrics.aovGrowth}
          prefix="$"
          valueFormat="currency"
          platform="shopify"
          data={metrics.dailyData || []}
        />
        <MetricCard
          title="Orders Placed"
          value={metrics.ordersPlaced}
          change={metrics.salesGrowth}
          valueFormat="number"
          platform="shopify"
          data={metrics.dailyData || []}
        />
        {/* Add more metric cards */}
      </div>
      
      <TopProducts products={metrics.topProducts} />
    </div>
  )
} 