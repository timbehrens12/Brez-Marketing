"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Music, Search, Pin, Linkedin } from "lucide-react"
import { ShopifyContent } from "./platforms/ShopifyContent"
import { MetaContent } from "./platforms/MetaContent"
import { DateRange } from "react-day-picker"
import type { Metrics } from "@/types/metrics"

interface ShopifyMetrics {
  totalSales: number
  salesGrowth: number
  averageOrderValue: number
  aovGrowth: number
  salesData: any[]
  ordersPlaced: number
  previousOrdersPlaced: number
  unitsSold: number
  previousUnitsSold: number
  orderCount: number
  previousOrderCount: number
  topProducts: any[]
  customerRetentionRate: number
  revenueByDay: any[]
  sessionCount: number
  sessionGrowth: number
  sessionData: any[]
  conversionRate: number
  conversionRateGrowth: number
  conversionData: any[]
  retentionRateGrowth: number
  retentionData: any[]
  currentWeekRevenue: number[]
  inventoryLevels: number
  returnRate: number
  inventoryData: any[]
  returnData: any[]
  customerLifetimeValue: number
  clvData: any[]
  averageTimeToFirstPurchase: number
  timeToFirstPurchaseData: any[]
  categoryPerformance: any[]
  categoryData: any[]
  shippingZones: any[]
  shippingData: any[]
  paymentMethods: any[]
  paymentData: any[]
  discountPerformance: any[]
  discountData: any[]
  customerSegments: { newCustomers: number; returningCustomers: number }
  firstTimeVsReturning: {
    firstTime: { orders: number; revenue: number }
    returning: { orders: number; revenue: number }
  }
  customerSegmentData: any[]
  dailyData: any[]
  chartData: any[]
}

interface PlatformTabsProps {
  platforms: {
    shopify: boolean
    meta: boolean
  }
  dateRange: DateRange | undefined
  metrics: Metrics
  isLoading: boolean
}

const defaultMetrics = {
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
  customerSegmentData: [],
  inventoryTurnover: 0,
  inventoryTurnoverGrowth: 0,
  ordersGrowth: 0,
  unitsGrowth: 0,
  conversionGrowth: 0,
  retentionGrowth: 0,
  returnGrowth: 0,
  inventoryGrowth: 0,
  dailyData: [],
  chartData: [],
}

export function PlatformTabs({ platforms, dateRange, metrics, isLoading }: PlatformTabsProps) {
  return (
    <Tabs defaultValue="shopify">
      <TabsList className="grid w-full grid-cols-6 mb-8 bg-[#111111] border-[#222222]">
        <TabsTrigger value="shopify" className="flex items-center gap-2 text-white data-[state=active]:bg-[#222222]">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Di8NeCzywloJqM3PWXj5VGVChVgmxi.png"
            alt="Shopify"
            className="h-4 w-4"
          />
          <span className="hidden md:inline">Shopify</span>
        </TabsTrigger>
        <TabsTrigger value="meta" className="flex items-center gap-2 text-white data-[state=active]:bg-[#222222]">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-xNnLSFG1hEPttp3zbiVUSkeeKN3EXY.png"
            alt="Meta"
            className="h-4 w-4"
          />
          <span className="hidden md:inline">Meta Ads</span>
        </TabsTrigger>
        <TabsTrigger value="tiktok" className="flex items-center gap-2 text-white data-[state=active]:bg-[#222222]">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kQNBaAXHdkQfjbkUEzr7W0yvQmt22Z.png"
            alt="TikTok"
            className="h-4 w-4"
          />
          <span className="hidden md:inline">TikTok</span>
        </TabsTrigger>
        <TabsTrigger value="google" className="flex items-center gap-2 text-white data-[state=active]:bg-[#222222]">
          <Search className="h-4 w-4 text-[#4285F4]" />
          <span className="hidden md:inline">Google</span>
        </TabsTrigger>
        <TabsTrigger value="pinterest" className="flex items-center gap-2 text-white data-[state=active]:bg-[#222222]">
          <Pin className="h-4 w-4 text-[#E60023]" />
          <span className="hidden md:inline">Pinterest</span>
        </TabsTrigger>
        <TabsTrigger value="linkedin" className="flex items-center gap-2 text-white data-[state=active]:bg-[#222222]">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-xNnLSFG1hEPttp3zbiVUSkeeKN3EXY.png"
            alt="LinkedIn"
            className="h-4 w-4 text-[#0A66C2]"
          />
          <span className="hidden md:inline">LinkedIn</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="shopify">
        <ShopifyContent metrics={defaultMetrics} dateRange={dateRange} />
      </TabsContent>
      <TabsContent value="meta">
        <MetaContent metrics={defaultMetrics} dateRange={dateRange} />
      </TabsContent>
    </Tabs>
  )
}

