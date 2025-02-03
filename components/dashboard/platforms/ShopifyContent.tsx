"use client"

import { MetricCard } from "@/components/metrics/MetricCard"
import { TopProducts } from "@/components/dashboard/TopProducts"
import type { Metrics } from "@/types/metrics"
import { useWidgets } from "@/context/WidgetContext"
import { CustomerSegmentsWidget } from "@/components/widgets/CustomerSegments"
import { useMemo } from "react"

interface ShopifyContentProps {
  metrics: Metrics
}

export function ShopifyContent({ metrics }: ShopifyContentProps) {
  const { widgets } = useWidgets()

  const shopifyWidgets = useMemo(() => {
    return widgets.filter((w) => w.platform === "Shopify" && w.isEnabled)
  }, [widgets])

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shopifyWidgets.map((widget) => {
          switch (widget.type) {
            case "totalSales":
              return (
                <MetricCard
                  key={widget.id}
                  title={widget.name}
                  value={metrics.totalSales}
                  change={metrics.salesGrowth}
                  data={metrics.salesData}
                  prefix="$"
                  valueFormat="currency"
                  platform="Shopify"
                />
              )
            case "aov":
              return (
                <MetricCard
                  key={widget.id}
                  title={widget.name}
                  value={metrics.averageOrderValue}
                  change={metrics.aovGrowth}
                  data={metrics.salesData.map((d) => ({ ...d, value: d.value / (d.ordersPlaced || 1) }))}
                  prefix="$"
                  valueFormat="currency"
                  platform="Shopify"
                />
              )
            case "orders":
              return (
                <MetricCard
                  key={widget.id}
                  title={widget.name}
                  value={metrics.ordersPlaced}
                  change={((metrics.ordersPlaced - metrics.previousOrdersPlaced) / metrics.previousOrdersPlaced) * 100}
                  data={metrics.salesData.map((d) => ({ ...d, value: d.ordersPlaced || 0 }))}
                  valueFormat="number"
                  platform="Shopify"
                />
              )
            case "units":
              return (
                <MetricCard
                  key={widget.id}
                  title={widget.name}
                  value={metrics.unitsSold}
                  change={((metrics.unitsSold - metrics.previousUnitsSold) / metrics.previousUnitsSold) * 100}
                  data={metrics.salesData.map((d) => ({ ...d, value: d.unitsSold || 0 }))}
                  valueFormat="number"
                  platform="Shopify"
                />
              )
            case "conversion":
              return (
                <MetricCard
                  key={widget.id}
                  title={widget.name}
                  value={metrics.conversionRate}
                  change={metrics.conversionRateGrowth}
                  data={metrics.conversionData}
                  valueFormat="percentage"
                  suffix="%"
                  platform="Shopify"
                />
              )
            case "retention":
              return (
                <MetricCard
                  key={widget.id}
                  title={widget.name}
                  value={metrics.customerRetentionRate}
                  change={metrics.retentionRateGrowth}
                  data={metrics.retentionData}
                  valueFormat="percentage"
                  suffix="%"
                  platform="Shopify"
                />
              )
            case "topProducts":
              return <TopProducts key={widget.id} products={metrics.topProducts} />
            case "inventory":
              return (
                <MetricCard
                  key={widget.id}
                  title={widget.name}
                  value={metrics.inventoryLevels}
                  change={0} // You may want to calculate the change from the previous period
                  data={metrics.inventoryData}
                  valueFormat="number"
                  platform="Shopify"
                />
              )
            case "returnRate":
              return (
                <MetricCard
                  key={widget.id}
                  title={widget.name}
                  value={metrics.returnRate}
                  change={0}
                  data={metrics.returnData}
                  valueFormat="percentage"
                  suffix="%"
                  platform="Shopify"
                />
              )
            case "customerSegments":
              return <CustomerSegmentsWidget key={widget.id} segments={metrics.customerSegments} />
            default:
              return null
          }
        })}
      </div>
    </div>
  )
}

