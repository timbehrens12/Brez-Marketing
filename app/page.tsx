"use client"

// Tell Next.js not to statically prerender this page.
export const dynamic = "force-dynamic"

import type { DateRange } from "react-day-picker"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
// Rename the dynamic import so it doesn’t conflict with our export.
import NextDynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { Layout } from "@/components/Layout"
import { MetricCard } from "@/components/metrics/MetricCard"
import { ShopifyOrders } from "@/components/ShopifyOrders"
import { calculateMetrics } from "@/utils/metrics"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.brezmarketingdashboard.com"

// -----------------------------------------------------------------------------
// DashboardContent Component
// -----------------------------------------------------------------------------

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
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)
  const [currentWeekRevenue, setCurrentWeekRevenue] = useState<number[]>(Array(7).fill(0))
  const [retryDelay, setRetryDelay] = useState(5000)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  async function fetchData() {
    if (!selectedStore) return

    setIsRefreshing(true)
    try {
      const response = await fetch(`${API_URL}/api/shopify/sales?shop=${encodeURIComponent(selectedStore)}`)

      if (response.status === 429) {
        console.warn("Rate limit exceeded. Backing off...")
        setRetryDelay((prevDelay) => Math.min(prevDelay * 2, 300000))
        setTimeout(fetchData, retryDelay)
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.needsReauth) {
          setNeedsReauth(true)
          router.push(`${API_URL}/shopify/auth?shop=${encodeURIComponent(selectedStore)}`)
          return
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
      setRetryDelay(5000)
    } catch (error) {
      console.error("Error fetching metrics:", error)
      setError(error instanceof Error ? error.message : "Failed to load dashboard data")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (selectedStore) {
      console.log("Fetching data for:", selectedStore);
      fetchData(selectedStore);
    }
  }, [selectedStore, dateRange, comparisonType, comparisonDateRange]);
  
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
          <AlertDescription>Authentication expired for {selectedStore}. Please re-authenticate.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert variant="default" className="max-w-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No data available yet. Please wait while we fetch your store data.</AlertDescription>
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
          <Button
            onClick={() => {
              fetchData()
            }}
            disabled={isRefreshing}
          >
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
            .map((widget) => renderWidget(widget.id.replace("pinned-", ""), metrics, widgets))}
        </div>
      </div>

      {/* Platform Tabs */}
      <Tabs defaultValue="shopify" className="w-full">
        <PlatformTabs />
        <TabsContent value="shopify">
          <ShopifyContent metrics={metrics} />
          <div className="mt-6">
            <RevenueByDay data={prepareRevenueByDayData(currentWeekRevenue)} />
          </div>
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

// -----------------------------------------------------------------------------
// renderWidget Helper Function
// -----------------------------------------------------------------------------

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
          data={metrics.salesData.map((d) => ({
            ...d,
            value: d.value / (d.ordersPlaced || 1),
          }))}
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

// -----------------------------------------------------------------------------
// Dynamically Import the Client-Only SearchParamsWrapper using NextDynamic
// -----------------------------------------------------------------------------

const SearchParamsWrapper = NextDynamic(() => import("@/components/SearchParamsWrapper"), { ssr: false })

// -----------------------------------------------------------------------------
// Dashboard Component
// -----------------------------------------------------------------------------

function Dashboard({
  selectedStore,
  setSelectedStore,
  dateRange,
  comparisonType,
  comparisonDateRange,
}: {
  selectedStore: string | null
  setSelectedStore: (store: string) => void
  dateRange: DateRange | undefined
  comparisonType: ComparisonType
  comparisonDateRange: DateRange | undefined
}) {
  return (
    <WidgetProvider>
      <Suspense fallback={<div>Loading search params...</div>}>
        <SearchParamsWrapper onShopFound={setSelectedStore} />
      </Suspense>
      <Suspense fallback={<div>Loading dashboard...</div>}>
        <DashboardContent
          selectedStore={selectedStore}
          dateRange={dateRange}
          comparisonType={comparisonType}
          comparisonDateRange={comparisonDateRange}
        />
      </Suspense>
    </WidgetProvider>
  )
}

// -----------------------------------------------------------------------------
// Main Page Component (wrapped at the top level in Suspense)
// -----------------------------------------------------------------------------

export default function Page() {
  console.log("Page component rendered")
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  const [comparisonType, setComparisonType] = useState<ComparisonType>("none")
  const [comparisonDateRange, setComparisonDateRange] = useState<DateRange>()
  const [error, setError] = useState<string | null>(null) // Added error state
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const shop = searchParams.get("shop");
    if (!shop) {
      console.log("No shop found in URL. Checking local storage...");
      const savedShop = localStorage.getItem("shop");
      if (savedShop) {
        console.log("Using saved shop:", savedShop);
        setSelectedStore(savedShop);
      } else {
        console.warn("No saved shop found, redirecting to Shopify auth.");
        router.replace("/shopify/auth");
      }
      return;
    }
  
    console.log("Persisting shop:", shop);
    localStorage.setItem("shop", shop);
    setSelectedStore(shop);
  
    console.log("Verifying session...");
    fetch(`${API_URL}/api/check-session?shop=${encodeURIComponent(shop)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          console.warn("Session invalid, redirecting to auth...");
          router.replace(`/shopify/auth?shop=${encodeURIComponent(shop)}`);
        } else {
          console.log("✅ Session verified. Staying on dashboard.");
        }
      })
      .catch((err) => console.error("Session check failed:", err));
  }, [searchParams, router]);
  

  const fetchData = async (shop: string, retryCount = 0) => {
    console.log("fetchData called with shop:", shop);
    if (!shop) return;
  
    try {
      setIsLoading(true);
      console.log("Checking session authentication...");
  
      // First, verify if session exists before making sales API request
      const sessionResponse = await fetch(`${API_URL}/api/check-session?shop=${encodeURIComponent(shop)}`);
      const sessionData = await sessionResponse.json();
  
      if (!sessionData.authenticated) {
        console.warn("Session not found, attempting reauthentication...");
  
        if (retryCount >= 3) {
          console.warn("Auth failed 3 times. Redirecting to reauth...");
          router.push(`${API_URL}/shopify/auth?shop=${encodeURIComponent(shop)}`);
        } else {
          console.warn(`Reauth required. Retrying in 2 seconds... (Attempt ${retryCount + 1})`);
          setTimeout(() => fetchData(shop, retryCount + 1), 2000);
        }
        return;
      }
  
      console.log("✅ Session verified. Proceeding with data fetch...");
  
      // Fetch sales data
      const response = await fetch(`${API_URL}/api/shopify/sales?shop=${encodeURIComponent(shop)}`);
  
      if (!response.ok) {
        const errorData = await response.json();
  
        if (errorData.needsReauth) {
          console.warn("Session expired. Redirecting to reauth...");
          router.push(`${API_URL}/shopify/auth?shop=${encodeURIComponent(shop)}`);
          return;
        }
  
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("📊 Data received from API:", data);
  
      // Update state variables with API data if needed
  
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      setError(error instanceof Error ? error.message : "An error occurred while fetching data");
    } finally {
      setIsLoading(false);
    }
  };
  
  

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  const onStoreSelect = (store: string) => {
    setSelectedStore(store)
    fetchData(store)
  }

  const onDateRangeChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange)
  }

  const handleComparisonChange = (type: ComparisonType, customRange?: DateRange) => {
    setComparisonType(type)
    setComparisonDateRange(customRange)
  }

  return (
    <Suspense fallback={<div>Loading page...</div>}>
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
          setSelectedStore={setSelectedStore}
          dateRange={dateRange}
          comparisonType={comparisonType}
          comparisonDateRange={comparisonDateRange}
        />
      </Layout>
    </Suspense>
  )
}

