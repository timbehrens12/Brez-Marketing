"use client"

import React, { useState, useEffect } from 'react'
import { MetricCard } from "@/components/metrics/MetricCard"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, ShoppingBag, Users, DollarSign, TrendingUp, Package, RefreshCcw, BarChart2, PercentIcon, UserCheck, MousePointerClick, Clock, Globe, CreditCard, ShoppingCart } from "lucide-react"
import { PlatformConnection } from "@/types/platformConnection"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { calculateMetrics } from "@/utils/metrics"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from '@/components/ui/skeleton'
import type { DateRange } from "react-day-picker"

// Import chart components from recharts
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

interface ShopifyTabProps {
  connection: PlatformConnection
}

// Define SafeMetrics interface
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
  unitsGrowth: 0;
  conversionRateGrowth: number;
  customerSegments: {
    newCustomers: number;
    returningCustomers: number;
  };
  topProducts: any[];
  dailyData: any[];
  topLocations: any[];
  orderTimeline: any[];
  orderStatuses: any[];
  averageItemsPerOrder: number;
}

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const ShopifyTab: React.FC<ShopifyTabProps> = ({ connection }) => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  })
  const [metrics, setMetrics] = useState<SafeMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true)
      try {
        const from = dateRange.from.toISOString().split('T')[0]
        const to = dateRange.to.toISOString().split('T')[0]
        
        const response = await fetch(
          `/api/shopify/metrics?connectionId=${connection.id}&from=${from}&to=${to}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch metrics')
        }
        
        const data = await response.json()
        setMetrics(data)
      } catch (error) {
        console.error('Error fetching metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [connection.id, dateRange])

  const safeMetrics: SafeMetrics = metrics || {
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
    customerSegments: {
      newCustomers: 0,
      returningCustomers: 0
    },
    topProducts: [],
    dailyData: [],
    topLocations: [],
    orderTimeline: [],
    orderStatuses: [],
    averageItemsPerOrder: 0
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

  // Handle date range change
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Shopify Dashboard</h2>
        <DateRangePicker
          value={{
            from: dateRange.from,
            to: dateRange.to
          }}
          onChange={handleDateRangeChange}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(8)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
            ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <img
                    src="/shopify-icon.png"
                    alt="Shopify"
                    width={20}
                    height={20}
                    className="mr-1"
                  />
                  <span>Total Sales</span>
                </div>
              }
              value={safeMetrics.totalSales}
              prefix="$"
              valueFormat="currency"
              change={safeMetrics.salesGrowth}
              data={safeMetrics.dailyData}
              platform="shopify"
            />
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <img
                    src="/shopify-icon.png"
                    alt="Shopify"
                    width={20}
                    height={20}
                    className="mr-1"
                  />
                  <span>Orders</span>
                </div>
              }
              value={safeMetrics.ordersPlaced}
              valueFormat="number"
              change={safeMetrics.ordersGrowth}
              data={safeMetrics.dailyData.map(d => ({ ...d, value: d.orders }))}
              platform="shopify"
            />
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <img
                    src="/shopify-icon.png"
                    alt="Shopify"
                    width={20}
                    height={20}
                    className="mr-1"
                  />
                  <span>Average Order Value</span>
                </div>
              }
              value={safeMetrics.averageOrderValue}
              prefix="$"
              valueFormat="currency"
              change={safeMetrics.aovGrowth}
              data={safeMetrics.dailyData.map(d => ({ 
                ...d, 
                value: d.orders > 0 ? d.revenue / d.orders : 0 
              }))}
              platform="shopify"
            />
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <img
                    src="/shopify-icon.png"
                    alt="Shopify"
                    width={20}
                    height={20}
                    className="mr-1"
                  />
                  <span>Units Sold</span>
                </div>
              }
              value={safeMetrics.unitsSold}
              valueFormat="number"
              change={safeMetrics.unitsGrowth}
              data={safeMetrics.dailyData.map(d => ({ ...d, value: d.orders }))}
              platform="shopify"
            />
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <img
                    src="/shopify-icon.png"
                    alt="Shopify"
                    width={20}
                    height={20}
                    className="mr-1"
                  />
                  <span>Sessions</span>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-gray-400 cursor-help">
                          (estimated)
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Estimated based on industry averages</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
              }
              value={safeMetrics.sessions}
              valueFormat="number"
              change={0}
              data={safeMetrics.dailyData}
              platform="shopify"
            />
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <img
                    src="/shopify-icon.png"
                    alt="Shopify"
                    width={20}
                    height={20}
                    className="mr-1"
                  />
                  <span>Conversion Rate</span>
                </div>
              }
              value={safeMetrics.conversionRate}
              suffix="%"
              valueFormat="percentage"
              change={safeMetrics.conversionRateGrowth}
              data={safeMetrics.dailyData}
              platform="shopify"
            />
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <img
                    src="/shopify-icon.png"
                    alt="Shopify"
                    width={20}
                    height={20}
                    className="mr-1"
                  />
                  <span>New Customers</span>
                </div>
              }
              value={safeMetrics.customerSegments.newCustomers}
              valueFormat="number"
              change={0}
              data={safeMetrics.dailyData}
              platform="shopify"
            />
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <img
                    src="/shopify-icon.png"
                    alt="Shopify"
                    width={20}
                    height={20}
                    className="mr-1"
                  />
                  <span>Items Per Order</span>
                </div>
              }
              value={safeMetrics.averageItemsPerOrder}
              valueFormat="number"
              change={0}
              data={safeMetrics.dailyData}
              platform="shopify"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-[#111111] border-[#222222]">
              <CardHeader className="py-2">
                <CardTitle className="text-white">Revenue Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={safeMetrics.revenueByDay}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                  >
                    <XAxis 
                      dataKey="day" 
                      tick={{ fill: '#888' }} 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fill: '#888' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#222', border: 'none' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: any) => [`$${value.toFixed(2)}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#5fc768" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
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
                        <span className="text-white">{product.title}</span>
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-[#111111] border-[#222222]">
              <CardHeader className="py-2">
                <CardTitle className="text-white">Customer Segments</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: 'New Customers',
                          value: safeMetrics.customerSegments.newCustomers
                        },
                        {
                          name: 'Returning Customers',
                          value: safeMetrics.customerSegments.returningCustomers
                        }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell key="cell-0" fill={COLORS[0]} />
                      <Cell key="cell-1" fill={COLORS[1]} />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#222', border: 'none' }}
                      formatter={(value: any, name: any) => [
                        `${value} customers`,
                        name
                      ]}
                    />
                    <Legend 
                      formatter={(value) => <span style={{ color: '#ccc' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="bg-[#111111] border-[#222222]">
              <CardHeader className="py-2">
                <CardTitle className="text-white">Order Timeline</CardTitle>
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-[#111111] border-[#222222]">
              <CardHeader className="py-2">
                <CardTitle className="text-white">Geographic Distribution</CardTitle>
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
            <Card className="bg-[#111111] border-[#222222]">
              <CardHeader className="py-2">
                <CardTitle className="text-white">Order Status</CardTitle>
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
                      label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
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
          </div>
        </>
      )}
    </div>
  )
} 