"use client"

import { MetricCard } from "@/components/metrics/MetricCard"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { InventorySummary } from "@/components/dashboard/InventorySummary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { Metrics, CustomerSegments, DailyData, Product } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { Activity, ShoppingBag, Users, DollarSign, TrendingUp, Package, RefreshCcw, BarChart2, PercentIcon, UserCheck, ShoppingCart } from "lucide-react"
import { PlatformConnection } from "@/types/platformConnection"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { calculateMetrics } from "@/utils/metrics"
import Image from "next/image"
import { SalesByProduct } from "@/components/dashboard/SalesByProduct"

interface ShopifyTabProps {
  connection: PlatformConnection
  dateRange: { from: Date; to: Date }
  brandId: string
  metrics: Metrics
  isLoading: boolean
  isRefreshingData?: boolean
  initialDataLoad?: boolean
}

interface SafeMetrics extends Omit<Metrics, 'revenueByDay' | 'topProducts' | 'customerSegments' | 'dailyData'> {
  revenueByDay: Array<{ date: string; revenue: number }>
  topProducts: Array<Product>
  customerSegments: CustomerSegments
  dailyData: Array<DailyData>
  salesData?: Array<{ date: string; value: number }>
  ordersData?: Array<{ date: string; value: number }>
  aovData?: Array<{ date: string; value: number }>
  unitsSoldData?: Array<{ date: string; value: number }>
}

export function ShopifyTab({ 
  connection, 
  dateRange, 
  brandId,
  metrics,
  isLoading,
  isRefreshingData = false,
  initialDataLoad = false
}: ShopifyTabProps) {
  if (!connection) return <div>No Shopify connection found</div>
  if (initialDataLoad) return <div className="flex items-center justify-center p-6"><Activity className="h-8 w-8 animate-spin text-blue-500 mr-2" /> Loading metrics...</div>

  const safeMetrics: SafeMetrics = {
    ...metrics,
    revenueByDay: (metrics.revenueByDay || []).map(d => {
      // Ensure we have a proper date string in ISO format
      let dateStr = d.date;
      if (typeof dateStr === 'object' && dateStr !== null) {
        // If it's a Date object, convert to ISO string
        try {
          dateStr = (dateStr as Date).toISOString();
        } catch (error) {
          console.error('Error converting date object to ISO string:', error);
          dateStr = new Date().toISOString(); // Fallback to current date
        }
      } else if (typeof dateStr !== 'string') {
        // If it's neither a string nor a Date, use current date
        dateStr = new Date().toISOString();
      } else {
        // Validate the string date
        try {
          const testDate = new Date(dateStr);
          if (isNaN(testDate.getTime())) {
            console.error('Invalid date string:', dateStr);
            dateStr = new Date().toISOString(); // Fallback to current date
          }
        } catch (error) {
          console.error('Error validating date string:', error);
          dateStr = new Date().toISOString(); // Fallback to current date
        }
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
    salesData: (metrics.salesData || []).filter(item => {
      if (!item.date) {
        console.error('Missing date in sales data item');
        return false;
      }
      
      try {
        // Validate the date
        const date = new Date(item.date);
        if (isNaN(date.getTime())) {
          console.error('Invalid date in sales data:', item.date);
          return false;
        }
        
        // Update the date property to ensure it's a valid ISO string
        item.date = date.toISOString();
        return true;
      } catch (error) {
        console.error('Invalid date in sales data:', item.date);
        return false;
      }
    }),
    ordersData: (metrics.ordersData || []).filter(item => {
      if (!item.date) {
        console.error('Missing date in orders data item');
        return false;
      }
      
      try {
        // Validate the date
        const date = new Date(item.date);
        if (isNaN(date.getTime())) {
          console.error('Invalid date in orders data:', item.date);
          return false;
        }
        
        // Update the date property to ensure it's a valid ISO string
        item.date = date.toISOString();
        return true;
      } catch (error) {
        console.error('Invalid date in orders data:', item.date);
        return false;
      }
    }),
    aovData: (metrics.aovData || []).filter(item => {
      if (!item.date) {
        console.error('Missing date in AOV data item');
        return false;
      }
      
      try {
        // Validate the date
        const date = new Date(item.date);
        if (isNaN(date.getTime())) {
          console.error('Invalid date in AOV data:', item.date);
          return false;
        }
        
        // Update the date property to ensure it's a valid ISO string
        item.date = date.toISOString();
        return true;
      } catch (error) {
        console.error('Invalid date in AOV data:', item.date);
        return false;
      }
    }),
    unitsSoldData: (metrics.unitsSoldData || []).filter(item => {
      if (!item.date) {
        console.error('Missing date in units sold data item');
        return false;
      }
      
      try {
        // Validate the date
        const date = new Date(item.date);
        if (isNaN(date.getTime())) {
          console.error('Invalid date in units sold data:', item.date);
          return false;
        }
        
        // Update the date property to ensure it's a valid ISO string
        item.date = date.toISOString();
        return true;
      } catch (error) {
        console.error('Invalid date in units sold data:', item.date);
        return false;
      }
    })
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
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Sales Summary</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
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
            data={safeMetrics.salesData || []}
            loading={isLoading}
            refreshing={isRefreshingData}
            platform="shopify"
            dateRange={dateRange}
            infoTooltip="Total revenue from all orders in the selected period"
            brandId={brandId}
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
                <ShoppingCart className="h-4 w-4" />
              </div>
            }
            value={safeMetrics.ordersPlaced || 0}
            change={safeMetrics.ordersGrowth || 0}
            data={safeMetrics.ordersData || []}
            loading={isLoading}
            refreshing={isRefreshingData}
            platform="shopify"
            dateRange={dateRange}
            infoTooltip="Total number of orders placed in the selected period"
            brandId={brandId}
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
                <span>Average Order</span>
                <TrendingUp className="h-4 w-4" />
              </div>
            }
            value={safeMetrics.averageOrderValue || 0}
            change={safeMetrics.aovGrowth || 0}
            prefix="$"
            valueFormat="currency"
            data={safeMetrics.aovData || []}
            loading={isLoading}
            refreshing={isRefreshingData}
            platform="shopify"
            dateRange={dateRange}
            infoTooltip="Average value of orders in the selected period"
            brandId={brandId}
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
            data={safeMetrics.unitsSoldData || []}
            loading={isLoading}
            refreshing={isRefreshingData}
            platform="shopify"
            dateRange={dateRange}
            infoTooltip="Total number of units sold in the selected period"
            brandId={brandId}
          />
        </div>
        
        {/* Sales by Product Widget - Full Width */}
        <div className="w-full">
          <SalesByProduct 
            brandId={brandId}
            dateRange={dateRange}
            isRefreshing={isRefreshingData}
          />
        </div>
      </div>

      {/* Inventory Summary Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Inventory Summary</h3>
        </div>
        <InventorySummary 
          brandId={brandId}
          isLoading={isLoading}
          isRefreshingData={isRefreshingData}
        />
      </div>
    </div>
  )
} 