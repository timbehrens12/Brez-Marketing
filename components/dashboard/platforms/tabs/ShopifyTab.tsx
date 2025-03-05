"use client"

import { MetricCard } from "@/components/metrics/MetricCard"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import type { Metrics, CustomerSegments, DailyData, Product } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { 
  Activity, ShoppingBag, Users, DollarSign, TrendingUp, Package, 
  PercentIcon, UserCheck, MousePointerClick, Truck, CreditCard, 
  Tag, BarChart3, HeartHandshake, Boxes
} from "lucide-react"
import { PlatformConnection } from "@/types/platformConnection"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { calculateMetrics } from "@/utils/metrics"
import Image from "next/image"

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
  customerLifetimeValue?: number
  totalInventory?: number
  fulfillmentRate?: number
  paymentSuccessRate?: number
  discountUsageRate?: number
  productCategories?: Array<{ name: string; count: number }>
}

// Colors for pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

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
    customerLifetimeValue: metrics.customerLifetimeValue || 0,
    totalInventory: metrics.totalInventory || 0,
    fulfillmentRate: metrics.fulfillmentRate || 0,
    paymentSuccessRate: metrics.paymentSuccessRate || 0,
    discountUsageRate: metrics.discountUsageRate || 0,
    productCategories: metrics.productCategories || []
  }

  // Prepare data for product categories pie chart
  const productCategoriesData = safeMetrics.productCategories?.slice(0, 8).map(category => ({
    name: category.name,
    value: category.count
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
      
      {/* Platform Indicator */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative flex items-center justify-center w-16 h-16 bg-[#111111] rounded-full border-2 border-[#95BF47] shadow-[0_0_15px_rgba(149,191,71,0.5)]">
          <Image 
            src="https://i.imgur.com/cnCcupx.png" 
            alt="Shopify" 
            width={40} 
            height={40} 
            className="object-contain"
          />
          <div className="absolute inset-0 rounded-full border-2 border-[#95BF47] animate-pulse"></div>
        </div>
      </div>
      
      {/* Key Metrics Row */}
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
              <span>Total Sales</span>
              <DollarSign className="h-4 w-4" />
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
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Orders</span>
              <ShoppingBag className="h-4 w-4" />
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
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Average Order Value</span>
              <TrendingUp className="h-4 w-4" />
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
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Units Sold</span>
              <Package className="h-4 w-4" />
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

      {/* Customer Metrics Row */}
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
              <span>New Customers</span>
              <Users className="h-4 w-4" />
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
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Returning Customers</span>
              <UserCheck className="h-4 w-4" />
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
              <span>Customer Lifetime Value</span>
              <HeartHandshake className="h-4 w-4" />
            </div>
          }
          value={safeMetrics.customerLifetimeValue || 0}
          change={0}
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
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Total Inventory</span>
              <Boxes className="h-4 w-4" />
            </div>
          }
          value={safeMetrics.totalInventory || 0}
          change={0}
          valueFormat="number"
          data={safeMetrics.dailyData}
          loading={isLoading}
          refreshing={isRefreshingData}
          platform="shopify"
        />
      </div>

      {/* Performance Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <span>Fulfillment Rate</span>
              <Truck className="h-4 w-4" />
            </div>
          }
          value={safeMetrics.fulfillmentRate || 0}
          change={0}
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
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Payment Success Rate</span>
              <CreditCard className="h-4 w-4" />
            </div>
          }
          value={safeMetrics.paymentSuccessRate || 0}
          change={0}
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
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Discount Usage Rate</span>
              <Tag className="h-4 w-4" />
            </div>
          }
          value={safeMetrics.discountUsageRate || 0}
          change={0}
          suffix="%"
          valueFormat="percentage"
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

      {/* Two Column Layout for Top Products and Product Categories */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Products */}
        {safeMetrics.topProducts && safeMetrics.topProducts.length > 0 && (
          <Card className="bg-[#111111] border-[#222222]">
            <CardHeader className="py-2">
              <CardTitle className="text-white">Top Products</CardTitle>
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

        {/* Product Categories */}
        {productCategoriesData && productCategoriesData.length > 0 && (
          <Card className="bg-[#111111] border-[#222222]">
            <CardHeader className="py-2">
              <CardTitle className="text-white">Product Categories</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productCategoriesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {productCategoriesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} products`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 w-full">
                {productCategoriesData.map((category, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-xs text-gray-300 truncate">{category.name}</span>
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