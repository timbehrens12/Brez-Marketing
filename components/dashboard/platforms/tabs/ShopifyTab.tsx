"use client"

import { MetricCard } from "@/components/metrics/MetricCard"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { Metrics, CustomerSegments, DailyData, Product } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { Activity, ShoppingBag, Users, DollarSign, TrendingUp, Package, RefreshCcw } from "lucide-react"
import { PlatformConnection } from "@/types/platformConnection"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { calculateMetrics } from "@/utils/metrics"

interface ShopifyTabProps {
  connection: PlatformConnection
  dateRange: { from: Date; to: Date }
  brandId: string
  metrics: Metrics
  isLoading: boolean
  isRefreshingData?: boolean
}

interface SafeMetrics extends Omit<Metrics, 'revenueByDay' | 'topProducts' | 'customerSegments' | 'dailyData'> {
  revenueByDay: Array<{ date: string; revenue: number }>
  topProducts: Array<Product>
  customerSegments: CustomerSegments
  dailyData: Array<DailyData>
}

export function ShopifyTab({ 
  connection, 
  dateRange, 
  brandId,
  metrics,
  isLoading,
  isRefreshingData = false
}: ShopifyTabProps) {
  if (!connection) return <div>No Shopify connection found</div>
  if (isLoading) return <div className="flex items-center justify-center p-6">Loading metrics...</div>

  const safeMetrics: SafeMetrics = {
    ...metrics,
    revenueByDay: (metrics.revenueByDay || []).map(d => {
      // Ensure we have a proper date string in ISO format
      let dateStr = d.date;
      if (typeof dateStr === 'object' && dateStr !== null) {
        // If it's a Date object, convert to ISO string
        dateStr = (dateStr as Date).toISOString();
      } else if (typeof dateStr !== 'string') {
        // If it's neither a string nor a Date, use current date
        dateStr = new Date().toISOString();
      }
      
      // Log for debugging
      console.log(`Processing revenue data: ${dateStr} = $${d.amount || 0}`);
      
      return {
        date: dateStr,
        revenue: d.amount || 0
      };
    }),
    topProducts: (metrics.topProducts || []).map(product => ({
      id: product.id,
      name: product.title || '',
      quantity: product.quantity || 0,
      revenue: product.revenue || 0
    })),
    customerSegments: {
      newCustomers: metrics.customerSegments?.newCustomers || 0,
      returningCustomers: metrics.customerSegments?.returningCustomers || 0
    },
    dailyData: (metrics.dailyData || []).map(d => ({
      date: d.date,
      orders: d.orders || 0,
      revenue: d.revenue || 0,
      value: d.revenue || 0 // Add this for MetricCard compatibility
    }))
  }

  return (
    <div className="space-y-8">
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-800 p-2 text-xs text-gray-300 rounded">
          <div>Date Range: {dateRange.from.toDateString()} to {dateRange.to.toDateString()}</div>
          <div>Revenue Data Points: {safeMetrics.revenueByDay.length}</div>
        </div>
      )}
      
      {/* Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Sales"
          value={safeMetrics.totalSales || 0}
          change={safeMetrics.salesGrowth || 0}
          prefix="$"
          valueFormat="currency"
          data={safeMetrics.dailyData}
          icon={<DollarSign className="h-4 w-4" />}
          loading={isLoading}
          refreshing={isRefreshingData}
        />
        <MetricCard
          title="Orders"
          value={safeMetrics.ordersPlaced || 0}
          change={safeMetrics.ordersGrowth || 0}
          valueFormat="number"
          data={safeMetrics.dailyData}
          icon={<ShoppingBag className="h-4 w-4" />}
          loading={isLoading}
          refreshing={isRefreshingData}
        />
        <MetricCard
          title="AOV"
          value={safeMetrics.averageOrderValue || 0}
          change={safeMetrics.aovGrowth || 0}
          prefix="$"
          valueFormat="currency"
          data={safeMetrics.dailyData}
          icon={<Activity className="h-4 w-4" />}
          loading={isLoading}
          refreshing={isRefreshingData}
        />
        <MetricCard
          title="Units Sold"
          value={safeMetrics.unitsSold || 0}
          change={safeMetrics.unitsGrowth || 0}
          valueFormat="number"
          data={safeMetrics.dailyData}
          icon={<Package className="h-4 w-4" />}
          loading={isLoading}
          refreshing={isRefreshingData}
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Conversion Rate"
          value={safeMetrics.conversionRate || 0}
          change={safeMetrics.conversionRateGrowth || 0}
          valueFormat="percentage"
          data={safeMetrics.dailyData}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={isLoading}
          refreshing={isRefreshingData}
        />
        <MetricCard
          title="Customer Retention"
          value={safeMetrics.customerRetentionRate || 0}
          change={safeMetrics.retentionGrowth || 0}
          valueFormat="percentage"
          data={safeMetrics.dailyData}
          icon={<Users className="h-4 w-4" />}
          loading={isLoading}
          refreshing={isRefreshingData}
        />
        <MetricCard
          title="Return Rate"
          value={safeMetrics.returnRate || 0}
          change={safeMetrics.returnGrowth || 0}
          valueFormat="percentage"
          data={safeMetrics.dailyData}
          icon={<RefreshCcw className="h-4 w-4" />}
          loading={isLoading}
          refreshing={isRefreshingData}
        />
        <MetricCard
          title="Active Customers"
          value={safeMetrics.customerSegments.newCustomers + safeMetrics.customerSegments.returningCustomers}
          change={0}
          valueFormat="number"
          data={safeMetrics.dailyData}
          icon={<Users className="h-4 w-4" />}
          loading={isLoading}
          refreshing={isRefreshingData}
        />
      </div>

      {/* Revenue Calendar - Full Width */}
      <div className="w-full">
        <Card className="bg-[#111111] border-[#222222]">
          <CardHeader className="py-2">
            <CardTitle className="text-white">Revenue Calendar</CardTitle>
          </CardHeader>
          <CardContent className="h-[520px]">
            <RevenueByDay 
              data={safeMetrics.revenueByDay} 
              brandId={brandId}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 