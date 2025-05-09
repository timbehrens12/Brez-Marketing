"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Metrics } from '@/types/metrics'
import { PlatformConnection } from '@/types/platformConnection'
import { DateRange } from 'react-day-picker'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, X, Settings, Pencil, GripVertical, ShoppingBag, Facebook, LayoutGrid, MoveUp, MoveDown, ArrowUp, ArrowDown, Plus, Edit } from "lucide-react"
import Image from "next/image"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { MetricCard } from "@/components/metrics/MetricCard"
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

// Define inventory item type (topProducts is already defined in Metrics)
interface InventoryItem {
  id: string;
  name: string;
  image?: string;
  quantity: number;
  price: number;
}

// Extend Metrics type to add our custom properties
interface ExtendedMetrics extends Metrics {
  dailyMetaData?: DailyDataItem[];
  inventory?: InventoryItem[];
}

// Define the widget types we can add to the home page
interface Widget {
  id: string;
  type: 'shopify' | 'meta';
  name: string;
  component: string;
  description?: string;
  icon?: string;
  isFullWidth?: boolean; // New property to identify full-width widgets
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
  // New Full-Width Shopify Widgets
  {
    id: 'shopify-products',
    type: 'shopify',
    name: 'Sales by Product',
    component: 'ProductSalesChart',
    description: 'Sales breakdown by product',
    icon: 'https://i.imgur.com/cnCcupx.png',
    isFullWidth: true
  },
  {
    id: 'shopify-inventory',
    type: 'shopify',
    name: 'Inventory',
    component: 'InventoryTable',
    description: 'Current inventory levels',
    icon: 'https://i.imgur.com/cnCcupx.png',
    isFullWidth: true
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

  // Move widget up in order within its section
  const moveWidgetUp = (widgetId: string) => {
    const widgetIndex = widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex <= 0) return; // Already at top

    const widget = widgets[widgetIndex];
    const sameTypeWidgets = widgets.filter(w => w.type === widget.type);
    const widgetTypeIndex = sameTypeWidgets.findIndex(w => w.id === widgetId);
    
    if (widgetTypeIndex <= 0) return; // Already at top of its section

    const newWidgets = [...widgets];
    const targetIndex = widgets.findIndex(w => w.id === sameTypeWidgets[widgetTypeIndex - 1].id);
    
    newWidgets.splice(widgetIndex, 1); // Remove the widget
    newWidgets.splice(targetIndex, 0, widget); // Insert at new position
    
    saveWidgets(newWidgets);
  };

  // Move widget down in order within its section
  const moveWidgetDown = (widgetId: string) => {
    const widgetIndex = widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1 || widgetIndex >= widgets.length - 1) return; // Already at bottom

    const widget = widgets[widgetIndex];
    const sameTypeWidgets = widgets.filter(w => w.type === widget.type);
    const widgetTypeIndex = sameTypeWidgets.findIndex(w => w.id === widgetId);
    
    if (widgetTypeIndex >= sameTypeWidgets.length - 1) return; // Already at bottom of its section

    const newWidgets = [...widgets];
    const targetIndex = widgets.findIndex(w => w.id === sameTypeWidgets[widgetTypeIndex + 1].id);
    
    newWidgets.splice(widgetIndex, 1); // Remove the widget
    newWidgets.splice(targetIndex, 0, widget); // Insert at new position
    
    saveWidgets(newWidgets);
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

    // For full-width widgets, render different components
    if (widget.isFullWidth) {
      // Common props for full-width widgets
      const fullWidthProps = {
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
        loading: isLoading || isRefreshingData,
        brandId: brandId,
        dateRange: dateRange
      };

      // Component-specific props
      let componentContent;
      switch (widget.id) {
        case 'shopify-products':
          componentContent = (
            <Card className="w-full bg-[#111] border-[#333]">
              <CardHeader>
                {fullWidthProps.title}
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col">
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse text-gray-400">Loading product data...</div>
                  </div>
                ) : (
                  <>
                    {metrics.topProducts && metrics.topProducts.length > 0 ? (
                      <div className="flex-1 flex flex-col">
                        <div className="grid grid-cols-12 mb-2 text-sm text-gray-400 border-b border-[#222] pb-2">
                          <div className="col-span-5">Product</div>
                          <div className="col-span-2 text-right">Units</div>
                          <div className="col-span-3 text-right">Sales</div>
                          <div className="col-span-2 text-right">% of Total</div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {metrics.topProducts.map((product, idx) => (
                            <div key={idx} className="grid grid-cols-12 py-2 border-b border-[#222] text-sm">
                              <div className="col-span-5 text-white flex items-center">
                                {/* Use product image placeholder since topProducts doesn't have image */}
                                <div className="w-8 h-8 mr-2 rounded bg-[#333] flex items-center justify-center">
                                  <ShoppingBag className="w-4 h-4 text-gray-400" />
                                </div>
                                <span className="truncate">{product.title}</span>
                              </div>
                              <div className="col-span-2 text-right text-gray-300">{product.quantity.toLocaleString()}</div>
                              <div className="col-span-3 text-right text-white">
                                ${product.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="col-span-2 text-right text-gray-300">
                                {((product.revenue / (metrics.totalSales || 1)) * 100).toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-gray-500">
                        No product data available
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
          break;
        case 'shopify-inventory':
          // Simple mock inventory data since it's not in the Metrics interface
          const mockInventory: InventoryItem[] = [
            { id: '1', name: 'T-Shirt', quantity: 23, price: 24.99 },
            { id: '2', name: 'Hoodie', quantity: 8, price: 49.99 },
            { id: '3', name: 'Jeans', quantity: 15, price: 59.99 },
            { id: '4', name: 'Hat', quantity: 0, price: 19.99 },
            { id: '5', name: 'Sneakers', quantity: 3, price: 89.99 },
          ];
          
          componentContent = (
            <Card className="w-full bg-[#111] border-[#333]">
              <CardHeader>
                {fullWidthProps.title}
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col">
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse text-gray-400">Loading inventory data...</div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 flex flex-col">
                      <div className="grid grid-cols-12 mb-2 text-sm text-gray-400 border-b border-[#222] pb-2">
                        <div className="col-span-5">Product</div>
                        <div className="col-span-2 text-right">In Stock</div>
                        <div className="col-span-3 text-right">Price</div>
                        <div className="col-span-2 text-right">Status</div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {mockInventory.map((item, idx) => (
                          <div key={idx} className="grid grid-cols-12 py-2 border-b border-[#222] text-sm">
                            <div className="col-span-5 text-white flex items-center">
                              <div className="w-8 h-8 mr-2 rounded bg-[#333] flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4 text-gray-400" />
                              </div>
                              <span className="truncate">{item.name}</span>
                            </div>
                            <div className="col-span-2 text-right text-gray-300">{item.quantity}</div>
                            <div className="col-span-3 text-right text-white">
                              ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="col-span-2 text-right">
                              <span 
                                className={`px-2 py-1 rounded text-xs ${
                                  item.quantity > 10 
                                    ? 'bg-green-900/30 text-green-400' 
                                    : item.quantity > 0 
                                      ? 'bg-yellow-900/30 text-yellow-400' 
                                      : 'bg-red-900/30 text-red-400'
                                }`}
                              >
                                {item.quantity > 10 ? 'In Stock' : item.quantity > 0 ? 'Low Stock' : 'Out of Stock'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
          break;
        default:
          componentContent = <div>Unknown full-width widget type</div>;
          break;
      }

      if (isEditMode) {
        return (
          <div key={widget.id} className="relative group col-span-full">
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
            
            <div className="absolute top-1/2 -left-3 z-10 transform -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 bg-[#333] text-gray-300 hover:bg-[#444]"
                onClick={() => moveWidgetUp(widget.id)}
                disabled={index === 0}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 bg-[#333] text-gray-300 hover:bg-[#444]"
                onClick={() => moveWidgetDown(widget.id)}
                disabled={index === widgets.filter(w => w.type === widget.type).length - 1}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="absolute inset-0 border-2 border-dashed border-[#444] rounded-lg pointer-events-none"></div>
            {componentContent}
          </div>
        );
      }

      return (
        <div key={widget.id} className="col-span-full">
          {componentContent}
        </div>
      );
    }

    // For regular widgets, use MetricCard as before
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
      className: "mb-0",
      platform: widget.type,
      dateRange: dateRange
    };

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

    if (isEditMode) {
      return (
        <div key={widget.id} className="relative group">
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
          
          <div className="absolute top-1/2 -left-3 z-10 transform -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6 bg-[#333] text-gray-300 hover:bg-[#444]"
              onClick={() => moveWidgetUp(widget.id)}
              disabled={index === 0}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6 bg-[#333] text-gray-300 hover:bg-[#444]"
              onClick={() => moveWidgetDown(widget.id)}
              disabled={index === widgets.filter(w => w.type === widget.type).length - 1}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="absolute inset-0 border-2 border-dashed border-[#444] rounded-lg pointer-events-none"></div>
          <MetricCard {...widgetProps} />
        </div>
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

    // Group widgets into regular and full-width
    const regularWidgets = sectionWidgets.filter(w => !w.isFullWidth);
    const fullWidthWidgets = sectionWidgets.filter(w => w.isFullWidth);

    return (
      <div className="mb-5 relative">
        <div className="flex items-center mb-2">
          <Image 
            src={iconUrl}
            alt={sectionTitle}
            width={20}
            height={20}
            className="mr-2"
          />
          <h2 className="text-lg font-medium text-white">{sectionTitle}</h2>
          
          {/* Add button for this section - visible only in edit mode */}
          {isEditMode && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 h-7 w-7 rounded-full bg-[#333] hover:bg-[#444]"
              onClick={() => {
                setActiveWidgetTab(platformType as 'shopify' | 'meta');
                setIsWidgetSelectorOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Render regular widgets in a grid */}
          {regularWidgets.map((widget, index) => renderWidget(widget, sectionWidgets.indexOf(widget)))}
          
          {/* Render full-width widgets (each takes up full row) */}
          {fullWidthWidgets.map((widget, index) => renderWidget(widget, sectionWidgets.indexOf(widget)))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 relative">
      {validWidgets.length === 0 ? (
        <Card className="bg-[#111] border-[#333] text-center py-10">
          <CardContent className="flex flex-col items-center">
            <LayoutGrid className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Build Your Custom Dashboard</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Add widgets from your connected platforms to create a personalized view of your most important metrics.
            </p>
            <Button
              size="lg"
              onClick={() => setIsWidgetSelectorOpen(true)}
              className="bg-[#444] hover:bg-[#555] text-white"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Widgets
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
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
                disabled={!shopifyConnection}
              >
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify" 
                  width={16} 
                  height={16} 
                  className="mr-2"
                />
                Shopify
                {!shopifyConnection && <span className="ml-1 text-xs">(Not Connected)</span>}
              </TabsTrigger>
              <TabsTrigger 
                value="meta" 
                className={cn(
                  "flex items-center text-gray-300 data-[state=active]:bg-[#333] data-[state=active]:text-white",
                  "focus-visible:ring-offset-0 focus-visible:ring-primary"
                )}
                disabled={!metaConnection}
              >
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png"
                  alt="Meta" 
                  width={16} 
                  height={16} 
                  className="mr-2"
                />
                Meta
                {!metaConnection && <span className="ml-1 text-xs">(Not Connected)</span>}
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

              {/* Available widgets section with improved layout and visuals */}
              {getAvailableWidgets().length > 0 && (
                <>
                  <h3 className="text-white text-sm font-medium mb-2">Available Widgets</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getAvailableWidgets().map(widget => (
                      <Card 
                        key={widget.id} 
                        className="flex flex-col p-4 cursor-pointer bg-[#1A1A1A] border-[#333] hover:bg-[#2A2A2A] transition-colors duration-150"
                        onClick={() => {
                          addWidget(widget);
                          // Optional: close modal when adding if that's better UX
                          // setIsWidgetSelectorOpen(false); 
                        }}
                      >
                        <div className="flex items-center mb-2">
                          <div className="mr-3 bg-[#333] p-2 rounded-lg">
                            <Image 
                              src={widget.icon || ''} 
                              alt={widget.type} 
                              width={24} 
                              height={24} 
                              className="object-contain"
                            />
                          </div>
                          <h4 className="font-medium text-white text-lg">{widget.name}</h4>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">{widget.description}</p>
                        <div className="mt-auto pt-2 border-t border-[#333] flex justify-end">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="bg-[#333] hover:bg-[#444] border-[#555] text-white"
                          >
                            <PlusCircle className="h-4 w-4 mr-1" /> Add
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {getAvailableWidgets().length === 0 && getAddedWidgets().length === 0 && (
                <div className="text-center py-8">
                  <LayoutGrid className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No {activeWidgetTab} widgets available.</p>
                  {activeWidgetTab === 'shopify' && !shopifyConnection && (
                    <p className="text-gray-500 mt-2">Connect your Shopify store to add widgets.</p>
                  )}
                  {activeWidgetTab === 'meta' && !metaConnection && (
                    <p className="text-gray-500 mt-2">Connect your Meta Ads account to add widgets.</p>
                  )}
                </div>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
} 