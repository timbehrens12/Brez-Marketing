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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard
          title="Total Sales"
          value={metrics.totalSales}
          change={metrics.salesGrowth}
          data={metrics.salesData}
          prefix="$"
          valueFormat="currency"
          platform="shopify"
        />
        {/* Add other metric cards */}
      </div>
      <TopProducts products={metrics.topProducts} />
    </div>
  )
} 