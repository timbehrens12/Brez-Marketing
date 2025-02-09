"use client"

import { useEffect, useState, useCallback } from "react"
import type { DateRange } from "react-day-picker"
import { Layout } from "@/components/Layout"
import { MetricCard } from "@/components/metrics/MetricCard"
import { ShopifyOrders } from "@/components/ShopifyOrders"
import { calculateMetrics } from "@/utils/metrics"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import type { ComparisonType } from "@/components/ComparisonPicker"
import { TopProducts } from "@/components/dashboard/TopProducts"
import { WidgetManager } from "@/components/dashboard/WidgetManager"
import { WidgetProvider, useWidgets } from "@/context/WidgetContext"
import type { Metrics } from "@/types/metrics"
import type { Widget } from "@/types/widgets"
import { PlatformTabs } from "@/components/dashboard/PlatformTabs"
import { ShopifyContent } from "@/components/dashboard/platforms/ShopifyContent"
import { MetaContent } from "@/components/dashboard/platforms/MetaContent"
import { PlatformContent } from "@/components/dashboard/platforms/OtherPlatforms"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { prepareRevenueByDayData } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

function DashboardContent({
  selectedStore,
  dateRange,
  comparisonType,
  comparisonDateRange,
}: {
  selectedStore: string | null
  dateRange: DateRange | undefined
  comparisonType: ComparisonType
  comparisonDateRange: DateRange | undefined
}) {
  const { widgets } = useWidgets()
  const [metrics, setMetrics] = useState<ReturnType<typeof calculateMetrics> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)
  const [currentWeekRevenue, setCurrentWeekRevenue] = useState<number[]>(Array(7).fill(0))
  const [retryDelay, setRetryDelay] = useState(5000) // Start with a 5-second delay
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    if (!selectedStore) return

    setIsRefreshing(true)
    try {
      const response = await fetch(`${API_URL}/api/shopify/sales?shop=${encodeURIComponent(selectedStore)}`)

      if (response.status === 429) {
        console.warn("Rate limit exceeded. Backing off...")
        setRetryDelay((prevDelay) => Math.min(prevDelay * 2, 300000)) // Double the delay, max 5 minutes
        setTimeout(fetchData, retryDelay)
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.needsReauth) {
          setNeedsReauth(true)
          throw new Error("Authentication expired. Please re-authenticate.")
        }
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`)
      }

      const data = await response.json()

      console.log("Received data from API:", data)

      if (!data.orders) {
        throw new Error("No orders data received")
      }

      const calculatedMetrics = calculateMetrics(
        data.orders,
        data.products || [],
        data.refunds || [],
        dateRange,
        comparisonType,
        comparisonDateRange,
      )

      setMetrics(calculatedMetrics)
      setCurrentWeekRevenue(calculatedMetrics.currentWeekRevenue)
      setError(null)
      setNeedsReauth(false)
      setRetryDelay(5000) // Reset retry delay on successful request
    } catch (error) {
      console.error("Error fetching metrics:", error)
      setError(error instanceof Error ? error.message : "Failed to load dashboard data")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedStore, dateRange, comparisonType, comparisonDateRange, retryDelay])

  useEffect(() => {
    fetchData()
    const intervalId = setInterval(fetchData, 300000) // Fetch data every 5 minutes

    return () => clearInterval(intervalId) // Clean up on unmount
  }, [fetchData])

  function handleReauth() {
    if (selectedStore) {
      window.location.href = `${API_URL}/shopify/auth?shop=${encodeURIComponent(selectedStore)}`
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading dashboard data...</span>
        </div>
      </div>
    )
  }

  if (needsReauth) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert variant="destructive" className="max-w-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Authentication expired for {selectedStore}. Please re-authenticate.
            <Button onClick={handleReauth} variant="outline" className="ml-4">
              Re-authenticate
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert variant="destructive" className="max-w-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "No data available. Please check your store connection."}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <WidgetManager />
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={fetchData} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </div>

      {/* Pinned Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">📌 Pinned</h3>
          <span className="text-sm text-muted-foreground">Quick access to your most important metrics</span>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {widgets
            .filter((widget) => widget.isPinned)
            .map((widget) => renderWidget(widget.id.replace("pinned-", ""), metrics!, widgets))}
        </div>
      </div>

      {/* Platform Tabs */}
      <Tabs defaultValue="shopify" className="w-full">
        <PlatformTabs />
        <TabsContent value="shopify">
          <ShopifyContent metrics={metrics} />
          {/* Revenue by Day chart */}
          <div className="mt-6">
            <RevenueByDay data={prepareRevenueByDayData(currentWeekRevenue)} />
          </div>
          {/* Shopify Orders */}
          <div className="mt-6">
            <ShopifyOrders selectedStore={selectedStore} />
          </div>
        </TabsContent>
        <TabsContent value="meta">
          <MetaContent />
        </TabsContent>
        <TabsContent value="tiktok">
          <PlatformContent platform="TikTok Ads" value="tiktok" />
        </TabsContent>
        <TabsContent value="google">
          <PlatformContent platform="Google Ads" value="google" />
        </TabsContent>
        <TabsContent value="pinterest">
          <PlatformContent platform="Pinterest Ads" value="pinterest" />
        </TabsContent>
        <TabsContent value="linkedin">
          <PlatformContent platform="LinkedIn Ads" value="linkedin" />
        </TabsContent>
      </Tabs>
    </>
  )
}

const renderWidget = (widgetId: string, metrics: Metrics, allWidgets: Widget[]) => {
  const widget = allWidgets.find((w) => w.id === widgetId || w.id === `pinned-${widgetId}`)
  if (!widget) return null

  switch (widget.type) {
    case "totalSales":
      return (
        <MetricCard
          key={widget.id}
          title="Total Sales"
          value={metrics.totalSales}
          change={metrics.salesGrowth}
          data={metrics.salesData}
          prefix="$"
          valueFormat="currency"
          platform={widget.platform}
          infoTooltip="Total revenue from all sales including taxes and shipping, excluding refunds"
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
          platform={widget.platform}
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
          platform={widget.platform}
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
          platform={widget.platform}
        />
      )
    case "sessions":
      return (
        <MetricCard
          key={widget.id}
          title={widget.name}
          value={metrics.sessionCount}
          change={metrics.sessionGrowth}
          data={metrics.sessionData}
          valueFormat="number"
          platform={widget.platform}
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
          platform={widget.platform}
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
          platform={widget.platform}
        />
      )
    case "topProducts":
      return <TopProducts key={widget.id} products={metrics.topProducts} />
    default:
      return null
  }
}

function Dashboard({
  selectedStore,
  dateRange,
  comparisonType,
  comparisonDateRange,
}: {
  selectedStore: string | null
  dateRange: DateRange | undefined
  comparisonType: ComparisonType
  comparisonDateRange: DateRange | undefined
}) {
  return (
    <WidgetProvider>
      <DashboardContent
        selectedStore={selectedStore}
        dateRange={dateRange}
        comparisonType={comparisonType}
        comparisonDateRange={comparisonDateRange}
      />
    </WidgetProvider>
  )
}

export default function Page() {
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  const [comparisonType, setComparisonType] = useState<ComparisonType>("none")
  const [comparisonDateRange, setComparisonDateRange] = useState<DateRange>()

  const onStoreSelect = (store: string) => {
    setSelectedStore(store)
  }

  const onDateRangeChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange)
  }

  const handleComparisonChange = (type: ComparisonType, customRange?: DateRange) => {
    setComparisonType(type)
    setComparisonDateRange(customRange)
  }

  return (
    <Layout
      onStoreSelect={onStoreSelect}
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      comparisonType={comparisonType}
      comparisonDateRange={comparisonDateRange}
      onComparisonChange={handleComparisonChange}
    >
      <Dashboard
        selectedStore={selectedStore}
        dateRange={dateRange}
        comparisonType={comparisonType}
        comparisonDateRange={comparisonDateRange}
      />
    </Layout>
  )
}

