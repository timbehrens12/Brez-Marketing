"use client"

import { useEffect, useState, useCallback } from "react"
import type { DateRange } from "react-day-picker"
import { MetricCard } from "@/components/metrics/MetricCard"
import { ShopifyOrders } from "@/components/ShopifyOrders"
import { calculateMetrics } from "@/utils/metrics"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, RefreshCw, LogOut } from "lucide-react"
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
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { StoreSelector } from "@/components/StoreSelector"
import { DateRangePicker } from "@/components/DateRangePicker"
import { ComparisonPicker } from "@/components/ComparisonPicker"
import { startOfDay, endOfDay } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  console.error("NEXT_PUBLIC_API_URL is not defined in the environment variables.")
}

function DashboardContent({
  selectedStore,
  onStoreSelect,
  dateRange,
  onDateRangeChange,
  onDisconnect,
}: {
  selectedStore: string | null
  onStoreSelect: (store: string) => void
  dateRange: DateRange | undefined
  onDateRangeChange: (newDateRange: DateRange | undefined) => void
  onDisconnect: () => void
}) {
  const { widgets } = useWidgets()
  const [metrics, setMetrics] = useState<ReturnType<typeof calculateMetrics> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)
  const [currentWeekRevenue, setCurrentWeekRevenue] = useState<number[]>(Array(7).fill(0))
  const [retryDelay, setRetryDelay] = useState(5000)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch data when a store is selected
  useEffect(() => {
    if (selectedStore) {
      fetchData()
    }
  }, [selectedStore])

  const fetchData = useCallback(async () => {
    if (!selectedStore) return
    if (!API_URL) {
      console.error("API_URL is not defined")
      setError("API URL is not configured properly")
      setLoading(false)
      return
    }

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
  }, [selectedStore, dateRange, retryDelay])

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

  const handleDisconnect = async () => {
    if (!selectedStore) return
    try {
      const response = await fetch(`${API_URL}/api/disconnect-store`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shop: selectedStore }),
      })

      if (!response.ok) {
        throw new Error("Failed to disconnect store")
      }

      onDisconnect()
    } catch (error) {
      console.error("Error disconnecting store:", error)
      setError("Failed to disconnect store. Please try again.")
    }
  }

  if (!selectedStore) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium text-gray-700">Please connect a store in the settings.</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-gray-700" />
          <span className="text-lg font-medium text-gray-700">Loading dashboard data...</span>
        </div>
      </div>
    )
  }

  if (needsReauth) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert variant="destructive" className="max-w-xl bg-white border-red-600 text-gray-800">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            Authentication expired for {selectedStore}. Please re-authenticate.
            <Button
              onClick={handleReauth}
              variant="outline"
              className="ml-4 bg-gray-100 text-gray-800 hover:bg-gray-200"
            >
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
        <Alert variant="destructive" className="max-w-xl bg-white border-red-600 text-gray-800">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>{error || "No data available. Please check your store connection."}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-gray-800">Dashboard</h2>
          <WidgetManager />
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={fetchData} disabled={isRefreshing} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
          <Button onClick={handleDisconnect} variant="outline" className="bg-gray-200 text-gray-800 hover:bg-gray-300">
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect Store
          </Button>
        </div>
      </div>

      {!selectedStore && (
        <Alert className="mb-6">
          <AlertDescription>
            No store connected. Please connect a store in the{" "}
            <a href="/settings" className="font-medium underline">
              settings
            </a>{" "}
            to view your data.
          </AlertDescription>
        </Alert>
      )}

      {/* Pinned Section - Always visible */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">📌 Pinned</h3>
          <span className="text-sm text-gray-600">Quick access to your most important metrics</span>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {widgets
            .filter((widget) => widget.isPinned)
            .map((widget) => (
              <MetricCard
                key={widget.id}
                title={widget.name}
                value={0}
                change={0}
                data={[]}
                platform={widget.platform}
                emptyState={!selectedStore ? "Connect a store to view data" : undefined}
              />
            ))}
        </div>
      </div>

      {/* Platform Tabs - Always visible */}
      <Tabs defaultValue="shopify" className="w-full">
        <PlatformTabs />
        <TabsContent value="shopify">
          {selectedStore ? (
            <ShopifyContent metrics={metrics || {
              totalSales: 0,
              salesGrowth: 0,
              averageOrderValue: 0,
              aovGrowth: 0,
              salesData: [],
              ordersPlaced: 0,
              previousOrdersPlaced: 0,
              unitsSold: 0,
              previousUnitsSold: 0,
              orderCount: 0,
              previousOrderCount: 0,
              topProducts: [],
              customerRetentionRate: 0,
              revenueByDay: [],
              sessionCount: 0,
              sessionGrowth: 0,
              sessionData: [],
              conversionRate: 0,
              conversionRateGrowth: 0,
              conversionData: [],
              retentionRateGrowth: 0,
              retentionData: [],
              currentWeekRevenue: [],
              inventoryLevels: 0,
              returnRate: 0,
              inventoryData: [],
              returnData: [],
              customerLifetimeValue: 0,
              clvData: [],
              averageTimeToFirstPurchase: 0,
              timeToFirstPurchaseData: [],
              categoryPerformance: [],
              categoryData: [],
              shippingZones: [],
              shippingData: [],
              paymentMethods: [],
              paymentData: [],
              discountPerformance: [],
              discountData: [],
              customerSegments: { newCustomers: 0, returningCustomers: 0 },
              firstTimeVsReturning: {
                firstTime: { orders: 0, revenue: 0 },
                returning: { orders: 0, revenue: 0 }
              },
              customerSegmentData: []
            }} dateRange={dateRange} />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Connect a Shopify store in settings to view data</p>
            </div>
          )}
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
  onStoreSelect,
  dateRange,
  onDateRangeChange,
  onDisconnect,
}: {
  selectedStore: string | null
  onStoreSelect: (store: string) => void
  dateRange: DateRange | undefined
  onDateRangeChange: (newDateRange: DateRange | undefined) => void
  onDisconnect: () => void
}) {
  const { widgets } = useWidgets()
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  useEffect(() => {
    const fetchShopifyData = async () => {
      if (!selectedStore) return
      
      try {
        const response = await fetch(`${API_URL}/api/shopify/sales?shop=${encodeURIComponent(selectedStore)}`)
        if (!response.ok) throw new Error('Failed to fetch Shopify data')
        
        const data = await response.json()
        if (data.orders) {
          const calculatedMetrics = calculateMetrics(
            data.orders,
            data.products || [],
            data.refunds || [],
            dateRange,
          )
          setMetrics(calculatedMetrics)
        }
      } catch (error) {
        console.error('Error fetching Shopify data:', error)
      }
    }

    fetchShopifyData()
    // Refresh every 5 minutes
    const interval = setInterval(fetchShopifyData, 300000)
    return () => clearInterval(interval)
  }, [selectedStore, dateRange])

  return (
    <WidgetProvider>
      <DashboardContent
        selectedStore={selectedStore}
        onStoreSelect={onStoreSelect}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        onDisconnect={onDisconnect}
      />
    </WidgetProvider>
  )
}

export default function DashboardPage() {
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const { widgets } = useWidgets()

  const onStoreSelect = useCallback((store: string) => {
    setSelectedStore(store)
  }, [])

  const handleDateChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange)
  }

  useEffect(() => {
    const fetchShopifyData = async () => {
      if (!selectedStore) return
      
      try {
        const response = await fetch(`${API_URL}/api/shopify/sales?shop=${encodeURIComponent(selectedStore)}`)
        if (!response.ok) throw new Error('Failed to fetch Shopify data')
        
        const data = await response.json()
        if (data.orders) {
          const calculatedMetrics = calculateMetrics(
            data.orders,
            data.products || [],
            data.refunds || [],
            dateRange,
          )
          setMetrics(calculatedMetrics)
        }
      } catch (error) {
        console.error('Error fetching Shopify data:', error)
      }
    }

    fetchShopifyData()
    // Refresh every 5 minutes
    const interval = setInterval(fetchShopifyData, 300000)
    return () => clearInterval(interval)
  }, [selectedStore, dateRange])

  return (
    <div className="flex flex-col min-h-screen bg-gray-200">
      <div className="bg-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <StoreSelector onStoreSelect={onStoreSelect} />
          <div className="flex items-center space-x-4">
            <DateRangePicker date={dateRange} onDateChange={handleDateChange} />
          </div>
        </div>
      </div>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <WidgetManager />
          </div>
        </div>

        {!selectedStore && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No store connected. Please connect a store in the{" "}
              <a href="/settings" className="font-medium underline">
                settings
              </a>{" "}
              to view your data.
            </AlertDescription>
          </Alert>
        )}

        {/* Pinned Section - Always visible */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold">📌 Pinned</h3>
            <span className="text-sm text-gray-600">Quick access to your most important metrics</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {widgets
              .filter((widget) => widget.isPinned)
              .map((widget) => (
                <MetricCard
                  key={widget.id}
                  title={widget.name}
                  value={0}
                  change={0}
                  data={[]}
                  platform={widget.platform}
                  emptyState={!selectedStore ? "Connect a store to view data" : undefined}
                />
              ))}
          </div>
        </div>

        {/* Platform Tabs - Always visible */}
        <Tabs defaultValue="shopify" className="w-full">
          <PlatformTabs />
          <TabsContent value="shopify">
            {selectedStore ? (
              <ShopifyContent metrics={metrics || {
                totalSales: 0,
                salesGrowth: 0,
                averageOrderValue: 0,
                aovGrowth: 0,
                salesData: [],
                ordersPlaced: 0,
                previousOrdersPlaced: 0,
                unitsSold: 0,
                previousUnitsSold: 0,
                orderCount: 0,
                previousOrderCount: 0,
                topProducts: [],
                customerRetentionRate: 0,
                revenueByDay: [],
                sessionCount: 0,
                sessionGrowth: 0,
                sessionData: [],
                conversionRate: 0,
                conversionRateGrowth: 0,
                conversionData: [],
                retentionRateGrowth: 0,
                retentionData: [],
                currentWeekRevenue: [],
                inventoryLevels: 0,
                returnRate: 0,
                inventoryData: [],
                returnData: [],
                customerLifetimeValue: 0,
                clvData: [],
                averageTimeToFirstPurchase: 0,
                timeToFirstPurchaseData: [],
                categoryPerformance: [],
                categoryData: [],
                shippingZones: [],
                shippingData: [],
                paymentMethods: [],
                paymentData: [],
                discountPerformance: [],
                discountData: [],
                customerSegments: { newCustomers: 0, returningCustomers: 0 },
                firstTimeVsReturning: {
                  firstTime: { orders: 0, revenue: 0 },
                  returning: { orders: 0, revenue: 0 }
                },
                customerSegmentData: []
              }} dateRange={dateRange} />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Connect a Shopify store in settings to view data</p>
              </div>
            )}
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
      </div>
    </div>
  )
}

