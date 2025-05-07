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
import { addDays, differenceInDays, subDays, startOfDay, endOfDay } from "date-fns"
import { useState, useEffect, useRef, useCallback } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { calculateMetrics } from "@/utils/metrics"
import Image from "next/image"
import { SalesByProduct } from "@/components/dashboard/SalesByProduct"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"

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
  if (initialDataLoad) return <div className="flex items-center justify-center p-6"><Activity className="h-8 w-8 animate-spin text-gray-400 mr-2" /> Loading metrics...</div>

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
    })
  }

  // Add a ref to track the last refresh timestamp to prevent multiple refreshes
  const lastRefreshTimestamp = useRef<number>(0);
  const REFRESH_THROTTLE = 1000; // Minimum time between refreshes in milliseconds

  // Function to trigger a refresh with throttling
  const triggerShopifyRefresh = useCallback(() => {
    const now = Date.now();
    
    // Check if we've refreshed recently to prevent duplicate refreshes
    if (now - lastRefreshTimestamp.current < REFRESH_THROTTLE) {
      console.log('[ShopifyTab] Skipping duplicate refresh - previous refresh too recent');
      return;
    }
    
    // Update the last refresh timestamp
    lastRefreshTimestamp.current = now;
    
    // Format dates as yyyy-MM-dd for consistency
    const fromDate = dateRange.from;
    const toDate = dateRange.to;
    const formattedFromDate = format(fromDate, 'yyyy-MM-dd');
    const formattedToDate = format(toDate, 'yyyy-MM-dd');
    
    console.log(`[ShopifyTab] Triggering single refresh with dates: ${formattedFromDate} to ${formattedToDate}`);
    
    // Dispatch a single event with all the necessary information
    window.dispatchEvent(new CustomEvent('force-shopify-refresh', { 
      detail: { 
        brandId, 
        timestamp: now,
        dateRange: {
          from: formattedFromDate,
          to: formattedToDate
        },
        forceFetch: true,
        bypassCache: true
      }
    }));
  }, [dateRange, brandId]);

  // Single consolidated useEffect for handling tab activation and visibility
  useEffect(() => {
    console.log('[ShopifyTab] Component mounted or date range changed');
    
    // This function will be called when this tab becomes visible
    const handleTabVisibility = (event?: Event) => {
      console.log('[ShopifyTab] Tab activation event received');
      triggerShopifyRefresh();
    };
    
    // Only trigger refresh on mount if we have valid data
    if (connection && dateRange?.from && dateRange?.to) {
      // Add a short delay to avoid race conditions with other components
      const initialTimeout = setTimeout(() => {
        triggerShopifyRefresh();
      }, 300);
      
      // Listen for tab activation events
      window.addEventListener('shopify-tab-activated', handleTabVisibility);
      
      // Clean up
      return () => {
        clearTimeout(initialTimeout);
        window.removeEventListener('shopify-tab-activated', handleTabVisibility);
      };
    }
  }, [connection, dateRange, triggerShopifyRefresh]);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
        <div className="w-full mb-8">
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

      {/* Add a simple refresh button for testing */}
      {process.env.NODE_ENV === 'development' && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => triggerShopifyRefresh()}
          className="my-2"
        >
          Manual Refresh
        </Button>
      )}
    </div>
  )
} 