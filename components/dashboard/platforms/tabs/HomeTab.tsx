"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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

const MemoizedCampaignWidget = React.memo(CampaignWidget);

// Add type definition for the global timeouts array - COPIED FROM METATAB
declare global {
  interface Window {
    _metaTimeouts?: ReturnType<typeof setTimeout>[];
    _blockMetaApiCalls?: boolean; // To temporarily block API calls
    _disableAutoMetaFetch?: boolean; // To disable auto-fetching behaviour
    _activeFetchIds?: Set<number | string>; // To track active fetch operations
    _metaFetchLock?: boolean; // Global lock to prevent multiple simultaneous hard refreshes
    _lastManualRefresh?: number; // Timestamp of the last manual refresh
    _lastMetaRefresh?: number; // Timestamp of the last successful Meta refresh
  }
}

// Initialize the fetch prevention system - COPIED FROM METATAB
if (typeof window !== 'undefined') {
  window._activeFetchIds = window._activeFetchIds || new Set();
  window._metaFetchLock = window._metaFetchLock || false;
  window._lastManualRefresh = window._lastManualRefresh || 0;
  window._lastMetaRefresh = window._lastMetaRefresh || 0;
}

// Helper function to check if a fetch is in progress globally - COPIED FROM METATAB
function isMetaFetchInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  // Check both the lock and active fetch IDs
  return window._metaFetchLock === true || (window._activeFetchIds?.size ?? 0) > 0;
}

// Helper function to acquire a fetch lock - COPIED FROM METATAB
function acquireMetaFetchLock(fetchId: number | string): boolean {
  if (typeof window === 'undefined') return true; // Assume success server-side or if window is not defined

  // If a lock is already active by another fetch, don't allow a new one
  if (window._metaFetchLock === true && !window._activeFetchIds?.has(fetchId)) {
    return false;
  }
  
  window._metaFetchLock = true; // Set the global lock
  window._activeFetchIds?.add(fetchId); // Register this fetchId
  
  return true;
}

// Helper function to release a fetch lock - COPIED FROM METATAB
function releaseMetaFetchLock(fetchId: number | string): void {
  if (typeof window === 'undefined') return;
  
  window._activeFetchIds?.delete(fetchId); // Remove this fetch ID
  
  // If no other active fetches, release the global lock
  if ((window._activeFetchIds?.size ?? 0) === 0) {
    window._metaFetchLock = false;
  }
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
  
  // Memoize dateRange to prevent unnecessary re-renders and effect triggers
  const memoizedDateRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return undefined; // Or a default range if appropriate
    }
    // Return a new object only if from/to actually change
    return { from: dateRange.from, to: dateRange.to };
  }, [dateRange?.from, dateRange?.to]);

  // State to store Meta daily data
  const [metaDaily, setMetaDaily] = useState<any[]>([]);
  const [shopifyDaily, setShopifyDaily] = useState<any[]>([]);
  const [isLoadingMetaData, setIsLoadingMetaData] = useState(false);
  const [isLoadingShopifyData, setIsLoadingShopifyData] = useState(false);
  const [isComprehensiveRefreshing, setIsComprehensiveRefreshing] = useState(false);
  const hasFetchedMetaData = useRef(false); // Ref to track if initial Meta data fetch has happened
  const lastRefreshTime = useRef(0); // Track last refresh time for visibility handling
  
  // Add a ref to prevent duplicate initial loads
  const isInitialLoadInProgress = useRef(false);
  const currentBrandId = useRef<string | null>(null);
  const lastDataFetchTime = useRef<number>(0);
  
  // Define an interface for MetaMetrics state
  interface MetaMetricsState {
    adSpend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    roas: number;
    adSpendGrowth: number | null;
    impressionGrowth: number | null;
    clickGrowth: number | null;
    conversionGrowth: number | null;
    roasGrowth: number | null;
    previousAdSpend: number;
    previousImpressions: number;
    previousClicks: number;
    previousConversions: number;
    previousRoas: number;
    ctr: number;
    previousCtr: number;
    ctrGrowth: number | null;
    cpc: number;
    previousCpc: number;
    cpcGrowth: number | null;
    costPerResult: number;
    cprGrowth: number | null;
    // Add missing properties for widgets
    results: number;
    previousResults: number;
    purchaseValue: number;
    previousPurchaseValue: number;
  }
  
  // Define initial state for Meta metrics
  const initialMetaMetricsState = {
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
    previousCtr: 0,
    ctrGrowth: 0,
    cpc: 0,
    previousCpc: 0,
    cpcGrowth: 0,
    costPerResult: 0,
    cprGrowth: 0,
    results: 0,
    previousResults: 0,
    purchaseValue: 0,
    previousPurchaseValue: 0
  };

  // State for direct Meta metrics
  const [metaMetrics, setMetaMetrics] = useState<MetaMetricsState>(initialMetaMetricsState);

  // Additional state for Meta campaign widget
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isSyncingCampaigns, setIsSyncingCampaigns] = useState<boolean>(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState<boolean>(false);
  
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
    
    // Case 1: Single day - always compare to the day before
    const isSingleDay = isSameDay(fromNormalized, toNormalized);
    if (isSingleDay) {
      // For a single day view, previous period is always the day before
      const prevDay = new Date(fromNormalized);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = toLocalISODateString(prevDay);
      
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
    
    return {
      prevFrom: prevFromStr,
      prevTo: prevToStr
    };
  };

  // Calculate percentage change function
  const calculatePercentChange = (current: number, previous: number): number | null => {
    if (previous === 0) {
      // Return null when there's no previous data to compare against
      return null; // This will display as "N/A" in the UI
      }
    if (current === previous) { // Handle cases where current and previous are the same
      return 0;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  // Treat metrics as ExtendedMetrics to ensure TypeScript compatibility
  const extendedMetrics = metrics as ExtendedMetrics;
  const metaData = metaDaily.length > 0 ? metaDaily : extendedMetrics.dailyMetaData || [];

  // Get connection info
  const shopifyConnection = connections.find(c => c.platform_type === 'shopify' && c.status === 'active');
  const metaConnection = connections.find(c => c.platform_type === 'meta' && c.status === 'active');
  
  // Filter widgets that require connections that don't exist
  const validWidgets = useMemo(() => {
    return widgets.filter(widget => 
      (widget.type === 'shopify' && shopifyConnection) || 
      (widget.type === 'meta' && metaConnection)
    );
  }, [widgets, shopifyConnection, metaConnection]);

  // Group widgets by platform
  const shopifyWidgets = validWidgets.filter(widget => widget.type === 'shopify');
  const metaWidgets = validWidgets.filter(widget => widget.type === 'meta');

  // Fetch Meta data directly from API with HARD PULL logic (same as MetaTab)
  const fetchMetaData = useCallback(async (isHardRefresh = true) => { // Added isHardRefresh parameter
    if (!brandId || !memoizedDateRange?.from || !memoizedDateRange?.to || !metaConnection) {
      // If it's not a hard refresh (e.g. initial soft load), still set loading to false if applicable
      if (!isHardRefresh) {
        setIsLoadingMetaData(false);
      }
      return;
    }

      const refreshId = `home-meta-refresh-${Date.now()}`;

    // For hard refreshes, attempt to acquire lock
    if (isHardRefresh) {
      if (isMetaFetchInProgress()) {
        toast.info("Meta data is already refreshing. Please wait.", { id: "meta-refresh-toast" });
        return;
      }
      if (!acquireMetaFetchLock(refreshId)) {
        toast.error("Failed to initiate Meta data refresh. Please try again.", { id: "meta-refresh-toast" });
        return;
      }
      toast.loading("Refreshing Meta data...", { id: "meta-refresh-toast", duration: 15000 }); // Show loading toast for hard refresh
    }

    try {
      // IMPORTANT: Don't reset metaMetrics to 0 here - keep existing data while loading
      setIsLoadingMetaData(true); // Always set loading true when fetch starts
      let criticalStepFailed = false; // Flag to track failure in critical steps

      // Step 1: Fetch fresh data from Meta API and update database (HARD PULL) - Only for hard refresh
      if (isHardRefresh) {
      const syncResponse = await fetch(`/api/meta/sync?brandId=${brandId}`, {
        method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Refresh-ID': refreshId }
      });
      if (!syncResponse.ok) {
          console.error(`[HomeTab] Meta API sync failed (${refreshId}): ${syncResponse.status} ${syncResponse.statusText}`);
          toast.error(`Meta API sync failed: ${syncResponse.statusText}`, { id: "meta-refresh-toast" });
          criticalStepFailed = true;
        } 
      
        // Step 2: Refresh campaigns with latest data - Only for hard refresh
        if (!criticalStepFailed) {
          const campaignResponse = await fetch(`/api/meta/campaigns?brandId=${brandId}&forceRefresh=true`, {
            headers: { 'Cache-Control': 'no-cache', 'X-Refresh-ID': refreshId }
          });
          if (!campaignResponse.ok) {
            console.error(`[HomeTab] Campaign data refresh failed (${refreshId}): ${campaignResponse.status} ${campaignResponse.statusText}`);
            toast.error(`Meta campaign refresh failed: ${campaignResponse.statusText}`, { id: "meta-refresh-toast" });
            criticalStepFailed = true;
          }
        }
      
        // Step 3: Refresh ad sets data - Only for hard refresh
        if (!criticalStepFailed) {
          const budgetResponse = await fetch(`/api/meta/update-campaign-budgets?brandId=${brandId}&forceRefresh=true`, {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache', 'X-Refresh-ID': refreshId }
          });
          if (!budgetResponse.ok) {
            console.error(`[HomeTab] Ad set budgets refresh failed (${refreshId}): ${budgetResponse.status} ${budgetResponse.statusText}`);
            toast.error(`Meta ad set budget refresh failed: ${budgetResponse.statusText} (Status: ${budgetResponse.status})`, { id: "meta-refresh-toast", duration: 10000 });
            criticalStepFailed = true;
          }
        }
      } // End of isHardRefresh specific steps
      
      // If any critical hard refresh step failed, abort before fetching metrics
      if (criticalStepFailed) {
        // Ensure lock is released if it was acquired for a hard refresh
        if (isHardRefresh) {
          releaseMetaFetchLock(refreshId);
        }
        setIsLoadingMetaData(false); // Reset loading state
        return; // Stop further execution
      }
      
      // Step 4: Now fetch the refreshed metrics data for display

      // Current period params
      const params = new URLSearchParams({ brandId: brandId });
      if (memoizedDateRange.from) params.append('from', memoizedDateRange.from.toISOString().split('T')[0]);
      if (memoizedDateRange.to) params.append('to', memoizedDateRange.to.toISOString().split('T')[0]);
      
      // Apply aggressive cache busting for hard refreshes or if specified
      if (isHardRefresh) {
      params.append('bypass_cache', 'true');
        params.append('force_load', 'true'); // Ensure backend re-fetches from DB
        params.append('refresh', 'true'); // Instructs backend to re-calculate/re-fetch if needed
      }
      
      const { prevFrom, prevTo } = getPreviousPeriodDates(memoizedDateRange.from, memoizedDateRange.to);
      const prevParams = new URLSearchParams({ brandId: brandId });
      if (prevFrom) prevParams.append('from', prevFrom);
      if (prevTo) prevParams.append('to', prevTo);

      if (isHardRefresh) {
      prevParams.append('bypass_cache', 'true');
      prevParams.append('force_load', 'true');
      prevParams.append('refresh', 'true');
      }
      
      const response = await fetch(`/api/metrics/meta?${params.toString()}`, { 
        cache: 'no-store', // Client-side cache instruction
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate', // HTTP cache instruction
          'Pragma': 'no-cache', // For older HTTP/1.0 caches
          'X-Refresh-ID': refreshId
        }
      });
      
      const prevResponse = await fetch(`/api/metrics/meta?${prevParams.toString()}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Refresh-ID': refreshId
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error fetching current Meta data" }));
        console.error(`[HomeTab] Failed to fetch current period Meta data (${refreshId}): ${response.status}`, errorData);
        throw new Error(errorData.error || `Failed to fetch current period Meta data: ${response.status}`);
      }
      
      if (!prevResponse.ok) {
        const errorData = await prevResponse.json().catch(() => ({ error: "Unknown error fetching previous Meta data" }));
        console.error(`[HomeTab] Failed to fetch previous period Meta data (${refreshId}): ${prevResponse.status}`, errorData);
        throw new Error(errorData.error || `Failed to fetch previous period Meta data: ${prevResponse.status}`);
      }
      
      const currentData = await response.json();
      const previousData = await prevResponse.json();
      
      // Removed debug logging to prevent spam
      
      setMetaMetrics(prev => {
        const newMetrics = {
          ...prev,
          // Try multiple possible property names for ad spend
          adSpend: currentData.adSpend || currentData.spend || currentData.totalSpend || 0,
          impressions: currentData.impressions || 0,
          clicks: currentData.clicks || 0,
          conversions: currentData.conversions || 0,
          roas: currentData.roas || 0,
          ctr: currentData.ctr || 0,
          cpc: currentData.cpc || 0,
          costPerResult: currentData.costPerResult || currentData.cost_per_result || 0,
          results: currentData.results || currentData.conversions || 0,
          purchaseValue: currentData.purchaseValue || currentData.purchase_value || 0,

          // Previous period data with multiple property name attempts
          previousAdSpend: previousData.adSpend || previousData.spend || previousData.totalSpend || 0,
          previousImpressions: previousData.impressions || 0,
          previousClicks: previousData.clicks || 0,
          previousConversions: previousData.conversions || 0,
          previousRoas: previousData.roas || 0,
          previousCtr: previousData.ctr || 0,
          previousCpc: previousData.cpc || 0,
          previousResults: previousData.results || previousData.conversions || 0,
          previousPurchaseValue: previousData.purchaseValue || previousData.purchase_value || 0,

          // Calculate growth rates
          adSpendGrowth: calculatePercentChange(
            currentData.adSpend || currentData.spend || currentData.totalSpend || 0, 
            previousData.adSpend || previousData.spend || previousData.totalSpend || 0
          ),
          impressionGrowth: calculatePercentChange(currentData.impressions || 0, previousData.impressions || 0),
          clickGrowth: calculatePercentChange(currentData.clicks || 0, previousData.clicks || 0),
          conversionGrowth: calculatePercentChange(currentData.conversions || 0, previousData.conversions || 0),
          roasGrowth: calculatePercentChange(currentData.roas || 0, previousData.roas || 0),
          ctrGrowth: calculatePercentChange(currentData.ctr || 0, previousData.ctr || 0),
          cpcGrowth: calculatePercentChange(currentData.cpc || 0, previousData.cpc || 0),
          cprGrowth: calculatePercentChange(
            currentData.costPerResult || currentData.cost_per_result || 0, 
            previousData.costPerResult || previousData.cost_per_result || 0
          ),
        };
        
        // Cache the metrics to localStorage
        if (typeof window !== 'undefined' && brandId) {
          localStorage.setItem(`meta_metrics_${brandId}`, JSON.stringify(newMetrics));
        }
        
        return newMetrics;
      });
      
      setMetaDaily(currentData.dailyData || []);
      hasFetchedMetaData.current = true;
      
      // Only show success and dispatch event if it was a hard refresh and ALL critical steps passed
      if (isHardRefresh && !criticalStepFailed) { // Re-check criticalStepFailed, though it should lead to early return if true
        toast.success("Meta data refreshed!", { id: "meta-refresh-toast" });
        window._lastMetaRefresh = Date.now(); // Update timestamp of last successful refresh
      
        // Dispatch event to notify other components if necessary
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('metaDataRefreshed', {
            detail: { brandId, timestamp: Date.now(), source: 'HomeTabHardRefresh', refreshId }
        }));
        }
      }
      
    } catch (error) {
      console.error(`[HomeTab] Error during Meta data fetch (${refreshId}):`, error);
      toast.error("Error fetching Meta data. Check console for details.", { id: "meta-refresh-toast" });
    } finally {
      setIsLoadingMetaData(false);
      if (isHardRefresh) {
        releaseMetaFetchLock(refreshId);
    }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, memoizedDateRange, metaConnection, getPreviousPeriodDates, calculatePercentChange]); // Removed setIsLoadingMetaData from deps, it's a setter

  // EXACT COPY OF META PAGE SYNC FUNCTION - THIS IS WHAT MAKES IT WORK
  const syncMetaInsights = async () => {
    if (!brandId || !memoizedDateRange?.from || !memoizedDateRange?.to) {
      return;
    }
    
    setIsLoadingMetaData(true);
    
    try {
      // Format dates in YYYY-MM-DD format
      const startDate = memoizedDateRange.from.toISOString().split('T')[0];
      const endDate = memoizedDateRange.to.toISOString().split('T')[0];
      
      const response = await fetch('/api/meta/insights/sync', {
            method: 'POST',
            headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          startDate,
          endDate,
          forceRefresh: true
        })
            });
            
            if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync Meta insights');
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Meta insights synced successfully", {
          description: `Synced ${result.count || 0} records from Meta.`,
          duration: 5000
        });

        // After successful sync, fetch the refreshed data
        await fetchMetaData(true);
        
        // Dispatch event to notify other widgets (reach, budget, etc.)
        window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
          detail: { 
            brandId, 
            timestamp: Date.now(),
            forceRefresh: true,
            syncedRecords: result.count || 0
          }
        }));
      } else {
        throw new Error(result.error || 'Failed to sync Meta insights');
      }
        } catch (error) {
      console.error('[HomeTab] Error syncing Meta insights:', error);
      toast.error("Failed to sync Meta insights", {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      });
    } finally {
      setIsLoadingMetaData(false);
    }
  };

  // Function to fetch campaign data from the API - RESTORED FROM BACKUP & MOVED EARLIER
  const fetchCampaigns = useCallback(async (forceRefresh = false) => {
    if (!brandId || !metaConnection) {
      setIsLoadingCampaigns(false);
      return;
    }
    
    // Only set loading true if we are actually going to fetch
    if (forceRefresh || campaigns.length === 0) { 
      setIsLoadingCampaigns(true);
    }
    
    try {
      let url = `/api/meta/campaigns?brandId=${brandId}`;
      
      let localFromDate: string | undefined;
      let localToDate: string | undefined;

      if (memoizedDateRange?.from && memoizedDateRange?.to) {
        localFromDate = memoizedDateRange.from.toISOString().split('T')[0];
        localToDate = memoizedDateRange.to.toISOString().split('T')[0];
        url += `&from=${localFromDate}&to=${localToDate}`;
        
        const isDifferentDateRange = 
          lastFetchedCampaignDates.current.from !== localFromDate || 
          lastFetchedCampaignDates.current.to !== localToDate;
        
        // If not forcing refresh and dates are the same, and we already have campaigns, skip.
        if (!forceRefresh && !isDifferentDateRange && campaigns.length > 0) {
          setIsLoadingCampaigns(false); // Ensure loading is false
          return;
        }
        lastFetchedCampaignDates.current = {from: localFromDate, to: localToDate};
      }
      
      // Add cache busting if forcing or if date range is specified (implies a new context)
      if (forceRefresh || (localFromDate && localToDate)) {
        url += `${url.includes('?') ? '&' : '?'}forceRefresh=true&t=${Date.now()}`;
      }
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText} (status: ${response.status})`);
      }
      
      const data = await response.json();
      setCampaigns(data.campaigns || []);
      
    } catch (error) {
      console.error('[HomeTab] Error fetching campaigns:', error);
    } finally {
      setIsLoadingCampaigns(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, metaConnection, memoizedDateRange, setIsLoadingCampaigns, setCampaigns]); // campaigns.length removed, added setIsLoadingCampaigns, setCampaigns

  // Fetch Shopify data when brandId or dateRange changes
  const fetchShopifyData = useCallback(async () => {
    if (!brandId || !memoizedDateRange?.from || !memoizedDateRange?.to || !shopifyConnection) {
      // Ensure loading state is false if prerequisites aren't met
      setIsLoadingShopifyData(false);
      return;
    }
    setIsLoadingShopifyData(true);
    try {
      const params = new URLSearchParams({
        brandId: brandId,
        from: memoizedDateRange.from.toISOString().split('T')[0],
        to: memoizedDateRange.to.toISOString().split('T')[0]
      });
      const response = await fetch(`/api/metrics/shopify?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch Shopify data: ${response.status}`);
      }
      const data = await response.json();
      // Assuming shopifyDaily data needs to be set here
      setShopifyDaily(data.dailyData || []); 
      // console.log("[HomeTab] Shopify data fetched:", data);
    } catch (error) {
      console.error("[HomeTab] Error fetching Shopify data:", error);
    } finally {
      setIsLoadingShopifyData(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, memoizedDateRange, shopifyConnection]); // Minimal necessary dependencies

  // Initial data load and refresh logic for Meta & Shopify
  useEffect(() => {
    if (brandId && memoizedDateRange?.from && memoizedDateRange?.to) {
      // For Meta, trigger a sync when brand or date range changes.
      if (metaConnection) {
        fetchMetaData(true); // Pass true for hard refresh
        if (widgets.some(widget => widget.id === 'meta-campaigns')) {
          fetchCampaigns(true); // forceRefresh is true here
        }
      } else {
        setMetaMetrics(initialMetaMetricsState); // Reset meta metrics if connection lost
        setMetaDaily([]);
        setCampaigns([]); // Also clear campaigns
        setIsLoadingMetaData(false);
        setIsLoadingCampaigns(false);
      }

      if (shopifyConnection) {
        fetchShopifyData();
      } else {
        setIsLoadingShopifyData(false);
      }
    } else {
      // If essential parameters are missing, ensure loading states are false.
      setIsLoadingMetaData(false);
      setIsLoadingShopifyData(false);
      setIsLoadingCampaigns(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, memoizedDateRange, metaConnection, shopifyConnection, widgets]); // fetchMetaData & fetchShopifyData are memoized. Added widgets for campaign check.

  // Add debounced refresh function
  const debouncedMetaRefresh = useRef<NodeJS.Timeout | null>(null);
    
  const triggerMetaRefresh = useCallback((isHardRefresh = true) => {
    // Clear any pending refresh
    if (debouncedMetaRefresh.current) {
      clearTimeout(debouncedMetaRefresh.current);
    }
    
    // Always use fetchMetaData for consistent data handling
    debouncedMetaRefresh.current = setTimeout(() => {
      fetchMetaData(isHardRefresh);
    }, 100);
  }, [fetchMetaData]);

  // CONSOLIDATED: Single useEffect for initial load and data changes
  useEffect(() => {
    if (!brandId || !memoizedDateRange?.from || !memoizedDateRange?.to) {
    return;
      }
      
    // Track if this is a brand change
    const isBrandChange = currentBrandId.current !== brandId;
    if (isBrandChange) {
      currentBrandId.current = brandId;
      // Clear cached data on brand change to prevent showing wrong brand's data
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`meta_metrics_${brandId}`);
      }
      // Reset the metrics to initial state to prevent showing stale data
      setMetaMetrics(initialMetaMetricsState);
    }
    
    // For Meta
    if (metaConnection) {
      // Use debounced refresh to prevent multiple rapid calls
      triggerMetaRefresh(true);
      
      if (widgets.some(widget => widget.id === 'meta-campaigns')) {
            fetchCampaigns(true);
        }
      } else {
      setIsLoadingMetaData(false);
      setIsLoadingCampaigns(false);
    }

    // For Shopify
    if (shopifyConnection) {
        fetchShopifyData();
      } else {
      setIsLoadingShopifyData(false);
      }
    
    // Cleanup debounce on unmount
    return () => {
      if (debouncedMetaRefresh.current) {
        clearTimeout(debouncedMetaRefresh.current);
    }
    };
  }, [brandId, memoizedDateRange, metaConnection, shopifyConnection, widgets, triggerMetaRefresh, fetchCampaigns, fetchShopifyData]);

  // SIMPLIFIED: Single visibility change handler
  useEffect(() => {
    if (!brandId || !metaConnection || !memoizedDateRange?.from || !memoizedDateRange?.to) {
        return;
      }
      
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const timeSinceLastRefresh = now - (window._lastMetaRefresh || 0);
        
        // Only refresh if it's been more than 5 minutes since last refresh
        if (timeSinceLastRefresh > 300000) { // 5 minutes
          
          // Clear any blocking flags
          if (typeof window !== 'undefined') {
            window._blockMetaApiCalls = false;
            window._disableAutoMetaFetch = false;
          }
          
          triggerMetaRefresh(true);
          window._lastMetaRefresh = now;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [brandId, metaConnection, memoizedDateRange, triggerMetaRefresh]);

  // Listen for global refresh events (keep this one as it handles external events)
  useEffect(() => {
    const handleGlobalRefresh = (event: CustomEvent) => {
      if (event.detail?.brandId === brandId && metaConnection) {
        // Don't refresh if we just refreshed
        const now = Date.now();
        const timeSinceLastRefresh = now - (window._lastMetaRefresh || 0);
        if (timeSinceLastRefresh < 5000) { // 5 seconds
          return;
        }
        
        toast.info("Syncing with recent Meta updates...", { id: "meta-global-refresh-toast" });
        triggerMetaRefresh(true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('metaDataRefreshed', handleGlobalRefresh as EventListener);
      window.addEventListener('force-meta-refresh', handleGlobalRefresh as EventListener);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('metaDataRefreshed', handleGlobalRefresh as EventListener);
        window.removeEventListener('force-meta-refresh', handleGlobalRefresh as EventListener);
      }
    };
  }, [brandId, metaConnection, triggerMetaRefresh]);

  // Function to manually trigger a hard refresh for Meta data from HomeTab UI (e.g., a button)
  const handleManualMetaRefresh = () => {
    if (!brandId || !metaConnection) {
      toast.error("Cannot refresh Meta data: No brand selected or Meta not connected.");
      return;
    }
    syncMetaInsights(); // Use syncMetaInsights instead of fetchMetaData
  };

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
  }, [brandId]); // Run once when brandId is set

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

  // Function to sync campaign data with Meta
  const syncCampaigns = useCallback(async () => {
    if (!brandId || !metaConnection) {
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

  // Render a single widget based on its type
  const renderWidget = (widget: Widget, index: number) => {
    // Remove the excessive debug logging that was causing log spam
    
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
      loading: (widget.type === 'meta' ? (isLoadingMetaData || isComprehensiveRefreshing) : isLoading) || isRefreshingData,
      brandId: brandId,
      className: "mb-0",
      platform: widget.type,
      dateRange: memoizedDateRange
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
              {memoizedDateRange?.from && memoizedDateRange?.to ? (
                <SalesByProduct 
                  brandId={brandId}
                  dateRange={memoizedDateRange}
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
            {memoizedDateRange?.from && memoizedDateRange?.to ? (
              <SalesByProduct 
                brandId={brandId}
                dateRange={memoizedDateRange}
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
          decimals: 2,
          hideGraph: true,
          showPreviousPeriod: true,
          previousValueFormat: "currency",
          previousValueDecimals: 2,
          previousValuePrefix: "$",
          infoTooltip: "Total amount spent on Meta ads",
          nullChangeText: "N/A",
          nullChangeTooltip: "No data for previous period"
        };
        break;
      case 'meta-impressions':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.impressions,
          change: metaMetrics.impressionGrowth,
          previousValue: metaMetrics.previousImpressions,
          hideGraph: true,
          valueFormat: "number",
          decimals: 0,
          showPreviousPeriod: true,
          previousValueFormat: "number",
          previousValueDecimals: 0,
          infoTooltip: "Total number of times your ads were viewed",
          nullChangeText: "N/A",
          nullChangeTooltip: "No data for previous period"
        };
        break;
      case 'meta-clicks':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.clicks,
          change: metaMetrics.clickGrowth,
          previousValue: metaMetrics.previousClicks,
          hideGraph: true,
          valueFormat: "number",
          decimals: 0,
          showPreviousPeriod: true,
          previousValueFormat: "number",
          previousValueDecimals: 0,
          infoTooltip: "Total number of clicks on your ads",
          nullChangeText: "N/A",
          nullChangeTooltip: "No data for previous period"
        };
        break;
      case 'meta-conversions':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.conversions,
          change: metaMetrics.conversionGrowth,
          previousValue: metaMetrics.previousConversions,
          hideGraph: true,
          valueFormat: "number",
          decimals: 0,
          showPreviousPeriod: true,
          previousValueFormat: "number",
          previousValueDecimals: 0,
          infoTooltip: "Total number of conversions from your ads",
          nullChangeText: "N/A",
          nullChangeTooltip: "No data for previous period"
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
          showPreviousPeriod: true,
          previousValueFormat: "number",
          previousValueDecimals: 2,
          previousValueSuffix: "x",
          infoTooltip: "Return on ad spend (revenue / ad spend)",
          nullChangeText: "N/A",
          nullChangeTooltip: "No data for previous period"
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
          value: metaMetrics.ctr, // Should be decimal now
          change: metaMetrics.ctrGrowth, // Should be based on decimals now
          previousValue: metaMetrics.previousCtr, // Should be decimal and available now
          valueFormat: "percentage",
          decimals: 2,
          hideGraph: true,
          showPreviousPeriod: true, 
          previousValueFormat: "percentage", 
          previousValueDecimals: 2,
          infoTooltip: "Click-through rate (clicks ÷ impressions)",
          nullChangeText: "N/A",
          nullChangeTooltip: "No data for previous period"
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
          value: metaMetrics.cpc,
          change: metaMetrics.cpcGrowth, // Now available
          previousValue: metaMetrics.previousCpc, // Now available
          prefix: "$",
          valueFormat: "currency",
          decimals: 2,
          hideGraph: true,
          showPreviousPeriod: true, 
          previousValueFormat: "currency", 
          previousValueDecimals: 2,
          previousValuePrefix: "$",
          infoTooltip: "Average cost per click (spend ÷ clicks)",
          nullChangeText: "N/A",
          nullChangeTooltip: "No data for previous period"
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
          decimals: 2, 
          hideGraph: true,
          showPreviousPeriod: true, 
          previousValueFormat: "currency", 
          previousValueDecimals: 2,
          previousValuePrefix: "$",
          previousValue: 0,
          infoTooltip: "Average cost per result",
          nullChangeText: "N/A",
          nullChangeTooltip: "No data for previous period"
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
          value: metaMetrics.conversions, // Use conversions as results (this is the actual results data)
          change: metaMetrics.conversionGrowth,
          valueFormat: "number",
          hideGraph: true,
          showPreviousPeriod: true,
          previousValue: metaMetrics.previousConversions,
          previousValueFormat: "number",
          infoTooltip: "Total number of results from your ads",
          nullChangeText: "N/A",
          nullChangeTooltip: "No data for previous period"
        };
        break;
      case 'meta-purchase-value':
        // Calculate purchase value from ROAS and spend (this is how it's done in MetaTab)
        const purchaseValue = metaMetrics.adSpend * metaMetrics.roas;
        const previousPurchaseValue = metaMetrics.previousAdSpend * metaMetrics.previousRoas;
        const purchaseValueGrowth = calculatePercentChange(purchaseValue, previousPurchaseValue);
        
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
              <DollarSign className="h-4 w-4 text-green-400" />
            </div>
          ),
          value: purchaseValue,
          change: purchaseValueGrowth,
          prefix: "$",
          valueFormat: "currency",
          hideGraph: true,
          showPreviousPeriod: true,
          previousValue: previousPurchaseValue,
          previousValueFormat: "currency",
          previousValuePrefix: "$",
          infoTooltip: "Total purchase value from your ads (calculated from ROAS × Ad Spend)",
          nullChangeText: "N/A",
          nullChangeTooltip: "No data for previous period"
        };
        break;
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
              <MemoizedCampaignWidget 
                brandId={brandId}
                campaigns={campaigns}
                isLoading={isLoadingCampaigns}
                isSyncing={isSyncingCampaigns}
                dateRange={memoizedDateRange}
                onRefresh={() => fetchCampaigns(true)}
                onSync={syncCampaigns}
              />
            </div>
          );
        }
        
        return (
          <div key={widget.id} className="col-span-full mb-4">
            <MemoizedCampaignWidget 
              brandId={brandId}
              campaigns={campaigns}
              isLoading={isLoadingCampaigns}
              isSyncing={isSyncingCampaigns}
              dateRange={memoizedDateRange}
              onRefresh={() => fetchCampaigns(true)}
              onSync={syncCampaigns}
            />
          </div>
        );
        
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
                dateRange={memoizedDateRange?.from && memoizedDateRange?.to ? memoizedDateRange : undefined}
                isManuallyRefreshing={isRefreshingData}
              />
            </div>
          );
        }
        
        return (
          <div key={widget.id} className="w-full">
            <TotalAdSetReachCard 
              brandId={brandId} 
              dateRange={memoizedDateRange?.from && memoizedDateRange?.to ? memoizedDateRange : undefined}
              isManuallyRefreshing={isRefreshingData}
            />
          </div>
        );
        
      case 'meta-budget':
        // Special handling for the Budget widget using TotalBudgetMetricCard
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
              <TotalBudgetMetricCard 
                brandId={brandId} 
                isManuallyRefreshing={isRefreshingData}
              />
            </div>
          );
        }
        
        return (
          <div key={widget.id} className="w-full">
            <TotalBudgetMetricCard 
              brandId={brandId} 
              isManuallyRefreshing={isRefreshingData}
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

    // 🔥🔥🔥 MAJOR DEBUG: Log final widget props before rendering MetricCard
    // Removed excessive debug logging to prevent log spam

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

  // Load cached metrics on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && brandId) {
      const cached = localStorage.getItem(`meta_metrics_${brandId}`);
      if (cached) {
        try {
          const cachedMetrics = JSON.parse(cached);
          setMetaMetrics(cachedMetrics);
        } catch (e) {
          console.error('[HomeTab] Failed to parse cached meta metrics:', e);
        }
      }
    }
  }, [brandId]); // Run when brandId changes

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