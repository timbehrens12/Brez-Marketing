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
import { addDays, differenceInDays, subDays, startOfDay, endOfDay, isSameDay, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { useState, useEffect, useRef, useCallback } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { calculateMetrics } from "@/utils/metrics"
import Image from "next/image"
import { SalesByProduct } from "@/components/dashboard/SalesByProduct"
import { format } from "date-fns"
// Advanced Shopify widgets removed - will be re-implemented later

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
  // Previous period values for comparison
  previousTotalSales?: number
  previousOrdersPlaced?: number
  previousAverageOrderValue?: number
  previousUnitsSold?: number
  previousConversionRate?: number
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
  // State for previous period data
  const [previousMetrics, setPreviousMetrics] = useState<Partial<Metrics>>({});
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastDateRange, setLastDateRange] = useState<string>('');

  if (!connection) return <div>No Shopify connection found</div>
  if (initialDataLoad) return <div className="flex items-center justify-center p-6"><Activity className="h-8 w-8 animate-spin text-gray-400 mr-2" /> Loading metrics...</div>

  // Helper function to convert Date to ISO date string
  const toLocalISODateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Calculate previous period dates (copied from MetaTab2)
  const getPreviousPeriodDates = (from: Date, to: Date): { prevFrom: string, prevTo: string } => {
    const fromNormalized = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toNormalized = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    
    // console.log(`[ShopifyTab] Calculating previous dates for range: ${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`);
    
    // Single day comparison
    const isSingleDay = isSameDay(fromNormalized, toNormalized);
    if (isSingleDay) {
      const prevDay = new Date(fromNormalized);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = toLocalISODateString(prevDay);
      
      // console.log(`[ShopifyTab] Single day detected, comparing to previous day: ${prevDayStr}`);
      
      return {
        prevFrom: prevDayStr,
        prevTo: prevDayStr
      };
    }
    
    // Check for preset patterns
    const rangeDays = Math.round((toNormalized.getTime() - fromNormalized.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    // Last 7 days preset
    const isLast7Days = rangeDays === 7 && isSameDay(toNormalized, yesterday);
    if (isLast7Days) {
      const prevFrom = new Date(fromNormalized);
      prevFrom.setDate(prevFrom.getDate() - 7);
      
      const prevTo = new Date(toNormalized);
      prevTo.setDate(prevTo.getDate() - 7);
      
      return {
        prevFrom: toLocalISODateString(prevFrom),
        prevTo: toLocalISODateString(prevTo)
      };
    }
    
    // Last 30 days preset
    const isLast30Days = rangeDays === 30 && isSameDay(toNormalized, yesterday);
    if (isLast30Days) {
      const prevFrom = new Date(fromNormalized);
      prevFrom.setDate(prevFrom.getDate() - 30);
      
      const prevTo = new Date(toNormalized);
      prevTo.setDate(prevTo.getDate() - 30);
      
      return {
        prevFrom: toLocalISODateString(prevFrom),
        prevTo: toLocalISODateString(prevTo)
      };
    }
    
    // This month preset
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    if (isSameDay(fromNormalized, startOfCurrentMonth)) {
      const daysInCurrentPeriod = Math.round((toNormalized.getTime() - fromNormalized.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const prevMonthStart = startOfMonth(subMonths(now, 1));
      const prevMonthEnd = new Date(prevMonthStart);
      prevMonthEnd.setDate(prevMonthStart.getDate() + daysInCurrentPeriod - 1);
      
      return {
        prevFrom: toLocalISODateString(prevMonthStart),
        prevTo: toLocalISODateString(prevMonthEnd)
      };
    }
    
    // Default: equivalent previous period
    const currentRange = toNormalized.getTime() - fromNormalized.getTime();
    const daysInRange = Math.ceil(currentRange / (1000 * 60 * 60 * 24)) + 1;
    
    const prevFrom = new Date(fromNormalized);
    prevFrom.setDate(prevFrom.getDate() - daysInRange);
    
    const prevTo = new Date(toNormalized);
    prevTo.setDate(prevTo.getDate() - daysInRange);
    
    return {
      prevFrom: toLocalISODateString(prevFrom),
      prevTo: toLocalISODateString(prevTo)
    };
  };

  // Calculate percentage change
  const calculatePercentChange = (current: number, previous: number): number | null => {
    if (previous === 0) {
      return null;
    }
    if (current === previous) {
      return 0;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  };



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
    }),
    // Previous period values for percentage comparisons using fetched data
    previousTotalSales: previousMetrics.totalSales || 0,
    previousOrdersPlaced: previousMetrics.ordersPlaced || 0,
    previousAverageOrderValue: previousMetrics.averageOrderValue || 0,
    previousUnitsSold: previousMetrics.unitsSold || 0,
    previousConversionRate: previousMetrics.conversionRate || 0
  }

  // Add a ref to track when we last dispatched a refresh event
  const lastRefreshRef = useRef<number>(0);
  const isInitialMountRef = useRef<boolean>(true);

  // Single coordinated data fetching function
  const fetchDataForDateRange = useCallback(async (from: Date, to: Date, reason: string = 'date-change') => {
    const currentDateRangeKey = `${format(from, 'yyyy-MM-dd')}-${format(to, 'yyyy-MM-dd')}`;
    
    // Prevent duplicate fetches for the same date range
    if (currentDateRangeKey === lastDateRange && !reason.includes('force')) {
      return;
    }

    setIsTransitioning(true);
    setLastDateRange(currentDateRangeKey);

    try {
      // Clear previous metrics immediately to prevent showing stale data
      setPreviousMetrics({});
      
      // Fetch both current and previous period data in parallel
      const [currentDataPromise, previousDataPromise] = await Promise.allSettled([
        // Current period data
        fetch(`/api/metrics?brandId=${brandId}&from=${format(from, 'yyyy-MM-dd')}&to=${format(to, 'yyyy-MM-dd')}&platform=shopify&force=true&bypass_cache=true&t=${Date.now()}`),
        // Previous period data
        (async () => {
          const { prevFrom, prevTo } = getPreviousPeriodDates(from, to);
          return fetch(`/api/metrics?brandId=${brandId}&from=${prevFrom}&to=${prevTo}&platform=shopify&force=true&bypass_cache=true&t=${Date.now()}`);
        })()
      ]);

      // Handle previous period data
      if (previousDataPromise.status === 'fulfilled' && previousDataPromise.value.ok) {
        const prevData = await previousDataPromise.value.json();
        setPreviousMetrics(prevData);
      }

      // Dispatch refresh event for current data
      window.dispatchEvent(new CustomEvent('force-shopify-refresh', { 
        detail: { 
          brandId, 
          timestamp: Date.now(),
          dateRange: {
            from: format(from, 'yyyy-MM-dd'),
            to: format(to, 'yyyy-MM-dd')
          },
          forceFetch: true,
          bypassCache: true,
          reason
        }
      }));

    } catch (error) {
      console.error('[ShopifyTab] Error fetching data:', error);
    } finally {
      // Small delay to prevent jarring transitions
      setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
    }
  }, [brandId, lastDateRange, getPreviousPeriodDates]);

  // Main effect for date range changes
  useEffect(() => {
    if (brandId && dateRange?.from && dateRange?.to) {
      fetchDataForDateRange(dateRange.from, dateRange.to, 'date-range-change');
    }
  }, [brandId, dateRange, fetchDataForDateRange]);

  // Initialize component
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
    }
  }, []);

  // Simplified empty metrics check
  useEffect(() => {
    if (!isTransitioning && !isLoading && !isRefreshingData && 
        metrics && metrics.totalSales === 0 && 
        dateRange?.from && dateRange?.to) {
      // Only retry if we haven't just transitioned and the data seems genuinely empty
      const timer = setTimeout(() => {
        fetchDataForDateRange(dateRange.from, dateRange.to, 'force-empty-retry');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [metrics, isTransitioning, isLoading, isRefreshingData, dateRange, fetchDataForDateRange]);



  return (
    <div className="space-y-4">
      {/* Subtle Page Indicator - Green line for Shopify */}
      <div className="mb-4">
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-500/30 to-transparent rounded-full"></div>
        {isTransitioning && (
          <div className="mt-2 flex items-center justify-center text-xs text-gray-400">
            <Activity className="h-3 w-3 animate-spin mr-2" />
            Updating data for new date range...
          </div>
        )}
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-800 p-2 text-xs text-gray-300 rounded mb-4">
          <div>Date Range: {dateRange.from.toDateString()} to {dateRange.to.toDateString()}</div>
          <div>Revenue Data Points: {safeMetrics.revenueByDay.length}</div>
        </div>
      )}

      {/* Key Metrics - 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Total Sales */}
        <MetricCard
          title="Total Sales"
          value={safeMetrics.totalSales || 0}
          change={calculatePercentChange(safeMetrics.totalSales || 0, safeMetrics.previousTotalSales || 0)}
          previousValue={safeMetrics.previousTotalSales || 0}
          prefix="$"
          valueFormat="currency"
          decimals={2}
          hideGraph={false}
          showPreviousPeriod={true}
          previousValueFormat="currency"
          previousValueDecimals={2}
          previousValuePrefix="$"
          infoTooltip="Total revenue from all orders in the selected period"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={safeMetrics.salesData || []}
          loading={isLoading || isLoadingPrevious || isTransitioning}
          refreshing={isRefreshingData || isTransitioning}
          platform="shopify"
          dateRange={dateRange}
          brandId={brandId}
          className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
        />

        {/* Orders */}
        <MetricCard
          title="Orders"
          value={safeMetrics.ordersPlaced || 0}
          change={calculatePercentChange(safeMetrics.ordersPlaced || 0, safeMetrics.previousOrdersPlaced || 0)}
          previousValue={safeMetrics.previousOrdersPlaced || 0}
          valueFormat="number"
          decimals={0}
          hideGraph={false}
          showPreviousPeriod={true}
          previousValueFormat="number"
          previousValueDecimals={0}
          infoTooltip="Total number of orders placed in the selected period"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={safeMetrics.ordersData || []}
          loading={isLoading || isLoadingPrevious || isTransitioning}
          refreshing={isRefreshingData || isTransitioning}
          platform="shopify"
          dateRange={dateRange}
          brandId={brandId}
          className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
        />

        {/* Average Order Value */}
        <MetricCard
          title="Average Order Value"
          value={safeMetrics.averageOrderValue || 0}
          change={calculatePercentChange(safeMetrics.averageOrderValue || 0, safeMetrics.previousAverageOrderValue || 0)}
          previousValue={safeMetrics.previousAverageOrderValue || 0}
          prefix="$"
          valueFormat="currency"
          decimals={2}
          hideGraph={false}
          showPreviousPeriod={true}
          previousValueFormat="currency"
          previousValueDecimals={2}
          previousValuePrefix="$"
          infoTooltip="Average value of orders in the selected period"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={safeMetrics.aovData || []}
          loading={isLoading || isLoadingPrevious || isTransitioning}
          refreshing={isRefreshingData || isTransitioning}
          platform="shopify"
          dateRange={dateRange}
          brandId={brandId}
          className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
        />

        {/* Units Sold */}
        <MetricCard
          title="Units Sold"
          value={safeMetrics.unitsSold || 0}
          change={calculatePercentChange(safeMetrics.unitsSold || 0, safeMetrics.previousUnitsSold || 0)}
          previousValue={safeMetrics.previousUnitsSold || 0}
          valueFormat="number"
          decimals={0}
          hideGraph={false}
          showPreviousPeriod={true}
          previousValueFormat="number"
          previousValueDecimals={0}
          infoTooltip="Total number of units sold in the selected period"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          data={safeMetrics.unitsSoldData || []}
          loading={isLoading || isLoadingPrevious || isTransitioning}
          refreshing={isRefreshingData || isTransitioning}
          platform="shopify"
          dateRange={dateRange}
          brandId={brandId}
          className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
        />
      </div>

      {/* Product Performance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Sales by Product Widget */}
        <div className="lg:col-span-2">
          <SalesByProduct 
            brandId={brandId}
            dateRange={dateRange}
            isRefreshing={isRefreshingData}
          />
        </div>
      </div>

      {/* Inventory Summary Section */}
      <div className="mt-6">
        <InventorySummary 
          brandId={brandId}
          isLoading={isLoading}
          isRefreshingData={isRefreshingData}
        />
      </div>

      {/* Enhanced Analytics Section */}
      <div className="mt-6 space-y-6">
        {/* Advanced Shopify analytics widgets will be re-implemented later */}
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Advanced analytics widgets will be available soon</p>
        </div>
      </div>
    </div>
  )
} 