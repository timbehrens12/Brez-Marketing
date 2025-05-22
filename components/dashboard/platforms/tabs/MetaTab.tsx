"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from "next/navigation"
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
import { format } from "date-fns"
import { withErrorBoundary } from '@/components/ui/error-boundary'
import { isSameDay, isYesterday, subDays, startOfMonth, subMonths, endOfMonth } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { toast } from "sonner"
import { DateRange } from "react-day-picker"
import { MetricCard } from "@/components/metrics/MetricCard"
import Image from "next/image"
import { TotalAdSetReachCard } from '../metrics/TotalAdSetReachCard'
import { TotalBudgetMetricCard } from '@/components/metrics/TotalBudgetMetricCard'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { nanoid } from "nanoid"

// Meta Global Cooldown to prevent excessive API calls
const META_GLOBAL_COOLDOWN = 15000; // 15 seconds
const META_AUTOREFRESH_INTERVAL = 300000; // 5 minutes
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Define global meta request queue
const requestQueue: { req: () => Promise<any>, id: string }[] = [];
let processingQueue = false;

// We need to use the DateRange type from react-day-picker
interface MetaTabProps {
  dateRange: DateRange | undefined
  metrics: any
  isLoading: boolean
  isRefreshingData?: boolean
  initialDataLoad?: boolean
  brandId: string
}

// Define the DailyDataItem type for daily metrics
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

// Define the structure of our metrics data
interface MetricsDataType {
  adSpend: number;
  adSpendGrowth: number;
  impressions: number;
  impressionGrowth: number;
  clicks: number;
  clickGrowth: number;
  conversions: number;
  conversionGrowth: number;
  ctr: number;
  ctrGrowth: number;
  cpc: number;
  cpcLink?: number;
  costPerResult: number;
  cprGrowth: number;
  roas: number;
  roasGrowth: number;
  frequency: number;
  budget: number;
  reach: number;
  dailyData: DailyDataItem[];
}

// Extend the Window interface to add our custom properties
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
  }
}

// Helper function to check if a meta fetch is in progress
function isMetaFetchInProgress(): boolean {
  return window._metaFetchLock === true;
}

// Helper function to acquire a meta fetch lock
function acquireMetaFetchLock(fetchId: number | string): boolean {
  if (window._metaFetchLock === true) {
    // There's already a fetch in progress
    console.log(`[MetaApi] FetchID ${fetchId}: Lock acquisition failed, another fetch is in progress`);
    return false;
  }
  
  // Register this fetch
  window._metaFetchLock = true;
  
  // Add to active fetches set
  if (!window._activeFetchIds) window._activeFetchIds = new Set();
  window._activeFetchIds.add(fetchId);
  
  return true;
}

// Helper function to release a meta fetch lock
function releaseMetaFetchLock(fetchId: number | string): void {
  // Remove from active fetches
  if (window._activeFetchIds) {
    window._activeFetchIds.delete(fetchId);
  }
  
  // Only release the lock if there are no more active fetches
  if (!window._activeFetchIds || window._activeFetchIds.size === 0) {
    window._metaFetchLock = false;
  }
}

// Define the MetricDataState type for consistent state management
type MetricDataState = {
  value: number;
  previousValue: number;
  isLoading: boolean;
  lastUpdated: Date | null;
}

// Interface for MetaMetricsState to match HomeTab implementation
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
}

// Function to process the request queue
function processRequestQueue() {
  if (processingQueue || requestQueue.length === 0) {
    return;
  }
  
  processingQueue = true;
  
  const processNext = () => {
    if (requestQueue.length === 0) {
      processingQueue = false;
      return;
    }
    
    const { req, id } = requestQueue.shift()!;
    
    console.log(`[RequestQueue] Processing request: ${id}`);
    
    // Run the request, then process the next one
    req().then(() => {
      console.log(`[RequestQueue] Request ${id} completed`);
      processNext();
    }).catch(error => {
      console.error(`[RequestQueue] Error processing request ${id}:`, error);
      processNext();
    });
  };
  
  processNext();
}

// Function to fetch campaign status
async function fetchCampaignStatus(campaignId: string, brandId: string) {
  try {
    const response = await fetch(`/api/meta/campaigns/status?campaignId=${campaignId}&brandId=${brandId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch campaign status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching status for campaign ${campaignId}:`, error);
    throw error;
  }
}

// Function to queue a campaign status check
function queueCampaignStatusCheck(campaignId: string, brandId: string, callback: (data: any) => void) {
  const reqId = `campaign-status-${campaignId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // Create the request function
  const req = async () => {
    try {
      const statusData = await fetchCampaignStatus(campaignId, brandId);
      callback(statusData);
    } catch (error) {
      console.error(`[QueuedRequest] Error fetching status for campaign ${campaignId}:`, error);
    }
  };
  
  // Add to queue
  requestQueue.push({ req, id: reqId });
  
  // Start processing the queue if it's not already being processed
  processRequestQueue();
}

// Throttle function to prevent excessive function calls
const throttle = (key: string, minInterval: number = 3000): boolean => {
  const now = Date.now();
  const throttleKey = `_throttle_${key}` as string;
  const lastCall = (window as any)[throttleKey] as number;
  
  if (lastCall && now - lastCall < minInterval) {
    return false;
  }
  
  (window as any)[throttleKey] = now;
  return true;
};

// Main MetaTab component
export function MetaTab({ 
  dateRange, 
  metrics, 
  isLoading, 
  isRefreshingData = false, 
  initialDataLoad = false, 
  brandId 
}: MetaTabProps) {
  // Create a unique ID for this component instance
  const instanceId = useRef(nanoid());
  
  // Debug mode state
  const [debugMode, setDebugMode] = useState(DEBUG_MODE);
  const [showDebugControls, setShowDebugControls] = useState(false);
  const [showMetaBackfillDialog, setShowMetaBackfillDialog] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(isLoading || initialDataLoad);
  const [fetchingCampaigns, setFetchingCampaigns] = useState(false);
  const [campaignReachLoaded, setCampaignReachLoaded] = useState(false);
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);

  // Previous date range ref for comparison
  const prevDateRangeRef = useRef<DateRange | undefined>(dateRange);
  
  // Router and search params
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // New state for HomeTab-style metrics
  const [metaDaily, setMetaDaily] = useState<DailyDataItem[]>([]);
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
    cprGrowth: null
  });

  // Flags to track what has been fetched already
  const hasFetchedMetaData = useRef(false);
  
  // Convert JS Date to local ISO date string (YYYY-MM-DD)
  const toLocalISODateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Calculate previous period dates based on current date range
  const getPreviousPeriodDates = (from: Date, to: Date): { prevFrom: string, prevTo: string } => {
    // Ensure we have valid dates
    const fromNormalized = from || new Date();
    const toNormalized = to || new Date();
    
    // Calculate the number of days in the current range
    const daysInRange = Math.round((toNormalized.getTime() - fromNormalized.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // For a single day view (today or yesterday), compare with the previous day
    if (daysInRange === 1) {
      // If viewing a single day, compare with previous day
      const prevFrom = subDays(fromNormalized, 1);
      const prevTo = prevFrom; // Same day for both
      
      return {
        prevFrom: toLocalISODateString(prevFrom),
        prevTo: toLocalISODateString(prevTo)
      };
    }
    
    // For multi-day periods, create a parallel previous period of same length
    const prevFrom = subDays(fromNormalized, daysInRange);
    const prevTo = subDays(toNormalized, daysInRange);
    
    const prevFromStr = toLocalISODateString(prevFrom);
    const prevToStr = toLocalISODateString(prevTo);
    
    console.log(`[MetaTab] Custom range detected (${daysInRange} days), comparing to previous period:`, {
      currentRange: `${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`,
      prevRange: `${prevFromStr} to ${prevToStr}`
    });
    
    return {
      prevFrom: prevFromStr,
      prevTo: prevToStr
    };
  };

  // Calculate percentage change based on current and previous values
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
  
  // Fetch Meta data directly from API using same approach as HomeTab
  const fetchMetaData = async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      return;
    }

    try {
      setIsManuallyRefreshing(true);

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
      
      console.log(`[MetaTab] Fetching Meta data for current period: ${params.toString()}`);
      
      // Calculate previous period dates using the same logic as HomeTab
      const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);
      
      // Previous period params
      const prevParams = new URLSearchParams({
        brandId: brandId
      });
      
      // Add previous period date range
      prevParams.append('from', prevFrom);
      prevParams.append('to', prevTo);
      prevParams.append('bypass_cache', 'true');
      
      console.log(`[MetaTab] Fetching Meta data for previous period: ${prevParams.toString()}`);
      
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
      
      console.log("[MetaTab] Fetched Meta data for current period:", {
        adSpend: currentData.adSpend,
        impressions: currentData.impressions,
        clicks: currentData.clicks,
        roas: currentData.roas,
        ctr: currentData.ctr,
        cpc: currentData.cpc,
        dailyData: Array.isArray(currentData.dailyData) ? currentData.dailyData.length : 0
      });
      
      console.log("[MetaTab] Fetched Meta data for previous period:", {
        adSpend: previousData.adSpend,
        impressions: previousData.impressions,
        clicks: previousData.clicks,
        roas: previousData.roas,
        ctr: previousData.ctr,
        cpc: previousData.cpc,
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

      // Adjust CTR values to be decimals
      const currentCtrDecimal = (currentData.ctr || 0) / 100;
      const previousCtrDecimal = (previousData.ctr || 0) / 100;
      const ctrGrowthDecimalBased = calculatePercentChange(currentCtrDecimal, previousCtrDecimal);

      // Calculate CPC Growth
      const currentCpc = currentData.cpc || 0;
      const previousCpcValue = previousData.cpc || 0;
      const cpcGrowthCalculated = calculatePercentChange(currentCpc, previousCpcValue);
      
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
        
        ctr: currentCtrDecimal,
        previousCtr: previousCtrDecimal,
        ctrGrowth: ctrGrowthDecimalBased,
        
        cpc: currentCpc,
        previousCpc: previousCpcValue,
        cpcGrowth: cpcGrowthCalculated,

        costPerResult: currentData.costPerResult || 0,
        cprGrowth: calculatePercentChange(currentData.costPerResult || 0, previousData.costPerResult || 0)
      });
      
      hasFetchedMetaData.current = true;
      setLoading(false);
    } catch (error) {
      console.error("[MetaTab] Error fetching Meta data:", error);
      setLoading(false);
    } finally {
      setIsManuallyRefreshing(false);
    }
  };

  // Fetch campaign data
  const fetchCampaigns = useCallback(async (forceRefresh = false) => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      return;
    }
    
    try {
      setFetchingCampaigns(true);
      
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      const response = await fetch(
        `/api/meta/campaigns/date-range?brandId=${brandId}&from=${fromDate}&to=${toDate}${forceRefresh ? '&force_refresh=true' : ''}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.campaigns && Array.isArray(data.campaigns)) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error("[MetaTab] Error fetching campaigns:", error);
    } finally {
      setFetchingCampaigns(false);
    }
  }, [brandId, dateRange]);
  
  // Load Meta data when component mounts or date range changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to && brandId) {
      fetchMetaData();
    }
  }, [dateRange, brandId]);
  
  // Fetch campaign data when component mounts or date range changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to && brandId) {
      fetchCampaigns();
    }
  }, [dateRange, brandId, fetchCampaigns]);
  
  // Also refresh data when isRefreshingData prop changes
  useEffect(() => {
    if (isRefreshingData && brandId) {
      fetchMetaData();
      fetchCampaigns(true);
    }
  }, [isRefreshingData, brandId, fetchCampaigns]);
  
  // Function to toggle the debug controls
  const toggleDebugControls = () => {
    setShowDebugControls(prev => !prev);
  };
  
  // Function to check if we have data to display
  const hasData = () => {
    return metaMetrics.adSpend > 0 || metaMetrics.impressions > 0 || metaMetrics.clicks > 0;
  };
  
  // Simple function to manually trigger data refresh
  const handleManualRefresh = () => {
    fetchMetaData();
    fetchCampaigns(true);
  };
  
  // Debug function for date range
  const debugDateRange = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      console.log("[MetaTab] Date range is not set");
      return;
    }
    
    console.log("[MetaTab] Current date range:", {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
      daysInRange: Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    });
    
    const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);
    console.log("[MetaTab] Previous period:", { prevFrom, prevTo });
  };
  
  return (
    <div className="space-y-8">
      {(() => {
        try {
          return (
            <>
              {/* Debug controls - add a keyboard shortcut to show/hide it */}
              <div className="mb-4">
                {showDebugControls && (
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-md mb-4">
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-semibold mb-2">Debug Controls</div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleManualRefresh}
                          className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                        >
                          Force Fetch Meta Data
                        </button>
                        
                        <button
                          onClick={debugDateRange}
                          className="px-3 py-1 text-xs bg-orange-700 hover:bg-orange-600 text-white rounded-md"
                        >
                          Debug Date Range
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Add a hidden button in the corner to trigger debug mode */}
              <div 
                className="fixed bottom-4 right-4 w-6 h-6 bg-transparent z-50 cursor-pointer"
                onClick={toggleDebugControls}
                title="Toggle debug controls (hidden)"
              ></div>
    
              {/* Meta Data Overview Heading */}
              <div className="flex items-center mb-4">
                <LineChart className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold">Meta Data Overview</h2>
              </div>
              
              {/* Direct DB connection widgets with grid layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ad Spend */}
                <MetricCard
                  title={
                    <div className="flex items-center gap-1.5">
                      <Image 
                        src="https://i.imgur.com/6hyyRrs.png" 
                        alt="Meta logo" 
                        width={16} 
                        height={16} 
                        className="object-contain"
                      />
                      <span className="ml-0.5">Meta Ad Spend</span>
                    </div>
                  }
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
                  loading={isManuallyRefreshing || isRefreshingData}
                  data={[]}
                  platform="meta"
                  dateRange={dateRange}
                  brandId={brandId}
                />

                {/* Impressions */}
                <MetricCard
                  title={
                    <div className="flex items-center gap-1.5">
                      <Image 
                        src="https://i.imgur.com/6hyyRrs.png" 
                        alt="Meta logo" 
                        width={16} 
                        height={16} 
                        className="object-contain"
                      />
                      <span className="ml-0.5">Meta Impressions</span>
                    </div>
                  }
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
                  loading={isManuallyRefreshing || isRefreshingData}
                  data={[]}
                  platform="meta"
                  dateRange={dateRange}
                  brandId={brandId}
                />

                {/* ROAS */}
                <MetricCard
                  title={
                    <div className="flex items-center gap-1.5">
                      <Image 
                        src="https://i.imgur.com/6hyyRrs.png" 
                        alt="Meta logo" 
                        width={16} 
                        height={16} 
                        className="object-contain"
                      />
                      <span className="ml-0.5">Meta ROAS</span>
                    </div>
                  }
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
                  loading={isManuallyRefreshing || isRefreshingData}
                  data={[]}
                  platform="meta"
                  dateRange={dateRange}
                  brandId={brandId}
                />

                {/* Reach */}
                <TotalAdSetReachCard 
                  brandId={brandId} 
                  dateRange={dateRange}
                  isManuallyRefreshing={fetchingCampaigns || isManuallyRefreshing || isRefreshingData}
                  campaigns={campaigns}
                />

                {/* Clicks */}
                <MetricCard
                  title={
                    <div className="flex items-center gap-1.5">
                      <Image 
                        src="https://i.imgur.com/6hyyRrs.png" 
                        alt="Meta logo" 
                        width={16} 
                        height={16} 
                        className="object-contain"
                      />
                      <span className="ml-0.5">Meta Clicks</span>
                    </div>
                  }
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
                  loading={isManuallyRefreshing || isRefreshingData}
                  data={[]}
                  platform="meta"
                  dateRange={dateRange}
                  brandId={brandId}
                />

                {/* Conversions */}
                <MetricCard
                  title={
                    <div className="flex items-center gap-1.5">
                      <Image 
                        src="https://i.imgur.com/6hyyRrs.png" 
                        alt="Meta logo" 
                        width={16} 
                        height={16} 
                        className="object-contain"
                      />
                      <span className="ml-0.5">Meta Conversions</span>
                    </div>
                  }
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
                  loading={isManuallyRefreshing || isRefreshingData}
                  data={[]}
                  platform="meta"
                  dateRange={dateRange}
                  brandId={brandId}
                />

                {/* CTR */}
                <MetricCard
                  title={
                    <div className="flex items-center gap-1.5">
                      <Image 
                        src="https://i.imgur.com/6hyyRrs.png" 
                        alt="Meta logo" 
                        width={16} 
                        height={16} 
                        className="object-contain"
                      />
                      <span className="ml-0.5">CTR</span>
                      <Percent className="h-4 w-4 text-blue-400" />
                    </div>
                  }
                  value={metaMetrics.ctr}
                  change={metaMetrics.ctrGrowth}
                  previousValue={metaMetrics.previousCtr}
                  valueFormat="percentage"
                  decimals={2}
                  hideGraph={true}
                  showPreviousPeriod={true}
                  previousValueFormat="percentage"
                  previousValueDecimals={2}
                  infoTooltip="Click-through rate (clicks ÷ impressions)"
                  nullChangeText="N/A"
                  nullChangeTooltip="No data for previous period"
                  loading={isManuallyRefreshing || isRefreshingData}
                  data={[]}
                  platform="meta"
                  dateRange={dateRange}
                  brandId={brandId}
                />

                {/* Cost Per Click */}
                <MetricCard
                  title={
                    <div className="flex items-center gap-1.5">
                      <Image 
                        src="https://i.imgur.com/6hyyRrs.png" 
                        alt="Meta logo" 
                        width={16} 
                        height={16} 
                        className="object-contain"
                      />
                      <span className="ml-0.5">Cost Per Click</span>
                      <MousePointer className="h-4 w-4 text-indigo-400" />
                    </div>
                  }
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
                  loading={isManuallyRefreshing || isRefreshingData}
                  data={[]}
                  platform="meta"
                  dateRange={dateRange}
                  brandId={brandId}
                />

                {/* Total Budget */}
                <TotalBudgetMetricCard
                  brandId={brandId}
                  isManuallyRefreshing={fetchingCampaigns || isManuallyRefreshing || isRefreshingData}
                />

                {/* Cost Per Result */}
                <MetricCard
                  title={
                    <div className="flex items-center gap-1.5">
                      <Image 
                        src="https://i.imgur.com/6hyyRrs.png" 
                        alt="Meta logo" 
                        width={16} 
                        height={16} 
                        className="object-contain"
                      />
                      <span className="ml-0.5">Cost Per Result</span>
                      <DollarSign className="h-4 w-4 text-orange-400" />
                    </div>
                  }
                  value={metaMetrics.costPerResult}
                  change={metaMetrics.cprGrowth}
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
                  loading={isManuallyRefreshing || isRefreshingData}
                  data={[]}
                  platform="meta"
                  dateRange={dateRange}
                  brandId={brandId}
                />
              </div>
              
              {/* Campaign Performance Widget */}
              <div className="mt-6">
                <div className="flex items-center mb-4">
                  <FacebookIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <h2 className="text-lg font-semibold">Campaign Performance</h2>
                </div>
                
                {fetchingCampaigns ? (
                  <Card className="border-zinc-800 bg-zinc-950">
                    <CardContent className="p-6 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                      <span className="ml-2 text-sm text-zinc-400">Loading campaigns data...</span>
                    </CardContent>
                  </Card>
                ) : (
                  <div>
                    {campaigns && campaigns.length > 0 ? (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">Campaign Performance Data {dateRange?.from && dateRange?.to ? `${format(dateRange.from, 'MM/dd/yyyy')} - ${format(dateRange.to, 'MM/dd/yyyy')}` : ''}</div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={() => fetchCampaigns(true)}
                              >
                                <RefreshCw className="h-3 w-3" />
                                Refresh
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Campaign List Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-zinc-800 bg-zinc-900">
                                <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400">Campaign</th>
                                <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400">Status</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">Budget</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">Spend</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">Clicks <ChevronDown className="h-3 w-3 inline ml-1" /></th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">CTR</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">ROAS</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">Reach</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">Conversions</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">Cost/Conv.</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">Impressions</th>
                                <th className="py-3 px-4 text-center text-xs font-medium text-zinc-400"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                              {campaigns.map((campaign: any) => (
                                <tr 
                                  key={campaign.id} 
                                  className="hover:bg-zinc-900/50 transition-colors"
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center">
                                      <div>
                                        <div className="font-medium">{campaign.name || campaign.campaign_name}</div>
                                        <div className="text-xs text-zinc-500 truncate max-w-[200px]">{campaign.id}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    {campaign.status === 'ACTIVE' ? (
                                      <Badge className="bg-green-900/30 text-green-500 hover:bg-green-900/30">Active</Badge>
                                    ) : campaign.status === 'PAUSED' ? (
                                      <Badge variant="outline" className="bg-yellow-900/10 border-yellow-800 text-yellow-500 hover:bg-yellow-900/10">Paused</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">{campaign.status}</Badge>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right">${campaign.budget?.toFixed(2) || '0.00'}</td>
                                  <td className="py-3 px-4 text-right">${campaign.spend?.toFixed(2) || '0.00'}</td>
                                  <td className="py-3 px-4 text-right">{campaign.clicks || 0}</td>
                                  <td className="py-3 px-4 text-right">{((campaign.ctr || 0) * 100).toFixed(2)}%</td>
                                  <td className="py-3 px-4 text-right">{(campaign.roas || 0).toFixed(2)}x</td>
                                  <td className="py-3 px-4 text-right">{campaign.reach || 0}</td>
                                  <td className="py-3 px-4 text-right">{campaign.conversions || 0}</td>
                                  <td className="py-3 px-4 text-right">
                                    {campaign.conversions && campaign.conversions > 0 && campaign.spend
                                      ? `$${(campaign.spend / campaign.conversions).toFixed(2)}`
                                      : '-'
                                    }
                                  </td>
                                  <td className="py-3 px-4 text-right">{campaign.impressions || 0}</td>
                                  <td className="py-3 px-4 text-center">
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <Card className="border-zinc-800 bg-zinc-950">
                        <CardContent className="p-6 text-center">
                          <div className="flex flex-col items-center justify-center py-8">
                            <FacebookIcon className="h-12 w-12 text-blue-500/30 mb-4" />
                            <h3 className="text-lg font-medium mb-2">No campaign data found</h3>
                            <p className="text-zinc-400 text-sm max-w-md mb-4">
                              No Meta campaigns were found for the selected date range.
                            </p>
                            <Button 
                              className="gap-2" 
                              size="sm"
                              onClick={() => fetchCampaigns(true)}
                            >
                              <RefreshCw className="h-4 w-4" />
                              Refresh Campaigns
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </>
          );
        } catch (error) {
          console.error("Error rendering MetaTab:", error);
          return (
            <div className="p-4 bg-red-950 border border-red-900 rounded-lg">
              <h3 className="text-red-500 font-medium mb-2">Error Rendering Meta Tab</h3>
              <p className="text-sm text-red-400">{String(error)}</p>
            </div>
          );
        }
      })()}
    </div>
  );
}

// Wrap the component with the error boundary at export
export default withErrorBoundary(MetaTab, {
  onError: (error) => {
    console.error("MetaTab error caught by boundary:", error)
  }
})
