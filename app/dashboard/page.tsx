"use client"

import { useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { PlatformTabs } from "@/components/dashboard/PlatformTabs"
import { StoreSelector } from "@/components/StoreSelector"
import { DateRangePicker } from "@/components/DateRangePicker"
import { DateRange } from "react-day-picker"
import { supabase } from "@/utils/supabase"

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
}

export default function DashboardPage() {
  const { user } = useUser()
  const [selectedStore, setSelectedStore] = useState("")
  const [date, setDate] = useState<DateRange | undefined>()
  const [metrics, setMetrics] = useState<ShopifyMetrics | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedStore && date) {
      loadShopifyData()
    }
  }, [selectedStore, date])

  const loadShopifyData = async () => {
    setLoading(true)
    try {
      // Use your existing backend API endpoint
      const response = await fetch('https://your-heroku-backend.herokuapp.com/api/shopify/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: selectedStore,
          dateRange: date
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error loading Shopify data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex gap-4">
          <StoreSelector onStoreSelect={setSelectedStore} />
          <DateRangePicker date={date} onDateChange={setDate} />
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-white mb-4">🚀 Pinned: Quick access to your most important metrics</h2>
          <PlatformTabs 
            dateRange={date} 
            metrics={metrics || defaultMetrics} 
            isLoading={loading}
          />
        </div>
      </div>
    </div>
  )
}

const defaultMetrics: ShopifyMetrics = {
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
}
