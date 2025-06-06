"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { 
  DollarSign, LineChart, MousePointerClick, TrendingUp, Loader2, 
  ArrowDownRight, ArrowUpRight, RefreshCw, ShoppingCart, Eye, 
  MousePointer, Target, SlidersHorizontal, Zap, ExternalLink, 
  PlusCircle, Layers, Wallet, ChevronDown, PiggyBank, 
  CircleDollarSign, Circle, Coins, Users, BarChart2,
  Sparkles, Image as ImageIcon, Activity, ArrowRight, 
  CalendarIcon, Check, ChevronsUpDown, Clock, Download, 
  FacebookIcon, MoreHorizontal, PenTool, SettingsIcon, 
  Terminal, User2, Wrench, CalendarRange, Percent, Info, 
  HelpCircle
} from "lucide-react"
import classNames from "classnames"
import { format, isSameDay, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { withErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Metrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  BrainCircuit, 
  AlertCircle,
  Settings,
} from "lucide-react"
import { MetricCard } from "@/components/metrics/MetricCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrencyCompact, formatNumberCompact, formatPercentage } from "@/lib/formatters"
import Image from "next/image"
import { AlertBox } from "@/components/ui/alert-box"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CampaignWidget } from "./CampaignWidget" // Import the Campaign Widget component
import { TotalBudgetMetricCard } from "../../../metrics/TotalBudgetMetricCard"
import MetaFixButton from "./meta-fix-button" // Import the Meta Fix Button
import { TotalAdSetReachCard } from '@/components/dashboard/platforms/metrics/TotalAdSetReachCard'
import { MetaSpecificDateSyncButton } from '@/components/dashboard/platforms/tabs/MetaSpecificDateSyncButton'; // Import the new button



interface MetaTabProps {
  dateRange: DateRange | undefined
  metrics: any
  isLoading: boolean
  isRefreshingData?: boolean
  initialDataLoad?: boolean
  brandId: string
}

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

// Add type definition for the global timeouts array
declare global {
  interface Window {
    _metaTimeouts?: ReturnType<typeof setTimeout>[];
    _blockMetaApiCalls?: boolean;
    _disableAutoMetaFetch?: boolean;
    _activeFetchIds?: Set<number | string>;
    _metaFetchLock?: boolean;
    _lastManualRefresh?: number;
    _lastMetaRefresh?: number;
    _metaApiRequests?: number;
    _canMakeMetaApiRequest?: boolean;
    _metaTabSwitchInProgress?: boolean;
    _lastMetaTabRefresh?: number; // Add timestamp of last refresh
    _metaTabInitialLoading?: boolean; // Add flag for initial loading state
  }
}

// Initialize the fetch prevention system
if (typeof window !== 'undefined') {
  window._activeFetchIds = window._activeFetchIds || new Set();
  window._metaFetchLock = window._metaFetchLock || false;
  window._lastManualRefresh = window._lastManualRefresh || 0;
  window._lastMetaRefresh = window._lastMetaRefresh || 0;
}

// Helper function to check if a fetch is in progress globally
function isMetaFetchInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  return window._metaFetchLock === true || (window._activeFetchIds?.size ?? 0) > 0;
}

// Helper function to acquire a fetch lock
function acquireMetaFetchLock(fetchId: number | string): boolean {
  if (typeof window === 'undefined') return true;
  
  if (window._metaFetchLock === true && !window._activeFetchIds?.has(fetchId)) {
    console.log(`[MetaTab] 🔒 Meta Fetch lock active by another process, rejecting new fetchId: ${fetchId}`);
    return false;
  }
  
  window._metaFetchLock = true;
  window._activeFetchIds?.add(fetchId);
  
  console.log(`[MetaTab] 🔐 Acquired Meta fetch lock for fetchId: ${fetchId}. Active fetches: ${window._activeFetchIds?.size}`);
  return true;
}

// Helper function to release a fetch lock
function releaseMetaFetchLock(fetchId: number | string): void {
  if (typeof window === 'undefined') return;
  
  // Remove this fetch ID
  window._activeFetchIds?.delete(fetchId);
  
  // If no active fetches, release the global lock
  if ((window._activeFetchIds?.size ?? 0) === 0) {
    window._metaFetchLock = false;
    console.log(`[MetaTab] 🔓 Released fetch lock (fetchId: ${fetchId})`);
  } else {
    console.log(`[MetaTab] 🔒 Lock maintained for ${window._activeFetchIds?.size} active fetches (ended: ${fetchId})`);
  }
}

const MemoizedCampaignWidget = React.memo(CampaignWidget);

export function MetaTab({ 
  dateRange, 
  metrics, 
  isLoading, 
  isRefreshingData = false, 
  initialDataLoad = false, 
  brandId 
}: MetaTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Unified loading state for all Meta widgets
  const [isLoadingAllMetaWidgets, setIsLoadingAllMetaWidgets] = useState(true);
  const [isSyncingCampaigns, setIsSyncingCampaigns] = useState<boolean>(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState<boolean>(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const hasFetchedData = useRef(false);

  // Define an interface for MetaMetrics state, similar to HomeTab
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
    results: number;
    previousResults: number;
    purchaseValue: number;
    previousPurchaseValue: number;
    reach: number;
    previousReach: number;
    reachGrowth: number | null;
    budget: number;
    previousBudget: number;
    budgetGrowth: number | null;
    linkClicks: number;
    previousLinkClicks: number;
    linkClicksGrowth: number | null;
  }
  
  // State for direct Meta metrics
  const [metaMetrics, setMetaMetrics] = useState<MetaMetricsState>({
    adSpend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    roas: 0,
    adSpendGrowth: null,
    impressionGrowth: null,
    clickGrowth: null,
    conversionGrowth: null,
    roasGrowth: null,
    previousAdSpend: 0,
    previousImpressions: 0,
    previousClicks: 0,
    previousConversions: 0,
    previousRoas: 0,
    ctr: 0,
    previousCtr: 0,
    ctrGrowth: null,
    cpc: 0,
    previousCpc: 0,
    cpcGrowth: null,
    costPerResult: 0,
    cprGrowth: null,
    results: 0,
    previousResults: 0,
    purchaseValue: 0,
    previousPurchaseValue: 0,
    reach: 0,
    previousReach: 0,
    reachGrowth: null,
    budget: 0,
    previousBudget: 0,
    budgetGrowth: null,
    linkClicks: 0,
    previousLinkClicks: 0,
    linkClicksGrowth: null,
  });
  
  const [metaDaily, setMetaDaily] = useState<DailyDataItem[]>([]);
  const lastFetchedCampaignDates = useRef({from: '', to: ''});

  // Helper function to convert a Date to a consistent ISO date string (YYYY-MM-DD) in local time
  const toLocalISODateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  // Calculate percentage change function
  const calculatePercentChange = (current: number, previous: number): number | null => {
    if (previous === 0) {
      return null;
    }
    if (current === previous) {
      return 0;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  };
  
  // Function to calculate previous period date range - copied from HomeTab
  const getPreviousPeriodDates = useCallback((from: Date, to: Date): { prevFrom: string, prevTo: string } => {
    const fromNormalized = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toNormalized = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    const isSingleDay = isSameDay(fromNormalized, toNormalized);

    if (isSingleDay) {
      const prevDay = new Date(fromNormalized);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = toLocalISODateString(prevDay);
      
      console.log(`Single day detected, comparing to previous day: ${prevDayStr}`);
      
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
      
      console.log(`"Last 7 days" preset detected, comparing to previous 7 days:`, {
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
      
      console.log(`"Last 30 days" preset detected, comparing to previous 30 days:`, {
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
      
      console.log(`"This month" pattern detected, comparing to same days in previous month:`, {
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
      
      console.log(`"Last month" pattern detected, comparing to the month before last:`, {
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
      
      console.log(`"This year" pattern detected, comparing to same days in previous year:`, {
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
      
      console.log(`"Last year" pattern detected, comparing to the year before last:`, {
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
    
    console.log(`Custom range detected (${daysInRange} days), comparing to previous period:`, {
      currentRange: `${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`,
      prevRange: `${prevFromStr} to ${prevToStr}`
    });
    
    return {
      prevFrom: prevFromStr,
      prevTo: prevToStr
    };
  }
  
  // Delete the existing getPreviousPeriodLabel function and replace with this fixed version
  const getPreviousPeriodLabel = (): string => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      return "Previous period";
    }
    
    // Create fresh date objects to avoid any timezone issues
    const fromDate = new Date(
      dateRange.from.getFullYear(),
      dateRange.from.getMonth(),
      dateRange.from.getDate()
    );
    
    const toDate = new Date(
      dateRange.to.getFullYear(),
      dateRange.to.getMonth(),
      dateRange.to.getDate()
    );
    
    // Helper function to format dates consistently
    const formatDate = (date: Date): string => {
      return format(date, "MMM d");
    };
    
    // Calculate days in the range
    const daysInRange = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Case 1: Single day - show the previous day with date
    if (isSameDay(fromDate, toDate)) {
      const prevDay = new Date(fromDate);
      prevDay.setDate(prevDay.getDate() - 1);
      return `Previous day (${formatDate(prevDay)})`;
    }
    
    // Case 2: Handle specific presets by checking date patterns
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    // Last 7 days preset: today is 28th, range should be 21-27
    if (daysInRange === 7 && isSameDay(toDate, yesterday)) {
      const prevFromDate = new Date(fromDate);
      prevFromDate.setDate(prevFromDate.getDate() - 7);
      
      const prevToDate = new Date(toDate);
      prevToDate.setDate(prevToDate.getDate() - 7);
      
      return `Previous 7 days (${formatDate(prevFromDate)} - ${formatDate(prevToDate)})`;
    }
    
    // Last 30 days preset
    if (daysInRange === 30 && isSameDay(toDate, yesterday)) {
      const prevFromDate = new Date(fromDate);
      prevFromDate.setDate(prevFromDate.getDate() - 30);
      
      const prevToDate = new Date(toDate);
      prevToDate.setDate(prevToDate.getDate() - 30);
      
      return `Previous 30 days (${formatDate(prevFromDate)} - ${formatDate(prevToDate)})`;
    }
    
    // This month preset
    const currentMonthStart = startOfMonth(now);
    if (isSameDay(fromDate, currentMonthStart)) {
      const prevMonthStart = startOfMonth(subMonths(now, 1));
      const dayDiff = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      const prevMonthEnd = new Date(prevMonthStart);
      prevMonthEnd.setDate(prevMonthStart.getDate() + dayDiff);
      
      return `Previous month's equivalent (${formatDate(prevMonthStart)} - ${formatDate(prevMonthEnd)})`;
    }
    
    // Last month preset
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    if (isSameDay(fromDate, lastMonthStart) && isSameDay(toDate, lastMonthEnd)) {
      const prevMonthStart = startOfMonth(subMonths(now, 2));
      const prevMonthEnd = endOfMonth(subMonths(now, 2));
      
      return `Month before last (${formatDate(prevMonthStart)} - ${formatDate(prevMonthEnd)})`;
    }
    
    // This year preset
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    if (isSameDay(fromDate, thisYearStart)) {
      const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const dayDiff = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      const prevYearEnd = new Date(prevYearStart);
      prevYearEnd.setDate(prevYearStart.getDate() + dayDiff);
      
      return `Previous year's equivalent (${formatDate(prevYearStart)} - ${formatDate(prevYearEnd)})`;
    }
    
    // Last year preset
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
    if (isSameDay(fromDate, lastYearStart) && isSameDay(toDate, lastYearEnd)) {
      const prevYearStart = new Date(now.getFullYear() - 2, 0, 1);
      const prevYearEnd = new Date(now.getFullYear() - 2, 11, 31);
      
      return `Year before last (${formatDate(prevYearStart)} - ${formatDate(prevYearEnd)})`;
    }
    
    // Default case - custom date range
    const prevFromDate = new Date(fromDate);
    prevFromDate.setDate(prevFromDate.getDate() - daysInRange);
    
    const prevToDate = new Date(toDate);
    prevToDate.setDate(prevToDate.getDate() - daysInRange);
    
    if (daysInRange <= 7) {
      return `Previous ${daysInRange} days (${formatDate(prevFromDate)} - ${formatDate(prevToDate)})`;
    } else if (daysInRange <= 31) {
      return `Previous period (${formatDate(prevFromDate)} - ${formatDate(prevToDate)})`;
    } else if (daysInRange <= 92) {
      return `Previous quarter (${formatDate(prevFromDate)} - ${formatDate(prevToDate)})`;
    } else {
      return `Previous period (${formatDate(prevFromDate)} - ${formatDate(prevToDate)})`;
    }
  };

  // Fetch Ad Spend data directly from the database
  const fetchAdSpendDirectly = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot fetch Ad Spend: Missing date range or brand ID")
      return
    }
    
    setAdSpendData(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Construct URL params for current period
      const params = new URLSearchParams()
      params.append('brandId', brandId)
      params.append('metric', 'adSpend')
      
      // Set date parameters - simple approach
      const fromDate = dateRange.from
      const toDate = dateRange.to
      
      params.append('from', fromDate.toISOString().split('T')[0])
      params.append('to', toDate.toISOString().split('T')[0])
      
      // Log what we're doing
      console.log(`Fetching Ad Spend for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
      
      // Calculate previous period date range using our simplified helper function
      const { prevFrom, prevTo } = getPreviousPeriodDates(fromDate, toDate)
      
      // Fetch data for current period
      const response = await fetch(`/api/metrics/meta/single/adSpend?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      // prevParams.append('metric', 'adSpend') // No longer needed for specific route
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/adSpend?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      // DETAILED LOGGING FOR PREVIOUS PERIOD DATA
      console.log(`[MetaTab - fetchAdSpendDirectly] Raw prevData for ${prevFrom} to ${prevTo}:`, JSON.stringify(prevData));
      if (prevData && typeof prevData.value === 'number') {
        console.log(`[MetaTab - fetchAdSpendDirectly] Valid prevData.value: ${prevData.value}`);
      } else {
        console.error(`[MetaTab - fetchAdSpendDirectly] Invalid or missing prevData.value! Received:`, prevData);
      }
      // END DETAILED LOGGING
      
      if (response.ok && prevResponse.ok) {
        setAdSpendData({
          value: data.value || 0,
          previousValue: prevData.value || 0,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`Ad Spend data fetched directly: ${data.value}, Previous: ${prevData.value}`)
      } else {
        console.error("Error fetching Ad Spend data:", data.error || prevData.error)
        setAdSpendData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error in Ad Spend fetch:", error)
      setAdSpendData(prev => ({ ...prev, isLoading: false }))
    }
  }
  
  // Fetch ROAS data directly from the database
  const fetchRoasDirectly = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot fetch ROAS: Missing date range or brand ID")
      return
    }
    
    setRoasData(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Construct URL params for current period
      const params = new URLSearchParams()
      params.append('brandId', brandId)
      params.append('metric', 'roas')
      
      // Set date parameters - simple approach
      const fromDate = dateRange.from
      const toDate = dateRange.to
      
      params.append('from', fromDate.toISOString().split('T')[0])
      params.append('to', toDate.toISOString().split('T')[0])
      
      // Log what we're doing
      console.log(`Fetching ROAS for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
      
      // Calculate previous period date range using our simplified helper function
      const { prevFrom, prevTo } = getPreviousPeriodDates(fromDate, toDate)
      
      // Fetch data for current period
      const response = await fetch(`/api/metrics/meta/single/roas?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      // prevParams.append('metric', 'roas') // No longer needed
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/roas?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      if (response.ok && prevResponse.ok) {
        setRoasData({
          value: data.value || 0,
          previousValue: prevData.value || 0,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`ROAS data fetched directly: ${data.value}, Previous: ${prevData.value}`)
      } else {
        console.error("Error fetching ROAS data:", data.error || prevData.error)
        setRoasData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error in ROAS fetch:", error)
      setRoasData(prev => ({ ...prev, isLoading: false }))
    }
  }
  
  // Fetch Impressions data directly from the database
  const fetchImpressionsDirectly = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot fetch Impressions: Missing date range or brand ID")
      return
    }
    
    setImpressionsData(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Construct URL params for current period
      const params = new URLSearchParams()
      params.append('brandId', brandId)
      params.append('metric', 'impressions')
      
      // Set date parameters - simple approach
      const fromDate = dateRange.from
      const toDate = dateRange.to
      
      params.append('from', fromDate.toISOString().split('T')[0])
      params.append('to', toDate.toISOString().split('T')[0])
      
      // Log what we're doing
      console.log(`Fetching Impressions for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
      
      // Calculate previous period date range using our simplified helper function
      const { prevFrom, prevTo } = getPreviousPeriodDates(fromDate, toDate)
      
      // Fetch data for current period
      const response = await fetch(`/api/metrics/meta/single/impressions?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      // prevParams.append('metric', 'impressions') // No longer needed
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/impressions?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      if (response.ok && prevResponse.ok) {
        setImpressionsData({
          value: data.value || 0,
          previousValue: prevData.value || 0,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`Impressions data fetched directly: ${data.value}, Previous: ${prevData.value}`)
      } else {
        console.error("Error fetching Impressions data:", data.error || prevData.error)
        setImpressionsData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error in Impressions fetch:", error)
      setImpressionsData(prev => ({ ...prev, isLoading: false }))
    }
  }
  
  
  // Fetch Clicks data directly from the database
  const fetchClicksDirectly = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot fetch Clicks: Missing date range or brand ID")
      return
    }
    
    setClicksData(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Construct URL params for current period
      const params = new URLSearchParams()
      params.append('brandId', brandId)
      params.append('metric', 'clicks')
      
      // Set date parameters - simple approach
      const fromDate = dateRange.from
      const toDate = dateRange.to
      
      params.append('from', fromDate.toISOString().split('T')[0])
      params.append('to', toDate.toISOString().split('T')[0])
      
      // Log what we're doing
      console.log(`Fetching Clicks for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
      
      // Calculate previous period date range using our simplified helper function
      const { prevFrom, prevTo } = getPreviousPeriodDates(fromDate, toDate)
      
      // Fetch data for current period
      const response = await fetch(`/api/metrics/meta/single/clicks?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      // prevParams.append('metric', 'clicks') // No longer needed
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/clicks?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      if (response.ok && prevResponse.ok) {
        setClicksData({
          value: data.value || 0,
          previousValue: prevData.value || 0,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`Clicks data fetched directly: ${data.value}, Previous: ${prevData.value}`)
      } else {
        console.error("Error fetching Clicks data:", data.error || prevData.error)
        setClicksData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error in Clicks fetch:", error)
      setClicksData(prev => ({ ...prev, isLoading: false }))
    }
  }
  
  // Fetch Purchase Conversion Value data directly from the database
  const fetchPurchaseValueDirectly = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot fetch Purchase Conversion Value: Missing date range or brand ID")
      return
    }
    
    setPurchaseValueData(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Construct URL params for current period
      const params = new URLSearchParams()
      params.append('brandId', brandId)
      params.append('metric', 'purchaseValue')
      
      // Set date parameters - simple approach
      const fromDate = dateRange.from
      const toDate = dateRange.to
      
      params.append('from', fromDate.toISOString().split('T')[0])
      params.append('to', toDate.toISOString().split('T')[0])
      
      // Log what we're doing
      console.log(`Fetching Purchase Conversion Value for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
      
      // Calculate previous period date range using our simplified helper function
      const { prevFrom, prevTo } = getPreviousPeriodDates(fromDate, toDate)
      
      // Fetch data for current period
      const response = await fetch(`/api/metrics/meta/single/purchase-conversion-value?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      // prevParams.append('metric', 'purchaseValue') // No longer needed
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/purchase-conversion-value?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      if (response.ok && prevResponse.ok) {
        setPurchaseValueData({
          value: data.value || 0,
          previousValue: prevData.value || 0,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`Purchase Conversion Value data fetched directly: ${data.value}, Previous: ${prevData.value}`)
      } else {
        console.error("Error fetching Purchase Conversion Value data:", data.error || prevData.error)
        setPurchaseValueData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error in Purchase Conversion Value fetch:", error)
      setPurchaseValueData(prev => ({ ...prev, isLoading: false }))
    }
  }
  
  // Fetch Results data directly from the database
  const fetchResultsDirectly = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot fetch Results: Missing date range or brand ID")
      return
    }
    
    setResultsData(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Construct URL params for current period
      const params = new URLSearchParams()
      params.append('brandId', brandId)
      params.append('metric', 'results')
      
      // Set date parameters - simple approach
      const fromDate = dateRange.from
      const toDate = dateRange.to
      
      params.append('from', fromDate.toISOString().split('T')[0])
      params.append('to', toDate.toISOString().split('T')[0])
      
      // Log what we're doing
      console.log(`Fetching Results for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
      
      // Calculate previous period date range using our simplified helper function
      const { prevFrom, prevTo } = getPreviousPeriodDates(fromDate, toDate)
      
      // Fetch data for current period
      const response = await fetch(`/api/metrics/meta/single/results?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      prevParams.append('metric', 'results')
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/results?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      if (!data.error && !prevData.error) {
        setResultsData({
          value: data.value || 0,
          previousValue: prevData.value || 0,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`Results data fetched directly: ${data.value}, Previous: ${prevData.value}`)
      } else {
        console.error("Error fetching Results data:", data.error || prevData.error)
        setResultsData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error in Results fetch:", error)
      setResultsData(prev => ({ ...prev, isLoading: false }))
    }
  }
  
  // Fetch Cost Per Result data directly from the database
  const fetchCostPerResultDirectly = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot fetch Cost Per Result: Missing date range or brand ID")
      return
    }
    
    setCostPerResultData(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Construct URL params for current period
      const params = new URLSearchParams()
      params.append('brandId', brandId)
      params.append('metric', 'costPerResult')
      
      // Set date parameters - simple approach
      const fromDate = dateRange.from
      const toDate = dateRange.to
      
      params.append('from', fromDate.toISOString().split('T')[0])
      params.append('to', toDate.toISOString().split('T')[0])
      
      // Log what we're doing
      console.log(`Fetching Cost Per Result for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
      
      // Calculate previous period date range using our simplified helper function
      const { prevFrom, prevTo } = getPreviousPeriodDates(fromDate, toDate)
      
      // Fetch data for current period
      const response = await fetch(`/api/metrics/meta/single/cost-per-result?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      prevParams.append('metric', 'costPerResult')
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/cost-per-result?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      if (!data.error && !prevData.error) {
        setCostPerResultData({
          value: data.value || 0,
          previousValue: prevData.value || 0,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`Cost Per Result data fetched directly: ${data.value}, Previous: ${prevData.value}`)
      } else {
        console.error("Error fetching Cost Per Result data:", data.error || prevData.error)
        setCostPerResultData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error in Cost Per Result fetch:", error)
      setCostPerResultData(prev => ({ ...prev, isLoading: false }))
    }
  }
  
  // Fetch Cost Per Click data directly from the database
  const fetchCostPerClickDirectly = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot fetch Cost Per Click: Missing date range or brand ID")
      return
    }
    
    setCostPerClickData(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Construct URL params for current period
      const params = new URLSearchParams()
      params.append('brandId', brandId)
      params.append('metric', 'costPerClick')
      
      // Set date parameters - simple approach
      const fromDate = dateRange.from
      const toDate = dateRange.to
      
      params.append('from', fromDate.toISOString().split('T')[0])
      params.append('to', toDate.toISOString().split('T')[0])
      
      // Log what we're doing
      console.log(`Fetching Cost Per Click for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
      
      // Calculate previous period date range using our simplified helper function
      const { prevFrom, prevTo } = getPreviousPeriodDates(fromDate, toDate)
      
      // Fetch data for current period
      const response = await fetch(`/api/metrics/meta/single/cost-per-click?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      prevParams.append('metric', 'costPerClick')
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/cost-per-click?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      if (!data.error && !prevData.error) {
        setCostPerClickData({
          value: data.value || 0,
          previousValue: prevData.value || 0,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`Cost Per Click data fetched directly: ${data.value}, Previous: ${prevData.value}`)
      } else {
        console.error("Error fetching Cost Per Click data:", data.error || prevData.error)
        setCostPerClickData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error in Cost Per Click fetch:", error)
      setCostPerClickData(prev => ({ ...prev, isLoading: false }))
    }
  }
  
  // Add function to fetch CTR (Click-Through Rate) data
  const fetchCtrDirectly = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot fetch CTR: Missing date range or brand ID")
      return
    }
    
    setCtrData(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Construct URL params for current period
      const params = new URLSearchParams()
      params.append('brandId', brandId)
      // params.append('metric', 'ctr') // No longer needed for specific route
      
      // Set date parameters - simple approach
      const fromDate = dateRange.from
      const toDate = dateRange.to
      
      params.append('from', fromDate.toISOString().split('T')[0])
      params.append('to', toDate.toISOString().split('T')[0])
      
      // Log what we're doing
      console.log(`Fetching CTR for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
      
      // Calculate previous period date range using our simplified helper function
      const { prevFrom, prevTo } = getPreviousPeriodDates(fromDate, toDate)
      
      // Fetch data for current period
      const response = await fetch(`/api/metrics/meta/single/click-through-rate?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      // prevParams.append('metric', 'ctr') // No longer needed for specific route
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/click-through-rate?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      // DETAILED LOGGING FOR PREVIOUS PERIOD DATA for CTR
      console.log(`[MetaTab - fetchCtrDirectly] Raw prevData for ${prevFrom} to ${prevTo}:`, JSON.stringify(prevData));
      if (prevData && typeof prevData.value === 'number') {
        console.log(`[MetaTab - fetchCtrDirectly] Valid prevData.value: ${prevData.value}`);
      } else {
        console.error(`[MetaTab - fetchCtrDirectly] Invalid or missing prevData.value! Received:`, prevData);
      }
      // END DETAILED LOGGING
      
      if (!data.error && !prevData.error) {
        // Convert percentage values to decimals for proper formatting
        // API returns percentage values (e.g., 16.67), but MetricCard expects decimals (e.g., 0.1667)
        const currentCtrDecimal = (data.value || 0) / 100;
        const previousCtrDecimal = (prevData.value || 0) / 100;
        
        setCtrData({
          value: currentCtrDecimal,
          previousValue: previousCtrDecimal,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`CTR data fetched directly: ${data.value}% (${currentCtrDecimal} decimal), Previous: ${prevData.value}% (${previousCtrDecimal} decimal)`)
      } else {
        console.error("Error fetching CTR data:", data.error || prevData.error)
        setCtrData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error in CTR fetch:", error)
      setCtrData(prev => ({ ...prev, isLoading: false }))
    }
  }
  
  // Fetch reach data directly from the database
  const fetchReachDirectly = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot fetch reach: Missing date range or brand ID")
      return
    }
    
    // Set loading state once at the beginning
    setReachData(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Construct URL params for current period
      const params = new URLSearchParams()
      params.append('brandId', brandId)
      params.append('metric', 'reach')
      
      // Set date parameters
      const fromDate = dateRange.from
      const toDate = dateRange.to
      
      params.append('from', fromDate.toISOString().split('T')[0])
      params.append('to', toDate.toISOString().split('T')[0])
      
      // Log what we're doing
      console.log(`Fetching Reach for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
      
      // Calculate previous period date range
      const { prevFrom, prevTo } = getPreviousPeriodDates(fromDate, toDate)
      
      // Fetch both current and previous period data in parallel
      const [currentResponse, prevResponse] = await Promise.all([
        fetch(`/api/metrics/meta/single/reach?${params.toString()}`),
        fetch(`/api/metrics/meta/single/reach?${new URLSearchParams({
          brandId,
          metric: 'reach',
          from: prevFrom,
          to: prevTo
        }).toString()}`)
      ]);
      
      // Process responses in parallel
      const [currentData, prevData] = await Promise.all([
        currentResponse.json(),
        prevResponse.json()
      ]);
      
      if (!currentData.error && !prevData.error) {
        // Set the state once with final data, not incrementally
    setReachData({
          value: currentData.value || 0,
          previousValue: prevData.value || 0,
      isLoading: false, 
      lastUpdated: new Date()
        })
        console.log(`Reach data fetched directly: ${currentData.value}, Previous: ${prevData.value}`)
      } else {
        console.error("Error fetching Reach data:", currentData.error || prevData.error)
        setReachData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error in Reach fetch:", error)
      setReachData(prev => ({ ...prev, isLoading: false }))
    }
  }
  
  // Fetch link clicks data directly from the database
  const fetchLinkClicksDirectly = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot fetch link clicks: Missing date range or brand ID")
      return
    }
    
    setLinkClicksData(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Construct URL params for current period
      const params = new URLSearchParams()
      params.append('brandId', brandId)
      params.append('metric', 'link_clicks')
      
      // Set date parameters
      const fromDate = dateRange.from
      const toDate = dateRange.to
      
      params.append('from', fromDate.toISOString().split('T')[0])
      params.append('to', toDate.toISOString().split('T')[0])
      
      // Log what we're doing
      console.log(`Fetching Link Clicks for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
      
      // Calculate previous period date range
      const { prevFrom, prevTo } = getPreviousPeriodDates(fromDate, toDate)
      
      // Fetch data for current period
      const response = await fetch(`/api/metrics/meta/single/link_clicks?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      // prevParams.append('metric', 'link_clicks') // No longer needed
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/link_clicks?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      if (!data.error && !prevData.error) {
        setLinkClicksData({
          value: data.value || 0,
          previousValue: prevData.value || 0,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`Link Clicks data fetched directly: ${data.value}, Previous: ${prevData.value}`)
      } else {
        console.error("Error fetching Link Clicks data:", data.error || prevData.error)
        setLinkClicksData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error in Link Clicks fetch:", error)
      setLinkClicksData(prev => ({ ...prev, isLoading: false }))
    }
  }
  
  // Fetch budget data directly from the database
  const fetchBudgetDirectly = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot fetch budget: Missing date range or brand ID")
      return
    }
    
    setBudgetData(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Construct URL params for current period
      const params = new URLSearchParams()
      params.append('brandId', brandId)
      params.append('metric', 'budget')
      
      // Set date parameters
      const fromDate = dateRange.from
      const toDate = dateRange.to
      
      params.append('from', fromDate.toISOString().split('T')[0])
      params.append('to', toDate.toISOString().split('T')[0])
      
      // Log what we're doing
      console.log(`Fetching Budget for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
      
      // Calculate previous period date range
      const { prevFrom, prevTo } = getPreviousPeriodDates(fromDate, toDate)
      
      // Fetch data for current period
      const response = await fetch(`/api/metrics/meta/single/budget?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      prevParams.append('metric', 'budget')
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/budget?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      if (!data.error && !prevData.error) {
        setBudgetData({
          value: data.value || 0,
          previousValue: prevData.value || 0,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`Budget data fetched directly: ${data.value}, Previous: ${prevData.value}`)
      } else {
        console.error("Error fetching Budget data:", data.error || prevData.error)
        setBudgetData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error in Budget fetch:", error)
      setBudgetData(prev => ({ ...prev, isLoading: false }))
    }
  }
  
  // Fetch all metrics data directly
  const fetchAllMetricsDirectly = async () => {
    console.log("[MetaTab] Starting unified loading for all Meta widgets AND campaigns");
    
    // Set unified loading state to true for all widgets
    setIsLoadingAllMetaWidgets(true);
    
    // Fetch ALL data in parallel - metrics AND campaigns
    await Promise.all([
      fetchAdSpendDirectly(),
      fetchRoasDirectly(),
      fetchImpressionsDirectly(),
      fetchClicksDirectly(),
      fetchPurchaseValueDirectly(),
      fetchResultsDirectly(),
      fetchCostPerResultDirectly(),
      fetchCostPerClickDirectly(),
      fetchCtrDirectly(),
      fetchReachDirectly(), // Ensure this is called
      fetchLinkClicksDirectly(),
      fetchBudgetDirectly(), // Ensure this is also called for consistency
      fetchCampaigns(true) // IMPORTANT: Include campaign fetching in unified loading
    ]);
    
    // Clear unified loading state when ALL data is loaded
    setIsLoadingAllMetaWidgets(false);
    console.log("[MetaTab] Unified loading completed - all Meta widgets AND campaigns loaded");
  }

  // Update the useEffect to call the new fetch functions
  useEffect(() => {
    if (dateRange && dateRange.from && dateRange.to && brandId) {
      console.log("[MetaTab] Date range or brandId changed, starting unified loading for all Meta widgets")
      setIsLoadingAllMetaWidgets(true);
      fetchAllMetricsDirectly() // This function will clear the loading state when complete
    } else {
      // If no valid dateRange or brandId, clear loading state
      setIsLoadingAllMetaWidgets(false);
    }
  }, [dateRange, brandId])

  // Remove the duplicate initial load effect - the above effect handles it all

  // Update the manual refresh function
  const refreshMetricsDirectly = async () => {
    console.log("Manually refreshing all metrics directly")
    await fetchAllMetricsDirectly()
  }

  // Add a refresh timer state
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null)
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false)

  // Function to refresh all metrics directly
  const refreshAllMetricsDirectly = useCallback(async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !brandId) {
      console.log("Cannot refresh metrics: Missing date range or brand ID")
      return
    }
    
    console.log("[MetaTab] Starting manual refresh with unified loading for all Meta widgets AND campaigns");
    
    // Set unified loading state for all widgets (replaces individual loading states)
    setIsLoadingAllMetaWidgets(true);
    setIsManuallyRefreshing(true);
    
    try {
      console.log("Refreshing all metrics and campaigns directly")
      // 300ms artificial delay to ensure loading state is visible
      // This prevents flickering by ensuring a consistent loading state is shown
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Fetch ALL data in parallel - metrics AND campaigns
      await Promise.all([
        fetchAdSpendDirectly(),
        fetchRoasDirectly(),
        fetchImpressionsDirectly(),
        fetchClicksDirectly(),
        fetchPurchaseValueDirectly(),
        fetchResultsDirectly(),
        fetchCostPerResultDirectly(),
        fetchCostPerClickDirectly(),
        fetchCtrDirectly(),
        fetchReachDirectly(),
        fetchLinkClicksDirectly(),
        fetchBudgetDirectly(),
        fetchCampaigns(true) // IMPORTANT: Include campaign fetching in unified loading
      ])
      
      // Success toast is shown only here, not in individual fetch functions
      toast.success("Metrics refreshed successfully")
    } catch (error) {
      console.error("Error refreshing metrics:", error)
      toast.error("Failed to refresh metrics")
    } finally {
      // Clear unified loading state when refresh is complete
      setIsLoadingAllMetaWidgets(false);
      setIsManuallyRefreshing(false)
      console.log("[MetaTab] Manual refresh with unified loading completed for all widgets AND campaigns");
    }
  }, [dateRange, brandId, 
     fetchAdSpendDirectly, fetchRoasDirectly, fetchImpressionsDirectly, 
     fetchClicksDirectly, fetchPurchaseValueDirectly, fetchResultsDirectly,
     fetchCostPerResultDirectly, fetchCostPerClickDirectly, fetchCtrDirectly,
     fetchReachDirectly, fetchLinkClicksDirectly, fetchBudgetDirectly, fetchCampaigns]);
  
  // Setup auto-refresh on a 5-minute interval
  useEffect(() => {
    // Clear any existing timer first
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }
    
    // Set up a new 5-minute refresh interval
    /*const timer = setInterval(() => {
      console.log("Auto-refreshing metrics (5-minute interval)")
      refreshAllMetricsDirectly()
    }, 5 * 60 * 1000) // 5 minutes in milliseconds
    
    setRefreshTimer(timer)*/
    
    // Clean up on unmount
    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
    }
  }, [dateRange, brandId])
  
  // Also refresh when isRefreshingData prop changes (to integrate with existing refresh mechanisms)
  useEffect(() => {
    if (isRefreshingData) {
      console.log("Refreshing metrics due to parent component refresh trigger")
      refreshAllMetricsDirectly()
    }
  }, [isRefreshingData])
  
  // Manual refresh button handler
  const handleManualRefresh = async () => {
    if (window._lastManualRefresh && Date.now() - window._lastManualRefresh < META_GLOBAL_COOLDOWN) {
      toast(`Please wait ${Math.ceil((window._lastManualRefresh + META_GLOBAL_COOLDOWN - Date.now()) / 1000)} seconds before refreshing again.`);
      return;
    }

    window._lastManualRefresh = Date.now();
    
    // Clear existing request queue to prevent stale requests
    requestQueue.length = 0;
    // processingQueue = false; // This global might be better managed within processRequestQueue itself
    
    console.log("[MetaTab] Manual refresh triggered. Fetching all data.");
    setIsLoadingAllMetaWidgets(true);
    setIsManuallyRefreshing(true); // Keep this if it drives other UI elements

    try {
      // It's assumed fetchMetaData will also fetch campaigns or that campaigns are fetched appropriately within it or by an effect triggered by its data.
      // If fetchMetaData doesn't handle campaigns, fetchCampaigns(true) might be needed here too, but ideally fetchMetaData is comprehensive.
      await fetchMetaData(); 
      // Consider if fetchCampaigns(true) is also needed here, if not covered by fetchMetaData
      // For now, assuming fetchMetaData is the primary data orchestrator for the tab.
    } catch (error) {
      console.error("[MetaTab] Error during manual refresh:", error);
      // Error handling can be more specific if needed
      toast.error("Refresh failed", { description: (error as Error).message });
    } finally {
      setIsLoadingAllMetaWidgets(false);
      setIsManuallyRefreshing(false);
      console.log("[MetaTab] Manual refresh complete.");
    }
  };

  // Store a stable reference to the refresh function
  const refreshAllMetricsDirectlyRef = useRef(refreshAllMetricsDirectly);

  // Update the ref when the function changes
  useEffect(() => {
    refreshAllMetricsDirectlyRef.current = refreshAllMetricsDirectly;
  }, [refreshAllMetricsDirectly]);

  // Add a separate effect for handling the isRefreshingData prop
  useEffect(() => {
    if (isRefreshingData && brandId) {
      console.log("[MetaTab] Parent component triggered refresh via isRefreshingData prop.");
      
      // We can now just call fetchMetaData, which is our single source of truth for data fetching.
      fetchMetaData().catch(error => {
        console.error("[MetaTab] Error during refresh triggered by parent:", error);
        toast.error("Refresh failed", { description: (error as Error).message });
      });
    }
  }, [isRefreshingData, brandId]);

  // Add a listener for the metaDataRefreshed event from the dashboard
  useEffect(() => {
    // Define the event handler
    const handleMetaDataRefreshed = (event: CustomEvent) => {
      // Check if this event is for our brand
      if (event.detail?.brandId === brandId) {
        console.log("[MetaTab] Received metaDataRefreshed event", event.detail);

        // **COORDINATION CHECK**: Skip if this event comes from MetaTabSync (our own syncMetaInsights)
        if (event.detail?.source === 'MetaTabSync') {
          console.log("[MetaTab] ⚠️ Skipping metaDataRefreshed event - triggered by our own syncMetaInsights");
          return;
        }

        // **COORDINATION CHECK**: Skip if this is from a tab-switch-initiated sync
        if (isTabSwitchSyncRef.current) {
          console.log("[MetaTab] ⚠️ Skipping metaDataRefreshed event - triggered by tab switch sync");
          return;
        }

        // **COORDINATION CHECK**: Skip if there's already a fetch in progress globally
        // isMetaFetchInProgress() checks window._metaFetchLock and window._activeFetchIds
        if (isMetaFetchInProgress()) {
          console.log("[MetaTab] ⚠️ Skipping metaDataRefreshed event - another Meta fetch is already in progress globally.");
          return;
        }
        
        logger.info("[MetaTab] metaDataRefreshed: Triggering fetchMetaData for a comprehensive refresh due to external event.");
        toast.info("Updating Meta data based on external event...", { duration: 3000 });
        fetchMetaData(); // This single call now handles campaigns and all metrics
      }
    };

    // Add the event listener
    window.addEventListener('metaDataRefreshed', handleMetaDataRefreshed as EventListener);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('metaDataRefreshed', handleMetaDataRefreshed as EventListener);
    };
  }, [brandId, fetchMetaData]); // Simplified dependencies

  // EXACT COPY OF WORKING HOMETAB SYNC FUNCTION WITH TODAY DETECTION
  const syncMetaInsights = useCallback(async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      console.error("[MetaTab] Cannot sync data - missing brand ID or date range");
      return;
    }
    
    const refreshId = `meta-tab-sync-${Date.now()}`;
    
    // Use the same locking mechanism for consistency (like HomeTab)
    if (isMetaFetchInProgress()) {
      console.log(`[MetaTab] ⚠️ Meta sync skipped - fetch already in progress for refreshId: ${refreshId}`);
      toast.info("Meta data is already refreshing. Please wait.", { id: "meta-refresh-toast" });
      return;
    }
    
    if (!acquireMetaFetchLock(refreshId)) {
      console.log(`[MetaTab] ⛔ Failed to acquire global lock for Meta sync refreshId: ${refreshId}`);
      toast.error("Failed to initiate Meta data refresh. Please try again.", { id: "meta-refresh-toast" });
      return;
    }
    
    console.log("[MetaTab] Syncing Meta insights data through database...");
    
    // Set ALL Meta widget loading states to true for consistent loading (like HomeTab)
    setLoading(true);
    setIsLoadingAllMetaWidgets(true);
    setIsManuallyRefreshing(true);
    
    toast.loading("Refreshing Meta data...", { id: "meta-refresh-toast", duration: 15000 });
    
    try {
      // Format dates in YYYY-MM-DD format
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      
      // Step 1: Sync fresh data from Meta API to database (like HomeTab)
      console.log(`[MetaTab] 🚀 Step 1: Syncing Meta insights to database (refreshId: ${refreshId})`);
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
        console.log(`[MetaTab] ✅ Meta insights synced successfully - synced ${result.count || 0} records from Meta (refreshId: ${refreshId})`);
        
        // Step 2: Now fetch the refreshed data with TODAY DETECTION (like HomeTab)
        console.log(`[MetaTab] 🚀 Step 2: Fetching all refreshed Meta data (refreshId: ${refreshId})`);
        
        // Use the existing fetchMetaData function which already has today detection
        await fetchMetaData();
        
        // Also refresh campaigns if needed
        await fetchCampaigns(true);
        
        // Step 3: Check for data gaps and auto-backfill if needed (same as HomeTab)
        console.log(`[MetaTab] 🚀 Step 3: Checking for data gaps and auto-backfilling if needed (refreshId: ${refreshId})`);
        // Use setTimeout to call detectAndBackfillDataGaps after the current call stack
        setTimeout(() => {
          detectAndBackfillDataGaps().catch(error => {
            console.error(`[MetaTab] Error during gap detection (refreshId: ${refreshId}):`, error);
          });
        }, 1000);
        
        toast.success("Meta data refreshed!", { id: "meta-refresh-toast" });
        window._lastMetaRefresh = Date.now(); // Update timestamp of last successful refresh
        
        // Dispatch event to notify other components (like HomeTab)
        window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
          detail: { 
            brandId, 
            timestamp: Date.now(),
            forceRefresh: true,
            syncedRecords: result.count || 0,
            source: 'MetaTabSync',
            refreshId
          }
        }));
        
        console.log(`[MetaTab] ✅ FULL Meta sync completed successfully (refreshId: ${refreshId})`);
        
      } else {
        throw new Error(result.error || 'Failed to sync Meta insights');
      }
    } catch (error) {
      console.error(`[MetaTab] Error syncing Meta insights (refreshId: ${refreshId}):`, error);
      toast.error("Failed to sync Meta insights", {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000,
        id: "meta-refresh-toast"
      });
    } finally {
      // Clear ALL Meta widget loading states at the same time for consistent loading (like HomeTab)
      setLoading(false);
      setIsLoadingAllMetaWidgets(false);
      setIsManuallyRefreshing(false);
      releaseMetaFetchLock(refreshId);
    }
  }, [brandId, dateRange, fetchCampaigns]);

  // Add the missing fetchMetaDataFromDatabase function from HomeTab with TODAY DETECTION
  const fetchMetaDataFromDatabase = useCallback(async (refreshId?: string) => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      console.log("[MetaTab] Skipping Meta data fetch from database: Missing brandId or dateRange.");
      return;
    }

    try {
      console.log(`[MetaTab] 🔄 Fetching Meta data from database (refreshId: ${refreshId || 'standalone'})`);

      // Current period params
      const params = new URLSearchParams({ brandId: brandId });
      if (dateRange.from) params.append('from', dateRange.from.toISOString().split('T')[0]);
      if (dateRange.to) params.append('to', dateRange.to.toISOString().split('T')[0]);
      
      params.append('bypass_cache', 'true');
      params.append('force_load', 'true');
      
      const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);
      const prevParams = new URLSearchParams({ brandId: brandId });
      if (prevFrom) prevParams.append('from', prevFrom);
      if (prevTo) prevParams.append('to', prevTo);
      
      prevParams.append('bypass_cache', 'true');
      prevParams.append('force_load', 'true');
      
      const [currentResponse, prevResponse] = await Promise.all([
        fetch(`/api/metrics/meta?${params.toString()}`, { cache: 'no-store' }),
        fetch(`/api/metrics/meta?${prevParams.toString()}`, { cache: 'no-store' })
      ]);
      
      if (!currentResponse.ok || !prevResponse.ok) {
        console.error(`[MetaTab] Failed to fetch meta data from DB`);
        throw new Error(`Failed to fetch meta data`);
      }
      
      const currentData = await currentResponse.json();
      const previousData = await prevResponse.json();
      
      setMetaMetrics({
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
        reach: currentData.reach || 0,
        budget: currentData.budget || 0,
        linkClicks: currentData.linkClicks || 0,
        
        previousAdSpend: previousData.adSpend || 0,
        previousImpressions: previousData.impressions || 0,
        previousClicks: previousData.clicks || 0,
        previousConversions: previousData.conversions || 0,
        previousRoas: previousData.roas || 0,
        previousCtr: previousData.ctr || 0,
        previousCpc: previousData.cpc || 0,
        previousResults: previousData.results || 0,
        previousPurchaseValue: previousData.purchaseValue || 0,
        previousReach: previousData.reach || 0,
        previousBudget: previousData.budget || 0,
        previousLinkClicks: previousData.linkClicks || 0,

        adSpendGrowth: calculatePercentChange(currentData.adSpend, previousData.adSpend),
        impressionGrowth: calculatePercentChange(currentData.impressions, previousData.impressions),
        clickGrowth: calculatePercentChange(currentData.clicks, previousData.clicks),
        conversionGrowth: calculatePercentChange(currentData.conversions, previousData.conversions),
        roasGrowth: calculatePercentChange(currentData.roas, previousData.roas),
        ctrGrowth: calculatePercentChange(currentData.ctr, previousData.ctr),
        cpcGrowth: calculatePercentChange(currentData.cpc, previousData.cpc),
        cprGrowth: calculatePercentChange(currentData.costPerResult, previousData.costPerResult),
        reachGrowth: calculatePercentChange(currentData.reach, previousData.reach),
        budgetGrowth: calculatePercentChange(currentData.budget, previousData.budget),
        linkClicksGrowth: calculatePercentChange(currentData.linkClicks, previousData.linkClicks),
      });
      
      setMetaDaily(currentData.dailyData || []);
      hasFetchedData.current = true;
      
    } catch (error) {
      console.error(`[MetaTab] Error fetching Meta data from database:`, error);
    }
  }, [brandId, dateRange, getPreviousPeriodDates]);

  // Smart data gap detection and auto-backfill (same as HomeTab/Dashboard)
  const detectAndBackfillDataGaps = useCallback(async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      console.log("[MetaTab] Skipping gap detection - missing brandId or dateRange");
      return;
    }

    try {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // Check if we're looking at yesterday's data specifically
      const isViewingYesterday = dateRange.from && dateRange.to &&
        dateRange.from.toISOString().split('T')[0] === yesterdayStr &&
        dateRange.to.toISOString().split('T')[0] === yesterdayStr;
      
      // Also check if yesterday is within the current date range
      const isYesterdayInRange = dateRange.from && dateRange.to &&
        dateRange.from <= yesterday && dateRange.to >= yesterday;
      
      if (isViewingYesterday || isYesterdayInRange) {
        console.log(`[MetaTab] Checking for data gaps for yesterday (${yesterdayStr})`);
        
        // Check for data gaps using the same endpoint as the main dashboard
        const gapResponse = await fetch(`/api/meta/check-gaps?brandId=${brandId}&date=${yesterdayStr}`);
        
        if (!gapResponse.ok) {
          console.warn("[MetaTab] Failed to check for data gaps");
          return;
        }
        
        const gapData = await gapResponse.json();
        
        // If we have less than expected data volume for yesterday, auto-backfill
        if (gapData.hasGap) {
          console.log(`[MetaTab] Data gap detected for ${yesterdayStr}, triggering auto-backfill`);
          
          // Show a quick notification that we're fixing the data
          toast.info("Completing yesterday's data...", {
            description: "Auto-filling missing Meta data for better accuracy.",
            duration: 3000,
            id: "meta-backfill-toast"
          });
          
          // Trigger backfill for yesterday
          const backfillResponse = await fetch('/api/meta/backfill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brandId: brandId,
              dateFrom: yesterdayStr,
              dateTo: yesterdayStr
            })
          });
          
          if (backfillResponse.ok) {
            const backfillData = await backfillResponse.json();
            
            if (backfillData.success && backfillData.count > 0) {
              console.log(`[MetaTab] ✅ Auto-backfilled ${backfillData.count} records for ${yesterdayStr}`);
              
              toast.success(`Completed yesterday's data!`, {
                description: `Added ${backfillData.count} missing records for better accuracy.`,
                duration: 5000,
                id: "meta-backfill-toast"
              });
              
              // Refresh the data to show the newly backfilled information
              setTimeout(() => {
                console.log("[MetaTab] Refreshing data after auto-backfill");
                fetchMetaData();
              }, 1000);
            } else {
              console.log(`[MetaTab] No additional data found during backfill for ${yesterdayStr}`);
            }
          } else {
            console.warn("[MetaTab] Failed to backfill data gap");
          }
        } else {
          console.log(`[MetaTab] No data gaps detected for ${yesterdayStr}`);
        }
      }
    } catch (error) {
      console.error("[MetaTab] Error during gap detection and backfill:", error);
    }
  }, [brandId, dateRange, fetchMetaData]);

  // Main data loading useEffect (mirrors HomeTab approach exactly with TODAY DETECTION)
  useEffect(() => {
    if (brandId && dateRange?.from && dateRange?.to) {
      console.log("[MetaTab] useEffect detected change in brandId or dateRange. Triggering syncMetaInsights.");
      
      // Use the existing prevFetchParamsRef variable from earlier in the file
      const currentFromISO = dateRange.from.toISOString();
      const currentToISO = dateRange.to.toISOString();
      const brandChanged = brandId !== prevFetchParamsRef.current?.brandId;
      const datesChanged = currentFromISO !== prevFetchParamsRef.current?.from || currentToISO !== prevFetchParamsRef.current?.to;
      
      // Check if this is "today" selection for special handling
      const today = new Date();
      const isToday = dateRange.from && dateRange.to && 
        dateRange.from.toISOString().split('T')[0] === today.toISOString().split('T')[0] &&
        dateRange.to.toISOString().split('T')[0] === today.toISOString().split('T')[0];
      
      // CRITICAL: For "today", ALWAYS refresh even if dates haven't changed
      // This ensures selecting "today" when already on today forces a refresh 
      const shouldRefresh = brandChanged || datesChanged || !initialLoadComplete.current || 
        (isToday && Date.now() - (window._lastMetaRefresh || 0) > 10000); // Refresh today if >10s since last
      
      if (shouldRefresh) {
        console.log(`[MetaTab] Change detected: Brand: ${brandChanged}, Dates: ${datesChanged}, InitialLoadDone: ${initialLoadComplete.current}, IsToday: ${isToday}`);
        
        // Clear blocking flags to ensure fetch works
        if (typeof window !== 'undefined') {
          window._blockMetaApiCalls = false;
          window._disableAutoMetaFetch = false;
        }
        
        if (!initialLoadComplete.current) {
          console.log(`[MetaTab] Initial load - triggering syncMetaInsights`);
        
        // Use the same unified sync approach as HomeTab
        syncMetaInsights().finally(() => {
            // Mark initial load as complete and update params
          initialLoadComplete.current = true;
            prevFetchParamsRef.current = { brandId, from: currentFromISO, to: currentToISO };
        });
      } else {
        console.log("[MetaTab] Subsequent load - triggering syncMetaInsights");
          syncMetaInsights().finally(() => {
            // Update params after successful sync
            prevFetchParamsRef.current = { brandId, from: currentFromISO, to: currentToISO };
          });
        }
      } else {
        console.log("[MetaTab] No changes detected, skipping fetch");
      }
    } else {
      console.log("[MetaTab] Skipping data fetch: Missing brandId or full dateRange.");
      // Clear loading states when prerequisites aren't met
      setLoading(false);
      setIsLoadingAllMetaWidgets(false);
    }
  }, [brandId, dateRange?.from, dateRange?.to, syncMetaInsights]);

  // Auto-detect data gaps after data loads (same as HomeTab/Dashboard)
  useEffect(() => {
    if (brandId && !loading && !isLoadingAllMetaWidgets && initialLoadComplete.current) {
      // Run gap detection after data has loaded
      const timeoutId = setTimeout(() => {
        console.log("[MetaTab] Running automatic gap detection after data load");
        detectAndBackfillDataGaps();
      }, 2000); // Wait 2 seconds after loading completes

      return () => clearTimeout(timeoutId);
    }
  }, [brandId, loading, isLoadingAllMetaWidgets, detectAndBackfillDataGaps]);

  // Add debug mode state
  const [debugMode, setDebugMode] = useState(false);
  
  // Toggle debug mode with key combo (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDebugMode(prev => !prev);
        console.log('Debug mode toggled:', !debugMode);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [debugMode]);

  // Debug date ranges
  const debugDateRange = async () => {
    if (!brandId) return;
    
    // Get current date
    const today = new Date().toISOString().split('T')[0];
    
    // Get date range strings if available
    const fromDateStr = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : today;
    const toDateStr = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : today;
    
    console.log(`[MetaTab DEBUG] Current date range: ${fromDateStr} to ${toDateStr}`);
    
    try {
      // Call debug endpoint
      const response = await fetch(`/api/meta/debug-dates?brandId=${brandId}&date=${today}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[MetaTab DEBUG] Date debug results:', data);
        
        // Show debug info in toast
        toast.info(`Date Debug Info`, {
          description: `Today's date: ${today}, DB records: ${data.todayDataCount}, Sample dates: ${data.sampleDates.slice(0,3).join(', ')}`,
          duration: 10000
        });
      }
    } catch (error) {
      console.error('Error in debug date range:', error);
    }
  };

  // Sync last 2 days (yesterday and today)
  const syncLast2Days = async () => {
    if (!brandId) {
      toast.error("No brand selected");
      return;
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const toastId = 'meta-sync-last-2-days';
    toast.loading(`Syncing Meta data for last 2 days (${yesterdayStr} and ${todayStr})...`, {
      id: toastId,
    });

    try {
      let totalRecords = 0;
      
      // Sync yesterday
      const yesterdayResponse = await fetch('/api/meta/backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          dateFrom: yesterdayStr,
          dateTo: yesterdayStr
        })
      });

      const yesterdayData = await yesterdayResponse.json();
      if (!yesterdayResponse.ok) {
        throw new Error(yesterdayData.error || `Failed to sync data for ${yesterdayStr}`);
      }
      totalRecords += yesterdayData.count || 0;

      // Sync today
      const todayResponse = await fetch('/api/meta/backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          dateFrom: todayStr,
          dateTo: todayStr
        })
      });

      const todayData = await todayResponse.json();
      if (!todayResponse.ok) {
        throw new Error(todayData.error || `Failed to sync data for ${todayStr}`);
      }
      totalRecords += todayData.count || 0;

      toast.success(`Successfully synced Meta data for last 2 days (${totalRecords} total records)`, {
        id: toastId,
        description: `Yesterday: ${yesterdayData.count || 0} records, Today: ${todayData.count || 0} records`
      });

      // Refresh campaigns data to reflect the changes
      const campaignsResponse = await fetch(`/api/meta/campaigns?brandId=${brandId}&refresh=true&t=${Date.now()}`);
      if (!campaignsResponse.ok) {
        console.warn("Could not refresh campaigns data after sync");
      }

      // Trigger dashboard refresh
      handleManualRefresh();

      window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
        detail: { 
          brandId, 
          timestamp: Date.now(),
          forceRefresh: true,
          backfilledDates: [yesterdayStr, todayStr]
        }
      }));

    } catch (error) {
      console.error('Error syncing last 2 days Meta data:', error);
      toast.error('Failed to sync Meta data for last 2 days', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Sync today's data only
  const syncTodayData = async () => {
    if (!brandId) {
      toast.error("No brand selected");
      return;
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const toastId = 'meta-sync-today';
    toast.loading(`Syncing Meta data for today (${todayStr})...`, {
      id: toastId,
    });

    try {
      // Sync today
      const todayResponse = await fetch('/api/meta/backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          dateFrom: todayStr,
          dateTo: todayStr
        })
      });

      const todayData = await todayResponse.json();
      if (!todayResponse.ok) {
        throw new Error(todayData.error || `Failed to sync data for ${todayStr}`);
      }

      toast.success(`Successfully synced Meta data for today (${todayData.count || 0} records)`, {
        id: toastId,
      });

      // Refresh campaigns data to reflect the changes
      const campaignsResponse = await fetch(`/api/meta/campaigns?brandId=${brandId}&refresh=true&t=${Date.now()}`);
      if (!campaignsResponse.ok) {
        console.warn("Could not refresh campaigns data after sync");
      }

      // Trigger dashboard refresh
      handleManualRefresh();

      window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
        detail: { 
          brandId, 
          timestamp: Date.now(),
          forceRefresh: true,
          backfilledDates: [todayStr]
        }
      }));

    } catch (error) {
      console.error('Error syncing today Meta data:', error);
      toast.error('Failed to sync Meta data for today', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Format the campaigns data from the API response
  const formatCampaigns = (campaigns: any[] = []) => {
    // Add has_data_in_range flag to each campaign
    return campaigns.map(campaign => {
      // Ensure daily_insights exists and is an array
      const daily_insights = campaign.daily_insights || [];
      
      // Deep copy to avoid reference issues
      const formattedCampaign = {
        ...campaign,
        // Make sure these values are properly typed
        budget: parseFloat(campaign.budget || 0),
        spent: parseFloat(campaign.spent || 0),
        impressions: parseInt(campaign.impressions || 0, 10),
        reach: parseInt(campaign.reach || 0, 10),
        clicks: parseInt(campaign.clicks || 0, 10),
        conversions: parseInt(campaign.conversions || 0, 10),
        ctr: parseFloat(campaign.ctr || 0),
        cpc: parseFloat(campaign.cpc || 0),
        cost_per_conversion: parseFloat(campaign.cost_per_conversion || 0),
        roas: parseFloat(campaign.roas || 0),
        adset_budget_total: parseFloat(campaign.adset_budget_total || 0),
        daily_insights
      };
      
      return formattedCampaign;
    });
  };
  
  // Function to refresh ad set budgets for all campaigns
  const refreshCampaignAdSetBudgets = async () => {
    if (!brandId) return;
    
    setIsRefreshing(true);
    
    try {
      // Call API endpoint to refresh ad sets for all campaigns
      const response = await fetch(`/api/meta/adsets/refresh-all?brandId=${brandId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh ad set budgets');
      }
      
      const data = await response.json();
      
      // Show success toast
      toast.success("Ad set budgets refreshed", {
        description: `Updated budget totals for ${data.refreshedCampaigns || 0} campaigns`,
      });
      
      // Refresh campaigns to show updated budgets
      await fetchCampaigns(true);
      
      return data;
    } catch (error) {
      console.error('[MetaTab] Error refreshing ad set budgets:', error);
      
      toast.error("Failed to refresh ad set budgets", {
        description: "There was an error refreshing ad set budgets. Please try again.",
      });
      
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshAllData = useCallback(async () => {
    // Show loading toast notification
    toast.loading("Refreshing all Meta data for selected date range...", { id: "meta-refresh-all" });
    
    // Use unified loading state instead of separate campaign loading
    setIsLoadingAllMetaWidgets(true);
    
    try {
      // Step 1: Refresh campaigns for the date range
      await fetchCampaigns(true);
      
      // Step 2: Refresh ad set budgets for all campaigns
      await refreshCampaignAdSetBudgets();
      
      // Success message
      toast.success("Data refreshed successfully", { id: "meta-refresh-all" });
      
      // Also refresh metrics if available
      if (refreshMetricsDirectly) {
        refreshMetricsDirectly();
      }
    } catch (error) {
      console.error("Error refreshing all data:", error);
      
      // Error message
      toast.error("Error refreshing data", { 
        id: "meta-refresh-all",
        description: "There was a problem refreshing Meta data. Please try again."
      });
    } finally {
      // Use unified loading state instead of separate campaign loading
      setIsLoadingAllMetaWidgets(false);
    }
  }, [fetchCampaigns, refreshCampaignAdSetBudgets, refreshMetricsDirectly]);
  
  
  // Refresh data when date range changes - DISABLED TO PREVENT AUTO-REFRESH
  /*
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      console.log("[MetaTab] Date range changed, refreshing data");
      
      // Only auto-fetch on date change if initial load has been completed
      if (initialLoadStarted) {
        // Don't auto-refresh on initial mount to avoid duplicate fetches
        fetchCampaigns(false);
      }
    }
  }, [dateRange, fetchCampaigns, initialLoadStarted]);
  */

  // Add a global refresh handler that is used by the main refresh button and auto-refresh
  const refreshAllMetaData = async (triggerBrandId: string): Promise<boolean> => {
    console.log(`[MetaTab] 🔄 Global refresh triggered for brandId: ${triggerBrandId}`);
    
    // Skip if a fetch is already in progress
    if (isMetaFetchInProgress()) {
      console.log(`[MetaTab] ⚠️ Global refresh skipped - fetch already in progress`);
      return false;
    }
    
    // Generate a unique request ID for this refresh
    const refreshId = `global-refresh-${Date.now()}`;
    
    // Acquire a global lock for this refresh operation
    if (!acquireMetaFetchLock(refreshId)) {
      console.log(`[MetaTab] ⛔ Failed to acquire global lock for refresh`);
      return false;
    }

    setIsManuallyRefreshing(true); // Set overarching loading state at the very start
    
    try {
      console.log(`[MetaTab] 🚀 Starting global refresh (${refreshId})`);
      
      // Step 1: Fetch fresh data from Meta API and update database
      const syncResponse = await fetch(`/api/meta/sync?brandId=${triggerBrandId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Refresh-ID': refreshId
        }
      });
      
      if (!syncResponse.ok) {
        console.error(`[MetaTab] Failed to sync Meta data from API: ${syncResponse.status}`);
        toast.error("Failed to refresh Meta data from API");
        return false;
      }
      
      console.log(`[MetaTab] ✅ Meta API sync completed`);
      
      // Step 2: Refresh campaigns with latest data
      await fetch(`/api/meta/campaigns?brandId=${triggerBrandId}&forceRefresh=true`, {
        headers: {
          'Cache-Control': 'no-cache',
          'X-Refresh-ID': refreshId
        }
      });
      
      console.log(`[MetaTab] ✅ Campaign data refreshed`);
      
      // Step 2.5: Explicitly trigger a campaign status check via direct API call for top campaigns
      try {
        console.log(`[MetaTab] 🔍 Explicitly checking campaign statuses`);
        if (campaigns && campaigns.length > 0) {
          // Get top 3 active campaigns to check
          const topCampaigns = [...campaigns]
            .filter(c => c.status.toUpperCase() === 'ACTIVE')
            .slice(0, 3);
          
          // Check each campaign status with direct API call
          for (const campaign of topCampaigns) {
            console.log(`[MetaTab] Checking status for campaign: ${campaign.campaign_id}`);
            await fetch('/api/meta/campaign-status-check', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Refresh-ID': refreshId
              },
              body: JSON.stringify({
                brandId: triggerBrandId,
                campaignId: campaign.campaign_id,
                refreshStatus: true,
                forceRefresh: true
              })
            });
          }
          console.log(`[MetaTab] ✅ Direct campaign status checks completed`);
        }
      } catch (statusError) {
        console.error(`[MetaTab] Error during direct campaign status checks:`, statusError);
      }
      
      // Step 3: Refresh ad sets data
      await fetch(`/api/meta/campaign-budgets?brandId=${triggerBrandId}&forceRefresh=true`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'X-Refresh-ID': refreshId
        }
      });
      
      console.log(`[MetaTab] ✅ Ad set budgets refreshed`);
      
      // Step 4: Refresh metrics for the dashboard
      await fetch(`/api/metrics/meta?brandId=${triggerBrandId}&refresh=true&bypass_cache=true`, {
        headers: {
          'Cache-Control': 'no-cache',
          'X-Refresh-ID': refreshId
        }
      });
      
      console.log(`[MetaTab] ✅ Metrics refreshed`);
      
      // Step 5: NOW, trigger the frontend metric state updates using the ref
      // This will set individual loading states correctly and re-fetch for UI
      if (refreshAllMetricsDirectlyRef.current) {
        console.log(`[MetaTab] 🚀 Triggering frontend refresh via refreshAllMetricsDirectlyRef.current()`);
        await refreshAllMetricsDirectlyRef.current();
      } else {
        console.warn("[MetaTab] refreshAllMetricsDirectlyRef.current is not available to refresh frontend metrics.");
      }
      
      // Success! Dispatch a custom event to notify any components that might be listening
      if (typeof window !== 'undefined') {
        // Dispatch more specific events to ensure all components react
        console.log(`[MetaTab] 📣 Dispatching detailed refresh events`);
        
        // Legacy event
        window.dispatchEvent(new CustomEvent('meta-data-refreshed', {
          detail: {
            success: true,
            refreshId,
            timestamp: new Date().toISOString()
          }
        }));
        
        // Dispatch additional events to make sure components notice
        window.dispatchEvent(new CustomEvent('page-refresh', {
          detail: {
            brandId: triggerBrandId, 
            timestamp: Date.now(),
            source: 'metatab-refresh'
          }
        }));
        
        window.dispatchEvent(new CustomEvent('metaDataRefreshed', {
          detail: {
            brandId: triggerBrandId,
            timestamp: Date.now(),
            forceRefresh: true,
            source: 'metatab-refresh'
          }
        }));
        
        // Also dispatch event on document for cross-iframe compatibility
        document.dispatchEvent(new CustomEvent('meta-refresh-all', {
          detail: {
            brandId: triggerBrandId,
            timestamp: Date.now()
          }
        }));
      }
      
      toast.success("Meta data refreshed successfully");
      return true;
    } catch (error) {
      console.error(`[MetaTab] Error during global refresh:`, error);
      toast.error("Failed to refresh Meta data");
      return false;
    } finally {
      // Always release the lock when done
      setIsManuallyRefreshing(false); // Clear overarching loading state at the very end
      releaseMetaFetchLock(refreshId);
    }
  };

  // Update the effect that handles auto-refresh to use the global refresh handler
  useEffect(() => {
    // Skip if auto-refresh is disabled or the component is unmounting
    if (window._disableAutoMetaFetch || !isMounted.current) return;
    
    // Only run the auto-refresh if we have a brand ID
    if (brandId) {
      console.log(`[MetaTab] Setting up 5-minute auto-refresh for Meta data`);
      
      // Set up a 5-minute interval for auto-refresh
      /*const intervalId = setInterval(() => {
        // Only refresh if the component is still mounted and the page is visible
        if (isMounted.current && document.visibilityState === 'visible') {
          console.log(`[MetaTab] Auto-refresh triggered`);
          refreshAllMetaData(brandId).then(success => {
            if (success) {
              console.log(`[MetaTab] Auto-refresh completed successfully`);
            } else {
              console.log(`[MetaTab] Auto-refresh completed with errors`);
            }
          });
        }
      }, 5 * 60 * 1000); // 5 minutes in milliseconds*/
      
      // Clean up the interval when the component unmounts
      return () => {
        /*clearInterval(intervalId);*/
        console.log(`[MetaTab] Cleaned up 5-minute auto-refresh interval`);
      };
    }
  }, [brandId]);

  // Listen for global page refresh event
  useEffect(() => {
    // Skip if component is unmounted
    if (!isMounted.current) return;
    
    // Define the event handler
    const handleGlobalRefresh = () => {
      console.log(`[MetaTab] Global page refresh detected`);
      
      // Only refresh if we have a brand ID
      if (!brandId) {
        console.log(`[MetaTab] No brand ID available, skipping refresh`);
        return;
      }
      
      // Trigger the refresh with the current brand ID
      refreshAllMetaData(brandId).then(success => {
        if (success) {
          console.log(`[MetaTab] Global refresh completed successfully`);
        } else {
          console.log(`[MetaTab] Global refresh completed with errors`);
        }
      });
    };
    
    // Register the event listener for the global refresh button
    window.addEventListener('page-refresh', handleGlobalRefresh);
    
    // Expose the refresh function to the window for external access
    if (typeof window !== 'undefined') {
      // @ts-ignore - Add the refresh function to the window object
      window._refreshMetaData = () => refreshAllMetaData(brandId);
    }
    
    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('page-refresh', handleGlobalRefresh);
      
      // Clean up the exposed function
      if (typeof window !== 'undefined') {
        // @ts-ignore
        delete window._refreshMetaData;
      }
    };
  }, [brandId, refreshAllMetaData]);

  // Add a proper date comparison function to avoid infinite loops
  const areDatesEqual = (date1: Date | undefined, date2: Date | undefined): boolean => {
    if (!date1 && !date2) return true;
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Store previous date range for comparison
  const prevDateRangeRef = useRef<{ from?: Date; to?: Date } | undefined>(undefined);

  // Update the useEffect hook that handles date range changes
  useEffect(() => {
    const currentFrom = dateRange?.from?.toISOString();
    const currentTo = dateRange?.to?.toISOString();
    const previousFrom = prevDateRangeRef.current?.from?.toISOString();
    const previousTo = prevDateRangeRef.current?.to?.toISOString();

    // Check if the dates have actually changed
    const datesChanged = currentFrom !== previousFrom || currentTo !== previousTo;

    if (datesChanged) {
      logger.debug('[MetaTab] Date range actually changed:', 
        `(${previousFrom?.split('T')[0]} - ${previousTo?.split('T')[0]})`, '->',
        `(${currentFrom?.split('T')[0]} - ${currentTo?.split('T')[0]})`);

      // Store the new date range as the previous one for the next render
      // Make sure to store a plain object or the relevant date parts if DateRange is complex
      prevDateRangeRef.current = dateRange ? { from: dateRange.from, to: dateRange.to } : undefined;

      // Fetch campaigns with the new date range (force refresh to get new data)
      if (throttle('date-range-change-fetch', 2000)) {
          fetchCampaigns(true);
      } else {
          logger.debug('[MetaTab] Throttled fetch due to rapid date change.')
      }

    } else {
      // Check if the dateRange object itself is undefined now when it wasn't before (or vice-versa)
      const rangePresenceChanged = (!!dateRange !== !!prevDateRangeRef.current);
      if (rangePresenceChanged) {
        logger.debug('[MetaTab] Date range presence changed.');
        prevDateRangeRef.current = dateRange ? { from: dateRange.from, to: dateRange.to } : undefined;
        if (throttle('date-range-presence-change-fetch', 2000)) {
           fetchCampaigns(true); // Fetch if range added/removed
        } else {
          logger.debug('[MetaTab] Throttled fetch due to rapid date presence change.')
        }
      } else {
        logger.debug('[MetaTab] Date range object updated, but dates are the same. Skipping fetch.');
      }
    }

  }, [dateRange, brandId, fetchCampaigns]);

  // Remove or comment out the previous useEffect hook handling date range persistence/stabilization
  // as this new hook handles the core logic of fetching on change.
  /*
  useEffect(() => {
    // ... previous stabilization logic ...
  }, [dateRange]);
  */

  // Add this effect to track when campaigns with reach data are loaded
  useEffect(() => {
    if (campaigns && campaigns.length > 0) {
      // Check if at least one campaign has reach data
      const hasReachData = campaigns.some(campaign => campaign.reach && campaign.reach > 0);
      
      if (hasReachData) {
        setCampaignReachLoaded(true);
        console.log("[MetaTab] Campaigns with reach data detected:", 
          campaigns.map(c => ({ name: c.name || c.campaign_name, reach: c.reach }))
        );
      } else {
        // If we have campaigns but no reach data yet, wait a bit and then check again
        // This handles cases where the campaign data loads but reach values are delayed
        const checkAgainTimeout = setTimeout(() => {
          console.log("[MetaTab] No reach data found in campaigns, will use fallback value");
          setCampaignReachLoaded(true); // Mark as loaded anyway after timeout so UI doesn't stay in loading state
        }, 3000); // Wait 3 seconds then stop loading state
        
        return () => clearTimeout(checkAgainTimeout);
      }
    } else {
      setCampaignReachLoaded(false);
    }
  }, [campaigns]);

  // Add debug logging to better understand what values we're getting
  useEffect(() => {
    if (campaigns && campaigns.length > 0 && debugMode) {
      console.log("[MetaTab] Campaign reach values:", 
        campaigns.map(c => ({ 
          name: c.name || c.campaign_name, 
          reach: c.reach, 
          status: c.status,
          dateRange: dateRange
        }))
      );
    }
  }, [campaigns, dateRange, debugMode]);

  // Add a special debug for reach calculation
  useEffect(() => {
    // Log the reach calculation
    if (campaigns && campaigns.length > 0) {
      const totalReach = campaigns.filter(c => c && typeof c.reach !== 'undefined')
        .reduce((sum, campaign) => sum + (parseInt(campaign.reach, 10) || 0), 0);
      
      console.log("[MetaTab] Current REACH calculation:", {
        reachTotal: totalReach,
        campaignsWithReach: campaigns.filter(c => c && c.reach > 0).length,
        allCampaigns: campaigns.length,
        campaignReaches: campaigns.map(c => ({ id: c.id, name: c.name || c.campaign_name, reach: c.reach }))
      });
    }
    // Return void to satisfy linter
    return undefined;
  }, [campaigns]);
  

  
  // Add new state for smart refresh system
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSmartRefreshing, setIsSmartRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(false);
  const lastNavigationRef = useRef<string>('');
  const lastVisibilityRef = useRef<string>('visible');
  const pageLoadTimeRef = useRef<number>(Date.now());
  
  // Smart refresh cooldown (30 seconds)
  const SMART_REFRESH_COOLDOWN = 30000;

  // Smart refresh function that respects cooldowns
  const performSmartRefresh = useCallback(async (reason: string) => {
    if (refreshCooldown || isSmartRefreshing || !brandId) {
      console.log(`[MetaTab] Smart refresh blocked: cooldown=${refreshCooldown}, refreshing=${isSmartRefreshing}, brandId=${brandId}`);
      return;
    }

    console.log(`[MetaTab] Performing smart refresh - Reason: ${reason}`);
    setIsSmartRefreshing(true);
    setRefreshCooldown(true);

    try {
      // Trigger the same refresh as the manual button
      await Promise.all([
        fetchAllMetricsDirectly(),
        fetchCampaigns(true)
      ]);
      
      setLastUpdated(new Date());
      
      toast.success("Data refreshed", {
        description: `Updated due to ${reason}`,
        duration: 3000
      });
      } catch (error) {
      console.error(`[MetaTab] Smart refresh failed:`, error);
      toast.error("Refresh failed", {
        description: "Please try again manually",
        duration: 3000
      });
    } finally {
      setIsSmartRefreshing(false);
      
      // Reset cooldown after delay
      setTimeout(() => {
        setRefreshCooldown(false);
      }, SMART_REFRESH_COOLDOWN);
    }
  }, [refreshCooldown, isSmartRefreshing, brandId, fetchAllMetricsDirectly, fetchCampaigns]);

  // Enhanced manual refresh function
  const handleSmartManualRefresh = useCallback(async () => {
    if (refreshCooldown) {
      toast.warning("Please wait", {
        description: "Refresh is on cooldown to prevent excessive API calls",
        duration: 3000
      });
      return;
    }

    await performSmartRefresh("manual refresh");
  }, [refreshCooldown, performSmartRefresh]);
    
  // Helper to determine if data is getting stale
  const getDataFreshnessStatus = useCallback(() => {
    if (!lastUpdated) return { status: 'loading', color: 'text-gray-500' };
    
    const timeSinceUpdate = Date.now() - lastUpdated.getTime();
    const minutes = Math.floor(timeSinceUpdate / 60000);
    
    if (minutes < 5) return { status: 'fresh', color: 'text-green-400' };
    if (minutes < 15) return { status: 'moderate', color: 'text-yellow-400' };
    if (minutes < 30) return { status: 'stale', color: 'text-orange-400' };
    return { status: 'very-stale', color: 'text-red-400' };
  }, [lastUpdated]);

  // Enhanced navigation detection effect using Next.js router (NO AUTO-REFRESH)
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // Just track navigation for logging, but don't auto-refresh
    if (lastNavigationRef.current && lastNavigationRef.current !== pathname) {
      console.log(`[MetaTab] Navigation detected: ${lastNavigationRef.current} → ${pathname}`);
      console.log('[MetaTab] Navigation detected but auto-refresh disabled - user can manually refresh if needed');
    }
    
    lastNavigationRef.current = pathname;
  }, [pathname]);

  // Page visibility detection effect with auto-refresh (like HomeTab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const currentVisibility = document.visibilityState;
      
      if (currentVisibility === 'visible' && lastVisibilityRef.current === 'hidden') {
        console.log('[MetaTab] Page became visible - auto-refresh disabled per user request');
        
        // Clear any potential blocking flags from other tabs/components but don't auto-refresh
        if (typeof window !== 'undefined') {
          window._blockMetaApiCalls = false;
          window._disableAutoMetaFetch = false;
          console.log("[MetaTab] Cleared blocking flags on visibility change (no auto-refresh)");
        }
        
        // REMOVED: Auto-refresh disabled per user request
        // if (brandId && dateRange?.from && dateRange?.to) {
        //   console.log("[MetaTab] Triggering syncMetaInsights on page visibility");
        //   syncMetaInsights();
        // }
      } else if (currentVisibility === 'hidden') {
        console.log('[MetaTab] Page became hidden');
      }
      
      lastVisibilityRef.current = currentVisibility;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [brandId, dateRange, syncMetaInsights]);
  
  // Focus detection (NO AUTO-REFRESH)
  useEffect(() => {
    const handleFocus = () => {
      console.log('[MetaTab] Window gained focus - timer continues showing time since last refresh');
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Update lastUpdated when data is refreshed by other means
  useEffect(() => {
    if (!isLoading && !isRefreshingData && !isSmartRefreshing) {
      setLastUpdated(new Date());
    }
  }, [isLoading, isRefreshingData, isSmartRefreshing, metricsData]);
          
    // Helper function to format time ago (like Meta's live timer)
  const getTimeAgo = useCallback((date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 30) return 'just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ${Math.floor((diffInSeconds % 3600) / 60)}m ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }, []);

  // Live-updating time ago display (updates every 10 seconds like Meta)
  const [timeAgoDisplay, setTimeAgoDisplay] = useState<string>('');
  const [dataFreshness, setDataFreshness] = useState({ status: 'loading', color: 'text-gray-500' });
  
  useEffect(() => {
    const updateTimeAgo = () => {
      if (lastUpdated) {
        setTimeAgoDisplay(getTimeAgo(lastUpdated));
        setDataFreshness(getDataFreshnessStatus());
      } else {
        setTimeAgoDisplay('Loading...');
        setDataFreshness({ status: 'loading', color: 'text-gray-500' });
      }
    };
    
    updateTimeAgo(); // Initial update
    const interval = setInterval(updateTimeAgo, 10000); // Update every 10 seconds for live feel
    
    return () => clearInterval(interval);
  }, [lastUpdated, getTimeAgo, getDataFreshnessStatus]);

  // Keyboard shortcut for refresh (Ctrl+Shift+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        console.log('Keyboard shortcut triggered Meta refresh');
        handleSmartManualRefresh();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSmartManualRefresh]);
          
  // Add a specific effect to refresh data when the component is mounted/visited - SMART REFRESH ON MOUNT ONLY
 
  
  // Add a new function to sync all Meta data from the beginning
  const syncAllTimeMetaData = async () => {
    if (!brandId) {
      toast.error("No brand ID available for sync");
      return;
    }
    
    // Show confirmation dialog first since this is a heavy operation
    const confirmed = window.confirm(
      "This will sync ALL Meta data from the beginning of your account (up to 2 years back). " +
      "This may take several minutes and use significant API quota. Continue?"
    );
    
    if (!confirmed) {
      return;
    }
    
    setIsLoadingAllMetaWidgets(true);
    toast.loading("Syncing all Meta data from beginning...", { 
      id: "all-time-sync-toast", 
      duration: 60000 // 1 minute timeout
    });
    
    try {
      // Start from 2 years ago (Meta's typical maximum retention)
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2);
      const endDate = new Date();
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`[MetaTab] Starting all-time sync from ${startDateStr} to ${endDateStr}`);
      
      // Call the insights sync API with the full date range
      const response = await fetch('/api/meta/insights/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          startDate: startDateStr,
          endDate: endDateStr,
          forceRefresh: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync all-time Meta data');
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`All-time Meta data synced! Processed ${result.count || 0} records.`, { 
          id: "all-time-sync-toast",
          duration: 10000 
        });
        
        // Trigger a refresh of the current view
        await fetchAllMetricsDirectly();
        
        console.log(`[MetaTab] ✅ All-time sync completed successfully - synced ${result.count || 0} records`);
      } else {
        throw new Error(result.error || 'Failed to sync all-time Meta data');
      }
      
    } catch (error) {
      console.error('[MetaTab] Error syncing all-time Meta data:', error);
      toast.error("Failed to sync all-time Meta data", {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 10000,
        id: "all-time-sync-toast"
      });
    } finally {
      setIsLoadingAllMetaWidgets(false);
    }
  };

  // === UNIFIED DATA FETCHING LOGIC (SAME AS HOMETAB) ===
  // Simple, working approach from HomeTab that handles all scenarios properly
  
  // Add a ref to track fetch parameters for comparison
  const prevFetchParamsRef = useRef<{ brandId?: string; from?: string; to?: string }>();
  
  // Main data loading useEffect (mirrors HomeTab approach)
  useEffect(() => {
    if (brandId && dateRange?.from && dateRange?.to) {
      console.log("[MetaTab] useEffect detected change in brandId or dateRange. Triggering syncMetaInsights.");
      
      // Compare with previous parameters to avoid unnecessary fetches
      const currentFromISO = dateRange.from.toISOString();
      const currentToISO = dateRange.to.toISOString();
      const brandChanged = brandId !== prevFetchParamsRef.current?.brandId;
      const datesChanged = currentFromISO !== prevFetchParamsRef.current?.from || currentToISO !== prevFetchParamsRef.current?.to;
      
      // Only trigger if something actually changed
      if (brandChanged || datesChanged || !initialLoadComplete.current) {
        console.log(`[MetaTab] Change detected: Brand: ${brandChanged}, Dates: ${datesChanged}, InitialLoadDone: ${initialLoadComplete.current}`);
        
        // Clear blocking flags to ensure fetch works
        if (typeof window !== 'undefined') {
          window._blockMetaApiCalls = false;
          window._disableAutoMetaFetch = false;
        }
        
        // Use the same unified sync approach as HomeTab
        syncMetaInsights().finally(() => {
          // Mark initial load as complete and update params
          initialLoadComplete.current = true;
          prevFetchParamsRef.current = { brandId, from: currentFromISO, to: currentToISO };
        });
      } else {
        console.log("[MetaTab] No changes detected, skipping fetch");
      }
    } else {
      console.log("[MetaTab] Skipping data fetch: Missing brandId or full dateRange.");
      // Clear loading states when prerequisites aren't met
      setLoading(false);
      setIsLoadingAllMetaWidgets(false);
    }
  }, [brandId, dateRange?.from, dateRange?.to, syncMetaInsights]);
  
  // Separate useEffect for handling manual refreshes (when user clicks refresh button)
  useEffect(() => {
    if (isRefreshingData && !isFetchingRef.current && initialLoadComplete.current) {
      console.log('[MetaTab] 🔄 Handling manual refresh request');
      
      isFetchingRef.current = true;
      
      const performRefresh = async () => {
        try {
          // For manual refreshes, use the refresh function that forces fresh data
          await refreshMetricsDirectly();
          console.log('[MetaTab] ✅ Manual refresh completed');
        } catch (error) {
          console.error('[MetaTab] ❌ Error in manual refresh:', error);
        } finally {
          isFetchingRef.current = false;
        }
      };
      
      performRefresh();
    }
  }, [isRefreshingData]); // Only trigger on refresh flag changes

  // Add a ref to track tab-switch-initiated syncs
  const isTabSwitchSyncRef = useRef(false);

  useEffect(() => {
    if (brandId && dateRange?.from && dateRange?.to) {
      syncMetaInsights();
    }
  }, [brandId, dateRange]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("[MetaTab] Page became visible, triggering data sync.");
        syncMetaInsights();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [syncMetaInsights]);

  useEffect(() => {
    const handleGlobalRefresh = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        if (detail?.brandId === brandId) {
            console.log("[MetaTab] Received global refresh event, syncing data.");
            syncMetaInsights();
        }
    };

    window.addEventListener('metaDataRefreshed', handleGlobalRefresh);
    return () => window.removeEventListener('metaDataRefreshed', handleGlobalRefresh);
  }, [brandId, syncMetaInsights]);


  const handleManualRefresh = async () => {
    await syncMetaInsights();
  };

  const syncCampaigns = async () => {
    setIsSyncingCampaigns(true);
    toast.loading("Syncing Meta campaigns...", { id: "meta-campaigns-sync" });
    try {
      const response = await fetch(`/api/meta/campaigns/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, forceRefresh: true }),
      });
      if (response.ok) {
        toast.success("Meta campaigns synced", { id: "meta-campaigns-sync" });
        await fetchCampaigns(true);
      } else {
        toast.error("Failed to sync Meta campaigns", { id: "meta-campaigns-sync" });
      }
    } catch (error) {
      console.error('[MetaTab] Error syncing Meta campaigns:', error);
      toast.error("Error syncing Meta campaigns", { id: "meta-campaigns-sync" });
    } finally {
      setIsSyncingCampaigns(false);
    }
  };


  const [showDebugControls, setShowDebugControls] = useState(false);

  const toggleDebugControls = () => {
    setShowDebugControls(prev => !prev);
  };

  if (isLoadingAllMetaWidgets && !hasFetchedData.current) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={handleManualRefresh} disabled={isLoadingAllMetaWidgets} size="sm" variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingAllMetaWidgets ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <MetaSpecificDateSyncButton brandId={brandId} onSyncSuccess={handleManualRefresh} />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={toggleDebugControls} size="sm" variant="ghost">
            <Wrench className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showDebugControls && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle>Debug Controls</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
             <MetaFixButton brandId={brandId} onFixComplete={handleManualRefresh} />
          </CardContent>
        </Card>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Ad Spend"
          value={metaMetrics.adSpend}
          change={metaMetrics.adSpendGrowth}
          previousValue={metaMetrics.previousAdSpend}
          prefix="$"
          valueFormat="currency"
          loading={isLoadingAllMetaWidgets}
        />
        <MetricCard
          title="ROAS"
          value={metaMetrics.roas}
          change={metaMetrics.roasGrowth}
          previousValue={metaMetrics.previousRoas}
          suffix="x"
          loading={isLoadingAllMetaWidgets}
        />
        <MetricCard
          title="Impressions"
          value={metaMetrics.impressions}
          change={metaMetrics.impressionGrowth}
          previousValue={metaMetrics.previousImpressions}
          valueFormat="number"
          loading={isLoadingAllMetaWidgets}
        />
        <MetricCard
          title="Clicks (All)"
          value={metaMetrics.clicks}
          change={metaMetrics.clickGrowth}
          previousValue={metaMetrics.previousClicks}
          valueFormat="number"
          loading={isLoadingAllMetaWidgets}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metaDaily}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="date" tickFormatter={(tick) => format(new Date(tick), 'MMM d')} />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tickFormatter={(value) => `$${formatNumberCompact(value)}`} />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tickFormatter={(value) => formatNumberCompact(value)} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="spend" fill="#8884d8" name="Ad Spend" />
              <Bar yAxisId="right" dataKey="clicks" fill="#82ca9d" name="Clicks" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TotalAdSetReachCard brandId={brandId} dateRange={dateRange} unifiedLoading={isLoadingAllMetaWidgets} />
        <TotalBudgetMetricCard brandId={brandId} unifiedLoading={isLoadingAllMetaWidgets} />
         <MetricCard
          title="Purchase Value"
          value={metaMetrics.purchaseValue}
          prefix="$"
          valueFormat="currency"
          change={calculatePercentChange(metaMetrics.purchaseValue, metaMetrics.previousPurchaseValue)}
          previousValue={metaMetrics.previousPurchaseValue}
          loading={isLoadingAllMetaWidgets}
        />
        <MetricCard
          title="Results"
          value={metaMetrics.results}
          valueFormat="number"
          change={calculatePercentChange(metaMetrics.results, metaMetrics.previousResults)}
          previousValue={metaMetrics.previousResults}
          loading={isLoadingAllMetaWidgets}
        />
        <MetricCard
          title="Cost Per Result"
          value={metaMetrics.costPerResult}
          prefix="$"
          valueFormat="currency"
          change={metaMetrics.cprGrowth}
          previousValue={metaMetrics.costPerResult > 0 ? (metaMetrics.costPerResult / (1 + (metaMetrics.cprGrowth || 0)/100)) : 0}
          loading={isLoadingAllMetaWidgets}
        />
        <MetricCard
          title="CPC (Link)"
          value={metaMetrics.cpc}
          prefix="$"
          valueFormat="currency"
          change={metaMetrics.cpcGrowth}
          previousValue={metaMetrics.previousCpc}
          loading={isLoadingAllMetaWidgets}
        />
        <MetricCard
          title="CTR (Link)"
          value={metaMetrics.ctr / 100}
          valueFormat="percentage"
          change={metaMetrics.ctrGrowth}
          previousValue={metaMetrics.previousCtr / 100}
          loading={isLoadingAllMetaWidgets}
        />
      </div>

      <MemoizedCampaignWidget 
        brandId={brandId}
        campaigns={campaigns}
        isLoading={isLoadingCampaigns}
        isSyncing={isSyncingCampaigns}
        dateRange={dateRange}
        onRefresh={() => fetchCampaigns(true)}
        onSync={syncCampaigns}
      />
    </div>
  )
}

export default withErrorBoundary(MetaTab);
