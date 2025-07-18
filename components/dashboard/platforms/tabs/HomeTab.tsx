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
import { getSupabaseClient } from '@/lib/supabase/client'
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
import { 
  dateToLocalDateString,
  isDateRangeToday,
  isDateRangeYesterday,
  formatDateRangeForAPI 
} from '@/lib/utils/timezone'

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
    _dashboardInitialSetup?: boolean; // Flag to track dashboard initial setup phase
  }
}

// Initialize the fetch prevention system - COPIED FROM METATAB
if (typeof window !== 'undefined') {
  window._activeFetchIds = window._activeFetchIds || new Set();
  window._metaFetchLock = window._metaFetchLock || false;
  window._lastManualRefresh = window._lastManualRefresh || 0;
  window._lastMetaRefresh = window._lastMetaRefresh || 0;
  window._dashboardInitialSetup = window._dashboardInitialSetup || false;
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
    console.log(`[HomeTab] 🔒 Meta Fetch lock active by another process, rejecting new fetchId: ${fetchId}`);
    return false;
  }
  
  window._metaFetchLock = true; // Set the global lock
  window._activeFetchIds?.add(fetchId); // Register this fetchId
  
  console.log(`[HomeTab] 🔐 Acquired Meta fetch lock for fetchId: ${fetchId}. Active fetches: ${window._activeFetchIds?.size}`);
  return true;
}

// Helper function to release a fetch lock - COPIED FROM METATAB
function releaseMetaFetchLock(fetchId: number | string): void {
  if (typeof window === 'undefined') return;
  
  window._activeFetchIds?.delete(fetchId); // Remove this fetch ID
  
  // If no other active fetches, release the global lock
  if ((window._activeFetchIds?.size ?? 0) === 0) {
    window._metaFetchLock = false;
    console.log(`[HomeTab] 🔓 Released Meta fetch lock (last fetchId: ${fetchId}). No active fetches.`);
  } else {
    console.log(`[HomeTab] 🔒 Meta Lock maintained for ${window._activeFetchIds?.size} active fetches (ended: ${fetchId})`);
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
  const supabase = getSupabaseClient();
  
  // State to store Meta daily data
  const [metaDaily, setMetaDaily] = useState<any[]>([]);
  const [shopifyDaily, setShopifyDaily] = useState<any[]>([]);
  const [isLoadingMetaData, setIsLoadingMetaData] = useState(false);
  const [isLoadingShopifyData, setIsLoadingShopifyData] = useState(false);
  const [isComprehensiveRefreshing, setIsComprehensiveRefreshing] = useState(false);
  
  // Get connection info early for initial state
  const shopifyConnection = connections.find(c => c.platform_type === 'shopify' && c.status === 'active');
  const metaConnection = connections.find(c => c.platform_type === 'meta' && c.status === 'active');
  
  // NEW: Unified loading state for all Meta widgets - start as true if Meta is connected to prevent individual loading
  const [isLoadingAllMetaWidgets, setIsLoadingAllMetaWidgets] = useState(!!metaConnection);
  
  const hasFetchedMetaData = useRef(false); // Ref to track if initial Meta data fetch has happened
  const lastRefreshTime = useRef(0); // Track last refresh time for visibility handling
  
  // Add a ref to prevent duplicate initial loads
  const isInitialLoadInProgress = useRef(false);
  const currentBrandId = useRef<string | null>(null);
  
  // Add refs to track initial setup state
  const isInitialSetupComplete = useRef(false);
  const lastFetchedDateRange = useRef<{ from?: Date; to?: Date }>({});
  const hasInitialDataLoaded = useRef(false);
  
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
  
  // State for direct Meta metrics
  const [metaMetrics, setMetaMetrics] = useState<MetaMetricsState>({
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
  });
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

  // Filter widgets that require connections that don't exist
  const validWidgets = widgets.filter(widget => 
    (widget.type === 'shopify' && shopifyConnection) || 
    (widget.type === 'meta' && metaConnection)
  );

  // Group widgets by platform
  const shopifyWidgets = validWidgets.filter(widget => widget.type === 'shopify');
  const metaWidgets = validWidgets.filter(widget => widget.type === 'meta');

  // Fetch Meta data directly from API with HARD PULL logic (same as MetaTab)
  const fetchMetaData = useCallback(async (isHardRefresh = true) => { // Added isHardRefresh parameter
    if (!brandId || !dateRange?.from || !dateRange?.to || !metaConnection) {
      console.log("[HomeTab] Skipping Meta data fetch: Missing brandId, dateRange, or Meta connection.");
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
        console.log(`[HomeTab] ⚠️ HARD PULL Meta refresh skipped - fetch already in progress for refreshId: ${refreshId}`);
        toast.info("Meta data is already refreshing. Please wait.", { id: "meta-refresh-toast" });
        return;
      }
      if (!acquireMetaFetchLock(refreshId)) {
        console.log(`[HomeTab] ⛔ Failed to acquire global lock for HARD PULL Meta refreshId: ${refreshId}`);
        toast.error("Failed to initiate Meta data refresh. Please try again.", { id: "meta-refresh-toast" });
        return;
      }
      toast.loading("Refreshing Meta data...", { id: "meta-refresh-toast", duration: 15000 }); // Show loading toast for hard refresh
    }

    try {
      setIsLoadingMetaData(true); // Always set loading true when fetch starts
      let criticalStepFailed = false; // Flag to track failure in critical steps

      if(isHardRefresh) {
        console.log(`[HomeTab] 🔄 Starting HARD PULL Meta data refresh for brandId: ${brandId}, refreshId: ${refreshId}`);
      } else {
        console.log(`[HomeTab] 🔄 Starting SOFT PULL Meta data refresh for brandId: ${brandId}, refreshId: ${refreshId}`);
      }

      // Step 1: Fetch fresh data from Meta API and update database (HARD PULL) - Only for hard refresh
      if (isHardRefresh) {
        console.log(`[HomeTab] 🚀 Step 1: Meta API sync (refreshId: ${refreshId})`);
      const syncResponse = await fetch(`/api/meta/sync?brandId=${brandId}`, {
        method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Refresh-ID': refreshId }
      });
      if (!syncResponse.ok) {
          console.error(`[HomeTab] CRITICAL FAILURE: Meta API sync failed (refreshId: ${refreshId}): ${syncResponse.status} ${syncResponse.statusText}`);
          toast.error(`Meta API sync failed: ${syncResponse.statusText}`, { id: "meta-refresh-toast" });
          criticalStepFailed = true;
        } else {
          console.log(`[HomeTab] ✅ Meta API sync completed (refreshId: ${refreshId})`);
        }
      
        // Step 2: Refresh campaigns with latest data - Only for hard refresh
        if (!criticalStepFailed) {
          console.log(`[HomeTab] 🚀 Step 2: Campaign data refresh (refreshId: ${refreshId})`);
          const campaignResponse = await fetch(`/api/meta/campaigns?brandId=${brandId}&forceRefresh=true`, {
            headers: { 'Cache-Control': 'no-cache', 'X-Refresh-ID': refreshId }
          });
          if (!campaignResponse.ok) {
            console.error(`[HomeTab] CRITICAL FAILURE: Campaign data refresh failed (refreshId: ${refreshId}): ${campaignResponse.status} ${campaignResponse.statusText}`);
            toast.error(`Meta campaign refresh failed: ${campaignResponse.statusText}`, { id: "meta-refresh-toast" });
            criticalStepFailed = true;
          } else {
            console.log(`[HomeTab] ✅ Campaign data refreshed (refreshId: ${refreshId})`);
          }
        }
      
        // Step 3: Refresh ad sets data - Only for hard refresh
        // THIS IS THE KNOWN FAILING ENDPOINT FROM LOGS
        if (!criticalStepFailed) {
          console.log(`[HomeTab] 🚀 Step 3: Ad set budgets refresh (refreshId: ${refreshId})`);
          const budgetResponse = await fetch(`/api/meta/campaign-budgets?brandId=${brandId}&forceRefresh=true`, {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache', 'X-Refresh-ID': refreshId }
          });
          if (!budgetResponse.ok) {
            console.error(`[HomeTab] CRITICAL FAILURE: Ad set budgets refresh failed (refreshId: ${refreshId}): ${budgetResponse.status} ${budgetResponse.statusText}`);
            toast.error(`Meta ad set budget refresh failed: ${budgetResponse.statusText} (Status: ${budgetResponse.status})`, { id: "meta-refresh-toast", duration: 10000 });
            criticalStepFailed = true;
          } else {
            console.log(`[HomeTab] ✅ Ad set budgets refreshed (refreshId: ${refreshId})`);
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
      console.log(`[HomeTab] 🚀 Step 4: Fetching refreshed metrics (refreshId: ${refreshId})`);

      // Current period params with proper timezone handling
      const params = new URLSearchParams({ brandId: brandId });
      if (dateRange.from) params.append('from', dateToLocalDateString(dateRange.from));
      if (dateRange.to) params.append('to', dateToLocalDateString(dateRange.to));
      
      // Check if this is "today" date range to force fresh data
      const isToday = dateRange.from && dateRange.to && isDateRangeToday(dateRange.from, dateRange.to);
      
      // Apply aggressive cache busting for hard refreshes, "today" date range, or if specified
      if (isHardRefresh || isToday) {
      params.append('bypass_cache', 'true');
        params.append('force_load', 'true'); // Ensure backend re-fetches from DB
        params.append('refresh', 'true'); // Instructs backend to re-calculate/re-fetch if needed
        if (isToday) {
          console.log(`[HomeTab] Today detected for Meta - forcing fresh data fetch (refreshId: ${refreshId})`);
          params.append('t', Date.now().toString()); // Additional cache busting for today
        }
      }
      // params.append('debug', 'true'); // Optional: for more verbose logging from backend
      
      console.log(`[HomeTab] Fetching Meta data with params (refreshId: ${refreshId}): ${params.toString()}`);
      
      const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);
      const prevParams = new URLSearchParams({ brandId: brandId });
      if (prevFrom) prevParams.append('from', prevFrom);
      if (prevTo) prevParams.append('to', prevTo);

      if (isHardRefresh || isToday) {
      prevParams.append('bypass_cache', 'true');
      prevParams.append('force_load', 'true');
      prevParams.append('refresh', 'true');
        if (isToday) {
          prevParams.append('t', Date.now().toString()); // Additional cache busting for today
        }
      }
      // prevParams.append('debug', 'true');
      
      console.log(`[HomeTab] Fetching Meta data for previous period (refreshId: ${refreshId}): ${prevParams.toString()}`);
      
      const response = await fetch(`/api/metrics/meta?${params.toString()}`, { 
        cache: (isHardRefresh || isToday) ? 'no-store' : 'default', // Client-side cache instruction
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate', // HTTP cache instruction
          'Pragma': 'no-cache', // For older HTTP/1.0 caches
          'X-Refresh-ID': refreshId
        }
      });
      
      const prevResponse = await fetch(`/api/metrics/meta?${prevParams.toString()}`, { 
        cache: (isHardRefresh || isToday) ? 'no-store' : 'default',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Refresh-ID': refreshId
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error fetching current Meta data" }));
        console.error(`[HomeTab] Failed to fetch current period Meta data (refreshId: ${refreshId}): ${response.status}`, errorData);
        throw new Error(errorData.error || `Failed to fetch current period Meta data: ${response.status}`);
      }
      
      if (!prevResponse.ok) {
        const errorData = await prevResponse.json().catch(() => ({ error: "Unknown error fetching previous Meta data" }));
        console.error(`[HomeTab] Failed to fetch previous period Meta data (refreshId: ${refreshId}): ${prevResponse.status}`, errorData);
        throw new Error(errorData.error || `Failed to fetch previous period Meta data: ${prevResponse.status}`);
      }
      
      const currentData = await response.json();
      const previousData = await prevResponse.json();
      
      // ... (rest of the data processing and state setting logic)
      // Ensure all console logs also include refreshId for better tracking
      console.log(`[HomeTab] Fetched Meta data for current period (refreshId: ${refreshId}):`, {
        adSpend: currentData.adSpend,
        impressions: currentData.impressions,
        // ... (other metrics)
        dailyData: Array.isArray(currentData.dailyData) ? currentData.dailyData.length : 0
      });
      
      console.log(`[HomeTab] Fetched Meta data for previous period (refreshId: ${refreshId}):`, {
        adSpend: previousData.adSpend,
        impressions: previousData.impressions,
        // ... (other metrics)
        dailyData: Array.isArray(previousData.dailyData) ? previousData.dailyData.length : 0
      });

      if (currentData.adSpend === 0 && currentData.impressions === 0 && currentData.clicks === 0 && isHardRefresh) {
        console.warn(`[HomeTab] Initial HARD PULL data fetch returned empty results (refreshId: ${refreshId}). This might indicate no ad activity or a sync delay.`);
        // Potentially add a small delay and a single retry here if this is common for very fresh data
      }

      // 🔥🔥🔥 MAJOR DEBUG: Log the exact values we're about to set
      console.log(`🔥🔥🔥 [HomeTab] MAJOR DEBUG: About to call setMetaMetrics with data (refreshId: ${refreshId}):`);
      console.log(`🔥🔥🔥 [HomeTab] CURRENT DATA:`, {
        adSpend: currentData.adSpend,
        impressions: currentData.impressions,
        clicks: currentData.clicks,
        conversions: currentData.conversions,
        roas: currentData.roas,
        ctr: currentData.ctr,
        cpc: currentData.cpc,
        costPerResult: currentData.costPerResult
      });
      console.log(`🔥🔥🔥 [HomeTab] PREVIOUS DATA:`, {
        adSpend: previousData.adSpend,
        impressions: previousData.impressions,
        clicks: previousData.clicks,
        conversions: previousData.conversions,
        roas: previousData.roas,
        ctr: previousData.ctr,
        cpc: previousData.cpc,
        costPerResult: previousData.costPerResult
      });

      setMetaMetrics(prev => {
        const newMetrics = {
          ...prev,
        adSpend: currentData.adSpend || 0,
        impressions: currentData.impressions || 0,
        clicks: currentData.clicks || 0,
          conversions: currentData.conversions || 0, // Assuming conversions is part of the API response
        roas: currentData.roas || 0,
          ctr: currentData.ctr || 0,
          cpc: currentData.cpc || 0,
          costPerResult: currentData.costPerResult || 0,
          results: currentData.results || 0, // Assuming 'results' exists
          purchaseValue: currentData.purchaseValue || 0, // Assuming 'purchaseValue' exists

        previousAdSpend: previousData.adSpend || 0,
        previousImpressions: previousData.impressions || 0,
        previousClicks: previousData.clicks || 0,
        previousConversions: previousData.conversions || 0,
        previousRoas: previousData.roas || 0,
          previousCtr: previousData.ctr || 0,
          previousCpc: previousData.cpc || 0,
          // previousCostPerResult: previousData.costPerResult || 0, // Assuming this should be here
          previousResults: previousData.results || 0,
          previousPurchaseValue: previousData.purchaseValue || 0,

          adSpendGrowth: calculatePercentChange(currentData.adSpend, previousData.adSpend),
          impressionGrowth: calculatePercentChange(currentData.impressions, previousData.impressions),
          clickGrowth: calculatePercentChange(currentData.clicks, previousData.clicks),
          conversionGrowth: calculatePercentChange(currentData.conversions, previousData.conversions),
          roasGrowth: calculatePercentChange(currentData.roas, previousData.roas),
          ctrGrowth: calculatePercentChange(currentData.ctr, previousData.ctr),
          cpcGrowth: calculatePercentChange(currentData.cpc, previousData.cpc),
          cprGrowth: calculatePercentChange(currentData.costPerResult, previousData.costPerResult),
        };
        
        // 🔥🔥🔥 MAJOR DEBUG: Log the exact values we're setting
        console.log(`🔥🔥🔥 [HomeTab] MAJOR DEBUG: Setting metaMetrics to NEW VALUES (refreshId: ${refreshId}):`);
        console.log(`🔥🔥🔥 [HomeTab] NEW METRICS:`, {
          adSpend: newMetrics.adSpend,
          impressions: newMetrics.impressions,
          clicks: newMetrics.clicks,
          conversions: newMetrics.conversions,
          roas: newMetrics.roas,
          ctr: newMetrics.ctr,
          cpc: newMetrics.cpc,
          costPerResult: newMetrics.costPerResult,
          adSpendGrowth: newMetrics.adSpendGrowth,
          impressionGrowth: newMetrics.impressionGrowth,
          clickGrowth: newMetrics.clickGrowth,
          conversionGrowth: newMetrics.conversionGrowth,
          roasGrowth: newMetrics.roasGrowth,
          ctrGrowth: newMetrics.ctrGrowth,
          cpcGrowth: newMetrics.cpcGrowth,
          cprGrowth: newMetrics.cprGrowth
        });
        
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
          console.log(`[HomeTab] 📣 Dispatched metaDataRefreshed event (refreshId: ${refreshId})`);
        }
        console.log(`[HomeTab] ✅ FULL HARD PULL Meta data refresh completed successfully (refreshId: ${refreshId})`);
      } else if (!isHardRefresh) {
        console.log(`[HomeTab] ✅ SOFT PULL Meta data refresh completed successfully (refreshId: ${refreshId})`);
      }
      
    } catch (error) {
      console.error(`[HomeTab] Error during Meta data fetch (refreshId: ${refreshId}):`, error);
      toast.error("Error fetching Meta data. Check console for details.", { id: "meta-refresh-toast" });
      // setMetaMetrics to a default error state or keep previous data? For now, log and show toast.
    } finally {
      setIsLoadingMetaData(false);
      if (isHardRefresh) {
        releaseMetaFetchLock(refreshId);
    }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, dateRange, metaConnection, getPreviousPeriodDates, calculatePercentChange]); // Removed setIsLoadingMetaData from deps, it's a setter

  // EXACT COPY OF META PAGE SYNC FUNCTION - THIS IS WHAT MAKES IT WORK
  const syncMetaInsights = async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      console.error("[HomeTab] Cannot sync data - missing brand ID or date range");
      return;
    }
    
    const refreshId = `home-meta-sync-${Date.now()}`;
    
    // Use the same locking mechanism for consistency
    if (isMetaFetchInProgress()) {
      console.log(`[HomeTab] ⚠️ Meta sync skipped - fetch already in progress for refreshId: ${refreshId}`);
      toast.info("Meta data is already refreshing. Please wait.", { id: "meta-refresh-toast" });
      return;
    }
    
    if (!acquireMetaFetchLock(refreshId)) {
      console.log(`[HomeTab] ⛔ Failed to acquire global lock for Meta sync refreshId: ${refreshId}`);
      toast.error("Failed to initiate Meta data refresh. Please try again.", { id: "meta-refresh-toast" });
      return;
    }
    
    console.log("[HomeTab] Syncing Meta insights data through database...");
    
    // Set ALL Meta widget loading states to true for consistent loading
    setIsLoadingMetaData(true);
    setIsLoadingAllMetaWidgets(true);
    setIsLoadingCampaigns(true); // Also set campaign loading to sync with other widgets
    
    toast.loading("Refreshing Meta data...", { id: "meta-refresh-toast", duration: 15000 });
    
    try {
      // Format dates in YYYY-MM-DD format
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      
      // Step 1: Sync fresh data from Meta API to database
      console.log(`[HomeTab] 🚀 Step 1: Syncing Meta insights to database (refreshId: ${refreshId})`);
      const response = await fetch('/api/meta/insights/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Refresh-ID': refreshId
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
        console.log(`[HomeTab] ✅ Meta insights synced successfully - synced ${result.count || 0} records from Meta (refreshId: ${refreshId})`);
        
        // Step 2: Now fetch the refreshed data from database AND campaigns in parallel
        console.log(`[HomeTab] 🚀 Step 2: Fetching all refreshed Meta data (refreshId: ${refreshId})`);
        
        // Fetch metrics data and campaigns in parallel to ensure consistent loading
        await Promise.all([
          fetchMetaDataFromDatabase(refreshId),
          // If campaign widget is present, also refresh campaigns
          widgets.some(widget => widget.id === 'meta-campaigns') ? fetchCampaigns(true, true) : Promise.resolve()
        ]);
        
        toast.success("Meta data refreshed!", { id: "meta-refresh-toast" });
        window._lastMetaRefresh = Date.now(); // Update timestamp of last successful refresh
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
          detail: { 
            brandId, 
            timestamp: Date.now(),
            forceRefresh: true,
            syncedRecords: result.count || 0,
            source: 'HomeTabSync',
            refreshId
          }
        }));
        
         // Also dispatch completion event for global refresh button
         window.dispatchEvent(new CustomEvent('data-refresh-complete', {
           detail: {
             brandId,
             platform: 'meta',
             timestamp: Date.now(),
             source: 'HomeTabSync'
           }
         }));
        
        // NEW: Trigger special widgets (Reach/Budget) to refresh after unified loading completes
        console.log("[HomeTab] Triggering special widgets refresh after unified loading completion");
        
        console.log(`[HomeTab] ✅ FULL Meta sync completed successfully (refreshId: ${refreshId})`);
      } else {
        throw new Error(result.error || 'Failed to sync Meta insights');
      }
    } catch (error) {
      console.error(`[HomeTab] Error syncing Meta insights (refreshId: ${refreshId}):`, error);
      toast.error("Failed to sync Meta insights", {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000,
        id: "meta-refresh-toast"
      });
    } finally {
      // Clear ALL Meta widget loading states at the same time for consistent loading
      setIsLoadingMetaData(false);
      setIsLoadingAllMetaWidgets(false);
      setIsLoadingCampaigns(false);
      releaseMetaFetchLock(refreshId);
    }
  };

  // Simplified function to fetch Meta data from database after sync
  const fetchMetaDataFromDatabase = useCallback(async (refreshId?: string) => {
    if (!brandId || !dateRange?.from || !dateRange?.to || !metaConnection) {
      console.log("[HomeTab] Skipping Meta data fetch from database: Missing brandId, dateRange, or Meta connection.");
      return;
    }

    try {
      console.log(`[HomeTab] 🔄 Fetching Meta data from database (refreshId: ${refreshId || 'standalone'})`);

      // Current period params
      const params = new URLSearchParams({ brandId: brandId });
      if (dateRange.from) params.append('from', dateRange.from.toISOString().split('T')[0]);
      if (dateRange.to) params.append('to', dateRange.to.toISOString().split('T')[0]);
      
      // Apply cache busting to ensure fresh data from database
      params.append('bypass_cache', 'true');
      params.append('force_load', 'true');
      params.append('refresh', 'true');
      
      const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);
      const prevParams = new URLSearchParams({ brandId: brandId });
      if (prevFrom) prevParams.append('from', prevFrom);
      if (prevTo) prevParams.append('to', prevTo);
      
      prevParams.append('bypass_cache', 'true');
      prevParams.append('force_load', 'true');
      prevParams.append('refresh', 'true');
      
      const currentResponse = await fetch(`/api/metrics/meta?${params.toString()}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Refresh-ID': refreshId || 'standalone'
        }
      });
      
      const prevResponse = await fetch(`/api/metrics/meta?${prevParams.toString()}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Refresh-ID': refreshId || 'standalone'
        }
      });
      
      if (!currentResponse.ok) {
        const errorData = await currentResponse.json().catch(() => ({ error: "Unknown error fetching current Meta data" }));
        console.error(`[HomeTab] Failed to fetch current period Meta data from database (refreshId: ${refreshId}): ${currentResponse.status}`, errorData);
        throw new Error(errorData.error || `Failed to fetch current period Meta data: ${currentResponse.status}`);
      }
      
      if (!prevResponse.ok) {
        const errorData = await prevResponse.json().catch(() => ({ error: "Unknown error fetching previous Meta data" }));
        console.error(`[HomeTab] Failed to fetch previous period Meta data from database (refreshId: ${refreshId}): ${prevResponse.status}`, errorData);
        throw new Error(errorData.error || `Failed to fetch previous period Meta data: ${prevResponse.status}`);
      }
      
      const currentData = await currentResponse.json();
      const previousData = await prevResponse.json();
      
      console.log(`[HomeTab] Fetched Meta data from database for current period (refreshId: ${refreshId}):`, {
        adSpend: currentData.adSpend,
        impressions: currentData.impressions,
        clicks: currentData.clicks,
        conversions: currentData.conversions,
        roas: currentData.roas,
        dailyData: Array.isArray(currentData.dailyData) ? currentData.dailyData.length : 0
      });
      
      console.log(`[HomeTab] Fetched Meta data from database for previous period (refreshId: ${refreshId}):`, {
        adSpend: previousData.adSpend,
        impressions: previousData.impressions,
        clicks: previousData.clicks,
        conversions: previousData.conversions,
        roas: previousData.roas,
        dailyData: Array.isArray(previousData.dailyData) ? previousData.dailyData.length : 0
      });

      // Update metaMetrics state with database data
      setMetaMetrics(prev => {
        const newMetrics = {
          ...prev,
          adSpend: currentData.adSpend || 0,
          impressions: currentData.impressions || 0,
          clicks: currentData.clicks || 0,
          conversions: currentData.conversions || 0,
          roas: currentData.roas || 0,
          ctr: currentData.ctr || 0,
          cpc: currentData.cpc || 0,
          costPerResult: currentData.costPerResult || 0,
          results: currentData.results || 0,
          purchaseValue: currentData.purchaseValue || 0,

          previousAdSpend: previousData.adSpend || 0,
          previousImpressions: previousData.impressions || 0,
          previousClicks: previousData.clicks || 0,
          previousConversions: previousData.conversions || 0,
          previousRoas: previousData.roas || 0,
          previousCtr: previousData.ctr || 0,
          previousCpc: previousData.cpc || 0,
          previousResults: previousData.results || 0,
          previousPurchaseValue: previousData.purchaseValue || 0,

          adSpendGrowth: calculatePercentChange(currentData.adSpend, previousData.adSpend),
          impressionGrowth: calculatePercentChange(currentData.impressions, previousData.impressions),
          clickGrowth: calculatePercentChange(currentData.clicks, previousData.clicks),
          conversionGrowth: calculatePercentChange(currentData.conversions, previousData.conversions),
          roasGrowth: calculatePercentChange(currentData.roas, previousData.roas),
          ctrGrowth: calculatePercentChange(currentData.ctr, previousData.ctr),
          cpcGrowth: calculatePercentChange(currentData.cpc, previousData.cpc),
          cprGrowth: calculatePercentChange(currentData.costPerResult, previousData.costPerResult),
        };
        
        console.log(`[HomeTab] ✅ Updated metaMetrics state from database (refreshId: ${refreshId})`);
        return newMetrics;
      });
      
      setMetaDaily(currentData.dailyData || []);
      hasFetchedMetaData.current = true;
      
    } catch (error) {
      console.error(`[HomeTab] Error fetching Meta data from database (refreshId: ${refreshId}):`, error);
      // Don't show toast error here as it's usually called after syncMetaInsights which shows its own errors
    }
  }, [brandId, dateRange, metaConnection, getPreviousPeriodDates, calculatePercentChange]);

  // Function to fetch campaign data from the API - RESTORED FROM BACKUP & MOVED EARLIER
  const fetchCampaigns = useCallback(async (forceRefresh = false, skipLoadingState = false) => {
    if (!brandId || !metaConnection) {
      console.log('[HomeTab] Cannot fetch campaigns without brandId or Meta connection');
      if (!skipLoadingState) {
        setIsLoadingCampaigns(false);
      }
      return;
    }
    
    // Only set loading true if we are actually going to fetch AND not skipping loading state
    if ((forceRefresh || campaigns.length === 0) && !skipLoadingState) { 
      setIsLoadingCampaigns(true);
    }
    
    try {
      let url = `/api/meta/campaigns?brandId=${brandId}`;
      
      let localFromDate: string | undefined;
      let localToDate: string | undefined;

      if (dateRange?.from && dateRange?.to) {
        localFromDate = dateRange.from.toISOString().split('T')[0];
        localToDate = dateRange.to.toISOString().split('T')[0];
        url += `&from=${localFromDate}&to=${localToDate}`;
        
        const isDifferentDateRange = 
          lastFetchedCampaignDates.current.from !== localFromDate || 
          lastFetchedCampaignDates.current.to !== localToDate;
        
        // If not forcing refresh and dates are the same, and we already have campaigns, skip.
        if (!forceRefresh && !isDifferentDateRange && campaigns.length > 0) {
          console.log('[HomeTab] Skipping campaign fetch: dates unchanged, not forcing, and campaigns exist.');
          if (!skipLoadingState) {
            setIsLoadingCampaigns(false); // Ensure loading is false
          }
          return;
        }
        lastFetchedCampaignDates.current = {from: localFromDate, to: localToDate};
      }
      
      // Add cache busting if forcing or if date range is specified (implies a new context)
      if (forceRefresh || (localFromDate && localToDate)) {
        url += `${url.includes('?') ? '&' : '?'}forceRefresh=true&t=${Date.now()}`;
      }
      
      console.log(`[HomeTab] Fetching Meta campaigns: ${url}`);
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
      console.log(`[HomeTab] Loaded ${data.campaigns?.length || 0} Meta campaigns`);
      
    } catch (error) {
      console.error('[HomeTab] Error fetching campaigns:', error);
      // Potentially set campaigns to empty array on error after logging
      // setCampaigns([]);
    } finally {
      // Only clear loading state if we're not skipping it (i.e., not coordinated with other loading)
      if (!skipLoadingState) {
        setIsLoadingCampaigns(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, metaConnection, dateRange, setIsLoadingCampaigns, setCampaigns, campaigns.length]); // Added relevant setters and campaigns.length

  // Fetch Shopify data when brandId or dateRange changes
  const fetchShopifyData = useCallback(async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to || !shopifyConnection) {
      // Ensure loading state is false if prerequisites aren't met
      setIsLoadingShopifyData(false);
      return;
    }
    setIsLoadingShopifyData(true);
    try {
      const params = new URLSearchParams({
        brandId: brandId,
        from: dateRange.from.toISOString().split('T')[0],
        to: dateRange.to.toISOString().split('T')[0]
      });

      // Check if this is "today" date range to force fresh data
      const today = new Date();
      const isToday = isSameDay(dateRange.from, today) && isSameDay(dateRange.to, today);
      
      if (isToday) {
        console.log("[HomeTab] Today detected for Shopify - forcing fresh data fetch");
        params.append('bypass_cache', 'true');
        params.append('force_load', 'true');
        params.append('refresh', 'true');
        params.append('t', Date.now().toString()); // Additional cache busting
      }

      const response = await fetch(`/api/metrics/shopify?${params.toString()}`, {
        cache: isToday ? 'no-store' : 'default',
        headers: isToday ? {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        } : {}
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch Shopify data: ${response.status}`);
      }
      const data = await response.json();
      // Assuming shopifyDaily data needs to be set here
      setShopifyDaily(data.dailyData || []); 
      console.log(`[HomeTab] Shopify data fetched${isToday ? ' (fresh for today)' : ''}:`, data);
    } catch (error) {
      console.error("[HomeTab] Error fetching Shopify data:", error);
    } finally {
      setIsLoadingShopifyData(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, dateRange, shopifyConnection]); // Minimal necessary dependencies

  // Effect to handle Meta connection changes and set unified loading state
  useEffect(() => {
    if (metaConnection && brandId && dateRange?.from && dateRange?.to) {
      // When Meta connection becomes available, set loading state immediately
      setIsLoadingAllMetaWidgets(true);
      console.log("[HomeTab] Meta connection detected, setting unified loading state to true");
    } else if (!metaConnection) {
      // When Meta connection is lost, clear loading state
      setIsLoadingAllMetaWidgets(false);
      console.log("[HomeTab] Meta connection lost, clearing unified loading state");
    }
  }, [metaConnection, brandId, dateRange?.from, dateRange?.to]);

  // Initial data load and refresh logic for Meta & Shopify
  useEffect(() => {
    // Skip if we're still in the dashboard's initial setup phase
    if (typeof window !== 'undefined' && window._dashboardInitialSetup) {
      console.log("[HomeTab] Skipping data fetch - dashboard still in initial setup phase");
      return;
    }
    
    // Check if we've already done the initial load for this date range
    const dateRangeChanged = dateRange?.from !== lastFetchedDateRange.current.from || 
                           dateRange?.to !== lastFetchedDateRange.current.to;
    
    if (brandId && dateRange?.from && dateRange?.to && (dateRangeChanged || !hasInitialDataLoaded.current)) {
      // Prevent duplicate initial loads
      if (isInitialLoadInProgress.current && !dateRangeChanged) {
        console.log("[HomeTab] Initial load already in progress, skipping duplicate call");
        return;
      }
      
      console.log("[HomeTab] useEffect detected change in brandId or dateRange. Fetching all data.");
      isInitialLoadInProgress.current = true;
      
      // Update the last fetched date range
      lastFetchedDateRange.current = { from: dateRange.from, to: dateRange.to };
      
      // For Meta, trigger a sync when brand or date range changes.
      if (metaConnection) {
        console.log("[HomeTab] Meta connection active, calling syncMetaInsights for database refresh.");
        syncMetaInsights(); // Use database-based sync instead of direct API calls
        // Note: Campaign fetching is now handled within syncMetaInsights for coordinated loading
      } else {
        console.log("[HomeTab] Meta connection not active, skipping Meta data fetch.");
        setMetaMetrics(initialMetaMetricsState);
        setMetaDaily([]);
        setCampaigns([]);
        // Clear all Meta loading states when not connected
        setIsLoadingMetaData(false);
        setIsLoadingAllMetaWidgets(false);
        setIsLoadingCampaigns(false);
      }

      if (shopifyConnection) {
        console.log("[HomeTab] Shopify connection active, calling fetchShopifyData.");
        fetchShopifyData();
      } else {
        console.log("[HomeTab] Shopify connection not active, skipping Shopify data fetch.");
        setIsLoadingShopifyData(false);
      }
      
      // Mark initial load as complete
      hasInitialDataLoaded.current = true;
      
      // Clear the in-progress flag after a delay
      setTimeout(() => {
        isInitialLoadInProgress.current = false;
      }, 2000);
    } else {
      console.log("[HomeTab] Skipping data fetch in useEffect: Missing brandId or full dateRange.");
      // Clear all loading states when prerequisites aren't met
      setIsLoadingMetaData(false);
      setIsLoadingAllMetaWidgets(false);
      setIsLoadingShopifyData(false);
      setIsLoadingCampaigns(false);
    }
  }, [brandId, dateRange, metaConnection, shopifyConnection]); // Removed widgets from dependencies

  // Effect for initial mount and visibility changes to trigger database-based refresh for Meta data
  useEffect(() => {
    if (!brandId || !metaConnection) {
      console.log("[HomeTab] Skipping Meta mount/visibility refresh: no brandId or Meta not connected.");
      return;
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("[HomeTab] Page became visible - auto-refresh disabled per user request.");
        // Clear any potential blocking flags from other tabs/components but don't auto-refresh
        if (typeof window !== 'undefined') {
          window._blockMetaApiCalls = false;
          window._disableAutoMetaFetch = false;
          console.log("[HomeTab] Cleared _blockMetaApiCalls and _disableAutoMetaFetch flags on visibility change (no auto-refresh).");
        }
        // REMOVED: syncMetaInsights(); // User requested no auto-refresh on tab switch
      }
    };

    // REMOVED: Initial sync on mount is now handled by the main data loading useEffect
    // Clear potential blocking flags first
    if (typeof window !== 'undefined') {
      window._blockMetaApiCalls = false;
      window._disableAutoMetaFetch = false;
      console.log("[HomeTab] Cleared _blockMetaApiCalls and _disableAutoMetaFetch flags on mount.");
    }
    // REMOVED: syncMetaInsights(); // Use database-based sync

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [brandId, metaConnection]);

  // Listen for global refresh events (e.g., from MetaTab)
  useEffect(() => {
    const handleGlobalRefresh = (event: CustomEvent) => {
      console.log("[HomeTab] Received global refresh event:", event.detail);
      if (event.detail?.brandId === brandId && metaConnection) {
        console.log("[HomeTab] Global refresh event matches current brandId. Triggering Meta database sync.");
        toast.info("Syncing with recent Meta updates...", { id: "meta-global-refresh-toast" });
        syncMetaInsights(); // Use database-based sync
      } else {
        console.log("[HomeTab] Global refresh event not for this brand or Meta not connected, skipping.");
      }
    };

    const handleNewDayDetected = (event: CustomEvent) => {
      console.log("[HomeTab] 🌅 New day detected event received:", event.detail);
      if (event.detail?.brandId === brandId && metaConnection) {
        console.log("[HomeTab] 📅 New day transition detected for current brand. Triggering comprehensive Meta sync.");
        toast.info("New day detected! Refreshing all Meta data...", { 
          id: "meta-new-day-refresh",
          duration: 8000 
        });
        
        // Force a comprehensive sync to ensure proper data separation
        syncMetaInsights();
      } else {
        console.log("[HomeTab] New day event not for this brand or Meta not connected, skipping.");
      }
    };

    const handleGlobalRefreshAll = (event: CustomEvent) => {
      console.log("[HomeTab] Received global-refresh-all event:", event.detail);
      if (event.detail?.brandId === brandId && 
          (event.detail?.currentTab === 'site' || event.detail?.platforms)) {
        console.log("[HomeTab] Global refresh all - triggering all widget refreshes");
        
        // Refresh Meta widgets if Meta is connected
        if (metaConnection && event.detail?.platforms?.meta) {
          console.log("[HomeTab] Refreshing Meta widgets");
          syncMetaInsights();
          if (widgets.some(widget => widget.id === 'meta-campaigns')) {
            fetchCampaigns(true);
          }
        }
        
        // Refresh Shopify widgets if Shopify is connected  
        if (shopifyConnection && event.detail?.platforms?.shopify) {
          console.log("[HomeTab] Refreshing Shopify widgets");
          // Trigger any Shopify-specific refreshes needed
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('metaDataRefreshed', handleGlobalRefresh as EventListener);
      window.addEventListener('force-meta-refresh', handleGlobalRefresh as EventListener);
      window.addEventListener('refresh-all-widgets', handleGlobalRefreshAll as EventListener);
      window.addEventListener('global-refresh-all', handleGlobalRefreshAll as EventListener);
      window.addEventListener('newDayDetected', handleNewDayDetected as EventListener);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('metaDataRefreshed', handleGlobalRefresh as EventListener);
        window.removeEventListener('force-meta-refresh', handleGlobalRefresh as EventListener);
        window.removeEventListener('refresh-all-widgets', handleGlobalRefreshAll as EventListener);
        window.removeEventListener('global-refresh-all', handleGlobalRefreshAll as EventListener);
        window.removeEventListener('newDayDetected', handleNewDayDetected as EventListener);
      }
    };
  }, [brandId, metaConnection]);

  // Function to manually trigger a database-based refresh for Meta data from HomeTab UI (e.g., a button)
  const handleManualMetaRefresh = () => {
    if (!brandId || !metaConnection) {
      toast.error("Cannot refresh Meta data: No brand selected or Meta not connected.");
      return;
    }
    console.log("[HomeTab] Manual Meta refresh triggered.");
    syncMetaInsights(); // Use database-based sync
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
    // Widget-specific props based on ID
    switch (widget.id) {
      case 'shopify-sales':
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metrics.totalSales || 0}
              change={metrics.salesGrowth || 0}
              prefix="$"
              valueFormat="currency"
              data={metrics.salesData || []}
              infoTooltip="Total revenue from all orders in the selected period"
              loading={isLoading}
            />
          </div>
        );
      case 'shopify-orders':
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metrics.ordersPlaced || 0}
              change={metrics.ordersGrowth || 0}
              data={metrics.ordersData || []}
              infoTooltip="Total number of orders placed in the selected period"
              loading={isLoading}
            />
          </div>
        );
      case 'shopify-aov':
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metrics.averageOrderValue || 0}
              change={metrics.aovGrowth || 0}
              prefix="$"
              valueFormat="currency"
              data={metrics.aovData || []}
              infoTooltip="Average value of orders in the selected period"
              loading={isLoading}
            />
          </div>
        );
      case 'shopify-units':
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metrics.unitsSold || 0}
              change={metrics.unitsGrowth || 0}
              data={metrics.unitsSoldData || []}
              infoTooltip="Total number of units sold in the selected period"
            />
          </div>
        );
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
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metaMetrics.adSpend}
              change={metaMetrics.adSpendGrowth}
              previousValue={metaMetrics.previousAdSpend}
              prefix="$"
              valueFormat="currency"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="currency"
              previousValueDecimals={2}
              previousValuePrefix="$"
              infoTooltip="Total amount spent on Meta ads"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingAllMetaWidgets}
            />
          </div>
        );
      case 'meta-impressions':
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metaMetrics.impressions}
              change={metaMetrics.impressionGrowth}
              previousValue={metaMetrics.previousImpressions}
              hideGraph={true}
              valueFormat="number"
              decimals={0}
              showPreviousPeriod={true}
              previousValueFormat="number"
              previousValueDecimals={0}
              infoTooltip="Total number of times your ads were viewed"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingAllMetaWidgets}
            />
          </div>
        );
      case 'meta-clicks':
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metaMetrics.clicks}
              change={metaMetrics.clickGrowth}
              previousValue={metaMetrics.previousClicks}
              hideGraph={true}
              valueFormat="number"
              decimals={0}
              showPreviousPeriod={true}
              previousValueFormat="number"
              previousValueDecimals={0}
              infoTooltip="Total number of clicks on your ads"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingAllMetaWidgets}
            />
          </div>
        );
      case 'meta-conversions':
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metaMetrics.conversions}
              change={metaMetrics.conversionGrowth}
              previousValue={metaMetrics.previousConversions}
              hideGraph={true}
              valueFormat="number"
              decimals={0}
              showPreviousPeriod={true}
              previousValueFormat="number"
              previousValueDecimals={0}
              infoTooltip="Total number of conversions from your ads"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingAllMetaWidgets}
            />
          </div>
        );
      case 'meta-roas':
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metaMetrics.roas}
              change={metaMetrics.roasGrowth}
              previousValue={metaMetrics.previousRoas}
              suffix="x"
              valueFormat="number"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="number"
              previousValueDecimals={2}
              previousValueSuffix="x"
              infoTooltip="Return on ad spend (revenue / ad spend)"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingAllMetaWidgets}
            />
          </div>
        );
      case 'meta-ctr':
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metaMetrics.ctr / 100} // Convert percentage to decimal for proper formatting
              change={metaMetrics.ctrGrowth}
              previousValue={metaMetrics.previousCtr / 100} // Convert percentage to decimal for proper formatting
              valueFormat="percentage"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="percentage"
              previousValueDecimals={2}
              infoTooltip="Click-through rate (clicks ÷ impressions)"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingAllMetaWidgets}
            />
          </div>
        );
      case 'meta-cpc':
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metaMetrics.cpc}
              change={metaMetrics.cpcGrowth}
              previousValue={metaMetrics.previousCpc}
              prefix="$"
              valueFormat="currency"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="currency"
              previousValueDecimals={2}
              previousValuePrefix="$"
              infoTooltip="Average cost per click (spend ÷ clicks)"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingAllMetaWidgets}
            />
          </div>
        );
      case 'meta-cpr':
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metaMetrics.costPerResult || 0}
              change={metaMetrics.cprGrowth || 0}
              prefix="$"
              valueFormat="currency"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="currency"
              previousValueDecimals={2}
              previousValuePrefix="$"
              previousValue={0}
              infoTooltip="Average cost per result"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingAllMetaWidgets}
            />
          </div>
        );
      case 'meta-results':
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={metaMetrics.conversions}
              change={metaMetrics.conversionGrowth}
              valueFormat="number"
              hideGraph={true}
              showPreviousPeriod={true}
              previousValue={metaMetrics.previousConversions}
              previousValueFormat="number"
              infoTooltip="Total number of results from your ads"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingAllMetaWidgets}
            />
          </div>
        );
      case 'meta-purchase-value':
        // Calculate purchase value from ROAS and spend (this is how it's done in MetaTab)
        const purchaseValue = metaMetrics.roas * metaMetrics.adSpend;
        const previousPurchaseValue = metaMetrics.previousRoas * metaMetrics.previousAdSpend;
        const purchaseValueGrowth = calculatePercentChange(purchaseValue, previousPurchaseValue);
        
        return (
          <div key={widget.id} className="w-full">
            <MetricCard 
              title={widget.name}
              value={purchaseValue}
              change={purchaseValueGrowth}
              prefix="$"
              valueFormat="currency"
              hideGraph={true}
              showPreviousPeriod={true}
              previousValue={previousPurchaseValue}
              previousValueFormat="currency"
              previousValuePrefix="$"
              infoTooltip="Total purchase value from your ads (calculated from ROAS × Ad Spend)"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingAllMetaWidgets}
            />
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
              <MemoizedCampaignWidget 
                brandId={brandId}
                campaigns={campaigns}
                isLoading={isLoadingAllMetaWidgets}
                isSyncing={isSyncingCampaigns}
                dateRange={dateRange}
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
              isLoading={isLoadingAllMetaWidgets}
              isSyncing={isSyncingCampaigns}
              dateRange={dateRange}
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
                dateRange={dateRange.from && dateRange.to ? dateRange : undefined}
                isManuallyRefreshing={false}
                disableAutoFetch={isLoadingAllMetaWidgets}
                unifiedLoading={isLoadingAllMetaWidgets}
              />
            </div>
          );
        }
        
        return (
          <div key={widget.id} className="w-full">
            <TotalAdSetReachCard 
              brandId={brandId} 
              dateRange={dateRange.from && dateRange.to ? dateRange : undefined}
              isManuallyRefreshing={false}
              disableAutoFetch={isLoadingAllMetaWidgets}
              unifiedLoading={isLoadingAllMetaWidgets}
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
                isManuallyRefreshing={false}
                disableAutoFetch={isLoadingAllMetaWidgets}
                unifiedLoading={isLoadingAllMetaWidgets}
              />
            </div>
          );
        }
        
        return (
          <div key={widget.id} className="w-full">
            <TotalBudgetMetricCard 
              brandId={brandId}
              isManuallyRefreshing={false}
              disableAutoFetch={isLoadingAllMetaWidgets}
              unifiedLoading={isLoadingAllMetaWidgets}
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
          <MetricCard 
            title={widget.name}
            value={widget.type === 'meta' ? metaMetrics.adSpend : metrics.totalSales || 0}
            change={widget.type === 'meta' ? metaMetrics.adSpendGrowth : metrics.salesGrowth || 0}
            prefix={widget.type === 'meta' ? "$" : undefined}
            valueFormat={widget.type === 'meta' ? "currency" : undefined}
            data={widget.type === 'meta' ? [] : metrics.salesData || []}
            infoTooltip={widget.type === 'meta' ? "Total revenue from all orders in the selected period" : undefined}
            brandId={brandId}
            className="mb-0"
            platform={widget.type}
            dateRange={dateRange}
            loading={widget.type === 'meta' ? isLoadingAllMetaWidgets : isLoading}
          />
        </div>
      );
    }

    // 🔥🔥🔥 MAJOR DEBUG: Log final widget props before rendering MetricCard
    if (widget.type === 'meta') {
      console.log(`🔥🔥🔥 [HomeTab] MAJOR DEBUG: About to render MetricCard for "${widget.id}" with props:`, {
        widgetId: widget.id,
        value: widget.type === 'meta' ? metaMetrics.adSpend : metrics.totalSales || 0,
        change: widget.type === 'meta' ? metaMetrics.adSpendGrowth : metrics.salesGrowth || 0,
        previousValue: widget.type === 'meta' ? metaMetrics.previousAdSpend : metrics.totalSales || 0,
        loading: widget.type === 'meta' ? isLoadingAllMetaWidgets : isLoading,
        title: typeof widget.name === 'string' ? widget.name : 'complex title object',
        metaMetricsSnapshot: {
          adSpend: metaMetrics.adSpend,
          impressions: metaMetrics.impressions,
          clicks: metaMetrics.clicks,
          conversions: metaMetrics.conversions,
          roas: metaMetrics.roas,
          ctr: metaMetrics.ctr,
          cpc: metaMetrics.cpc,
          costPerResult: metaMetrics.costPerResult
        }
      });
    }

    return (
      <div key={widget.id} className="w-full">
        <MetricCard 
          title={widget.name}
          value={widget.type === 'meta' ? metaMetrics.adSpend : metrics.totalSales || 0}
          change={widget.type === 'meta' ? metaMetrics.adSpendGrowth : metrics.salesGrowth || 0}
          prefix={widget.type === 'meta' ? "$" : undefined}
          valueFormat={widget.type === 'meta' ? "currency" : undefined}
          data={widget.type === 'meta' ? [] : metrics.salesData || []}
          infoTooltip={widget.type === 'meta' ? "Total revenue from all orders in the selected period" : undefined}
          brandId={brandId}
          className="mb-0"
          platform={widget.type}
          dateRange={dateRange}
        />
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

  // NEW: Function to trigger refresh of special Meta widgets after coordinated loading
  const triggerSpecialWidgetsRefresh = useCallback(() => {
    // Trigger refresh for Reach and Budget widgets by dispatching custom events
    console.log("[HomeTab] Triggering special widgets refresh after unified loading");
    window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
      detail: { brandId, source: 'homeTab-unified' }
    }));
  }, [brandId]);

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