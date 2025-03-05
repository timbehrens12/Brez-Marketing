"use client"

import { MetricCard } from "@/components/metrics/MetricCard"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { DollarSign, ShoppingBag, TrendingUp, Package, Layers, Users, RefreshCw } from "lucide-react"
import { PlatformConnection } from "@/types/platforms"
import { DateRange } from "react-day-picker"
import { Metrics, SafeMetrics } from "@/types/metrics"
import { calculateMetrics } from "@/utils/metrics"
import Image from "next/image"
import { Table, TableHeader, TableBody, TableCell, TableRow, TableHead } from "@/components/ui/table"

// Update the Product interface to match what we're using
interface Product {
  id: string
  title: string
  quantity: number
  revenue: number
}

// Update the DailyData interface to include units
interface DailyData {
  date: string
  revenue: number
  orders: number
  units: number
}

interface ShopifyTabProps {
  connection: PlatformConnection
  dateRange: DateRange
  brandId: string
  metrics: Metrics
  isLoading: boolean
  isRefreshingData?: boolean
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

  // Ensure metrics are safe to use
  const safeMetrics = {
    totalSales: metrics?.totalSales || 0,
    ordersPlaced: metrics?.ordersPlaced || 0,
    averageOrderValue: metrics?.averageOrderValue || 0,
    unitsSold: metrics?.unitsSold || 0,
    inventoryLevels: metrics?.inventoryLevels || 0,
    salesGrowth: metrics?.salesGrowth || 0,
    ordersGrowth: metrics?.ordersGrowth || 0,
    aovGrowth: metrics?.aovGrowth || 0,
    unitsGrowth: metrics?.unitsGrowth || 0,
    inventoryGrowth: metrics?.inventoryGrowth || 0,
    revenueByDay: (metrics?.revenueByDay || []).map(item => ({
      date: item.date,
      revenue: item.revenue || item.amount || 0
    })),
    topProducts: (metrics?.topProducts || []) as Product[],
    customerSegments: metrics?.customerSegments || { newCustomers: 0, returningCustomers: 0 },
    dailyData: (metrics?.dailyData || []) as DailyData[]
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Sales"
          value={safeMetrics.totalSales}
          change={safeMetrics.salesGrowth}
          data={safeMetrics.dailyData.map(d => ({ date: d.date, value: d.revenue }))}
          prefix="$"
          valueFormat="currency"
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          infoTooltip="Total sales revenue for the selected period"
          includesRefunds={true}
          dateRange={dateRange}
        />
        <MetricCard
          title="Orders"
          value={safeMetrics.ordersPlaced}
          change={safeMetrics.ordersGrowth}
          data={safeMetrics.dailyData.map(d => ({ date: d.date, value: d.orders }))}
          valueFormat="number"
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          infoTooltip="Total number of orders placed during the selected period"
          dateRange={dateRange}
        />
        <MetricCard
          title="Average Order Value"
          value={safeMetrics.averageOrderValue}
          change={safeMetrics.aovGrowth}
          data={[]}
          prefix="$"
          valueFormat="currency"
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          infoTooltip="Average value of orders during the selected period"
          dateRange={dateRange}
        />
        <MetricCard
          title="Units Sold"
          value={safeMetrics.unitsSold}
          change={safeMetrics.unitsGrowth}
          data={safeMetrics.dailyData.map(d => ({ date: d.date, value: d.units }))}
          valueFormat="number"
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          infoTooltip="Total number of product units sold during the selected period"
          dateRange={dateRange}
        />
        <MetricCard
          title="Inventory Levels"
          value={safeMetrics.inventoryLevels}
          change={safeMetrics.inventoryGrowth}
          data={[]}
          valueFormat="number"
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          infoTooltip="Current inventory levels across all products"
          dateRange={dateRange}
        />
      </div>

      {/* Remove non-functional metrics as requested */}
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Day</CardTitle>
            <CardDescription>Daily revenue for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueByDay 
              data={safeMetrics.revenueByDay} 
              brandId={brandId}
              isRefreshing={isRefreshingData}
            />
          </CardContent>
        </Card>

        {safeMetrics.topProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
              <CardDescription>Best-selling products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeMetrics.topProducts.slice(0, 5).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                      <TableCell className="text-right">${product.revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 