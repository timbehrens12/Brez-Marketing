"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Metrics } from '@/types/metrics'
import { PlatformConnection } from '@/types/platformConnection'
import { DateRange } from 'react-day-picker'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, X, Settings, Pencil, GripVertical, ShoppingBag, Facebook, LayoutGrid } from "lucide-react"
import Image from "next/image"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { MetricCard } from "@/components/metrics/MetricCard"
import { SalesByProduct } from "@/components/dashboard/SalesByProduct"
import { InventorySummary } from "@/components/dashboard/InventorySummary"
import { DragDropContext, Droppable, Draggable, DroppableProvided } from 'react-beautiful-dnd'
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format, isSameDay, startOfMonth, endOfMonth, subMonths } from 'date-fns'

// Define the MetaTab DailyDataItem type for proper type checking
interface DailyDataItem {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  roas: number;
  value?: number;
  [key: string]: string | number | undefined;
}

// Extend Metrics type to add our custom properties
interface ExtendedMetrics extends Metrics {
  dailyMetaData?: DailyDataItem[];
}

// Define the widget types we can add to the home page
interface Widget {
  id: string;
  type: 'shopify' | 'meta';
  name: string;
  component: string;
  description?: string;
  icon?: string;
}

// Available widgets users can add
const AVAILABLE_WIDGETS: Widget[] = [
  // Shopify widgets
  { 
    id: 'shopify-sales', 
    type: 'shopify', 
    name: 'Total Sales', 
    component: 'MetricCard',
    description: 'Total revenue from Shopify orders',
    icon: 'https://i.imgur.com/cnCcupx.png'
  },
  { 
    id: 'shopify-orders', 
    type: 'shopify', 
    name: 'Orders', 
    component: 'MetricCard',
    description: 'Number of orders from Shopify',
    icon: 'https://i.imgur.com/cnCcupx.png'
  },
  { 
    id: 'shopify-aov', 
    type: 'shopify', 
    name: 'Average Order Value', 
    component: 'MetricCard',
    description: 'Shopify Average Order Value (AOV)',
    icon: 'https://i.imgur.com/cnCcupx.png'
  },
  { 
    id: 'shopify-units', 
    type: 'shopify', 
    name: 'Units Sold', 
    component: 'MetricCard',
    description: 'Total units sold on Shopify',
    icon: 'https://i.imgur.com/cnCcupx.png'
  },
  {
    id: 'shopify-sales-by-product',
    type: 'shopify',
    name: 'Sales By Product',
    component: 'SalesByProduct',
    description: 'Displays sales data broken down by product',
    icon: 'https://i.imgur.com/cnCcupx.png' 
  },
  {
    id: 'shopify-inventory-summary',
    type: 'shopify',
    name: 'Inventory Summary',
    component: 'InventorySummary',
    description: 'Summary of current inventory levels',
    icon: 'https://i.imgur.com/cnCcupx.png'
  },
  
  // Meta widgets
  { 
    id: 'meta-adspend', 
    type: 'meta', 
    name: 'Meta Ad Spend', 
    component: 'MetricCard',
    description: 'Total ad spend on Meta platforms',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-impressions', 
    type: 'meta', 
    name: 'Meta Impressions', 
    component: 'MetricCard',
    description: 'Total impressions from Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-clicks', 
    type: 'meta', 
    name: 'Meta Clicks', 
    component: 'MetricCard',
    description: 'Total clicks on Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-conversions', 
    type: 'meta', 
    name: 'Meta Conversions', 
    component: 'MetricCard',
    description: 'Total conversions from Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-roas', 
    type: 'meta', 
    name: 'Meta ROAS', 
    component: 'MetricCard',
    description: 'Meta Return On Ad Spend (ROAS)',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  }
];

interface HomeTabProps {
  brandId: string
  brandName: string
  dateRange: DateRange
  metrics: Metrics
  isLoading: boolean
  isRefreshingData?: boolean
  platformStatus: {
    shopify: boolean
    meta: boolean
  }
  connections: PlatformConnection[]
  brands?: Array<{ id: string, name: string }>
  isEditMode?: boolean
}

// Custom function to determine if a widget should be full-width
const isFullWidthWidget = (component: string): boolean => {
  return ['SalesByProduct', 'InventorySummary'].includes(component);
};

export function HomeTab({
  brandId,
  brandName,
  dateRange,
  metrics,
  isLoading,
  isRefreshingData = false,
  platformStatus,
  connections,
  brands = [],
  isEditMode = false
}: HomeTabProps) {
  // State for user's selected widgets
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isWidgetSelectorOpen, setIsWidgetSelectorOpen] = useState(false);
  const [activeWidgetTab, setActiveWidgetTab] = useState<'shopify' | 'meta'>('shopify');
  const [editMode, setEditMode] = useState(isEditMode);
  const supabase = createClientComponentClient();
  
  // State to store Meta daily data
  const [metaDaily, setMetaDaily] = useState<DailyDataItem[]>([]);
  const [isLoadingMetaData, setIsLoadingMetaData] = useState(false);
  const hasFetchedMetaData = useRef(false);
  
  // State for direct Meta metrics
  const [metaMetrics, setMetaMetrics] = useState({
    adSpend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    roas: 0,
    adSpendGrowth: 0,
    impressionGrowth: 0,
    clickGrowth: 0,
    conversionGrowth: 0,
    roasGrowth: 0,
    previousAdSpend: 0,
    previousImpressions: 0,
    previousClicks: 0, 
    previousConversions: 0,
    previousRoas: 0
  });

  // Helper function to convert a Date to a consistent ISO date string (YYYY-MM-DD) in local time
  const toLocalISODateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Function to calculate previous period date range - matches the one in MetaTab
  const getPreviousPeriodDates = (from: Date, to: Date): { prevFrom: string, prevTo: string } => {
    // Normalize dates to avoid timezone issues - work with dates at the day level only
    const fromNormalized = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toNormalized = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    
    console.log(`[HomeTab] Calculating previous dates for range: ${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`);
    
    // Case 1: Single day - always compare to the day before
    const isSingleDay = isSameDay(fromNormalized, toNormalized);
    if (isSingleDay) {
      // For a single day view, previous period is always the day before
      const prevDay = new Date(fromNormalized);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = toLocalISODateString(prevDay);
      
      console.log(`[HomeTab] Single day detected, comparing to previous day: ${prevDayStr}`);
      
      return {
        prevFrom: prevDayStr,
        prevTo: prevDayStr
      };
    }
    
    // Case 2: "Last 7 days" preset (Mar 21-27 → should compare to Mar 14-20)
    // Check if this is the last 7 days preset by looking at the range size and end date
    const rangeDays = Math.round((toNormalized.getTime() - fromNormalized.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    // If we have a 7-day range ending yesterday, it's likely the "Last 7 days" preset
    const isLast7Days = rangeDays === 7 && isSameDay(toNormalized, yesterday);
    if (isLast7Days) {
      // For last 7 days, previous period should be the 7 days before that (not overlapping)
      const prevFrom = new Date(fromNormalized);
      prevFrom.setDate(prevFrom.getDate() - 7);
      
      const prevTo = new Date(toNormalized);
      prevTo.setDate(prevTo.getDate() - 7);
      
      console.log(`[HomeTab] "Last 7 days" preset detected, comparing to previous 7 days:`, {
        currentRange: `${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`,
        prevRange: `${toLocalISODateString(prevFrom)} to ${toLocalISODateString(prevTo)}`
      });
      
      return {
        prevFrom: toLocalISODateString(prevFrom),
        prevTo: toLocalISODateString(prevTo)
      };
    }
    
    // Case 3: "Last 30 days" preset (similar logic to Last 7 days)
    const isLast30Days = rangeDays === 30 && isSameDay(toNormalized, yesterday);
    if (isLast30Days) {
      // For last 30 days, previous period should be the 30 days before that (not overlapping)
      const prevFrom = new Date(fromNormalized);
      prevFrom.setDate(prevFrom.getDate() - 30);
      
      const prevTo = new Date(toNormalized);
      prevTo.setDate(prevTo.getDate() - 30);
      
      console.log(`[HomeTab] "Last 30 days" preset detected, comparing to previous 30 days:`, {
        currentRange: `${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`,
        prevRange: `${toLocalISODateString(prevFrom)} to ${toLocalISODateString(prevTo)}`
      });
      
      return {
        prevFrom: toLocalISODateString(prevFrom),
        prevTo: toLocalISODateString(prevTo)
      };
    }
    
    // Case 4: "This month" preset (from start of current month to today)
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    if (isSameDay(fromNormalized, startOfCurrentMonth)) {
      // Get the days in current period
      const daysInCurrentPeriod = Math.round((toNormalized.getTime() - fromNormalized.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Previous period should be same number of days in previous month
      const prevMonthStart = startOfMonth(subMonths(now, 1));
      const prevMonthEnd = new Date(prevMonthStart);
      prevMonthEnd.setDate(prevMonthStart.getDate() + daysInCurrentPeriod - 1);
      
      console.log(`[HomeTab] "This month" pattern detected, comparing to same days in previous month:`, {
        currentRange: `${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`,
        prevRange: `${toLocalISODateString(prevMonthStart)} to ${toLocalISODateString(prevMonthEnd)}`
      });
      
      return {
        prevFrom: toLocalISODateString(prevMonthStart),
        prevTo: toLocalISODateString(prevMonthEnd)
      };
    }
    
    // Case 5: "Last month" preset (entire previous month)
    const startOfLastMonth = startOfMonth(subMonths(now, 1));
    const endOfLastMonth = endOfMonth(subMonths(now, 1));
    if (isSameDay(fromNormalized, startOfLastMonth) && isSameDay(toNormalized, endOfLastMonth)) {
      // Previous period should be the month before last
      const startOfPrevMonth = startOfMonth(subMonths(now, 2));
      const endOfPrevMonth = endOfMonth(subMonths(now, 2));
      
      console.log(`[HomeTab] "Last month" pattern detected, comparing to the month before last:`, {
        currentRange: `${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`,
        prevRange: `${toLocalISODateString(startOfPrevMonth)} to ${toLocalISODateString(endOfPrevMonth)}`
      });
      
      return {
        prevFrom: toLocalISODateString(startOfPrevMonth),
        prevTo: toLocalISODateString(endOfPrevMonth)
      };
    }
    
    // Case 6: "This year" preset (from start of year to today)
    const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);
    if (isSameDay(fromNormalized, startOfCurrentYear)) {
      // Get the days in current period
      const daysInCurrentPeriod = Math.round((toNormalized.getTime() - fromNormalized.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Previous period should be same number of days in previous year
      const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const prevYearEnd = new Date(prevYearStart);
      prevYearEnd.setDate(prevYearStart.getDate() + daysInCurrentPeriod - 1);
      
      console.log(`[HomeTab] "This year" pattern detected, comparing to same days in previous year:`, {
        currentRange: `${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`,
        prevRange: `${toLocalISODateString(prevYearStart)} to ${toLocalISODateString(prevYearEnd)}`
      });
      
      return {
        prevFrom: toLocalISODateString(prevYearStart),
        prevTo: toLocalISODateString(prevYearEnd)
      };
    }
    
    // Case 7: "Last year" preset (entire previous year)
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
    if (isSameDay(fromNormalized, startOfLastYear) && isSameDay(toNormalized, endOfLastYear)) {
      // Previous period should be the year before last
      const startOfPrevYear = new Date(now.getFullYear() - 2, 0, 1);
      const endOfPrevYear = new Date(now.getFullYear() - 2, 11, 31);
      
      console.log(`[HomeTab] "Last year" pattern detected, comparing to the year before last:`, {
        currentRange: `${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`,
        prevRange: `${toLocalISODateString(startOfPrevYear)} to ${toLocalISODateString(endOfPrevYear)}`
      });
      
      return {
        prevFrom: toLocalISODateString(startOfPrevYear),
        prevTo: toLocalISODateString(endOfPrevYear)
      };
    }
    
    // Case 8: Default for custom date ranges - use equivalent previous period
    const currentRange = toNormalized.getTime() - fromNormalized.getTime();
    const daysInRange = Math.ceil(currentRange / (1000 * 60 * 60 * 24)) + 1;
    
    const prevFrom = new Date(fromNormalized);
    prevFrom.setDate(prevFrom.getDate() - daysInRange);
    
    const prevTo = new Date(toNormalized);
    prevTo.setDate(prevTo.getDate() - daysInRange);
    
    const prevFromStr = toLocalISODateString(prevFrom);
    const prevToStr = toLocalISODateString(prevTo);
    
    console.log(`[HomeTab] Custom range detected (${daysInRange} days), comparing to previous period:`, {
      currentRange: `${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`,
      prevRange: `${prevFromStr} to ${prevToStr}`
    });
    
    return {
      prevFrom: prevFromStr,
      prevTo: prevToStr
    };
  };

  // Calculate percentage change function
  const calculatePercentChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  // Treat metrics as ExtendedMetrics to ensure TypeScript compatibility
  const extendedMetrics = metrics as ExtendedMetrics;
  const metaData = metaDaily.length > 0 ? metaDaily : extendedMetrics.dailyMetaData || [];

  // Get connection info
  const shopifyConnection = connections.find(c => c.platform_type === 'shopify' && c.status === 'active');
  const metaConnection = connections.find(c => c.platform_type === 'meta' && c.status === 'active');
  
  // Filter widgets that require connections that don't exist
  const validWidgets = widgets.filter(widget => 
    (widget.type === 'shopify' && shopifyConnection) || 
    (widget.type === 'meta' && metaConnection)
  );

  // Group widgets by platform
  const shopifyWidgets = validWidgets.filter(widget => widget.type === 'shopify');
  const metaWidgets = validWidgets.filter(widget => widget.type === 'meta');

  // Fetch Meta data directly from API
  const fetchMetaData = async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to || !metaConnection) {
      return;
    }

    try {
      setIsLoadingMetaData(true);

      // Current period params
      const params = new URLSearchParams({
        brandId: brandId
      });
      
      // Add date range
      params.append('from', dateRange.from.toISOString().split('T')[0]);
      params.append('to', dateRange.to.toISOString().split('T')[0]);
      
      // Force metrics fetch
      params.append('bypass_cache', 'true');
      params.append('force_load', 'true');
      
      console.log(`[HomeTab] Fetching Meta data for current period: ${params.toString()}`);
      
      // Calculate previous period dates using the same logic as MetaTab
      const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);
      
      // Previous period params
      const prevParams = new URLSearchParams({
        brandId: brandId
      });
      
      // Add previous period date range
      prevParams.append('from', prevFrom);
      prevParams.append('to', prevTo);
      prevParams.append('bypass_cache', 'true');
      
      console.log(`[HomeTab] Fetching Meta data for previous period: ${prevParams.toString()}`);
      
      // Fetch current period data
      const response = await fetch(`/api/metrics/meta?${params.toString()}`, { 
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      // Fetch previous period data
      const prevResponse = await fetch(`/api/metrics/meta?${prevParams.toString()}`, { 
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch current period Meta data: ${response.status}`);
      }
      
      if (!prevResponse.ok) {
        throw new Error(`Failed to fetch previous period Meta data: ${prevResponse.status}`);
      }
      
      const currentData = await response.json();
      const previousData = await prevResponse.json();
      
      console.log("[HomeTab] Fetched Meta data for current period:", {
        adSpend: currentData.adSpend,
        impressions: currentData.impressions,
        clicks: currentData.clicks,
        roas: currentData.roas,
        dailyData: Array.isArray(currentData.dailyData) ? currentData.dailyData.length : 0
      });
      
      console.log("[HomeTab] Fetched Meta data for previous period:", {
        adSpend: previousData.adSpend,
        impressions: previousData.impressions,
        clicks: previousData.clicks,
        roas: previousData.roas,
        dailyData: Array.isArray(previousData.dailyData) ? previousData.dailyData.length : 0
      });
      
      // Update state with fetched data
      if (Array.isArray(currentData.dailyData) && currentData.dailyData.length > 0) {
        setMetaDaily(currentData.dailyData);
      }
      
      // Calculate percentage changes correctly using current and previous period values
      const adSpendGrowth = calculatePercentChange(currentData.adSpend || 0, previousData.adSpend || 0);
      const impressionGrowth = calculatePercentChange(currentData.impressions || 0, previousData.impressions || 0);
      const clickGrowth = calculatePercentChange(currentData.clicks || 0, previousData.clicks || 0);
      const conversionGrowth = calculatePercentChange(currentData.conversions || 0, previousData.conversions || 0);
      const roasGrowth = calculatePercentChange(currentData.roas || 0, previousData.roas || 0);
      
      // Store both current metrics and previous period metrics in our local state
      setMetaMetrics({
        adSpend: currentData.adSpend || 0,
        impressions: currentData.impressions || 0,
        clicks: currentData.clicks || 0,
        conversions: currentData.conversions || 0,
        roas: currentData.roas || 0,
        adSpendGrowth,
        impressionGrowth,
        clickGrowth,
        conversionGrowth,
        roasGrowth,
        previousAdSpend: previousData.adSpend || 0,
        previousImpressions: previousData.impressions || 0,
        previousClicks: previousData.clicks || 0,
        previousConversions: previousData.conversions || 0,
        previousRoas: previousData.roas || 0
      });
      
      hasFetchedMetaData.current = true;
    } catch (error) {
      console.error("[HomeTab] Error fetching Meta data:", error);
    } finally {
      setIsLoadingMetaData(false);
    }
  };

  // Fetch Shopify data
  const fetchShopifyData = async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to || !shopifyConnection) {
      return;
    }

    try {
      // Add a cache-busting parameter to ensure we get fresh data
      const cacheBuster = `&t=${new Date().getTime()}`
      const fromDateStr = format(dateRange.from, 'yyyy-MM-dd');
      const toDateStr = format(dateRange.to, 'yyyy-MM-dd');
      
      console.log(`[HomeTab] Fetching Shopify data for connection: ${shopifyConnection.id}`);
      const response = await fetch(`/api/metrics?brandId=${brandId}&from=${fromDateStr}&to=${toDateStr}${cacheBuster}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch Shopify metrics');
      }
      
      // We don't need to do anything with the response as the parent component will handle updating metrics
    } catch (error) {
      console.error("[HomeTab] Error fetching Shopify data:", error);
    }
  };

  // Add an effect specifically for refreshing data when the component mounts
  useEffect(() => {
    // This will run whenever the HomeTab is mounted/navigated to
    const refreshAllData = async () => {
      console.log("[HomeTab] Component mounted - refreshing all data");
      
      if (metaConnection) {
        await fetchMetaData();
      }
      
      if (shopifyConnection) {
        await fetchShopifyData();
      }
    };
    
    // Clear any Meta API blocking flags that might be set
    if (window._blockMetaApiCalls !== undefined) {
      window._blockMetaApiCalls = false;
    }
    
    // Refresh data on mount
    refreshAllData();
    
    // No dependency on dateRange to avoid duplicate fetches,
    // this is specifically for mount/navigation
  }, [brandId, metaConnection, shopifyConnection]);

  // Load Meta data when component mounts or date range changes
  useEffect(() => {
    if (validWidgets.some(widget => widget.type === 'meta') && metaConnection) {
      fetchMetaData();
    }
  }, [dateRange, brandId, metaConnection, validWidgets.length]);

  // Listen for meta data refresh events from parent components
  useEffect(() => {
    const handleMetaDataRefresh = (event: Event) => {
      if (validWidgets.some(widget => widget.type === 'meta') && metaConnection) {
        console.log("[HomeTab] Detected meta data refresh event, refreshing Meta data");
        fetchMetaData();
      }
    };

    // Listen for both event naming styles to ensure we catch all events
    window.addEventListener('metaDataRefreshed', handleMetaDataRefresh);
    window.addEventListener('meta-data-refreshed', handleMetaDataRefresh);
    
    return () => {
      window.removeEventListener('metaDataRefreshed', handleMetaDataRefresh);
      window.removeEventListener('meta-data-refreshed', handleMetaDataRefresh);
    };
  }, [metaConnection, validWidgets]);

  // Load user's saved widget configuration
  useEffect(() => {
    async function loadUserWidgets() {
      try {
        // Check localStorage first for faster loading
        const savedWidgets = localStorage.getItem(`dashboard_widgets_${brandId}`);
        if (savedWidgets) {
          setWidgets(JSON.parse(savedWidgets));
        }

        // Then load from database for persistence across devices
        const { data, error } = await supabase
          .from('dashboard_widgets')
          .select('widgets')
          .eq('brand_id', brandId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
          console.error('Error loading widgets:', error);
          return;
        }

        if (data?.widgets) {
          const parsedWidgets = data.widgets;
          setWidgets(parsedWidgets);
          // Update localStorage with the latest from the database
          localStorage.setItem(`dashboard_widgets_${brandId}`, JSON.stringify(parsedWidgets));
      }
    } catch (error) {
        console.error('Error loading widgets:', error);
      }
    }

    if (brandId) {
      loadUserWidgets();
    }
  }, [brandId]);

  // Save widgets when they change
  const saveWidgets = async (updatedWidgets: Widget[]) => {
    try {
      // Update local state
      setWidgets(updatedWidgets);
      
      // Save to localStorage for immediate persistence
      localStorage.setItem(`dashboard_widgets_${brandId}`, JSON.stringify(updatedWidgets));
      
      // Save to database for cross-device persistence
      const { error } = await supabase
        .from('dashboard_widgets')
        .upsert({ 
          brand_id: brandId, 
          widgets: updatedWidgets 
        }, { 
          onConflict: 'brand_id' 
        });

      if (error) {
        console.error('Error saving widgets:', error);
        toast.error('Failed to save your dashboard layout');
      }
    } catch (error) {
      console.error('Error saving widgets:', error);
      toast.error('Failed to save your dashboard layout');
    }
  };

  // Add a widget to the dashboard
  const addWidget = (widget: Widget) => {
    const updatedWidgets = [...widgets, widget];
    saveWidgets(updatedWidgets);
    toast.success(`Added ${widget.name} widget to dashboard`);
    
    // If adding Meta widget and we haven't fetched Meta data yet, fetch it
    if (widget.type === 'meta' && !hasFetchedMetaData.current && metaConnection) {
      fetchMetaData();
    }
  };

  // Remove a widget from the dashboard
  const removeWidget = (widgetId: string) => {
    const updatedWidgets = widgets.filter(w => w.id !== widgetId);
    saveWidgets(updatedWidgets);
    toast.success('Widget removed from dashboard');
  };

  // Modify the handleDragEnd function to work with our new sectioned layout
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    // Get droppable ID to determine which section is being dragged within
    const sourceDroppableId = result.source.droppableId;
    const destinationDroppableId = result.destination.droppableId;
    
    // Copy the current widgets array
    const newWidgets = [...widgets];
    
    // Find widget indices that match the platform type of the droppable area
    const platformType = sourceDroppableId.split('-')[1]; // 'widgets-shopify' -> 'shopify'
    const platformWidgets = newWidgets.filter(w => w.type === platformType);
    
    // If dragging between sections, handle that special case
    if (sourceDroppableId !== destinationDroppableId) {
      // This shouldn't happen with our current setup, but we handle it anyway
      toast("Can't move between sections. Widgets must stay in their platform section.");
      return;
    }
    
    // Get the correct widgets for this section
    const sectionWidgets = newWidgets.filter(w => w.type === platformType);
    
    // Get the widget that was dragged
    const [removed] = sectionWidgets.splice(result.source.index, 1);
    
    // Insert the widget at the new position
    sectionWidgets.splice(result.destination.index, 0, removed);
    
    // Map the dragged widgets back to their original indices in the full widgets array
    const updatedWidgets = [...newWidgets];
    let sectionIndex = 0;
    
    for (let i = 0; i < updatedWidgets.length; i++) {
      if (updatedWidgets[i].type === platformType) {
        updatedWidgets[i] = sectionWidgets[sectionIndex];
        sectionIndex++;
      }
    }
    
    // Update the state and save to database
    setWidgets(updatedWidgets);
    saveWidgets(updatedWidgets);
  };

  // Filter available widgets by platform and remove already added ones
  const getAvailableWidgets = () => {
    const addedWidgetIds = widgets.map(w => w.id);
    return AVAILABLE_WIDGETS.filter(widget => 
      widget.type === activeWidgetTab && !addedWidgetIds.includes(widget.id)
    );
  };

  // Get widgets already added for current platform
  const getAddedWidgets = () => {
    return widgets.filter(widget => widget.type === activeWidgetTab);
  };

  // Render a single widget based on its type
  const renderWidget = (widget: Widget, index: number) => {
    // Create empty datasets for metrics that don't exist in the Metrics type
    const emptyDataset = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 6 + i);
      return {
        date: date.toISOString(),
        value: 0
      };
    });
    
    let widgetProps: any = {
      title: (
        <div className="flex items-center gap-2">
          <div className="relative w-4 h-4">
            <Image 
              src={widget.icon || ''}
              alt={`${widget.type} logo`} 
              width={16} 
              height={16} 
              className="object-contain"
            />
          </div>
          <span>{widget.name}</span>
        </div>
      ),
      loading: (widget.type === 'meta' ? isLoadingMetaData : isLoading) || isRefreshingData,
      brandId: brandId,
      className: "mb-0", // Ensure MetricCards don't have bottom margin when in a grid
      platform: widget.type,
      dateRange: dateRange,
      // Pass isRefreshingData to child components that might need it
      isRefreshingData: isRefreshingData 
    };

    // Handle specific components first
    if (widget.component === 'SalesByProduct') {
      if (!dateRange || !dateRange.from || !dateRange.to) { // Check if dates are defined
        return (
          <div key={widget.id} className="w-full h-full col-span-full p-1 bg-[#1A1A1A] border border-[#333] rounded-lg flex items-center justify-center">
            <p className="text-gray-400">Date range not fully selected.</p>
          </div>
        ); // Or some other placeholder
      }
      // Now TypeScript knows dateRange.from and dateRange.to are Dates
      const salesByProductDateRange = { from: dateRange.from, to: dateRange.to };

      if (editMode) {
        return (
          <Draggable key={widget.id} draggableId={widget.id} index={index}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                className="relative group w-full h-full col-span-full" // Added col-span-full
              >
                <div className="absolute -top-3 -right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="destructive" size="icon" className="h-6 w-6 rounded-full" onClick={() => removeWidget(widget.id)}><X className="h-3 w-3" /></Button>
                </div>
                <div className="absolute top-1.5 right-1.5 z-10 h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 bg-[#333]/80 hover:bg-[#444]/80 transition-all cursor-move" {...provided.dragHandleProps}>
                  <GripVertical className="h-4 w-4 text-gray-300" />
                </div>
                <div className="absolute inset-0 border-2 border-dashed border-[#444] rounded-lg pointer-events-none"></div>
                <div className="p-1 bg-[#1A1A1A] border border-[#333] rounded-lg h-full"> {/* Added padding and background for consistency */}
                  <SalesByProduct brandId={brandId} dateRange={salesByProductDateRange} isRefreshing={isRefreshingData} />
                </div>
              </div>
            )}
          </Draggable>
        );
      }
      return (
        <div key={widget.id} className="w-full h-full col-span-full p-1 bg-[#1A1A1A] border border-[#333] rounded-lg"> {/* Added col-span-full */}
           <SalesByProduct brandId={brandId} dateRange={salesByProductDateRange} isRefreshing={isRefreshingData} />
        </div>
      );
    }

    if (widget.component === 'InventorySummary') {
       if (editMode) {
        return (
          <Draggable key={widget.id} draggableId={widget.id} index={index}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                className="relative group w-full h-full col-span-full" // Added col-span-full
              >
                <div className="absolute -top-3 -right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="destructive" size="icon" className="h-6 w-6 rounded-full" onClick={() => removeWidget(widget.id)}><X className="h-3 w-3" /></Button>
                </div>
                <div className="absolute top-1.5 right-1.5 z-10 h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 bg-[#333]/80 hover:bg-[#444]/80 transition-all cursor-move" {...provided.dragHandleProps}>
                  <GripVertical className="h-4 w-4 text-gray-300" />
                </div>
                <div className="absolute inset-0 border-2 border-dashed border-[#444] rounded-lg pointer-events-none"></div>
                 <div className="p-1 bg-[#1A1A1A] border border-[#333] rounded-lg h-full"> {/* Added padding and background for consistency */}
                  <InventorySummary brandId={brandId} isLoading={isLoadingMetaData || isLoading} isRefreshingData={isRefreshingData} />
                </div>
              </div>
            )}
          </Draggable>
        );
      }
      return (
        <div key={widget.id} className="w-full h-full col-span-full p-1 bg-[#1A1A1A] border border-[#333] rounded-lg"> {/* Added col-span-full */}
          <InventorySummary brandId={brandId} isLoading={isLoadingMetaData || isLoading} isRefreshingData={isRefreshingData} />
        </div>
      );
    }

    // Widget-specific props based on ID
    switch (widget.id) {
      case 'shopify-sales':
        widgetProps = {
          ...widgetProps,
          value: metrics.totalSales || 0,
          change: metrics.salesGrowth || 0,
          prefix: "$",
          valueFormat: "currency",
          data: metrics.salesData || [],
          infoTooltip: "Total revenue from all orders in the selected period"
        };
        break;
      case 'shopify-orders':
        widgetProps = {
          ...widgetProps,
          value: metrics.ordersPlaced || 0,
          change: metrics.ordersGrowth || 0,
          data: metrics.ordersData || [],
          infoTooltip: "Total number of orders placed in the selected period"
        };
        break;
      case 'shopify-aov':
        widgetProps = {
          ...widgetProps,
          value: metrics.averageOrderValue || 0,
          change: metrics.aovGrowth || 0,
          prefix: "$",
          valueFormat: "currency",
          data: metrics.aovData || [],
          infoTooltip: "Average value of orders in the selected period"
        };
        break;
      case 'shopify-units':
        widgetProps = {
          ...widgetProps,
          value: metrics.unitsSold || 0,
          change: metrics.unitsGrowth || 0,
          data: metrics.unitsSoldData || [],
          infoTooltip: "Total number of units sold in the selected period"
        };
        break;
      case 'meta-adspend':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.adSpend,
          change: metaMetrics.adSpendGrowth,
          previousValue: metaMetrics.previousAdSpend,
          prefix: "$",
          valueFormat: "currency",
          hideGraph: true,
          infoTooltip: "Total ad spend on Meta platforms"
        };
        break;
      case 'meta-impressions':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.impressions,
          change: metaMetrics.impressionGrowth,
          previousValue: metaMetrics.previousImpressions,
          hideGraph: true,
          infoTooltip: "Total number of times your ads were viewed"
        };
        break;
      case 'meta-clicks':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.clicks,
          change: metaMetrics.clickGrowth,
          previousValue: metaMetrics.previousClicks,
          hideGraph: true,
          infoTooltip: "Total number of clicks on your ads"
        };
        break;
      case 'meta-conversions':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.conversions,
          change: metaMetrics.conversionGrowth,
          previousValue: metaMetrics.previousConversions,
          hideGraph: true,
          infoTooltip: "Total number of conversions from your ads"
        };
        break;
      case 'meta-roas':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.roas,
          change: metaMetrics.roasGrowth,
          previousValue: metaMetrics.previousRoas,
          suffix: "x",
          valueFormat: "number",
          decimals: 2,
          hideGraph: true,
          infoTooltip: "Return on ad spend (revenue / ad spend)"
        };
        break;
      default:
        break;
    }

    if (editMode) {
      return (
        <Draggable key={widget.id} draggableId={widget.id} index={index}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              className="relative group"
            >
              <div className="absolute -top-3 -right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={() => removeWidget(widget.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div 
                className="absolute top-1.5 right-1.5 z-10 h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 bg-[#333]/80 hover:bg-[#444]/80 transition-all cursor-move" 
                {...provided.dragHandleProps}
              >
                <GripVertical className="h-4 w-4 text-gray-300" />
              </div>
              <div className="absolute inset-0 border-2 border-dashed border-[#444] rounded-lg pointer-events-none"></div>
              <MetricCard {...widgetProps} />
            </div>
          )}
        </Draggable>
      );
    }

    return (
      <div key={widget.id} className="w-full">
        <MetricCard {...widgetProps} />
      </div>
    );
  };

  const renderWidgetSection = (sectionWidgets: Widget[], sectionTitle: string, platformType: string, iconUrl: string) => {
    if (sectionWidgets.length === 0) return null;

    return (
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <Image 
              src={iconUrl}
              alt={sectionTitle}
              width={20}
              height={20}
              className="mr-2"
            />
            <h2 className="text-lg font-medium text-white">{sectionTitle}</h2>
          </div>
        </div>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId={`widgets-${platformType}`} direction="horizontal">
            {(provided: DroppableProvided) => (
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" 
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {sectionWidgets.map((widget, index) => renderWidget(widget, index))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    );
  };

  useEffect(() => {
    // Update editMode when isEditMode prop changes
    setEditMode(isEditMode);
  }, [isEditMode]);

  return (
    <div className="space-y-2">
      {validWidgets.length === 0 ? (
        <Card className="bg-[#111] border-[#333] text-center py-10">
          <CardContent className="flex flex-col items-center">
            <LayoutGrid className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Your Dashboard Awaits</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Click the grid icon above to add widgets from Shopify, Meta, and other platforms to build your personalized view.
            </p>
            <Button
              size="lg"
              onClick={() => setIsWidgetSelectorOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Your First Widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Header with Edit Controls */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <div className="flex space-x-2">
              {editMode ? (
                <>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setIsWidgetSelectorOpen(true)}
                    className="flex items-center"
                  >
                    <PlusCircle className="mr-1 h-4 w-4" />
                    Add/Remove Widgets
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      // When done editing, just turn off edit mode
                      setEditMode(false);
                    }}
                  >
                    Done
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsWidgetSelectorOpen(true);
                    }}
                    className="flex items-center"
                  >
                    <PlusCircle className="mr-1 h-4 w-4" />
                    Add Widgets
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                    className="flex items-center"
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit Layout
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Shopify Section */}
          {renderWidgetSection(
            shopifyWidgets, 
            "Shopify", 
            "shopify", 
            "https://i.imgur.com/cnCcupx.png"
          )}
          
          {/* Meta Section */}
          {renderWidgetSection(
            metaWidgets, 
            "Meta Ads", 
            "meta", 
            "https://i.imgur.com/6hyyRrs.png"
          )}
        </>
      )}

      {/* Widget Selector Dialog */}
      <Dialog open={isWidgetSelectorOpen} onOpenChange={setIsWidgetSelectorOpen}>
        <DialogContent className="sm:max-w-lg bg-[#111] border-[#333]">
          <DialogHeader>
            <DialogTitle className="text-white">Add Widgets</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose widgets to add to your dashboard. They will be placed in the appropriate section based on platform.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs 
            defaultValue={activeWidgetTab} 
            value={activeWidgetTab} 
            onValueChange={(value) => setActiveWidgetTab(value as 'shopify' | 'meta')}
            className="mt-4"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-[#222] border-[#444]">
              <TabsTrigger 
                value="shopify" 
                className={cn(
                  "flex items-center text-gray-300 data-[state=active]:bg-[#333] data-[state=active]:text-white",
                  "focus-visible:ring-offset-0 focus-visible:ring-primary"
                )}
              >
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify" 
                  width={16} 
                  height={16} 
                  className="mr-2"
                />
                Shopify
              </TabsTrigger>
              <TabsTrigger 
                value="meta" 
                className={cn(
                  "flex items-center text-gray-300 data-[state=active]:bg-[#333] data-[state=active]:text-white",
                  "focus-visible:ring-offset-0 focus-visible:ring-primary"
                )}
              >
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png"
                  alt="Meta" 
                  width={16} 
                  height={16} 
                  className="mr-2"
                />
                Meta
              </TabsTrigger>
            </TabsList>
            
           <div className="px-1 py-2">
              {/* Selected widgets section */}
              {getAddedWidgets().length > 0 && (
                <>
                  <h3 className="text-white text-sm font-medium mb-2">Selected Widgets</h3>
                  <div className="grid grid-cols-1 gap-3 mb-4">
                    {getAddedWidgets().map(widget => (
                      <Card 
                        key={widget.id} 
                        className="flex justify-between items-center p-3 bg-[#1A1A1A] border-[#333]"
                      >
                        <div className="flex items-center">
                          <div className="mr-3 bg-[#333] p-2 rounded-lg">
                            <Image 
                              src={widget.icon || ''} 
                              alt={widget.type} 
                              width={24} 
                              height={24} 
                              className="object-contain"
                            />
              </div>
                          <div>
                            <h4 className="font-medium text-white">{widget.name}</h4>
                            <p className="text-sm text-gray-400">{widget.description}</p>
                </div>
              </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-white hover:bg-[#333]"
                          onClick={() => removeWidget(widget.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Available widgets section */}
              {getAvailableWidgets().length > 0 && (
                <>
                  <h3 className="text-white text-sm font-medium mb-2">Available Widgets</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {getAvailableWidgets().map(widget => (
                      <Card 
                        key={widget.id} 
                        className="flex justify-between items-center p-3 cursor-pointer bg-[#1A1A1A] border-[#333] hover:bg-[#2A2A2A] transition-colors duration-150"
                        onClick={() => {
                          addWidget(widget);
                        }}
                      >
                        <div className="flex items-center">
                          <div className="mr-3 bg-[#333] p-2 rounded-lg">
                            <Image 
                              src={widget.icon || ''} 
                              alt={widget.type} 
                              width={24} 
                              height={24} 
                              className="object-contain"
                            />
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{widget.name}</h4>
                            <p className="text-sm text-gray-400">{widget.description}</p>
                          </div>
                        </div>
                        <PlusCircle className="h-5 w-5 text-gray-400 hover:text-white" />
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {getAvailableWidgets().length === 0 && getAddedWidgets().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No {activeWidgetTab} widgets available.</p>
                </div>
              )}
              </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
} 