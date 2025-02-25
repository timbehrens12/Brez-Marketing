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
  const hasData = metrics && Object.keys(metrics).length > 0

  if (isLoading) {
    return <div>Loading Meta data...</div>
  }

  return (
    <div className="bg-[#525151] rounded-lg p-4">
      <div className="bg-[#222222] p-4 rounded-lg">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="Ad Spend"
                value={hasData ? metrics.totalSales : "-"}
                change={hasData ? metrics.salesGrowth : 0}
                prefix="$"
                valueFormat="currency"
                platform="meta"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="ROAS"
                value={hasData ? metrics.roas || "-" : "-"}
                change={hasData ? metrics.roasGrowth || 0 : 0}
                suffix="x"
                valueFormat="number"
                platform="meta"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="CTR"
                value={hasData ? metrics.ctr || "-" : "-"}
                change={hasData ? metrics.ctrGrowth || 0 : 0}
                suffix="%"
                valueFormat="number"
                platform="meta"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="CPC"
                value={hasData ? metrics.cpc || "-" : "-"}
                change={hasData ? metrics.cpcGrowth || 0 : 0}
                prefix="$"
                valueFormat="currency"
                platform="meta"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="Impressions"
                value={hasData ? metrics.impressions || "-" : "-"}
                change={hasData ? metrics.impressionGrowth || 0 : 0}
                valueFormat="number"
                platform="meta"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="Clicks"
                value={hasData ? metrics.clicks || "-" : "-"}
                change={hasData ? metrics.clickGrowth || 0 : 0}
                valueFormat="number"
                platform="meta"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="Conversions"
                value={hasData ? metrics.conversions || "-" : "-"}
                change={hasData ? metrics.conversionGrowth || 0 : 0}
                valueFormat="number"
                platform="meta"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="Cost Per Result"
                value={hasData ? metrics.costPerResult || "-" : "-"}
                change={hasData ? metrics.cprGrowth || 0 : 0}
                prefix="$"
                valueFormat="currency"
                platform="meta"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}