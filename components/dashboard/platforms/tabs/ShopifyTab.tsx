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
import { CartAbandonmentWidget } from "@/components/dashboard/shopify/CartAbandonmentWidget"
import { CustomerSegmentationWidget } from "@/components/dashboard/shopify/CustomerSegmentationWidget"
import { ProductPerformanceWidget } from "@/components/dashboard/shopify/ProductPerformanceWidget"
import { DiscountPerformanceWidget } from "@/components/dashboard/shopify/DiscountPerformanceWidget"
import { MarginAnalysisWidget } from "@/components/dashboard/shopify/MarginAnalysisWidget"

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
    
    console.log(`[ShopifyTab] Calculating previous dates for range: ${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`);
    
    // Single day comparison
    const isSingleDay = isSameDay(fromNormalized, toNormalized);
    if (isSingleDay) {
      const prevDay = new Date(fromNormalized);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = toLocalISODateString(prevDay);
      
      console.log(`[ShopifyTab] Single day detected, comparing to previous day: ${prevDayStr}`);
      
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

  // Fetch previous period data
  const fetchPreviousMetrics = useCallback(async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      return;
    }

    setIsLoadingPrevious(true);
    try {
      const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);
      
      const response = await fetch(`/api/metrics?brandId=${brandId}&from=${prevFrom}&to=${prevTo}&platform=shopify&force=true&bypass_cache=true&t=${Date.now()}`);
      
      if (response.ok) {
        const prevData = await response.json();
        setPreviousMetrics(prevData);
        console.log('[ShopifyTab] Fetched previous period metrics:', prevData);
      }
    } catch (error) {
      console.error('[ShopifyTab] Error fetching previous metrics:', error);
    } finally {
      setIsLoadingPrevious(false);
    }
  }, [brandId, dateRange]);

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

  // Fetch previous period data when date range changes
  useEffect(() => {
    if (brandId && dateRange?.from && dateRange?.to) {
      console.log('[ShopifyTab] Date range changed, fetching previous period metrics');
      fetchPreviousMetrics();
    }
  }, [brandId, dateRange, fetchPreviousMetrics]);

  // Add a function to safely dispatch refresh events with debouncing
  const safeDispatchRefresh = useCallback((reason: string) => {
    const now = Date.now();
    // Debounce to prevent multiple refreshes within 2 seconds
    if (now - lastRefreshRef.current > 2000) {
      lastRefreshRef.current = now;
      console.log(`[ShopifyTab] Dispatching force-shopify-refresh event (reason: ${reason})`);
      
      // Always use the exact date range from props
      const fromDate = dateRange.from;
      const toDate = dateRange.to;
      
      window.dispatchEvent(new CustomEvent('force-shopify-refresh', { 
        detail: { 
          brandId, 
          timestamp: now,
          dateRange: {
            from: format(fromDate, 'yyyy-MM-dd'),
            to: format(toDate, 'yyyy-MM-dd')
          },
          forceFetch: true,
          bypassCache: true,
          reason
        }
      }));
    } else {
      console.log(`[ShopifyTab] Skipped duplicate refresh (debounced) - reason: ${reason}`);
    }
  }, [brandId, dateRange]);

  // Replace the Last 30 days preset useEffect
  useEffect(() => {
    // Only run this on non-initial render to avoid double-refresh with tab activation
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return; // Skip on initial mount since tab activation will handle it
    }
    
    // Check if this is a 30-day preset by looking at the date range
    /*const daysDiff = differenceInDays(dateRange.to, dateRange.from);
    const isLast30Days = daysDiff >= 25 && daysDiff <= 35;
    
    if (isLast30Days) {
      console.log('[ShopifyTab] Detected Last 30 days preset');
      // Use a shorter timeout and the safe dispatch function
      const refreshTimeout = setTimeout(() => {
        safeDispatchRefresh('date-range-is-30-days');
      }, 300);
      
      return () => clearTimeout(refreshTimeout);
    }*/

  }, [dateRange, safeDispatchRefresh])

  // Add a useEffect hook to listen for tab visibility changes
  useEffect(() => {
    // const handleTabVisibility = (event?: Event) => {
    //   if (document.visibilityState === 'visible') {
    //     console.log('[ShopifyTab] Tab became visible, refreshing data');
    //     // Refresh data when tab becomes visible, with debouncing
    //     safeDispatchRefresh('tab-became-visible');
    //   }
    // };
    // 
    // // Add event listener for visibility change
    // document.addEventListener('visibilitychange', handleTabVisibility);
    // 
    // // Cleanup function to remove event listener
    // return () => {
    //   document.removeEventListener('visibilitychange', handleTabVisibility);
    // };
  }, [safeDispatchRefresh]); // Re-run if safeDispatchRefresh changes (e.g. brandId, dateRange)

  // Add check for empty metrics and force refresh if needed
  useEffect(() => {
    // Check if metrics data is empty when it shouldn't be
    const isEmpty = !metrics || 
                    metrics.totalSales === 0 || 
                    (metrics.revenueByDay && metrics.revenueByDay.length === 0);
    
    if (isEmpty && connection && !isLoading && !isRefreshingData) {
      console.log('[ShopifyTab] Detected empty metrics - triggering DIRECT API call to fetch metrics');
      
      // Always use the exact date range from props - don't override with Last 30 Days
      const fromDate = dateRange.from;
      const toDate = dateRange.to;
      
      // Format dates as yyyy-MM-dd
      const formattedFromDate = format(fromDate, 'yyyy-MM-dd');
      const formattedToDate = format(toDate, 'yyyy-MM-dd');
      
      const fetchUrl = `/api/metrics?brandId=${brandId}&from=${formattedFromDate}&to=${formattedToDate}&platform=shopify&force=true&bypass_cache=true&t=${Date.now()}`;
      
      console.log('[ShopifyTab] Fetching metrics directly from:', fetchUrl);
      
      fetch(fetchUrl)
        .then(res => {
          if (!res.ok) {
            throw new Error(`API call failed with status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('[ShopifyTab] Direct metrics API call succeeded:', data);
          
          // Force UI refresh
          window.dispatchEvent(new Event('refresh-metrics'));
          
          // Don't reload the page as it might disrupt user experience
          // Instead, manually update the DOM if possible
          setTimeout(() => {
            try {
              // If the metrics still aren't showing, try to update the summary cards directly
              if (!document.querySelector('[data-testid="total-sales-value"]')?.textContent) {
                console.log('[ShopifyTab] Attempting to directly modify DOM to show metrics');
                
                // Use the data we just fetched to update the cards
                const cards = document.querySelectorAll('.metric-card');
                if (cards && cards.length > 0) {
                  // Try to update the total sales card
                  const salesCard = Array.from(cards).find(el => 
                    el.textContent?.includes('Total Sales'));
                  if (salesCard) {
                    const valueEl = salesCard.querySelector('.value');
                    if (valueEl && data.totalSales) {
                      valueEl.textContent = `$${data.totalSales.toFixed(2)}`;
                      console.log('[ShopifyTab] Updated Total Sales card with value:', data.totalSales);
                    }
                  }
                  
                  // Repeat for other cards...
                }
              }
            } catch (domError) {
              console.error('[ShopifyTab] Error updating DOM directly:', domError);
              // If all else fails, reload the page
              window.location.reload();
            }
          }, 2000);
        })
        .catch(err => {
          console.error('[ShopifyTab] Direct metrics API call failed:', err);
          
          // Try to fetch metrics from a backup source - directly from Supabase
          console.log('[ShopifyTab] Attempting to calculate metrics from backup data source');
          try {
            // Listen for events from SalesByProduct component which has data
            const handleSalesByProductData = (event: any) => {
              if (event.detail && event.detail.orders && event.detail.orders.length > 0) {
                console.log('[ShopifyTab] Received backup data from SalesByProduct', event.detail);
                
                // Calculate metrics directly
                const orders = event.detail.orders;
                const totalSales = orders.reduce((sum: number, order: any) => 
                  sum + parseFloat(order.total_price || 0), 0);
                
                // Force update UI
                document.querySelector('.total-sales-value')?.setAttribute('data-value', totalSales.toString());
              }
            };
            
            // Trigger a custom event for SalesByProduct to send us the data
            window.addEventListener('salesByProductData', handleSalesByProductData);
            window.dispatchEvent(new CustomEvent('requestSalesByProductData'));
            
            // Cleanup listener after 5 seconds
            setTimeout(() => {
              window.removeEventListener('salesByProductData', handleSalesByProductData);
            }, 5000);
          } catch (backupError) {
            console.error('[ShopifyTab] Backup data fetch failed:', backupError);
          }
        });
    }
  }, [metrics, connection, isLoading, isRefreshingData, dateRange, brandId]);

  // Add a new effect for date range changes to force refresh data
  useEffect(() => {
    // When date range changes, force refresh the data
    if (connection && dateRange?.from && dateRange?.to) {
      console.log('[ShopifyTab] Date range changed, forcing refresh');
      
      // Format dates as yyyy-MM-dd
      const formattedFromDate = format(dateRange.from, 'yyyy-MM-dd');
      const formattedToDate = format(dateRange.to, 'yyyy-MM-dd');
      
      // Check if this is "today" date range to force fresh data
      const today = new Date();
      const isToday = isSameDay(dateRange.from, today) && isSameDay(dateRange.to, today);
      
      if (isToday) {
        console.log('[ShopifyTab] Today date range detected - forcing immediate cache-busted refresh');
      }
      
      // Wait a moment to let other effects settle
      setTimeout(() => {
        // Dispatch force refresh event with formatted dates
        window.dispatchEvent(new CustomEvent('force-shopify-refresh', { 
          detail: { 
            brandId, 
            timestamp: Date.now(),
            dateRange: {
              from: formattedFromDate,
              to: formattedToDate
            },
            forceFetch: true,
            bypassCache: true,
            isToday: isToday,
            reason: isToday ? 'today-refresh' : 'date-range-change'
          }
        }));
      }, 300);
    }
  }, [dateRange, connection, brandId]);

  // Add effect to refresh data every time the component mounts (navigation)
  useEffect(() => {
    // REMOVED: Auto-refresh on component mount/navigation
    // The user wanted to disable hard refresh when navigating between pages
    // Only refresh when explicitly clicking refresh button or changing tabs within the page
    console.log('[ShopifyTab] Component mounted - auto-refresh disabled per user request');
  }, [brandId]); // Only depend on brandId to trigger on navigation

  useEffect(() => {
    // This effect runs once on mount, after the component has rendered
    // Check if metrics are empty after rendering
    setTimeout(() => {
      const metricsCards = document.querySelectorAll('.metric-card');
      
      // If metrics cards are present but values are $0.00 or 0, try to fix them
      let needsFallbackFix = false;
      
      metricsCards.forEach(card => {
        const valueElem = card.querySelector('.value');
        if (valueElem && (valueElem.textContent === '$0.00' || valueElem.textContent === '0')) {
          needsFallbackFix = true;
        }
      });
      
      if (needsFallbackFix) {
        console.log('[ShopifyTab] Detected empty metric cards after render, applying emergency fix');
        
        // Try to get data from SalesByProduct
        window.dispatchEvent(new CustomEvent('requestSalesByProductData'));
        
        // Always use the exact date range from props - don't override with Last 30 Days
        const fromDate = dateRange.from;
        const toDate = dateRange.to;
        
        // Format dates as yyyy-MM-dd
        const formattedFromDate = format(fromDate, 'yyyy-MM-dd');
        const formattedToDate = format(toDate, 'yyyy-MM-dd');
        
        // Check if this is "today" to add extra cache busting
        const today = new Date();
        const isToday = isSameDay(dateRange.from, today) && isSameDay(dateRange.to, today);
        
        const fetchUrl = `/api/metrics?brandId=${brandId}&from=${formattedFromDate}&to=${formattedToDate}&platform=shopify&force=true&nocache=true&bypass_cache=true${isToday ? '&refresh=true&force_load=true' : ''}&t=${Date.now()}`;
        
        fetch(fetchUrl)
          .then(res => res.json())
          .then(data => {
            if (data && !data.error && data.totalSales > 0) {
              // Update the DOM directly
              const salesCards = document.querySelectorAll('.metric-card');
              salesCards.forEach(card => {
                const title = card.querySelector('.metric-title');
                const valueElem = card.querySelector('.value');
                
                if (title && valueElem) {
                  const titleText = title.textContent || '';
                  
                  if (titleText.includes('Total Sales') && data.totalSales) {
                    valueElem.textContent = `$${data.totalSales.toFixed(2)}`;
                  } else if (titleText.includes('Orders') && data.ordersPlaced) {
                    valueElem.textContent = data.ordersPlaced.toString();
                  } else if (titleText.includes('Average Order') && data.averageOrderValue) {
                    valueElem.textContent = `$${data.averageOrderValue.toFixed(2)}`;
                  } else if (titleText.includes('Units Sold') && data.unitsSold) {
                    valueElem.textContent = data.unitsSold.toString();
                  }
                }
              });
              
              console.log('[ShopifyTab] Emergency fix applied successfully');
            }
          })
          .catch(err => {
            console.error('[ShopifyTab] Emergency fix API call failed:', err);
          });
      }
    }, 1000); // Give the component time to render first
  }, [brandId, dateRange]);

  return (
    <div className="space-y-4">
      {/* Subtle Page Indicator - Green line for Shopify */}
      <div className="mb-4">
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-500/30 to-transparent rounded-full"></div>
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
          loading={isLoading || isLoadingPrevious}
          refreshing={isRefreshingData}
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
          loading={isLoading || isLoadingPrevious}
          refreshing={isRefreshingData}
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
          loading={isLoading || isLoadingPrevious}
          refreshing={isRefreshingData}
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
          loading={isLoading || isLoadingPrevious}
          refreshing={isRefreshingData}
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
        {/* Cart Abandonment & Customer Segmentation Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CartAbandonmentWidget 
            brandId={brandId}
            dateRange={dateRange}
            connectionId={connection.id}
          />
          <CustomerSegmentationWidget 
            brandId={brandId}
            dateRange={dateRange}
            connectionId={connection.id}
          />
        </div>

        {/* Product Performance & Discount Analysis Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProductPerformanceWidget 
            brandId={brandId}
            dateRange={dateRange}
            connectionId={connection.id}
          />
          <DiscountPerformanceWidget 
            brandId={brandId}
            dateRange={dateRange}
            connectionId={connection.id}
          />
        </div>

        {/* Profit Margin Analysis - Full Width */}
        <div className="mt-6">
          <MarginAnalysisWidget 
            connectionId={connection.id}
            dateRange={dateRange}
          />
        </div>
      </div>
    </div>
  )
} 