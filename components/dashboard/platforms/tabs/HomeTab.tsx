"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Metrics } from '@/types/metrics'
import { PlatformConnection } from '@/types/platformConnection'
import { DateRange } from 'react-day-picker'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  PlusCircle, X, Settings, Pencil, GripVertical, ShoppingBag, Facebook, LayoutGrid, 
  MoveUp, MoveDown, ArrowUp, ArrowDown, Plus, Edit, DollarSign, Eye, 
  MousePointer, Users, TrendingUp, Target, Percent, Activity, Zap 
} from "lucide-react"
import Image from "next/image"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { MetricCard } from "@/components/metrics/MetricCard"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format, isSameDay, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { SalesByProduct } from '@/components/dashboard/SalesByProduct'
import { InventorySummary } from '@/components/dashboard/InventorySummary'
import { TotalBudgetMetricCard } from '@/components/metrics/TotalBudgetMetricCard'
import { TotalAdSetReachCard } from '@/components/dashboard/platforms/metrics/TotalAdSetReachCard'
import { CampaignWidget } from '@/components/dashboard/platforms/tabs/CampaignWidget'

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
  fullWidth?: boolean;
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
  // Add full-width Shopify widgets
  {
    id: 'shopify-sales-by-product',
    type: 'shopify',
    name: 'Sales by Product',
    component: 'SalesByProduct',
    description: 'Product-specific sales performance',
    icon: 'https://i.imgur.com/cnCcupx.png',
    fullWidth: true
  },
  {
    id: 'shopify-inventory',
    type: 'shopify',
    name: 'Inventory Summary',
    component: 'InventorySummary',
    description: 'Current inventory status and metrics',
    icon: 'https://i.imgur.com/cnCcupx.png',
    fullWidth: true
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
  },
  // Additional Meta widgets
  { 
    id: 'meta-reach', 
    type: 'meta', 
    name: 'Reach', 
    component: 'TotalAdSetReachCard',
    description: 'Estimated number of unique people who saw your ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-budget', 
    type: 'meta', 
    name: 'Total Budget', 
    component: 'TotalBudgetMetricCard',
    description: 'Total budget for all active Meta ad sets',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-ctr', 
    type: 'meta', 
    name: 'CTR', 
    component: 'MetricCard',
    description: 'Click-through rate on your Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-cpc', 
    type: 'meta', 
    name: 'Cost Per Click', 
    component: 'MetricCard',
    description: 'Average cost per click on your Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-cpr', 
    type: 'meta', 
    name: 'Cost Per Result', 
    component: 'MetricCard',
    description: 'Average cost per result on your Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-results', 
    type: 'meta', 
    name: 'Results', 
    component: 'MetricCard',
    description: 'Total number of results from your Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-purchase-value', 
    type: 'meta', 
    name: 'Purchase Value', 
    component: 'MetricCard',
    description: 'Total purchase value from Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-campaigns', 
    type: 'meta', 
    name: 'Campaign Performance', 
    component: 'CampaignWidget',
    description: 'Performance metrics for Meta ad campaigns',
    icon: 'https://i.imgur.com/6hyyRrs.png',
    fullWidth: true
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
    previousRoas: 0,
    ctr: 0,
    ctrGrowth: 0,
    cpc: 0,
    costPerResult: 0,
    cprGrowth: 0
  });

  // Additional state for Meta campaign widget
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isSyncingCampaigns, setIsSyncingCampaigns] = useState(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  
  // Add state to track the last fetched dates for campaigns
  const lastFetchedCampaignDates = useRef({from: '', to: ''});
  
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
        previousRoas: previousData.roas || 0,
        ctr: currentData.ctr || 0,
        ctrGrowth: calculatePercentChange(currentData.ctr || 0, previousData.ctr || 0),
        cpc: currentData.cpc || 0,
        costPerResult: currentData.costPerResult || 0,
        cprGrowth: calculatePercentChange(currentData.cprGrowth || 0, previousData.cprGrowth || 0)
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
    // Get widgets of the same type AND same layout (standard or full-width)
    const isFullWidth = widget.fullWidth === true;
    const sameTypeAndLayoutWidgets = widgets.filter(
      w => w.type === widget.type && (w.fullWidth === true) === isFullWidth
    );
    
    const widgetTypeIndex = sameTypeAndLayoutWidgets.findIndex(w => w.id === widgetId);
    
    if (widgetTypeIndex <= 0) return; // Already at top of its section

    const newWidgets = [...widgets];
    const targetIndex = widgets.findIndex(w => w.id === sameTypeAndLayoutWidgets[widgetTypeIndex - 1].id);
    
    newWidgets.splice(widgetIndex, 1); // Remove the widget
    newWidgets.splice(targetIndex, 0, widget); // Insert at new position
    
    saveWidgets(newWidgets);
  };

  // Move widget down in order within its section
  const moveWidgetDown = (widgetId: string) => {
    const widgetIndex = widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1 || widgetIndex >= widgets.length - 1) return; // Already at bottom

    const widget = widgets[widgetIndex];
    // Get widgets of the same type AND same layout (standard or full-width)
    const isFullWidth = widget.fullWidth === true;
    const sameTypeAndLayoutWidgets = widgets.filter(
      w => w.type === widget.type && (w.fullWidth === true) === isFullWidth
    );
    
    const widgetTypeIndex = sameTypeAndLayoutWidgets.findIndex(w => w.id === widgetId);
    
    if (widgetTypeIndex >= sameTypeAndLayoutWidgets.length - 1) return; // Already at bottom of its section

    const newWidgets = [...widgets];
    const targetIndex = widgets.findIndex(w => w.id === sameTypeAndLayoutWidgets[widgetTypeIndex + 1].id);
    
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

  // Function to fetch campaign data from the API
  const fetchCampaigns = useCallback(async (forceRefresh = false) => {
    if (!brandId || !metaConnection) {
      console.log('[HomeTab] Cannot fetch campaigns without brandId or Meta connection');
      return;
    }
    
    // Set loading state if we're doing a manual refresh or if campaigns are empty
    if (forceRefresh || campaigns.length === 0) {
      setIsLoadingCampaigns(true);
    }
    
    try {
      // Construct the URL with required parameters
      let url = `/api/meta/campaigns?brandId=${brandId}`;
      
      // Add date range parameters if available
      if (dateRange?.from && dateRange?.to) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        const toDate = dateRange.to.toISOString().split('T')[0];
        url += `&from=${fromDate}&to=${toDate}`;
        
        // Skip refresh if dates haven't changed and not forcing
        if (!forceRefresh && 
            lastFetchedCampaignDates.current.from === fromDate && 
            lastFetchedCampaignDates.current.to === toDate &&
            campaigns.length > 0) {
          console.log(`[HomeTab] Using cached campaigns data for range ${fromDate} to ${toDate}`);
          return campaigns;
        }
        
        // Update last fetched dates
        lastFetchedCampaignDates.current = { from: fromDate, to: toDate };
        console.log(`[HomeTab] Fetching campaigns with date range: ${fromDate} to ${toDate}`);
      }
      
      // Add forceRefresh parameter if needed
      if (forceRefresh) {
        url += `&forceRefresh=true`;
      }
      
      console.log(`[HomeTab] Fetching campaigns from ${url}`);
      
      const response = await fetch(url, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns data: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data.campaigns)) {
        console.log(`[HomeTab] Successfully fetched ${data.campaigns.length} campaigns`);
        setCampaigns(data.campaigns);
        return data.campaigns;
      } else {
        console.warn('[HomeTab] Received invalid campaigns data format');
        return campaigns; // Return existing campaigns on error
      }
    } catch (error) {
      console.error('[HomeTab] Error fetching campaigns:', error);
      toast.error('Failed to load campaign data');
      return campaigns; // Return existing campaigns on error
    } finally {
      // Add a small delay before setting loading to false for smoother UX
      setTimeout(() => setIsLoadingCampaigns(false), 300);
    }
  }, [brandId, dateRange, metaConnection, campaigns]);

  // Function to sync campaign data with Meta
  const syncCampaigns = useCallback(async () => {
    if (!brandId || !metaConnection) {
      console.log('[HomeTab] Cannot sync campaigns without brandId or Meta connection');
      return;
    }
    
    setIsSyncingCampaigns(true);
    toast.loading("Syncing Meta campaigns...", { id: "meta-campaigns-sync" });
    
    try {
      const response = await fetch(`/api/meta/campaigns/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          forceRefresh: true
        }),
      });
      
      if (response.ok) {
        toast.success("Meta campaigns synced", { id: "meta-campaigns-sync" });
        // Reload campaigns after sync
        fetchCampaigns(true);
      } else {
        toast.error("Failed to sync Meta campaigns", { id: "meta-campaigns-sync" });
      }
    } catch (error) {
      console.error('[HomeTab] Error syncing Meta campaigns:', error);
      toast.error("Error syncing Meta campaigns", { id: "meta-campaigns-sync" });
    } finally {
      setIsSyncingCampaigns(false);
    }
  }, [brandId, metaConnection, fetchCampaigns]);

  // Add an effect to fetch campaign data when needed
  useEffect(() => {
    if (metaConnection && validWidgets.some(widget => widget.id === 'meta-campaigns')) {
      fetchCampaigns();
    }
  }, [metaConnection, dateRange, fetchCampaigns, validWidgets]);

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

    // For demo, we'll use MetricCard for all widgets with different properties
    // In a real implementation, you'd render different components based on widget.component
    
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
      case 'shopify-sales-by-product':
        // Sales by Product widget (full width)
        if (isEditMode) {
          return (
            <div key={widget.id} className="col-span-full relative group mb-4">
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
              
              <div className="absolute top-1/2 -left-3 z-10 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 bg-[#333] text-gray-300 hover:bg-[#444]"
                  onClick={() => moveWidgetUp(widget.id)}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 bg-[#333] text-gray-300 hover:bg-[#444]"
                  onClick={() => moveWidgetDown(widget.id)}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="absolute inset-0 border-2 border-dashed border-[#444] rounded-lg pointer-events-none"></div>
              {dateRange.from && dateRange.to ? (
                <SalesByProduct 
                  brandId={brandId}
                  dateRange={{
                    from: dateRange.from,
                    to: dateRange.to
                  }}
                  isRefreshing={isRefreshingData}
                />
              ) : (
                <Card className="bg-[#111] border-[#333] p-6 text-center">
                  <CardContent>
                    <p className="text-gray-400">Please select a date range to view sales by product</p>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        }
        
        return (
          <div key={widget.id} className="col-span-full mb-4">
            {dateRange.from && dateRange.to ? (
              <SalesByProduct 
                brandId={brandId}
                dateRange={{
                  from: dateRange.from,
                  to: dateRange.to
                }}
                isRefreshing={isRefreshingData}
              />
            ) : (
              <Card className="bg-[#111] border-[#333] p-6 text-center">
                <CardContent>
                  <p className="text-gray-400">Please select a date range to view sales by product</p>
                </CardContent>
              </Card>
            )}
          </div>
        );
        
      case 'shopify-inventory':
        // Inventory Summary widget (full width)
        if (isEditMode) {
          return (
            <div key={widget.id} className="col-span-full relative group mb-4">
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
              
              <div className="absolute top-1/2 -left-3 z-10 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 bg-[#333] text-gray-300 hover:bg-[#444]"
                  onClick={() => moveWidgetUp(widget.id)}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 bg-[#333] text-gray-300 hover:bg-[#444]"
                  onClick={() => moveWidgetDown(widget.id)}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="absolute inset-0 border-2 border-dashed border-[#444] rounded-lg pointer-events-none"></div>
              <InventorySummary 
                brandId={brandId}
                isLoading={isLoading}
                isRefreshingData={isRefreshingData}
              />
            </div>
          );
        }
        
        return (
          <div key={widget.id} className="col-span-full mb-4">
            <InventorySummary 
              brandId={brandId}
              isLoading={isLoading}
              isRefreshingData={isRefreshingData}
            />
          </div>
        );
        
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
      case 'meta-ctr':
        widgetProps = {
          ...widgetProps,
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
              <Percent className="h-4 w-4 text-blue-400" />
            </div>
          ),
          value: metaMetrics.ctr || 0,
          change: metaMetrics.ctrGrowth || 0,
          valueFormat: "number",
          decimals: 2,
          suffix: "%",
          hideGraph: true,
          infoTooltip: "Click-through rate (clicks ÷ impressions)"
        };
        break;
      case 'meta-cpc':
        widgetProps = {
          ...widgetProps,
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
              <MousePointer className="h-4 w-4 text-indigo-400" />
            </div>
          ),
          value: metaMetrics.cpc || 0,
          prefix: "$",
          valueFormat: "currency",
          decimals: 2,
          hideGraph: true,
          infoTooltip: "Average cost per click (spend ÷ clicks)"
        };
        break;
      case 'meta-cpr':
        widgetProps = {
          ...widgetProps,
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
              <DollarSign className="h-4 w-4 text-orange-400" />
            </div>
          ),
          value: metaMetrics.costPerResult || 0,
          change: metaMetrics.cprGrowth || 0,
          prefix: "$",
          valueFormat: "currency",
          hideGraph: true,
          infoTooltip: "Average cost per result"
        };
        break;
      case 'meta-results':
        widgetProps = {
          ...widgetProps,
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
              <Target className="h-4 w-4 text-red-400" />
            </div>
          ),
          value: 0, // This value needs to be fetched directly from API
          valueFormat: "number",
          hideGraph: true,
          infoTooltip: "Total number of results from your ads"
        };
        break;
      case 'meta-purchase-value':
        widgetProps = {
          ...widgetProps,
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
              <ShoppingBag className="h-4 w-4 text-green-400" />
            </div>
          ),
          value: 0, // This value needs to be fetched directly from API
          prefix: "$",
          valueFormat: "currency",
          hideGraph: true,
          infoTooltip: "Total purchase value from your ads"
        };
        break;
      case 'meta-reach':
        // Special handling for the Reach widget using TotalAdSetReachCard
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
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 bg-[#333] text-gray-300 hover:bg-[#444]"
                  onClick={() => moveWidgetDown(widget.id)}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="absolute inset-0 border-2 border-dashed border-[#444] rounded-lg pointer-events-none"></div>
              <TotalAdSetReachCard 
                brandId={brandId} 
                dateRange={dateRange.from && dateRange.to ? dateRange : undefined}
                isManuallyRefreshing={isRefreshingData}
              />
            </div>
          );
        }
        
        return (
          <div key={widget.id} className="w-full">
            <TotalAdSetReachCard 
              brandId={brandId} 
              dateRange={dateRange.from && dateRange.to ? dateRange : undefined}
              isManuallyRefreshing={isRefreshingData}
            />
          </div>
        );
        
      case 'meta-budget':
        // Special handling for the Total Budget widget using TotalBudgetMetricCard
        if (isEditMode) {
          return (
            <div key={widget.id} className="relative group w-full h-full">
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
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 bg-[#333] text-gray-300 hover:bg-[#444]"
                  onClick={() => moveWidgetDown(widget.id)}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="absolute inset-0 border-2 border-dashed border-[#444] rounded-lg pointer-events-none"></div>
              <div className="h-full flex">
                <Card className="bg-[#111] border-[#333] w-full">
                  <TotalBudgetMetricCard 
                    brandId={brandId}
                    isManuallyRefreshing={isRefreshingData}
                  />
                </Card>
              </div>
            </div>
          );
        }
        
        return (
          <div key={widget.id} className="w-full h-full">
            <Card className="bg-[#111] border-[#333] w-full h-full">
              <TotalBudgetMetricCard 
                brandId={brandId}
                isManuallyRefreshing={isRefreshingData}
              />
            </Card>
          </div>
        );
        
      case 'meta-campaigns':
        // Campaign Widget (full width)
        if (isEditMode) {
          return (
            <div key={widget.id} className="col-span-full relative group mb-4">
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
              
              <div className="absolute top-1/2 -left-3 z-10 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 bg-[#333] text-gray-300 hover:bg-[#444]"
                  onClick={() => moveWidgetUp(widget.id)}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 bg-[#333] text-gray-300 hover:bg-[#444]"
                  onClick={() => moveWidgetDown(widget.id)}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="absolute inset-0 border-2 border-dashed border-[#444] rounded-lg pointer-events-none"></div>
              <CampaignWidget 
                brandId={brandId}
                campaigns={campaigns}
                isLoading={isLoadingCampaigns || isLoading}
                isSyncing={isSyncingCampaigns}
                dateRange={dateRange}
                onRefresh={fetchCampaigns}
                onSync={syncCampaigns}
              />
            </div>
          );
        }
        
        return (
          <div key={widget.id} className="col-span-full mb-4">
            <CampaignWidget 
              brandId={brandId}
              campaigns={campaigns}
              isLoading={isLoadingCampaigns || isLoading}
              isSyncing={isSyncingCampaigns}
              dateRange={dateRange}
              onRefresh={fetchCampaigns}
              onSync={syncCampaigns}
            />
          </div>
        );
        
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

    // Separate standard widgets from full-width widgets
    const standardWidgets = sectionWidgets.filter(w => !w.fullWidth);
    const fullWidthWidgets = sectionWidgets.filter(w => w.fullWidth);

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
        
        {/* Render standard-sized widgets in a grid */}
        {standardWidgets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {standardWidgets.map((widget, index) => renderWidget(widget, index))}
          </div>
        )}
        
        {/* Render full-width widgets in sequence */}
        {fullWidthWidgets.map((widget, index) => renderWidget(widget, index + standardWidgets.length))}
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
        <DialogContent className="sm:max-w-lg bg-[#111] border-[#333] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="pb-2 shrink-0">
            <DialogTitle className="text-white">Add Widgets</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose widgets to add to your dashboard.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs 
            defaultValue={activeWidgetTab} 
            value={activeWidgetTab} 
            onValueChange={(value) => setActiveWidgetTab(value as 'shopify' | 'meta')}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-[#222] border-[#444] shrink-0">
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
            
            <div className="px-1 py-0 overflow-y-auto flex-1 min-h-0 h-[60vh]">
              {getAvailableWidgets().length === 0 && getAddedWidgets().length === 0 ? (
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
              ) : (
                <div className="space-y-6">
                  {/* Selected widgets section - at the top */}
                  {getAddedWidgets().length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-medium">Your Selected Widgets</h3>
                        <span className="text-xs text-gray-400">{getAddedWidgets().length} selected</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {getAddedWidgets().map(widget => (
                          <Card 
                            key={widget.id} 
                            className="flex items-center p-3 bg-[#1A1A1A] border-[#333]"
                          >
                            <div className="mr-3 bg-[#333] p-2 rounded-lg">
                              <Image 
                                src={widget.icon || ''} 
                                alt={widget.type} 
                                width={20} 
                                height={20} 
                                className="object-contain"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center">
                                <h4 className="font-medium text-white">{widget.name}</h4>
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
                    </div>
                  )}
                  
                  {/* Widget categories - now showing all available widgets together */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-medium">Available Widgets</h3>
                      <span className="text-xs text-gray-400">{getAvailableWidgets().length} available</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getAvailableWidgets().map(widget => (
                        <Card 
                          key={widget.id} 
                          className="flex flex-col p-3 cursor-pointer bg-[#1A1A1A] border-[#333] hover:bg-[#2A2A2A] transition-colors duration-150"
                          onClick={() => {
                            addWidget(widget);
                          }}
                        >
                          <div className="flex items-center">
                            <div className="mr-3 bg-[#333] p-2 rounded-lg">
                              <Image 
                                src={widget.icon || ''} 
                                alt={widget.type} 
                                width={20} 
                                height={20} 
                                className="object-contain"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-white">{widget.name}</h4>
                              </div>
                              <p className="text-xs text-gray-400">{widget.description}</p>
                            </div>
                            <Button 
                              size="icon"
                              variant="ghost"
                              className="ml-2 h-8 w-8 rounded-full bg-[#333] hover:bg-[#444] text-gray-300"
                            >
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
} 