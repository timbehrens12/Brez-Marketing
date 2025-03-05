"use client"

import { MetricCard } from "@/components/metrics/MetricCard"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts"
import type { Metrics, CustomerSegments, DailyData, Product } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { Activity, ShoppingBag, Users, DollarSign, TrendingUp, Package, RefreshCcw, BarChart2, PercentIcon, UserCheck, MousePointerClick, Clock, Globe, CreditCard, ShoppingCart } from "lucide-react"
import { PlatformConnection } from "@/types/platformConnection"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { calculateMetrics } from "@/utils/metrics"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ShopifyTabProps {
  connection: PlatformConnection
  dateRange: { from: Date; to: Date }
  brandId: string
  metrics: Metrics
  isLoading: boolean
  isRefreshingData?: boolean
}

interface SafeMetrics {
  totalSales: number;
  ordersPlaced: number;
  averageOrderValue: number;
  unitsSold: number;
  conversionRate: number;
  sessions: number;
  revenueByDay: any[];
  salesGrowth: number;
  ordersGrowth: number;
  aovGrowth: number;
  unitsGrowth: number;
  conversionRateGrowth: number;
  dailyData: any[];
  customerSegments: {
    newCustomers: number;
    returningCustomers: number;
  };
  topProducts?: any[];
  topLocations?: any[];
  orderTimeline?: any[];
  orderStatuses?: any[];
  averageItemsPerOrder?: number;
  isSessionsEstimated?: boolean;
}

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const defaultMetrics: SafeMetrics = {
  totalSales: 0,
  ordersPlaced: 0,
  averageOrderValue: 0,
  unitsSold: 0,
  conversionRate: 0,
  sessions: 0,
  revenueByDay: [],
  salesGrowth: 0,
  ordersGrowth: 0,
  aovGrowth: 0,
  unitsGrowth: 0,
  conversionRateGrowth: 0,
  dailyData: [],
  customerSegments: {
    newCustomers: 0,
    returningCustomers: 0
  },
  topProducts: [],
  topLocations: [],
  orderTimeline: [],
  orderStatuses: [],
  averageItemsPerOrder: 0
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
    })),
    topLocations: metrics.topLocations || [],
    orderTimeline: metrics.orderTimeline || [],
    orderStatuses: metrics.orderStatuses || [],
    averageItemsPerOrder: metrics.averageItemsPerOrder || 0
  }

  // Format order timeline data for chart
  const formattedOrderTimeline = safeMetrics.orderTimeline?.map(item => ({
    ...item,
    hour: `${item.hour}:00`
  })) || [];

  // Format order status data for chart
  const formattedOrderStatuses = safeMetrics.orderStatuses?.map((status, index) => ({
    ...status,
    color: COLORS[index % COLORS.length]
  })) || [];

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
          title={
            <div className="flex items-center gap-2">
              <Image
                src="/images/shopify-logo.png"
                alt="Shopify"
                width={20}
                height={20}
                className="mr-1"
              />
              <span>Total Sales</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          }
          value={safeMetrics.totalSales || 0}
          change={safeMetrics.salesGrowth || 0}
          prefix="$"
          valueFormat="currency"
          data={safeMetrics.dailyData}
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
        />
        <MetricCard
          title={
            <div className="flex items-center gap-2">
              <Image
                src="/images/shopify-logo.png"
                alt="Shopify"
                width={20}
                height={20}
                className="mr-1"
              />
              <span>Orders</span>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </div>
          }
          value={safeMetrics.ordersPlaced || 0}
          change={safeMetrics.ordersGrowth || 0}
          data={safeMetrics.dailyData.map(d => ({ ...d, value: d.orders }))}
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
        />
        <MetricCard
          title={
            <div className="flex items-center gap-2">
              <Image
                src="/images/shopify-logo.png"
                alt="Shopify"
                width={20}
                height={20}
                className="mr-1"
              />
              <span>Average Order Value</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          }
          value={safeMetrics.averageOrderValue || 0}
          change={safeMetrics.aovGrowth || 0}
          prefix="$"
          valueFormat="currency"
          data={safeMetrics.dailyData.map(d => ({ 
            ...d, 
            value: d.orders > 0 ? d.revenue / d.orders : 0 
          }))}
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
        />
        <MetricCard
          title={
            <div className="flex items-center gap-2">
              <Image
                src="/images/shopify-logo.png"
                alt="Shopify"
                width={20}
                height={20}
                className="mr-1"
              />
              <span>Units Sold</span>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          }
          value={safeMetrics.unitsSold || 0}
          change={safeMetrics.unitsGrowth || 0}
          data={safeMetrics.dailyData.map(d => ({ ...d, value: d.orders }))}
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={
            <div className="flex items-center gap-2">
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Conversion Rate</span>
              <PercentIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          }
          value={safeMetrics.conversionRate || 0}
          change={safeMetrics.conversionRateGrowth || 0}
          suffix="%"
          valueFormat="percentage"
          data={safeMetrics.dailyData}
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
        />
        <MetricCard
          title={
            <div className="flex items-center gap-2">
              <Image
                src="/images/shopify-logo.png"
                alt="Shopify"
                width={20}
                height={20}
                className="mr-1"
              />
              <span>Sessions</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          }
          value={safeMetrics.sessions || 0}
          change={0}
          loading={isLoading}
          refreshing={isRefreshingData}
          valueFormat="number"
          data={safeMetrics.dailyData}
          platform="shopify"
        />
        <MetricCard
          title={
            <div className="flex items-center gap-2">
              <Image
                src="/images/shopify-logo.png"
                alt="Shopify"
                width={20}
                height={20}
                className="mr-1"
              />
              <span>New Customers</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          }
          value={safeMetrics.customerSegments.newCustomers || 0}
          change={0}
          valueFormat="number"
          data={safeMetrics.dailyData}
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
        />
        <MetricCard
          title={
            <div className="flex items-center gap-2">
              <Image
                src="/images/shopify-logo.png"
                alt="Shopify"
                width={20}
                height={20}
                className="mr-1"
              />
              <span>Returning Customers</span>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </div>
          }
          value={safeMetrics.customerSegments.returningCustomers || 0}
          change={0}
          valueFormat="number"
          data={safeMetrics.dailyData}
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
        />
      </div>

      {/* Third Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={
            <div className="flex items-center gap-2">
              <Image
                src="/images/shopify-logo.png"
                alt="Shopify"
                width={20}
                height={20}
                className="mr-1"
              />
              <span>Items Per Order</span>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
          }
          value={safeMetrics.averageItemsPerOrder || 0}
          change={0}
          valueFormat="number"
          data={safeMetrics.dailyData}
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
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
              isRefreshing={isRefreshingData}
            />
          </CardContent>
        </Card>
      </div>

      {/* Order Timeline and Geographic Distribution - Two Column Layout */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Order Timeline */}
        {formattedOrderTimeline.length > 0 && (
          <Card className="bg-[#111111] border-[#222222]">
            <CardHeader className="py-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Order Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={formattedOrderTimeline}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                >
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fill: '#888' }} 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: '#888' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#222', border: 'none' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: any) => [`${value} orders`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#5fc768" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Geographic Distribution */}
        {safeMetrics.topLocations && safeMetrics.topLocations.length > 0 && (
          <Card className="bg-[#111111] border-[#222222]">
            <CardHeader className="py-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>Geographic Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {safeMetrics.topLocations.map((location, index) => (
                  <div key={location.country || index} className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{index + 1}.</span>
                      <span className="text-white">{location.country}</span>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-right">
                        <div className="text-gray-400 text-xs">Orders</div>
                        <div className="text-white">{location.count}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-400 text-xs">Revenue</div>
                        <div className="text-white">${location.revenue.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Order Status and Top Products - Two Column Layout */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Order Status */}
        {formattedOrderStatuses.length > 0 && (
          <Card className="bg-[#111111] border-[#222222]">
            <CardHeader className="py-2">
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Order Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedOrderStatuses}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {formattedOrderStatuses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#222', border: 'none' }}
                    formatter={(value: any, name: any, props: any) => [
                      `${value} orders (${(props.payload.percentage).toFixed(1)}%)`,
                      props.payload.status
                    ]}
                  />
                  <Legend 
                    formatter={(value) => <span style={{ color: '#ccc' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Products */}
        {safeMetrics.topProducts && safeMetrics.topProducts.length > 0 && (
          <Card className="bg-[#111111] border-[#222222]">
            <CardHeader className="py-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Top Products</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {safeMetrics.topProducts.map((product, index) => (
                  <div key={product.id || index} className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{index + 1}.</span>
                      <span className="text-white">{product.name}</span>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-right">
                        <div className="text-gray-400 text-xs">Units</div>
                        <div className="text-white">{product.quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-400 text-xs">Revenue</div>
                        <div className="text-white">${product.revenue.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 