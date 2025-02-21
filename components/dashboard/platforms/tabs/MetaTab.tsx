"use client"
import { MetricCard } from "@/components/metrics/MetricCard"
import type { MetaMetrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"

interface MetaTabProps {
  metrics: MetaMetrics
  dateRange: DateRange | undefined
  isLoading: boolean
}

export function MetaTab({ metrics, dateRange, isLoading }: MetaTabProps) {
  if (isLoading) {
    return <div>Loading Meta data...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard
          title="Ad Spend"
          value={metrics.totalSales}
          change={metrics.salesGrowth}
          data={[]}
          prefix="$"
          valueFormat="currency"
          platform="meta"
        />
        {/* Add other Meta-specific metrics */}
      </div>
    </div>
  )
}