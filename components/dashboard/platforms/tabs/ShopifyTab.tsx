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
import React, { useState, useEffect, useRef, useCallback } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { calculateMetrics } from "@/utils/metrics"
import Image from "next/image"
import { SalesByProduct } from "@/components/dashboard/SalesByProduct"
import { CustomerSegmentationWidget } from "@/components/shopify/CustomerSegmentationWidget"

import { RepeatCustomersWidget } from "@/components/shopify/RepeatCustomersWidget"
import { SyncStatusIndicator } from "@/components/ui/SyncStatusIndicator"

import { format } from "date-fns"
import { toast } from "sonner"

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
  
  // SIMPLE SOLUTION: Just block during any loading state + add time-based safety
  const [mountTimestamp] = useState(() => Date.now());
  const timeSinceMount = Date.now() - mountTimestamp;
  const forceLoadingDueToTime = timeSinceMount < 300; // Block for first 300ms only
  
  // SIMPLIFIED FLASH FIX: Use component key to detect date changes
  const hasValidMetrics = metrics.totalSales !== undefined && 
    metrics.ordersPlaced !== undefined && 
    metrics.revenueByDay && 
    metrics.revenueByDay.length > 0;
  
   // ULTIMATE DATE CHANGE BLOCKING: Use timestamp-based blocking
  const dateKey = `${dateRange.from.getTime()}-${dateRange.to.getTime()}`;
  const [lastStableDateKey, setLastStableDateKey] = useState(dateKey);
  const [dateChangeTimestamp, setDateChangeTimestamp] = useState<number | null>(null);
  
  // Detect date changes and start blocking timer
  React.useEffect(() => {
    if (lastStableDateKey !== dateKey) {
      setLastStableDateKey(dateKey);
      setDateChangeTimestamp(Date.now());
    }
  }, [dateKey, lastStableDateKey]);
  
  // Clear the blocking after 2000ms
  React.useEffect(() => {
    if (dateChangeTimestamp !== null) {
      const timer = setTimeout(() => {
        setDateChangeTimestamp(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [dateChangeTimestamp]);
  
  // Force loading for 2000ms after date change
  const timeSinceDateChange = dateChangeTimestamp ? Date.now() - dateChangeTimestamp : Infinity;
  const forceLoadingDueDateChange = dateChangeTimestamp !== null && timeSinceDateChange < 2000;
  
  // FORCE LOADING if:
  // 1. Metrics are incomplete OR  
  // 2. Date range just changed (block for 2000ms)
  const shouldForceLoading = !hasValidMetrics || forceLoadingDueDateChange;
  
  // Check if we're actually loading vs just have no data
  const isActuallyLoading = isLoading || isRefreshingData || isLoadingPrevious || forceLoadingDueToTime;
  
  // Check if we have received a response from the API (even zero values count as "data")
  // The API always returns numbers (not undefined), so if we have numbers, we have a response
  const hasApiResponse = typeof metrics.totalSales === 'number' && typeof metrics.ordersPlaced === 'number';
  
  // Check if metrics look incomplete (but only if we're not in a loading state)
  const hasIncompleteMetrics = !isActuallyLoading && hasApiResponse && (
    (metrics.totalSales && !metrics.revenueByDay?.length) ||
    shouldForceLoading
  );
  
  const isMetricsStale = isActuallyLoading || hasIncompleteMetrics;
  


  
  // Only show loading overlay when actually loading data, not when there's just no data
  const showLoadingOverlay = isActuallyLoading;


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
    

    
    // Single day comparison
    const isSingleDay = isSameDay(fromNormalized, toNormalized);
    if (isSingleDay) {
      const prevDay = new Date(fromNormalized);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = toLocalISODateString(prevDay);
      

      
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
  // Add ref to track last comparison fetch to prevent excessive calls
  const lastComparisonFetchRef = useRef<number>(0);
  const comparisonCacheRef = useRef<string>('');

  const fetchPreviousMetrics = useCallback(async (force: boolean = false) => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      return;
    }

    const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);
    const cacheKey = `${brandId}-${prevFrom}-${prevTo}`;
    const now = Date.now();
    
    // Smart debouncing: Only fetch if forced, cache key changed, or 5+ seconds passed
    if (!force && comparisonCacheRef.current === cacheKey && (now - lastComparisonFetchRef.current) < 5000) {
      console.log('[ShopifyTab] Skipping comparison fetch - too recent');
      return;
    }

    console.log('[ShopifyTab] Fetching fresh comparison data...');
    setIsLoadingPrevious(true);
    lastComparisonFetchRef.current = now;
    comparisonCacheRef.current = cacheKey;

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(`/api/metrics?brandId=${brandId}&from=${prevFrom}&to=${prevTo}&platform=shopify&timezone=${encodeURIComponent(userTimezone)}&force=true&bypass_cache=true&t=${Date.now()}`);
      
      if (response.ok) {
        const prevData = await response.json();
        setPreviousMetrics(prevData);
        console.log('[ShopifyTab] ✅ Comparison data updated:', { totalSales: prevData.totalSales, ordersPlaced: prevData.ordersPlaced });
      }
    } catch (error) {
      console.error('[ShopifyTab] Error fetching comparison data:', error);
    } finally {
      // CRITICAL FIX: Delay clearing isLoadingPrevious to prevent race condition
      // This gives the parent time to update the main metrics before we show data
      setTimeout(() => {
        setIsLoadingPrevious(false);
      }, 100); // Small delay to ensure main metrics update first
    }
  }, [brandId, dateRange]);

  // Force zero values during loading OR date changes to completely prevent flashing
  const shouldBlockOldData = showLoadingOverlay || forceLoadingDueDateChange || !hasApiResponse;
  
  // Use empty metrics during loading OR date changes to prevent flashing
  const displayMetrics = shouldBlockOldData ? {} as Metrics : metrics;
  const getMetricValue = (value: number | undefined) => {
    const result = shouldBlockOldData ? 0 : (value || 0);
    return result;
  };
  const getMetricData = (data: any[] | undefined) => {
    const result = shouldBlockOldData ? [] : (data || []);
    return result;
  };
  
  const safeMetrics: SafeMetrics = {
    ...displayMetrics,
    revenueByDay: (displayMetrics.revenueByDay || []).map(d => {
      // Ensure we have a proper date string in ISO format
      let dateStr = d.date;
      if (typeof dateStr === 'object' && dateStr !== null) {
        // If it's a Date object, convert to ISO string
        try {
          dateStr = (dateStr as Date).toISOString();
        } catch (error) {
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
            dateStr = new Date().toISOString(); // Fallback to current date
          }
        } catch (error) {
          dateStr = new Date().toISOString(); // Fallback to current date
        }
      }
      
      return {
        date: dateStr,
        revenue: d.amount || 0
      };
    }),
    topProducts: (displayMetrics.topProducts || []).map(product => ({
      id: product.id,
      name: product.title || '',
      quantity: product.quantity || 0,
      revenue: product.revenue || 0
    })),
    customerSegments: {
      newCustomers: displayMetrics.customerSegments?.newCustomers || 0,
      returningCustomers: displayMetrics.customerSegments?.returningCustomers || 0
    },
    dailyData: (displayMetrics.dailyData || []).map(d => ({
      date: d.date,
      orders: d.orders || 0,
      revenue: d.revenue || 0,
      value: d.revenue || 0 // Add this for MetricCard compatibility
    })),
    salesData: (displayMetrics.salesData || []).filter(item => {
      if (!item.date) {
        return false;
      }
      
      try {
        // Validate the date
        const date = new Date(item.date);
        if (isNaN(date.getTime())) {
          return false;
        }
        
        // Keep the original timestamp - don't convert to ISO as it changes timezone
        // The chart will handle timezone display properly
        return true;
      } catch (error) {
        return false;
      }
    }),
    ordersData: (displayMetrics.ordersData || []).filter(item => {
      if (!item.date) {
        return false;
      }
      
      try {
        // Validate the date
        const date = new Date(item.date);
        if (isNaN(date.getTime())) {
          return false;
        }
        
        // Keep the original timestamp - don't convert to ISO as it changes timezone
        // The chart will handle timezone display properly
        return true;
      } catch (error) {
        return false;
      }
    }),
    aovData: (displayMetrics.aovData || []).filter(item => {
      if (!item.date) {
        return false;
      }
      
      try {
        // Validate the date
        const date = new Date(item.date);
        if (isNaN(date.getTime())) {
          return false;
        }
        
        // Keep the original timestamp - don't convert to ISO as it changes timezone
        // The chart will handle timezone display properly
        return true;
      } catch (error) {
        return false;
      }
    }),
    unitsSoldData: (displayMetrics.unitsSoldData || []).filter(item => {
      if (!item.date) {
        return false;
      }
      
      try {
        // Validate the date
        const date = new Date(item.date);
        if (isNaN(date.getTime())) {
          return false;
        }
        
        // Keep the original timestamp - don't convert to ISO as it changes timezone
        // The chart will handle timezone display properly
        return true;
      } catch (error) {
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
      // Force fetch on date changes
      fetchPreviousMetrics(true);
    }
  }, [brandId, dateRange, fetchPreviousMetrics]);

  // 🔄 DYNAMIC COMPARISON REFRESH: Update comparison data when main metrics change
  useEffect(() => {
    // Only refresh comparison if we have valid main metrics and they've changed
    if (brandId && dateRange?.from && dateRange?.to && metrics.totalSales !== undefined) {
      console.log('[ShopifyTab] Main metrics updated, refreshing comparison data...');
      fetchPreviousMetrics();
    }
  }, [metrics.totalSales, metrics.ordersPlaced, metrics.averageOrderValue, brandId, dateRange, fetchPreviousMetrics]);

  // Add a function to safely dispatch refresh events with debouncing
  const safeDispatchRefresh = useCallback((reason: string) => {
    const now = Date.now();
    // Debounce to prevent multiple refreshes within 2 seconds
    if (now - lastRefreshRef.current > 2000) {
      lastRefreshRef.current = now;

      
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

      
      // Always use the exact date range from props - don't override with Last 30 Days
      const fromDate = dateRange.from;
      const toDate = dateRange.to;
      
      // Format dates as yyyy-MM-dd
      const formattedFromDate = format(fromDate, 'yyyy-MM-dd');
      const formattedToDate = format(toDate, 'yyyy-MM-dd');
      
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const fetchUrl = `/api/metrics?brandId=${brandId}&from=${formattedFromDate}&to=${formattedToDate}&platform=shopify&timezone=${encodeURIComponent(userTimezone)}&force=true&bypass_cache=true&t=${Date.now()}`;
      

      
      fetch(fetchUrl)
        .then(res => {
          if (!res.ok) {
            throw new Error(`API call failed with status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {

          
          // Force UI refresh
          window.dispatchEvent(new Event('refresh-metrics'));
          
          // Don't reload the page as it might disrupt user experience
          // Instead, manually update the DOM if possible
          setTimeout(() => {
            try {
              // If the metrics still aren't showing, try to update the summary cards directly
              if (!document.querySelector('[data-testid="total-sales-value"]')?.textContent) {

                
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

                    }
                  }
                  
                  // Repeat for other cards...
                }
              }
            } catch (domError) {
              // If all else fails, reload the page
              window.location.reload();
            }
          }, 2000);
        })
        .catch(err => {
          
          // Try to fetch metrics from a backup source - directly from Supabase

          try {
            // Listen for events from SalesByProduct component which has data
            const handleSalesByProductData = (event: any) => {
              if (event.detail && event.detail.orders && event.detail.orders.length > 0) {

                
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
          }
        });
    }
  }, [metrics, connection, isLoading, isRefreshingData, dateRange, brandId]);

  // Add a new effect for date range changes to force refresh data
  useEffect(() => {
    // When date range changes, force refresh the data
    if (connection && dateRange?.from && dateRange?.to) {

      
      // Format dates as yyyy-MM-dd
      const formattedFromDate = format(dateRange.from, 'yyyy-MM-dd');
      const formattedToDate = format(dateRange.to, 'yyyy-MM-dd');
      
      // Check if this is "today" date range to force fresh data
      const today = new Date();
      const isToday = isSameDay(dateRange.from, today) && isSameDay(dateRange.to, today);
      
      if (isToday) {

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

  }, [brandId]); // Only depend on brandId to trigger on navigation

  // Fresh data sync function (like Meta's syncMetaInsights)
  const syncShopifyData = useCallback(async (refreshId?: string) => {
    if (!brandId || !connection) {
      return;
    }

    try {
      // Starting fresh Shopify data sync
      
      // Show toast for sync
      toast.loading("Syncing fresh Shopify data...", { 
        id: "shopify-sync-toast",
        duration: 15000 
      });

      // Trigger fresh Shopify sync with date range
      const syncResponse = await fetch('/api/cron/shopify-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          force_refresh: true,
          full_sync: true,
          dateRange: {
            from: format(dateRange.from, 'yyyy-MM-dd'),
            to: format(dateRange.to, 'yyyy-MM-dd')
          }
        }),
      });

      if (!syncResponse.ok) {
        throw new Error(`Shopify sync failed: ${syncResponse.status}`);
      }

      const syncResult = await syncResponse.json();
      // Shopify sync completed

      // Also sync comparison period data for the previous period
      const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);
      
      try {
        // Syncing comparison period
        
        await fetch('/api/cron/shopify-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brandId,
            force_refresh: true,
            comparison_sync: true,
            dateRange: {
              from: prevFrom,
              to: prevTo
            }
          }),
        });
        
        // Comparison period sync completed
      } catch (compError) {
        // Comparison period sync failed
      }

      toast.success("Shopify data synced successfully", { 
        id: "shopify-sync-toast",
        duration: 3000 
      });

      // Trigger data refresh for all components
      window.dispatchEvent(new CustomEvent('shopifyDataRefreshed', { 
        detail: { 
          brandId, 
          timestamp: Date.now(),
          forceRefresh: true
        }
      }));
      
      // Also dispatch specific events for enhanced widgets
      window.dispatchEvent(new CustomEvent('refresh-all-widgets', { 
        detail: { 
          brandId, 
          timestamp: Date.now(),
          source: 'shopify-sync'
        }
      }));
      
      // Dispatched refresh events

    } catch (error) {
      // Failed to sync Shopify data
      toast.error("Failed to sync Shopify data", {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000,
        id: "shopify-sync-toast"
      });
    }
  }, [brandId, connection, dateRange]);

  // Fresh data sync on mount and date changes (like MetaTab2)
  const hasFetchedShopifyData = useRef(false);
  const lastFetchedDateRange = useRef({from: '', to: ''});

  useEffect(() => {
    if (brandId && dateRange?.from && dateRange?.to && connection) {
      const currentFromDate = format(dateRange.from, 'yyyy-MM-dd');
      const currentToDate = format(dateRange.to, 'yyyy-MM-dd');
      
      // Check if this is initial mount or if date range has changed
      const isInitialMount = !hasFetchedShopifyData.current;
      const hasDateRangeChanged = 
        lastFetchedDateRange.current.from !== currentFromDate || 
        lastFetchedDateRange.current.to !== currentToDate;
      
      if (isInitialMount || hasDateRangeChanged) {
        // Triggering fresh sync
        
        // Update the tracking refs
        lastFetchedDateRange.current = {from: currentFromDate, to: currentToDate};
        hasFetchedShopifyData.current = true;
        
        // Only trigger sync for today's data or when user explicitly changes date
        // This prevents constant syncing for historical data
        const isToday = format(new Date(), 'yyyy-MM-dd') === currentToDate;
        const shouldSync = isInitialMount || isToday || hasDateRangeChanged;
        
        if (shouldSync) {
          // Add a small delay to prevent rapid-fire syncing during navigation
          setTimeout(() => {
            syncShopifyData('mount-or-date-change');
          }, 500);
        }
      }
    } else {
      // Reset tracking if requirements not met
      hasFetchedShopifyData.current = false;
      lastFetchedDateRange.current = {from: '', to: ''};
    }
  }, [brandId, dateRange, connection, syncShopifyData]);

  // DISABLED: External refresh events to prevent infinite loops
  // The automatic sync on mount/date changes is sufficient
  // Manual refresh can be triggered via refresh buttons if needed
  // 
  // useEffect(() => {
  //   let cancelled = false;
  //   
  //   const handleExternalRefresh = async (event: any) => {
  //     if (cancelled) return;
  //     
  //     console.log('[ShopifyTab] Handling external refresh event:', event.type);
  //     
  //     // Only sync data, don't dispatch more events to avoid loops
  //     if (typeof syncShopifyData === 'function') {
  //       await syncShopifyData('external-refresh');
  //     }
  //   };
  //   
  //   // Listen for refresh events from GlobalRefreshButton
  //   window.addEventListener('global-refresh-all', handleExternalRefresh);
  //   window.addEventListener('refresh-all-widgets', handleExternalRefresh);
  //   
  //   return () => {
  //     cancelled = true;
  //     window.removeEventListener('global-refresh-all', handleExternalRefresh);
  //     window.removeEventListener('refresh-all-widgets', handleExternalRefresh);
  //   };
  // }, [syncShopifyData]);

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
        
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const fetchUrl = `/api/metrics?brandId=${brandId}&from=${formattedFromDate}&to=${formattedToDate}&platform=shopify&timezone=${encodeURIComponent(userTimezone)}&force=true&nocache=true&bypass_cache=true${isToday ? '&refresh=true&force_load=true' : ''}&t=${Date.now()}`;
        
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
              

            }
          })
          .catch(err => {
            // Handle error silently
          });
      }
    }, 1000); // Give the component time to render first
  }, [brandId, dateRange]);

  // Force complete component remount on date changes - nuclear option
  const componentKey = `${dateRange.from.getTime()}-${dateRange.to.getTime()}`;


  return (
    <div key={componentKey} className="space-y-4">
      {/* Subtle Page Indicator - Green line for Shopify */}
      <div className="mb-4">
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-500/30 to-transparent rounded-full"></div>
      </div>

      {/* Sync Status Indicator */}
      <SyncStatusIndicator brandId={brandId} className="mb-4" />

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-800 p-2 text-xs text-gray-300 rounded mb-4">
          <div>Date Range: {dateRange.from.toDateString()} to {dateRange.to.toDateString()}</div>
          <div>Revenue Data Points: {safeMetrics.revenueByDay.length}</div>
        </div>
      )}

      {/* Key Metrics - 1x4 Grid with smooth transitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Total Sales */}
        <MetricCard
          title="Total Sales"
          value={getMetricValue(safeMetrics.totalSales)}
          change={shouldBlockOldData ? 0 : calculatePercentChange(safeMetrics.totalSales || 0, safeMetrics.previousTotalSales || 0)}
          previousValue={getMetricValue(safeMetrics.previousTotalSales)}
          prefix="$"
          valueFormat="currency"
          decimals={2}
          hideGraph={false}
          showPreviousPeriod={true}
          previousValueFormat="currency"
          previousValueDecimals={2}
          emptyState={hasApiResponse && metrics.totalSales === 0 ? "No sales data for this period" : undefined}
          previousValuePrefix="$"
          infoTooltip="Total revenue from all orders in the selected period"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          loading={shouldBlockOldData}
          refreshing={false}
          data={getMetricData(safeMetrics.salesData)}
          platform="shopify"
          dateRange={dateRange}
          brandId={brandId}
          className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
        />

        {/* Orders */}
        <MetricCard
          title="Orders"
          value={getMetricValue(safeMetrics.ordersPlaced)}
          change={shouldBlockOldData ? 0 : calculatePercentChange(safeMetrics.ordersPlaced || 0, safeMetrics.previousOrdersPlaced || 0)}
          previousValue={getMetricValue(safeMetrics.previousOrdersPlaced)}
          valueFormat="number"
          decimals={0}
          hideGraph={false}
          showPreviousPeriod={true}
          previousValueFormat="number"
          previousValueDecimals={0}
          infoTooltip="Total number of orders placed in the selected period"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          loading={shouldBlockOldData}
          emptyState={hasApiResponse && metrics.ordersPlaced === 0 ? "No orders for this period" : undefined}
          refreshing={false}
          data={getMetricData(safeMetrics.ordersData)}
          platform="shopify"
          dateRange={dateRange}
          brandId={brandId}
          className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
        />

        {/* Average Order Value */}
        <MetricCard
          title="Average Order Value"
          value={getMetricValue(safeMetrics.averageOrderValue)}
          change={shouldBlockOldData ? 0 : calculatePercentChange(safeMetrics.averageOrderValue || 0, safeMetrics.previousAverageOrderValue || 0)}
          previousValue={getMetricValue(safeMetrics.previousAverageOrderValue)}
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
          loading={shouldBlockOldData}
          emptyState={hasApiResponse && metrics.averageOrderValue === 0 ? "No order data for this period" : undefined}
          refreshing={false}
          data={getMetricData(safeMetrics.aovData)}
          platform="shopify"
          dateRange={dateRange}
          brandId={brandId}
          className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
        />

        {/* Units Sold */}
        <MetricCard
          title="Units Sold"
          value={getMetricValue(safeMetrics.unitsSold)}
          change={shouldBlockOldData ? 0 : calculatePercentChange(safeMetrics.unitsSold || 0, safeMetrics.previousUnitsSold || 0)}
          previousValue={getMetricValue(safeMetrics.previousUnitsSold)}
          valueFormat="number"
          decimals={0}
          hideGraph={false}
          showPreviousPeriod={true}
          previousValueFormat="number"
          previousValueDecimals={0}
          infoTooltip="Total number of units sold in the selected period"
          nullChangeText="N/A"
          nullChangeTooltip="No data for previous period"
          loading={shouldBlockOldData}
          emptyState={hasApiResponse && metrics.unitsSold === 0 ? "No units sold for this period" : undefined}
          refreshing={false}
          data={getMetricData(safeMetrics.unitsSoldData)}
          platform="shopify"
          dateRange={dateRange}
          brandId={brandId}
          className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
        />
      </div>

             {/* Product Performance Section */}
       <div>
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
      </div>

      {/* Enhanced Analytics Section */}
      <div className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Segmentation by Location */}
          <CustomerSegmentationWidget
            brandId={brandId}
            dateRange={dateRange}
            isLoading={isLoading}
            isRefreshingData={isRefreshingData}
          />

          {/* Repeat Customer Analysis */}
          <RepeatCustomersWidget
            brandId={brandId}
            dateRange={dateRange}
            isLoading={isLoading}
            isRefreshingData={isRefreshingData}
          />
        </div>
      </div>


    </div>
  )
} 
