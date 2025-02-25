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
    <div className="bg-[#525151] rounded-lg p-4">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <MetricCard
            title="Ad Spend"
            value={metrics.totalSales}
            change={metrics.salesGrowth}
            prefix="$"
            valueFormat="currency"
            platform="meta"
            data={metrics.dailyData || []}
          />
          <MetricCard
            title="Impressions"
            value={metrics.impressions || 0}
            change={metrics.impressionGrowth || 0}
            valueFormat="number"
            platform="meta"
            data={metrics.dailyData || []}
          />
          <MetricCard
            title="Clicks"
            value={metrics.clicks || 0}
            change={metrics.clickGrowth || 0}
            valueFormat="number"
            platform="meta"
            data={metrics.dailyData || []}
          />
          <MetricCard
            title="Conversions"
            value={metrics.conversions || 0}
            change={metrics.conversionGrowth || 0}
            valueFormat="number"
            platform="meta"
            data={metrics.dailyData || []}
          />
        </div>
      </div>
    </div>
  )
}