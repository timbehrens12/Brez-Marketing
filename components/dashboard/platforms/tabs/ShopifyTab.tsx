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
  const hasData = metrics && Object.keys(metrics).length > 0

  return (
    <div className="bg-[#525151] rounded-lg p-4">
      <div className="bg-[#222222] p-4 rounded-lg">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="Total Sales"
                value={hasData ? metrics.totalSales : "-"}
                change={hasData ? metrics.salesGrowth : 0}
                prefix="$"
                valueFormat="currency"
                platform="shopify"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="Orders"
                value={hasData ? metrics.ordersPlaced : "-"}
                change={hasData ? metrics.ordersGrowth : 0}
                valueFormat="number"
                platform="shopify"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="AOV"
                value={hasData ? metrics.averageOrderValue : "-"}
                change={hasData ? metrics.aovGrowth : 0}
                prefix="$"
                valueFormat="currency"
                platform="shopify"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="Units Sold"
                value={hasData ? metrics.unitsSold : "-"}
                change={hasData ? metrics.unitsGrowth : 0}
                valueFormat="number"
                platform="shopify"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="Conversion Rate"
                value={hasData ? metrics.conversionRate : "-"}
                change={hasData ? metrics.conversionGrowth : 0}
                suffix="%"
                valueFormat="number"
                platform="shopify"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="Customer Retention"
                value={hasData ? metrics.customerRetentionRate : "-"}
                change={hasData ? metrics.retentionGrowth : 0}
                suffix="%"
                valueFormat="number"
                platform="shopify"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="Return Rate"
                value={hasData ? metrics.returnRate : "-"}
                change={hasData ? metrics.returnGrowth : 0}
                suffix="%"
                valueFormat="number"
                platform="shopify"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
            <div className="bg-[#111111] p-4 rounded-lg">
              <MetricCard
                title="Inventory Levels"
                value={hasData ? metrics.inventoryLevels : "-"}
                change={hasData ? metrics.inventoryGrowth : 0}
                valueFormat="number"
                platform="shopify"
                data={hasData ? metrics.dailyData : []}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 