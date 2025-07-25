﻿"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  Terminal, User2, Wrench, CalendarRange, Percent, Info
} from "lucide-react"
import classNames from "classnames"
import { format } from "date-fns"
import { withErrorBoundary } from '@/components/ui/error-boundary'
import { isSameDay, isYesterday, subDays, startOfMonth, subMonths, endOfMonth } from "date-fns"
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
import { 
  getCurrentLocalDateString, 
  getYesterdayLocalDateString, 
  dateToLocalDateString,
  isDateRangeToday,
  isDateRangeYesterday,
  formatDateRangeForAPI
} from '@/lib/utils/timezone';

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

// Add an interface for the metrics data
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

// Add type definition for the global timeouts array
declare global {
  interface Window {
    _metaTimeouts?: ReturnType<typeof setTimeout>[];
    _blockMetaApiCalls?: boolean;
    _disableAutoMetaFetch?: boolean;
    _activeFetchIds?: Set<number | string>;
    _metaFetchLock?: boolean;
  }
}

// Initialize the fetch prevention system
if (typeof window !== 'undefined') {
  window._activeFetchIds = window._activeFetchIds || new Set();
  window._metaFetchLock = window._metaFetchLock || false;
}

// Helper function to check if a fetch is in progress globally
function isMetaFetchInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  return window._metaFetchLock === true || (window._activeFetchIds?.size ?? 0) > 0;
}

// Helper function to acquire a fetch lock
function acquireMetaFetchLock(fetchId: number | string): boolean {
  if (typeof window === 'undefined') return true;
  
  // If a lock is already active, don't allow a new one
  if (window._metaFetchLock === true) {
    console.log(`[MetaTab] 🔒 Fetch lock active, rejecting fetchId: ${fetchId}`);
    return false;
  }
  
  // Set the lock and register the fetch ID
  window._metaFetchLock = true;
  window._activeFetchIds?.add(fetchId);
  
  console.log(`[MetaTab] 🔐 Acquired fetch lock for fetchId: ${fetchId}`);
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

// Properly define the type for all metric state objects
type MetricDataState = {
  value: number;
  previousValue: number;
  isLoading: boolean;
  lastUpdated: Date | null;
}

export function MetaTab({ 
  dateRange, 
  metrics, 
  isLoading, 
  isRefreshingData = false, 
  initialDataLoad = false, 
  brandId 
}: MetaTabProps) {
  const mountTimeRef = useRef(Date.now());

  // Helper function to create a default metrics object
  const createDefaultMetricsData = (): MetricsDataType => {
      return {
        adSpend: 0,
        adSpendGrowth: 0,
        impressions: 0,
        impressionGrowth: 0,
        clicks: 0,
        clickGrowth: 0,
        conversions: 0,
        conversionGrowth: 0,
        ctr: 0,
        ctrGrowth: 0,
        cpc: 0,
        cpcLink: 0,
        costPerResult: 0,
        cprGrowth: 0,
        roas: 0,
        roasGrowth: 0,
        frequency: 0,
      budget: 0,
        reach: 0,
      dailyData: [] as DailyDataItem[]
    };
  };

  // Create a safe version of metrics to use internally with error handling
  const safeMetrics = useMemo(() => {
    try {
      if (!metrics || typeof metrics !== 'object') {
        console.log("Creating default metrics object - metrics prop is invalid");
        return createDefaultMetricsData();
    }
    
    // Otherwise, create a safe copy with checks for each property
    return {
      adSpend: typeof metrics.adSpend === 'number' && !isNaN(metrics.adSpend) ? metrics.adSpend : 0,
      adSpendGrowth: typeof metrics.adSpendGrowth === 'number' && !isNaN(metrics.adSpendGrowth) ? metrics.adSpendGrowth : 0,
      impressions: typeof metrics.impressions === 'number' && !isNaN(metrics.impressions) ? metrics.impressions : 0,
      impressionGrowth: typeof metrics.impressionGrowth === 'number' && !isNaN(metrics.impressionGrowth) ? metrics.impressionGrowth : 0,
      clicks: typeof metrics.clicks === 'number' && !isNaN(metrics.clicks) ? metrics.clicks : 0,
      clickGrowth: typeof metrics.clickGrowth === 'number' && !isNaN(metrics.clickGrowth) ? metrics.clickGrowth : 0,
      conversions: typeof metrics.conversions === 'number' && !isNaN(metrics.conversions) ? metrics.conversions : 0,
      conversionGrowth: typeof metrics.conversionGrowth === 'number' && !isNaN(metrics.conversionGrowth) ? metrics.conversionGrowth : 0,
      ctr: typeof metrics.ctr === 'number' && !isNaN(metrics.ctr) ? metrics.ctr : 0,
      ctrGrowth: typeof metrics.ctrGrowth === 'number' && !isNaN(metrics.ctrGrowth) ? metrics.ctrGrowth : 0,
      cpc: typeof metrics.cpc === 'number' && !isNaN(metrics.cpc) ? metrics.cpc : 0,
      cpcLink: typeof metrics.cpcLink === 'number' && !isNaN(metrics.cpcLink) ? metrics.cpcLink : 0,
      costPerResult: typeof metrics.costPerResult === 'number' && !isNaN(metrics.costPerResult) ? metrics.costPerResult : 0,
      cprGrowth: typeof metrics.cprGrowth === 'number' && !isNaN(metrics.cprGrowth) ? metrics.cprGrowth : 0,
      roas: typeof metrics.roas === 'number' && !isNaN(metrics.roas) ? metrics.roas : 0,
      roasGrowth: typeof metrics.roasGrowth === 'number' && !isNaN(metrics.roasGrowth) ? metrics.roasGrowth : 0,
      frequency: typeof metrics.frequency === 'number' && !isNaN(metrics.frequency) ? metrics.frequency : 0,
        budget: typeof metrics.budget === 'number' && !isNaN(metrics.budget) ? metrics.budget : 0,
      reach: typeof metrics.reach === 'number' && !isNaN(metrics.reach) ? metrics.reach : 0,
        dailyData: Array.isArray(metrics.dailyData) ? metrics.dailyData as DailyDataItem[] : [] as DailyDataItem[]
      };
    } catch (error) {
      console.error("Error creating safe metrics object:", error);
      // Return a default object if there was an error
      return createDefaultMetricsData();
    }
  }, [metrics]);
  
  const [metaData, setMetaData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string>("7d")
  const [topCampaigns, setTopCampaigns] = useState<any[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [cachedCampaigns, setCachedCampaigns] = useState<any[]>([])
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metricsData, setMetricsData] = useState<MetricsDataType>(() => {
    // Initialize with zeros to prevent flashing all-time data
    return {
      adSpend: 0,
      adSpendGrowth: 0,
      impressions: 0,
      impressionGrowth: 0,
      clicks: 0,
      clickGrowth: 0,
      conversions: 0,
      conversionGrowth: 0,
      ctr: 0,
      ctrGrowth: 0,
      cpc: 0,
      costPerResult: 0,
      cprGrowth: 0,
      roas: 0,
      roasGrowth: 0,
      frequency: 0,
      budget: 0,
      reach: 0,
      dailyData: []
    };
  });

  // Loading states - add more granular control
  const [isDateChangeLoading, setIsDateChangeLoading] = useState<boolean>(false);
  const [initialLoadStarted, setInitialLoadStarted] = useState<boolean>(false);
  
  // Add this after the loading states to ensure widget visibility during loading
  const showLoadingPlaceholder = loading && !initialLoadStarted;

  // Refs to track component mount state
  const isMounted = useRef<boolean>(true);
  const isFetching = useRef<boolean>(false);
  const lastFetchedDates = useRef<{from?: string, to?: string}>({});
  const initialLoadComplete = useRef<boolean>(false);
  const dateRangeRef = useRef(dateRange);

  // Add this state near the other state declarations
  const [showDebugControls, setShowDebugControls] = useState(false);

  // Add this function to toggle debug controls
  const toggleDebugControls = () => {
    setShowDebugControls(prev => !prev);
  };

  // Add a useEffect to save campaigns to localStorage cache when available
  useEffect(() => {
    if (campaigns && campaigns.length > 0) {
      try {
        localStorage.setItem(`meta-campaigns-${brandId}`, JSON.stringify(campaigns));
        setCachedCampaigns(campaigns);
      } catch (e) {
        console.error("Error caching campaigns:", e);
      }
    }
  }, [campaigns, brandId]);

  // Add a useEffect to load cached campaigns from localStorage on mount
  useEffect(() => {
    if (brandId) {
      try {
        const cached = localStorage.getItem(`meta-campaigns-${brandId}`);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          setCachedCampaigns(parsedCache);
        }
      } catch (e) {
        console.error("Error loading cached campaigns:", e);
      }
    }
  }, [brandId]);

  // Check if we have data to display - with improved type safety
  const hasData = () => {
    // More robust check that ensures metrics is an object
    // and has valid numeric properties before trying to use them
    return (
      typeof metrics === 'object' && 
      metrics !== null &&
      'adSpend' in metrics &&
      typeof metrics.adSpend === 'number' && 
      !isNaN(metrics.adSpend) &&
      'impressions' in metrics &&
      typeof metrics.impressions === 'number' && 
      !isNaN(metrics.impressions) &&
      'clicks' in metrics &&
      typeof metrics.clicks === 'number' && 
      !isNaN(metrics.clicks)
    )
  }

  // Initialize metricsData using safeMetrics on mount and when metrics changes
  useEffect(() => {
    if (!metrics || typeof metrics !== 'object') {
      // Handle case when metrics is null or undefined
      // Set default values but don't crash
      try {
        // Only set default metrics if we don't already have data
        if (!metricsData.adSpend && !metricsData.clicks && !metricsData.impressions) {
          setMetricsData(createDefaultMetricsData());
        }
      } catch (e) {
        console.error("Error setting default metrics:", e);
      }
      return;
    }
    
    // Set metrics from our sanitized object to ensure it's fully initialized
    try {
      // First check if safeMetrics exists and is an object
      if (!safeMetrics || typeof safeMetrics !== 'object') {
        console.error("safeMetrics is not a valid object");
        return;
      }
      
      // Create a local object starting with current values to prevent flickering
      const safeData = {...metricsData};
      
      // Only update properties if they exist and are valid in safeMetrics
      if (typeof safeMetrics.adSpend === 'number' && !isNaN(safeMetrics.adSpend)) 
        safeData.adSpend = safeMetrics.adSpend;
      if (typeof safeMetrics.adSpendGrowth === 'number' && !isNaN(safeMetrics.adSpendGrowth)) 
        safeData.adSpendGrowth = safeMetrics.adSpendGrowth;
      if (typeof safeMetrics.impressions === 'number' && !isNaN(safeMetrics.impressions)) 
        safeData.impressions = safeMetrics.impressions;
      if (typeof safeMetrics.impressionGrowth === 'number' && !isNaN(safeMetrics.impressionGrowth)) 
        safeData.impressionGrowth = safeMetrics.impressionGrowth;
      if (typeof safeMetrics.clicks === 'number' && !isNaN(safeMetrics.clicks)) 
        safeData.clicks = safeMetrics.clicks;
      if (typeof safeMetrics.clickGrowth === 'number' && !isNaN(safeMetrics.clickGrowth)) 
        safeData.clickGrowth = safeMetrics.clickGrowth;
      if (typeof safeMetrics.conversions === 'number' && !isNaN(safeMetrics.conversions)) 
        safeData.conversions = safeMetrics.conversions;
      if (typeof safeMetrics.conversionGrowth === 'number' && !isNaN(safeMetrics.conversionGrowth)) 
        safeData.conversionGrowth = safeMetrics.conversionGrowth;
      if (typeof safeMetrics.ctr === 'number' && !isNaN(safeMetrics.ctr)) 
        safeData.ctr = safeMetrics.ctr;
      if (typeof safeMetrics.ctrGrowth === 'number' && !isNaN(safeMetrics.ctrGrowth)) 
        safeData.ctrGrowth = safeMetrics.ctrGrowth;
      if (typeof safeMetrics.cpc === 'number' && !isNaN(safeMetrics.cpc)) 
        safeData.cpc = safeMetrics.cpc;
      if (typeof safeMetrics.cpcLink === 'number' && !isNaN(safeMetrics.cpcLink)) 
        safeData.cpcLink = safeMetrics.cpcLink;
      if (typeof safeMetrics.costPerResult === 'number' && !isNaN(safeMetrics.costPerResult)) 
        safeData.costPerResult = safeMetrics.costPerResult;
      if (typeof safeMetrics.cprGrowth === 'number' && !isNaN(safeMetrics.cprGrowth)) 
        safeData.cprGrowth = safeMetrics.cprGrowth;
      if (typeof safeMetrics.roas === 'number' && !isNaN(safeMetrics.roas)) 
        safeData.roas = safeMetrics.roas;
      if (typeof safeMetrics.roasGrowth === 'number' && !isNaN(safeMetrics.roasGrowth)) 
        safeData.roasGrowth = safeMetrics.roasGrowth;
      if (typeof safeMetrics.frequency === 'number' && !isNaN(safeMetrics.frequency)) 
        safeData.frequency = safeMetrics.frequency;
      if (typeof safeMetrics.budget === 'number' && !isNaN(safeMetrics.budget)) 
        safeData.budget = safeMetrics.budget;
      if (typeof safeMetrics.reach === 'number' && !isNaN(safeMetrics.reach)) 
        safeData.reach = safeMetrics.reach;
      if (Array.isArray(safeMetrics.dailyData) && safeMetrics.dailyData.length > 0) 
        safeData.dailyData = safeMetrics.dailyData as DailyDataItem[];
      
      // Now update the state with our safe data object
      setMetricsData(safeData);
    } catch (error) {
      console.error("Error updating metrics state:", error);
      // On error, keep existing data instead of resetting to defaults
    }
  }, [metrics, safeMetrics]);

  // Replace the above effect with a simpler one that only runs on mount to load campaigns
  useEffect(() => {
    // Only fetch campaigns on initial mount if we have a brand ID
    if (brandId && campaigns.length === 0 && !isLoadingCampaigns) {
      setIsLoadingCampaigns(true);
      fetchCampaigns().finally(() => {
        isFetching.current = false;
      });
    }
  }, [brandId]); // Only depend on brandId to prevent repeated calls

  // Function to fetch Meta campaigns data
  const fetchCampaigns = async (forceRefresh = false) => {
    if (!brandId) return [];
    
    // Generate a unique ID for this fetch request
    const fetchId = Date.now();
    
    // Check if a fetch is already in progress - critical to prevent loops
    if (isMetaFetchInProgress() && !forceRefresh) {
      console.log(`[MetaTab] ⚠️ Fetch already in progress, skipping redundant fetch (fetchId: ${fetchId})`);
      return [];
    }
    
    // Check if the campaigns data is already cached and dates haven't changed
    const fromDate = dateRange?.from?.toISOString().split('T')[0];
    const toDate = dateRange?.to?.toISOString().split('T')[0];
    
    // Skip fetch if we already have data for this date range and it's not a forced refresh
    if (!forceRefresh && campaigns.length > 0 && lastFetchedDates.current.from === fromDate && lastFetchedDates.current.to === toDate) {
      console.log(`[MetaTab] 🔄 Using cached campaign data for date range: ${fromDate} to ${toDate} (fetchId: ${fetchId})`);
      return campaigns;
    }
    
    // Try to acquire a fetch lock
    if (!acquireMetaFetchLock(fetchId)) {
      console.log(`[MetaTab] ⛔ Failed to acquire fetch lock, skipping fetch (fetchId: ${fetchId})`);
      return [];
    }
    
    // Only show loading indicator if it's a manual refresh or there are no campaigns yet
    if (forceRefresh || campaigns.length === 0) {
      setIsLoadingCampaigns(true);
    }
    
    if (forceRefresh) {
      setIsRefreshing(true);
    }
    
    // Log the fetch request
    console.log(`[MetaTab] 🔍 Fetching campaigns (fetchId: ${fetchId}, forceRefresh: ${forceRefresh})`);
    
    try {
      let url = `/api/meta/campaigns?brandId=${brandId}`;
      
      // Add forceRefresh parameter if needed
      if (forceRefresh) {
        url += `&forceRefresh=true`;
      }
      
      // Add date range parameters if available
      if (dateRange?.from && dateRange?.to) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        const toDate = dateRange.to.toISOString().split('T')[0];
        url += `&from=${fromDate}&to=${toDate}`;
        
        console.log(`[MetaTab] Fetching campaigns with date range: ${fromDate} to ${toDate} (fetchId: ${fetchId})`);
      } else {
        console.log(`[MetaTab] Fetching campaigns without date range (fetchId: ${fetchId})`);
      }
      
      // Create an AbortController to cancel the request if needed
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout
      
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          cache: 'no-cache', // Avoid browser cache
          headers: {
            'x-fetch-id': fetchId.toString() // Help debug with request ID
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch campaign data (status ${response.status})`);
      }
      
      const data = await response.json();
        
        // Only update state if component is still mounted
        if (!isMounted.current) {
          console.log(`[MetaTab] Component unmounted, not updating state (fetchId: ${fetchId})`);
          return data.campaigns || [];
        }
        
        // Check if the response data looks valid
        if (!data.campaigns || !Array.isArray(data.campaigns)) {
          console.warn(`[MetaTab] Invalid campaign data received (fetchId: ${fetchId})`);
          return [];
        }
        
        // Format and set the campaigns data
        const formattedCampaigns = formatCampaigns(data.campaigns);
        
        // Compare with existing data to avoid unnecessary state updates
        const existingCampaignsJson = JSON.stringify(campaigns);
        const newCampaignsJson = JSON.stringify(formattedCampaigns);
        
        if (existingCampaignsJson !== newCampaignsJson) {
          console.log(`[MetaTab] Campaign data changed, updating state (fetchId: ${fetchId})`);
          setCampaigns(formattedCampaigns);
          setCachedCampaigns(formattedCampaigns); // Cache for reuse
          
          // Update the lastFetchedDates ref with current date range
          if (dateRange?.from && dateRange?.to) {
            lastFetchedDates.current = {
              from: dateRange.from.toISOString().split('T')[0],
              to: dateRange.to.toISOString().split('T')[0]
            };
            console.log(`[MetaTab] Updated lastFetchedDates to: ${JSON.stringify(lastFetchedDates.current)}`);
          }
        } else {
          console.log(`[MetaTab] Campaign data unchanged, skipping update (fetchId: ${fetchId})`);
        }
        
        setLastRefresh(new Date());
        
        // If it was a manual refresh, show a success notification
        if (forceRefresh) {
          // Show success toast using sonner toast
          toast.success("Campaigns refreshed", {
            description: `Successfully refreshed ${data.campaigns.length} campaigns`
          });
        }
        
        return data.campaigns;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if ((error as Error).name === 'AbortError') {
          console.log(`[MetaTab] Fetch aborted (fetchId: ${fetchId})`);
          return [];
        }
        
        throw error; // Re-throw for outer catch
      }
    } catch (error: unknown) {
      console.error(`[MetaTab] Error fetching campaigns (fetchId: ${fetchId}):`, error);
      setError("Failed to load campaign data. Please try again.");
      
      // Show error toast only on manual refresh
      if (forceRefresh) {
        toast.error("Error refreshing campaigns", {
          description: "Failed to refresh campaign data. Please try again."
        });
      }
      
      return [];
    } finally {
      // Always hide the loading state
      setIsLoadingCampaigns(false);
      setIsRefreshing(false);
      
      // Always release the lock
      releaseMetaFetchLock(fetchId);
      
      console.log(`[MetaTab] Campaign fetch complete (fetchId: ${fetchId})`);
    }
  };

    async function fetchMetaData() {
    // Don't make API calls if the block flags are set
    if (window._blockMetaApiCalls || window._disableAutoMetaFetch) {
      console.log("Blocking Meta API call - auto fetch disabled or component unmounted");
      return;
    }
    
    if (!brandId) return;
    
    // Set loading states but don't reset metrics data when loading
    setLoading(true);
    setIsDateChangeLoading(true);
    setError(null);
    
    // Mark that initial load has been started
    setInitialLoadStarted(true);
    
    // Create a local variable to track if component is still mounted
    let isMounted = true;
    
    try {
      // Format date range correctly to ensure proper filtering
      let fromDate = dateRange?.from;
      let toDate = dateRange?.to;
      
      // Check if we have a valid date range before proceeding
      if (!fromDate && !toDate) {
        console.log("No date range provided, aborting fetch");
        setError("Invalid date range");
        setLoading(false);
        setIsDateChangeLoading(false);
        return;
      }
      
      // Detect special presets - improve detection mechanism
      const isYesterdayPreset = (dateRange as any)?._preset === 'yesterday' || 
                              (fromDate && toDate && 
                               isSameDay(fromDate, toDate) && 
                               isYesterday(fromDate));
      
      const isToday = (dateRange as any)?._preset === 'today';
      const isCustomRange = !isYesterdayPreset && !isToday;

      const params = new URLSearchParams({
        brandId: brandId as string,
        strict_date_range: 'true',  // Always enforce strict date handling
        bypass_cache: 'true',       // Always bypass cache for fresh data
        date_debug: 'true',         // Enable date debugging
        refresh: 'true'             // Force refresh every time to prevent stale data
      });
      
      // Handle special presets with explicit date determination
      if (isYesterdayPreset) {
        // For yesterday preset, use exact date match with local timezone
        const yesterdayStr = getYesterdayLocalDateString();
        
        // CRITICAL: Set exactly the same date for both from and to
        params.append('from', yesterdayStr);
        params.append('to', yesterdayStr); // Same date for both
        params.append('preset', 'yesterday'); // Add explicit preset marker
        
        console.log(`Using yesterday preset with exact date: ${yesterdayStr}`);
        
        // Force log to troubleshoot
        console.warn(`YESTERDAY ONLY: Fetching data only for ${yesterdayStr}`);
      } 
      else if (isToday) {
        // For today preset, use today's date only with local timezone
        const todayStr = getCurrentLocalDateString();
        params.append('from', todayStr);
        params.append('to', todayStr); // Same date for both
        params.append('preset', 'today');
        console.log(`Using today preset with exact date: ${todayStr}`);
      }
      else if (fromDate) {
        // For normal date ranges, use local date strings
        const fromStr = dateToLocalDateString(fromDate);
        params.append('from', fromStr);
        
        if (toDate) {
          const toStr = dateToLocalDateString(toDate);
          params.append('to', toStr);
        }
      }
      
      // Prevent flash of old data by clearing metrics before API call for specific presets
      if (isYesterdayPreset || isToday) {
        // Reset metrics to prevent flash of old data when switching between presets
        setMetricsData({
          adSpend: 0,
          adSpendGrowth: 0,
          impressions: 0,
          impressionGrowth: 0,
          clicks: 0,
          clickGrowth: 0,
          conversions: 0,
          conversionGrowth: 0,
          ctr: 0,
          ctrGrowth: 0,
          cpc: 0,
          costPerResult: 0,
          cprGrowth: 0,
          roas: 0,
          roasGrowth: 0,
          frequency: 0,
          budget: 0,
          reach: 0,
          dailyData: []
        });
      }
      
      console.log(`Fetching Meta data with params:`, Object.fromEntries(params.entries()));
      
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Create cleanup handler
      const cleanup = () => {
        isMounted = false;
        controller.abort();
      };
      
      // Set timeout to prevent request hanging
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          controller.abort();
          setError("Request timed out. Please try again.");
          setLoading(false);
          setIsDateChangeLoading(false);
        }
      }, 30000);
      
      // Retry logic to ensure data loads correctly
      let retryCount = 0;
      const maxRetries = 2;
      let response = null;
      let responseData = null;
      
      while (retryCount <= maxRetries && isMounted) {
        try {
          // Add retry identifier to params
          if (retryCount > 0) {
            params.set('retry', retryCount.toString());
            console.log(`Retry attempt ${retryCount} for Meta data`);
          }
          
          response = await fetch(`/api/metrics/meta?${params.toString()}`, { 
            signal,
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch Meta data: ${response.status}`);
          }
          
          responseData = await response.json();
          
          // Additional validation for yesterday preset to ensure we only have yesterday's data
          if (isYesterdayPreset && responseData && responseData.dailyData) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            // Validate that all daily data points are from yesterday only
            const hasNonYesterdayData = responseData.dailyData.some((dataPoint: any) => 
              dataPoint.date !== yesterdayStr
            );
            
            if (hasNonYesterdayData) {
              console.warn("Received data contains non-yesterday dates for yesterday preset");
              
              // Filter to only include yesterday data
              responseData.dailyData = responseData.dailyData.filter((dataPoint: any) => 
                dataPoint.date === yesterdayStr
              );
              
              console.log(`Filtered daily data to only include ${yesterdayStr}`);
            }
          }
          
          // Check if we have valid data or if we should retry
          const hasAnyData = responseData && (
            responseData.adSpend > 0 || 
            responseData.impressions > 0 || 
            responseData.clicks > 0 ||
            (Array.isArray(responseData.dailyData) && responseData.dailyData.length > 0)
          );
          
          // For today preset, we may have zeros, which is legitimate - don't retry
          if (hasAnyData || isToday) {
            break; // We have valid data, exit retry loop
          }
          
          // For yesterday and custom ranges, if we got zeros, retry
          if ((isYesterdayPreset || isCustomRange) && !hasAnyData && retryCount < maxRetries) {
            console.log(`No data received for ${isYesterdayPreset ? 'yesterday' : 'custom range'}, retrying...`);
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            continue;
          }
          
          // If we've exhausted retries or got legitimate zeros, break
          break;
          
        } catch (error) {
          console.error(`Error in fetch attempt ${retryCount}:`, error);
          if (retryCount < maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          } else {
            throw error; // Re-throw after max retries
          }
        }
      }
      
      clearTimeout(timeoutId);
      
      if (!isMounted) {
        return cleanup;
      }
      
      if (!responseData) {
        throw new Error("Failed to fetch Meta data after retries");
      }
      
      // Validate date range in response
      if (responseData._dateRange) {
        const responseFrom = new Date(responseData._dateRange.from);
        const responseTo = new Date(responseData._dateRange.to);
        const requestedFrom = new Date(params.get('from') || '');
        const requestedTo = new Date(params.get('to') || '');
        
        if (responseFrom.getTime() !== requestedFrom.getTime() || 
            responseTo.getTime() !== requestedTo.getTime()) {
          console.warn("Date range mismatch:", {
            requested: { from: requestedFrom, to: requestedTo },
            received: { from: responseFrom, to: responseTo }
          });
          toast.warning("Data range mismatch", {
            description: "The data received doesn't match the requested date range.",
            duration: 4000
          });
          setLoading(false);
          setIsDateChangeLoading(false);
          return cleanup;
        }
      }
      
      // Skip update if we got all zeros and no daily data (unless first load or Today preset)
      const hasRealData = responseData.adSpend > 0 || 
                         responseData.impressions > 0 || 
                         responseData.clicks > 0 || 
                         (Array.isArray(responseData.dailyData) && responseData.dailyData.length > 0);
                           
      if (!hasRealData && metricsData.adSpend > 0 && !isToday) {
        // For today and yesterday, zero data might be legitimate
        if (!isYesterdayPreset && !isToday) {
          toast.warning("No Meta data available", {
            description: "No data found for the selected date range.",
            duration: 4000
          });
        } else {
          // For yesterday and today, show more specific message
          toast.info(`No ${isYesterdayPreset ? 'yesterday' : 'today'}'s data`, {
            description: `No Meta ad data found for ${isYesterdayPreset ? 'yesterday' : 'today'}.`,
            duration: 4000
          });
        }
        setLoading(false);
        setIsDateChangeLoading(false);
        return cleanup;
      }

      // Log the data we received for debugging
      console.log(`Received Meta data:`, {
        adSpend: responseData.adSpend,
        impressions: responseData.impressions,
        clicks: responseData.clicks,
        dailyDataLength: responseData.dailyData?.length || 0,
        preset: isYesterdayPreset ? 'yesterday' : isToday ? 'today' : 'custom'
      });

      // Update metrics with validated data
      setMetricsData({
        adSpend: responseData.adSpend ?? 0,
        adSpendGrowth: responseData.adSpendGrowth ?? 0,
        impressions: responseData.impressions ?? 0,
        impressionGrowth: responseData.impressionGrowth ?? 0,
        clicks: responseData.clicks ?? 0,
        clickGrowth: responseData.clickGrowth ?? 0,
        conversions: responseData.conversions ?? 0,
        conversionGrowth: responseData.conversionGrowth ?? 0,
        ctr: responseData.ctr ?? 0,
        ctrGrowth: responseData.ctrGrowth ?? 0,
        cpc: responseData.cpc ?? 0,
        costPerResult: responseData.costPerResult ?? 0,
        cprGrowth: responseData.cprGrowth ?? 0,
        roas: responseData.roas ?? 0,
        roasGrowth: responseData.roasGrowth ?? 0,
        frequency: responseData.frequency ?? 0,
        budget: responseData.budget ?? 0,
        reach: responseData.reach ?? 0,
        dailyData: Array.isArray(responseData.dailyData) ? responseData.dailyData : []
      });
      
      setLoading(false);
      setIsDateChangeLoading(false);
      
      return cleanup;
    } catch (error) {
      console.error("Error fetching Meta data:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch Meta data");
      setLoading(false);
      setIsDateChangeLoading(false);
    }
  }

  // Add a separate effect to manually load Meta data when this component mounts
  useEffect(() => {
    if (brandId && !window._disableAutoMetaFetch) {
      console.log("Manually triggering Meta data load on component mount");
      
      // Add a small delay to ensure we load after the initial render
      setTimeout(() => {
        // Preload data with forced parameters to ensure it always loads on first try
        const isYesterdayPreset = (dateRange as any)?._preset === 'yesterday' || 
                               (dateRange?.from && dateRange?.to && 
                                isSameDay(dateRange.from, dateRange.to) && 
                                isYesterday(dateRange.from));
                                
        if (isYesterdayPreset) {
          console.log("INITIAL LOAD: Yesterday preset detected, using direct data loading");
          
          // Use a more direct approach for yesterday data to avoid any caching issues
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          const forcedParams = new URLSearchParams({
            brandId: brandId,
            from: yesterdayStr,
            to: yesterdayStr,
            preset: 'yesterday',
            strict_date_range: 'true',
            bypass_cache: 'true',
            refresh: 'true',
            force_load: 'true'
          });
          
          console.log(`INITIAL LOAD: Force loading yesterday data with params: ${forcedParams.toString()}`);
          
          // Directly fetch the data
          (async () => {
            try {
              const response = await fetch(`/api/metrics/meta?${forcedParams.toString()}`, {
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache'
                }
              });
              
              if (!response.ok) {
                throw new Error(`Failed to fetch yesterday's data: ${response.status}`);
              }
              
              const data = await response.json();
              
              console.log("INITIAL LOAD: Successfully loaded yesterday's data:", {
                adSpend: data.adSpend,
                impressions: data.impressions,
                clicks: data.clicks,
                dailyData: Array.isArray(data.dailyData) ? data.dailyData.length : 0
              });
              
              // Immediately update the state with the fetched data
              if (data) {
                setMetricsData({
                  adSpend: data.adSpend ?? 0,
                  adSpendGrowth: data.adSpendGrowth ?? 0,
                  impressions: data.impressions ?? 0,
                  impressionGrowth: data.impressionGrowth ?? 0,
                  clicks: data.clicks ?? 0,
                  clickGrowth: data.clickGrowth ?? 0,
                  conversions: data.conversions ?? 0,
                  conversionGrowth: data.conversionGrowth ?? 0,
                  ctr: data.ctr ?? 0,
                  ctrGrowth: data.ctrGrowth ?? 0,
                  cpc: data.cpc ?? 0,
                  cpcLink: data.cpcLink ?? 0,
                  costPerResult: data.costPerResult ?? 0,
                  cprGrowth: data.cprGrowth ?? 0,
                  roas: data.roas ?? 0,
                  roasGrowth: data.roasGrowth ?? 0,
                  frequency: data.frequency ?? 0,
                  budget: data.budget ?? 0,
                  reach: data.reach ?? 0,
                  dailyData: Array.isArray(data.dailyData) ? data.dailyData : []
                });
                setLoading(false);
                initialLoadComplete.current = true;
              }
            } catch (error) {
              console.error("INITIAL LOAD: Error fetching yesterday's data:", error);
              // Fall back to regular fetch
              fetchMetaData();
            }
          })();
        } else {
          // For other date ranges, use the regular fetch
          fetchMetaData();
        }
      }, 100); // Small delay to ensure DOM is ready
    }
  }, [brandId, dateRange]);

  // Add a button to manually fetch data 
  const manuallyLoadData = () => {
    // Create a date range for the last 30 days to ensure we get real data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const currentDateRange = {
      from: startDate,
      to: endDate
    };
    
    // Temporarily allow fetch
    if (window._disableAutoMetaFetch) {
      window._disableAutoMetaFetch = false;
      
      // Completely disable the block flag to ensure request goes through
      window._blockMetaApiCalls = false;
      
      // Use a try-finally to ensure we restore the flags
      try {
        // Create a custom fetch function that uses the current date range
        const fetchWithCurrentDates = async () => {
          // Set loading states but don't reset metrics data when loading
          setLoading(true);
          setIsDateChangeLoading(true);
          setError(null);
          
          // Create a local variable to track if component is still mounted
          let isMounted = true;
          
          try {
            const params = new URLSearchParams({
              brandId: brandId as string
            });
            
            // Use the current date range instead of the global one
            params.append('from', currentDateRange.from.toISOString().split('T')[0]);
            params.append('to', currentDateRange.to.toISOString().split('T')[0]);
            
            // Force metrics fetch regardless of auto-fetch settings
            params.append('bypass_cache', 'true');
            params.append('force_load', 'true');
            params.append('debug', 'true');
            
            console.log(`DEBUG: Force fetching Meta data with params: ${params.toString()}`);
            
            const response = await fetch(`/api/metrics/meta?${params.toString()}`, { 
              // Force refresh from network, not cache
              cache: 'no-cache',
              headers: {
                'Cache-Control': 'no-cache'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed to fetch Meta data: ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log("DEBUG: Fetched Meta data:", JSON.stringify({
              adSpend: data.adSpend,
              impressions: data.impressions,
              clicks: data.clicks,
              roas: data.roas,
              dailyData: Array.isArray(data.dailyData) ? data.dailyData.length : 0
            }));
            
            // Update metrics state with the data we received
      setMetricsData({
              adSpend: data.adSpend ?? 0,
              adSpendGrowth: data.adSpendGrowth ?? 0,
              impressions: data.impressions ?? 0,
              impressionGrowth: data.impressionGrowth ?? 0,
              clicks: data.clicks ?? 0,
              clickGrowth: data.clickGrowth ?? 0,
              conversions: data.conversions ?? 0,
              conversionGrowth: data.conversionGrowth ?? 0,
              ctr: data.ctr ?? 0,
              ctrGrowth: data.ctrGrowth ?? 0,
              cpc: data.cpc ?? 0,
              costPerResult: data.costPerResult ?? 0,
              cprGrowth: data.cprGrowth ?? 0,
              roas: data.roas ?? 0,
              roasGrowth: data.roasGrowth ?? 0,
              frequency: data.frequency ?? 0,
              budget: data.budget ?? 0,
              reach: data.reach ?? 0,
              dailyData: Array.isArray(data.dailyData) ? data.dailyData : []
            });
            
            // Log the values we just set to help with debugging
            console.log("DEBUG: Updated metrics data:", JSON.stringify({
              adSpend: data.adSpend,
              impressions: data.impressions,
              clicks: data.clicks,
              roas: data.roas
            }));

            if (isMounted) {
              setLoading(false);
              setIsDateChangeLoading(false);
            }
          } catch (error) {
            console.error('DEBUG: Error fetching Meta data:', error);
            
            if (isMounted) {
              setError(error instanceof Error ? error.message : 'An error occurred');
              setLoading(false);
              setIsDateChangeLoading(false);
            }
          }
        };
        
        // Call our custom fetch function
        fetchWithCurrentDates();
    } finally {
        // Wait a bit before restoring the settings to ensure the request completes
        setTimeout(() => {
          window._disableAutoMetaFetch = true;
          window._blockMetaApiCalls = true;
        }, 2000);
      }
    } else {
      // If auto fetch is enabled, just use the standard function
      fetchMetaData();
    }
  };

  // Function to force clear and re-sync Meta data
  const refreshMetaData = async () => {
    if (!brandId) return
    
    setIsSyncing(true)
    try {
      // First, clear existing data
      const clearResponse = await fetch(`/api/meta/clear-data?brandId=${brandId}`, {
        method: 'POST'
      })
      
      if (!clearResponse.ok) {
        throw new Error(`Failed to clear Meta data: ${clearResponse.status}`)
      }
      
      // Now trigger a new sync
      const syncResponse = await fetch(`/api/meta/sync?brandId=${brandId}`, {
        method: 'POST'
      })
      
      if (!syncResponse.ok) {
        throw new Error(`Failed to sync Meta data: ${syncResponse.status}`)
      }
      
      toast.success("Meta data refreshed successfully. Reloading page...")
      
      // Reload the page to show new data
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (err) {
      console.error("Error refreshing Meta data:", err)
      toast.error("Failed to refresh Meta data. Please try again.")
    } finally {
      setIsSyncing(false)
    }
  }

  // Function to run diagnostics on the Meta connection
  const runDiagnostics = async () => {
    if (!brandId) return
    
    try {
      const response = await fetch(`/api/meta/diagnose?brandId=${brandId}`)
      if (!response.ok) {
        throw new Error(`Failed to run diagnostics: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Meta connection diagnostics:', data)
      
      // Format the diagnostic data as a readable string
      let diagnosticInfo = `
============ META CONNECTION DIAGNOSTICS ============\n
Connection Status: ${data.connection?.status || 'Unknown'}\n
Connection ID: ${data.connection?.id || 'Unknown'}\n
Created: ${data.connection?.created_at ? new Date(data.connection.created_at).toLocaleString() : 'Unknown'}\n
\n---- AD ACCOUNTS ----\n`

      if (data.accounts?.data?.length > 0) {
        data.accounts.data.forEach((account: any, index: number) => {
          diagnosticInfo += `\nAccount ${index + 1}:\n`
          diagnosticInfo += `Name: ${account.name}\n`
          diagnosticInfo += `ID: ${account.id}\n`
          diagnosticInfo += `Status: ${account.account_status === 1 ? 'Active' : 'Inactive'}\n`
        })
      } else {
        diagnosticInfo += 'No ad accounts found.\n'
      }
      
      diagnosticInfo += '\n---- CAMPAIGNS ----\n'
      
      if (data.campaigns?.data?.length > 0) {
        data.campaigns.data.forEach((campaign: any, index: number) => {
          diagnosticInfo += `\nCampaign ${index + 1}:\n`
          diagnosticInfo += `Name: ${campaign.name}\n`
          diagnosticInfo += `Status: ${campaign.status}\n`
          diagnosticInfo += `Objective: ${campaign.objective}\n`
          diagnosticInfo += `Created: ${campaign.created_time ? new Date(campaign.created_time).toLocaleString() : 'Unknown'}\n`
        })
      } else {
        diagnosticInfo += 'No campaigns found. You need to create at least one campaign in Meta Ads Manager.\n'
      }
      
      diagnosticInfo += '\n---- DATABASE DATA ----\n'
      diagnosticInfo += `Data in meta_ad_insights: ${data.existing_data?.has_data ? 'Yes' : 'No'}\n`
      
      diagnosticInfo += '\n---- RECOMMENDATION ----\n'
      if (!data.campaigns?.data?.length) {
        diagnosticInfo += 'Create an active campaign in Meta Ads Manager to generate data.\n'
        diagnosticInfo += 'Even with a very small budget ($1/day) or a paused campaign that ran briefly, you should see data.\n'
      } else if (data.campaigns?.data?.length > 0 && data.campaigns.data.every((c: any) => c.status !== 'ACTIVE')) {
        diagnosticInfo += 'You have campaigns, but none are active. Activate a campaign to generate data.\n'
      }
      
      showDiagnosticDialog(diagnosticInfo, data)
      
      toast.success("Diagnostics completed successfully")
    } catch (err) {
      console.error("Error running Meta diagnostics:", err)
      toast.error("Failed to run diagnostics. Please try again.")
    }
  }

  // Function to test fetch Meta data (dry run)
  const testFetchMetaData = async () => {
    if (!brandId) return
    
    try {
      toast.info("Fetching Meta data in test mode...")
      
      const response = await fetch(`/api/meta/sync?brandId=${brandId}&dryRun=true`, {
        method: 'POST'
      })
      
        if (!response.ok) {
          throw new Error(`Failed to fetch Meta data: ${response.status}`)
        }
        
        const data = await response.json()
      console.log('Meta data test fetch result:', data)
      
      if (data.success && data.insights && data.insights.length > 0) {
        let insightsInfo = `
============ META TEST FETCH RESULTS ============\n
Successfully fetched ${data.count} ads/insights.
\n
This data would be synced to your dashboard in a real sync operation.
\n`

        // Show a sample of the insights (first 5)
        insightsInfo += '\n---- SAMPLE INSIGHTS DATA ----\n'
        
        const sampleInsights = data.insights.slice(0, 5)
        sampleInsights.forEach((insight: any, index: number) => {
          insightsInfo += `\nInsight ${index + 1}:\n`
          insightsInfo += `Campaign: ${insight.campaign_name}\n`
          insightsInfo += `Ad: ${insight.ad_name}\n`
          insightsInfo += `Spend: $${parseFloat(insight.spend || 0).toFixed(2)}\n`
          insightsInfo += `Impressions: ${insight.impressions}\n`
          insightsInfo += `Clicks: ${insight.clicks}\n`
          
          // Show conversions if available
          const conversions = insight.actions?.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')
          if (conversions) {
            insightsInfo += `Conversions: ${conversions.value}\n`
          }
        })
        
        insightsInfo += '\n---- CONCLUSION ----\n'
        insightsInfo += 'Your Meta account is working correctly and returning data.\n'
        insightsInfo += 'Use the "Sync Now" button to populate this data into your dashboard.\n'
        
        showDiagnosticDialog(insightsInfo)
        toast.success("Test fetch completed successfully")
      } else {
        let message = `
============ META TEST FETCH RESULTS ============\n
No insights data was returned from Meta.
\n
This could be because:
- You don't have any active campaigns
- You haven't spent any money on ads recently
- Your campaigns are in draft mode
\n
Try creating at least one active campaign in Meta Ads Manager.
`
        showDiagnosticDialog(message)
        toast.info("No data found in Meta account")
      }
    } catch (err) {
      console.error("Error testing Meta data fetch:", err)
      toast.error("Failed to test fetch Meta data. Please try again.")
    }
  }

  // Helper function to show diagnostic dialog
  const showDiagnosticDialog = (content: string, data?: any) => {
    const dialogElement = document.createElement('div')
    dialogElement.style.position = 'fixed'
    dialogElement.style.zIndex = '1000'
    dialogElement.style.top = '0'
    dialogElement.style.left = '0'
    dialogElement.style.width = '100%'
    dialogElement.style.height = '100%'
    dialogElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
    dialogElement.style.display = 'flex'
    dialogElement.style.justifyContent = 'center'
    dialogElement.style.alignItems = 'center'
    
    const dialogContent = document.createElement('div')
    dialogContent.style.backgroundColor = '#222'
    dialogContent.style.border = '1px solid #444'
    dialogContent.style.borderRadius = '8px'
    dialogContent.style.padding = '20px'
    dialogContent.style.maxWidth = '800px'
    dialogContent.style.maxHeight = '80vh'
    dialogContent.style.overflow = 'auto'
    dialogContent.style.position = 'relative'
    
    const closeButton = document.createElement('button')
    closeButton.innerHTML = '✕'
    closeButton.style.position = 'absolute'
    closeButton.style.top = '10px'
    closeButton.style.right = '10px'
    closeButton.style.background = 'none'
    closeButton.style.border = 'none'
    closeButton.style.color = '#999'
    closeButton.style.fontSize = '20px'
    closeButton.style.cursor = 'pointer'
    closeButton.onclick = () => {
      document.body.removeChild(dialogElement)
    }
    
    const title = document.createElement('h3')
    title.textContent = 'Meta Connection Diagnostics'
    title.style.marginTop = '0'
    title.style.marginBottom = '15px'
    title.style.color = '#fff'
    
    const pre = document.createElement('pre')
    pre.textContent = content
    pre.style.whiteSpace = 'pre-wrap'
    pre.style.fontSize = '14px'
    pre.style.color = '#ddd'
    pre.style.backgroundColor = '#1a1a1a'
    pre.style.padding = '10px'
    pre.style.borderRadius = '4px'
    pre.style.maxHeight = '500px'
    pre.style.overflow = 'auto'
    
    // Add buttons if we have data
    if (data && data.accounts?.data?.length > 0) {
      const buttonContainer = document.createElement('div')
      buttonContainer.style.display = 'flex'
      buttonContainer.style.gap = '10px'
      buttonContainer.style.marginTop = '15px'
      
      const testFetchButton = document.createElement('button')
      testFetchButton.textContent = 'Test Fetch Data'
      testFetchButton.style.backgroundColor = '#4a7edd'
      testFetchButton.style.color = 'white'
      testFetchButton.style.border = 'none'
      testFetchButton.style.padding = '8px 12px'
      testFetchButton.style.borderRadius = '4px'
      testFetchButton.style.cursor = 'pointer'
      testFetchButton.onclick = () => {
        document.body.removeChild(dialogElement)
        testFetchMetaData()
      }
      
      const helpButton = document.createElement('button')
      helpButton.textContent = 'Setup Help'
      helpButton.style.backgroundColor = '#555'
      helpButton.style.color = 'white'
      helpButton.style.border = 'none'
      helpButton.style.padding = '8px 12px'
      helpButton.style.borderRadius = '4px'
      helpButton.style.cursor = 'pointer'
      helpButton.onclick = () => {
        window.open('/help/meta-setup', '_blank')
      }
      
      buttonContainer.appendChild(testFetchButton)
      buttonContainer.appendChild(helpButton)
      dialogContent.appendChild(buttonContainer)
    }
    
    dialogContent.appendChild(closeButton)
    dialogContent.appendChild(title)
    dialogContent.appendChild(pre)
    dialogElement.appendChild(dialogContent)
    
    document.body.appendChild(dialogElement)
  }

  // Add a maximum timeout for loading states to prevent infinite spinning
  useEffect(() => {
    // Set a maximum loading time for any widget
    const timeoutId = setTimeout(() => {
      // Force all loading states to false after 15 seconds
      if (loading) {
        setLoading(false);
      }
      if (isDateChangeLoading) {
        setIsDateChangeLoading(false);
      }
      if (isLoadingCampaigns) {
        setIsLoadingCampaigns(false);
      }
    }, 15000); // 15 second maximum loading time

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loading, isDateChangeLoading, isLoadingCampaigns]);

  // Add a function to patch the global fetch method to block Meta API calls
  const patchFetch = () => {
    // Store the original fetch function
    const originalFetch = window.fetch;
    
    // Replace fetch with our patched version
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      // Convert input to string for checking
      const url = input.toString();
      
      // Check if the request is for the Meta API
      if (url.includes('/api/metrics/meta')) {
        console.log('Blocking Meta API call:', url);
        // Return a resolved promise with an empty response
        return Promise.resolve(new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      
      // For all other requests, pass through to the original fetch
      return originalFetch(input, init);
    };
    
    // Return a function to restore the original fetch
    return () => {
      window.fetch = originalFetch;
    };
  };

  // Add a cleanup function to cancel any pending requests and prevent memory leaks
  useEffect(() => {
    // This will run on component mount
    // Set a ref to track component mount status
    const isMounted = { current: true };
    
    // Clear the block flag when component mounts
    window._blockMetaApiCalls = false;
    
    // Store the function to restore the original fetch
    let restoreFetch: (() => void) | null = null;
    
    // Return cleanup function that runs on unmount
    return () => {
      isMounted.current = false;
      // Cancel any pending fetch operations
      isFetching.current = false;
      
      // Set a global flag to block all Meta API calls
      window._blockMetaApiCalls = true;
      
      // Patch the fetch function to block Meta API calls
      restoreFetch = patchFetch();
      
      // Ensure we restore the fetch after some time (in case user navigates back)
      setTimeout(() => {
        if (restoreFetch) {
          restoreFetch();
          console.log('Restored original fetch function');
        }
      }, 5000); // Keep patched for 5 seconds
      
      // Clear any timeouts that might be pending
      if (window._metaTimeouts && Array.isArray(window._metaTimeouts)) {
        window._metaTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
        window._metaTimeouts = [];
      }
      
      console.log("MetaTab unmounted - cleanup complete");
    };
  }, []); // Empty dependency array means this only runs on mount/unmount
  
  // Helper function to safely set timeouts that clean up on unmount
  const safeSetTimeout = (callback: () => void, delay: number): ReturnType<typeof setTimeout> => {
    // Initialize the global timeout array if it doesn't exist
    if (!window._metaTimeouts) {
      window._metaTimeouts = [];
    }
    
    // Create the timeout and store its ID
    const timeoutId = setTimeout(() => {
      // Remove this timeout ID from the array
      if (window._metaTimeouts) {
        window._metaTimeouts = window._metaTimeouts.filter(id => id !== timeoutId);
      }
      // Run the callback
      callback();
    }, delay);
    
    // Add the timeout ID to the array
    window._metaTimeouts.push(timeoutId);
    
    return timeoutId;
  };

  // Show a loading spinner when initialDataLoad is true
  if (initialDataLoad) {
    return (
      <div className="flex items-center justify-center p-12">
        <Activity className="h-8 w-8 animate-spin text-gray-400 mr-3" />
        <span className="text-gray-300">Loading Meta Ads data...</span>
      </div>
    )
  }

  // Transform daily data for the line chart - use useMemo to prevent recalculation on every render
  const dailyTrendData = useMemo(() => {
    if (!metricsData || 
        typeof metricsData !== 'object' || 
        !metricsData.dailyData || 
        !Array.isArray(metricsData.dailyData) || 
        metricsData.dailyData.length === 0) {
      // Return empty array instead of logging
      return []
    }
    
    try {
    // Filter based on selected time frame
      let filteredData = [...metricsData.dailyData].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    
    if (selectedTimeFrame === "7d") {
      filteredData = filteredData.slice(-7)
    } else if (selectedTimeFrame === "30d") {
      filteredData = filteredData.slice(-30)
    } else if (selectedTimeFrame === "90d") {
      filteredData = filteredData.slice(-90)
    }
    
    return filteredData.map((item: DailyDataItem) => {
      // Ensure that item exists and has the required properties
      if (!item) return { date: '', spend: 0, roas: 0 }
      
      // Safely extract properties with fallbacks
      const date = typeof item.date === 'string' ? item.date : ''
      const spend = typeof item.spend === 'number' && !isNaN(item.spend) ? item.spend : 0
      const roas = typeof item.roas === 'number' && !isNaN(item.roas) ? item.roas : 0
      
      return {
        date: date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        spend,
        roas
      }
    }).filter(item => item.date !== '') // Remove items with invalid dates
    } catch (error) {
      // Keep this console.error as it's only triggered on actual errors, not during normal renders
      console.error("Error processing daily trend data:", error);
      return []; // Return empty array on error
    }
  }, [metricsData, selectedTimeFrame]); // Only recalculate when these dependencies change

  // Fix the calculations in processMetaData function by improving comparisons
  const calculateGrowth = useCallback((data: DailyDataItem[], metric: string): number => {
    if (!data || data.length < 2) return 0;
    
    // Sort data by date ascending
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Split into two equal periods
    const halfLength = Math.floor(sortedData.length / 2);
    const firstPeriodData = sortedData.slice(0, halfLength);
    const secondPeriodData = sortedData.slice(halfLength);
    
    // Calculate totals for each period
    const firstTotal = firstPeriodData.reduce((sum, item) => {
      const value = typeof item[metric] === 'number' ? item[metric] as number : 0;
      return sum + value;
    }, 0);
    
    const secondTotal = secondPeriodData.reduce((sum, item) => {
      const value = typeof item[metric] === 'number' ? item[metric] as number : 0;
      return sum + value;
    }, 0);
    
    // Calculate growth percentage with protection against division by zero
    if (firstTotal === 0) {
      return secondTotal > 0 ? 100 : 0;
    }
    
    return ((secondTotal - firstTotal) / firstTotal) * 100;
  }, []);

  // Initial data load on component mount
  useEffect(() => {
    if (!brandId) return;
    
    // Flag to track if component is unmounted during fetch
    let isComponentMounted = true;
    
    const loadInitialData = async () => {
      if (!dateRange || !dateRange.from) {
        console.log("No date range for initial Meta data load, skipping");
        setLoading(false);
        return;
      }
      
      // Prevent double fetching during initial load
      if (isFetching.current) {
        console.log("Already fetching Meta data, skipping duplicate fetch");
        return;
      }
      
      console.log("Initial Meta data load starting");
      isFetching.current = true;
      
      try {
        // Clear any existing data first to prevent flashing
        setMetricsData({
          adSpend: 0,
          adSpendGrowth: 0,
          impressions: 0,
          impressionGrowth: 0,
          clicks: 0,
          clickGrowth: 0,
          conversions: 0,
          conversionGrowth: 0,
          ctr: 0,
          ctrGrowth: 0,
          cpc: 0,
          costPerResult: 0,
          cprGrowth: 0,
          roas: 0,
          roasGrowth: 0,
          frequency: 0,
          budget: 0,
          reach: 0,
          dailyData: []
        });
        
        // Fetch data with a retry mechanism
        await fetchMetaData();
        
        // Check if we actually got data back, if not, retry with more aggressive parameters
        if (isComponentMounted && metricsData && 
          (metricsData.adSpend === 0 && metricsData.impressions === 0 && metricsData.clicks === 0)) {
          
          console.log("Initial data fetch returned empty results, retrying with forced load...");
          
          // Short delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Force a retry with bypass_cache and refresh parameters
          const forceParams = new URLSearchParams({
            brandId: brandId,
            bypass_cache: 'true',
            refresh: 'true',
            force_load: 'true',
            date_debug: 'true'
          });
          
          // Add date range parameters
          if (dateRange?.from) {
            const formattedFromDate = new Date(dateRange.from);
            formattedFromDate.setHours(0, 0, 0, 0);
            forceParams.append('from', formattedFromDate.toISOString().split('T')[0]);
            
            // If yesterday preset, enforce same date for both
            const isYesterdayPreset = (dateRange as any)?._preset === 'yesterday' || 
                                     (isYesterday(dateRange.from));
            
            if (isYesterdayPreset) {
              forceParams.append('to', formattedFromDate.toISOString().split('T')[0]);
              forceParams.append('preset', 'yesterday');
              console.log("Force loading yesterday data with exact date match");
            } else if (dateRange?.to) {
              const formattedToDate = new Date(dateRange.to);
              formattedToDate.setHours(23, 59, 59, 999);
              forceParams.append('to', formattedToDate.toISOString().split('T')[0]);
            }
          }
          
          console.log(`Force fetching data with params: ${forceParams.toString()}`);
          
          try {
            const response = await fetch(`/api/metrics/meta?${forceParams.toString()}`, {
              cache: 'no-store', 
              headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
              throw new Error(`Failed forced fetch: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Forced data fetch response:", {
              adSpend: data.adSpend,
              impressions: data.impressions,
              clicks: data.clicks,
              dailyData: Array.isArray(data.dailyData) ? data.dailyData.length : 0
            });
            
            // Update state with the forced data
            if (isComponentMounted && data) {
              setMetricsData({
                adSpend: data.adSpend ?? 0,
                adSpendGrowth: data.adSpendGrowth ?? 0,
                impressions: data.impressions ?? 0,
                impressionGrowth: data.impressionGrowth ?? 0,
                clicks: data.clicks ?? 0,
                clickGrowth: data.clickGrowth ?? 0,
                conversions: data.conversions ?? 0,
                conversionGrowth: data.conversionGrowth ?? 0,
                ctr: data.ctr ?? 0,
                ctrGrowth: data.ctrGrowth ?? 0,
                cpc: data.cpc ?? 0,
                costPerResult: data.costPerResult ?? 0,
                cprGrowth: data.cprGrowth ?? 0,
                roas: data.roas ?? 0,
                roasGrowth: data.roasGrowth ?? 0,
                frequency: data.frequency ?? 0,
                budget: data.budget ?? 0,
                reach: data.reach ?? 0,
                dailyData: Array.isArray(data.dailyData) ? data.dailyData : []
              });
            }
          } catch (retryError) {
            console.error("Error during forced data fetch:", retryError);
          }
        }
        
        // Only set initialLoadComplete if component is still mounted
        if (isComponentMounted) {
          initialLoadComplete.current = true;
        }
      } catch (error) {
        console.error("Error during initial Meta data load:", error);
        if (isComponentMounted) {
          setError(error instanceof Error ? error.message : "Failed to load Meta data");
        }
      } finally {
        if (isComponentMounted) {
          setLoading(false);
          isFetching.current = false;
        }
      }
    };
    
    // Load data on mount
    loadInitialData();
    
    // Update dateRangeRef for future change detection
    dateRangeRef.current = dateRange;
    
    // Cleanup function
    return () => {
      isComponentMounted = false;
      window._blockMetaApiCalls = true; // Block API calls during unmount
    };
  }, [brandId, dateRange]);
  
  // === REPLACE THE ENTIRE DATE RANGE EFFECT WITH THIS FIXED VERSION ===
  
  // Add a request ID counter to help track requests
  const requestIdCounter = useRef(0);
  // Add a flag to track if we're already processing a date range change
  const isProcessingDateChange = useRef(false);
  // Create a stable ref for the last processed date range to prevent loops
  const lastProcessedDateRange = useRef<{from?: string, to?: string}>({});
  
  // Effect to handle date range changes with loop protection
  useEffect(() => {
    // Skip if missing required data
    if (!dateRange || !brandId) return;
    
    // Skip if component is unmounting
    if (!isMounted.current) return;
    
    // Skip if we're still doing initial load - important to prevent loops
    if (loading && !initialLoadComplete.current) return;
    
    // Extract stable date strings for comparison
    const newFrom = dateRange.from?.toISOString().split('T')[0];
    const newTo = dateRange.to?.toISOString().split('T')[0];
    const oldFrom = lastProcessedDateRange.current.from;
    const oldTo = lastProcessedDateRange.current.to;
    
    // CRITICAL: Skip if fetch is already in progress globally
    if (isMetaFetchInProgress()) {
      console.log(`[MetaTab] 🚫 Date range effect: Global fetch lock active, skipping`);
      return;
    }
    
    // CRITICAL: If we're already processing a date change, skip this effect run completely
    if (isProcessingDateChange.current) {
      console.log(`[MetaTab] Already processing date change, skipping duplicate effect run`);
      return;
    }
    
    // If nothing changed based on stable string comparisons, return early
    if (newFrom === oldFrom && newTo === oldTo) {
      console.log(`[MetaTab] Date range truly unchanged (${newFrom} to ${newTo}), skipping`);
      return;
    }
    
    // Generate a unique request ID for this date change to track it in logs
    const currentRequestId = ++requestIdCounter.current;
    
    console.log(`[MetaTab] 🔄 Date range changed (requestId: ${currentRequestId})`);
    console.log(`[MetaTab] From: ${oldFrom || 'undefined'} → ${newFrom || 'undefined'}`);
    console.log(`[MetaTab] To: ${oldTo || 'undefined'} → ${newTo || 'undefined'}`);
    
    // Set processing flag to block nested effect runs
    isProcessingDateChange.current = true;
    
    // Set loading state immediately to give user feedback
    setIsDateChangeLoading(true);
    
    // IMPORTANT: Immediately update the ref to prevent future reruns for the same date
    lastProcessedDateRange.current = {
      from: newFrom,
      to: newTo
    };
    
    // Use a longer timeout to prevent rapid successive calls
    const fetchWithLoopProtection = () => {
      // Cancel any existing timeouts to prevent overlapping requests
      if (window._metaTimeouts) {
        window._metaTimeouts.forEach(timeout => clearTimeout(timeout));
        window._metaTimeouts = [];
      }
      
      // Final check before proceeding - in case something changed during the timeout
      if (!isMounted.current || isMetaFetchInProgress()) {
        console.log(`[MetaTab] 🛑 Date range effect: Fetch blocked by global lock or component unmounted`);
        isProcessingDateChange.current = false;
        setIsDateChangeLoading(false);
        return;
      }
      
      // Only fetch if component still mounted and not already fetching
      if (isMounted.current && !isFetching.current) {
        console.log(`[MetaTab] 🚀 Executing date range fetch (requestId: ${currentRequestId})`);
        
        // Start fetch and set flags
        isFetching.current = true;
        
        // Use promise-based approach for better error handling
        const fetchData = async () => {
          try {
            // Acquire a global fetch lock with our request ID
            if (!acquireMetaFetchLock(`date-range-${currentRequestId}`)) {
              console.log(`[MetaTab] Failed to acquire global lock for date range change (requestId: ${currentRequestId})`);
              return;
            }
            
            // Log the request to help with debugging
            console.log(`[MetaTab] Starting campaign fetch (requestId: ${currentRequestId})`);
            
            // Capture current campaigns to restore if fetch fails
            const previousCampaignsSnapshot = [...campaigns];
            
            // Execute the fetch with the specific date range
            await fetchCampaigns(false);
            
            // Get metrics data only after campaigns are retrieved
      if (isMounted.current) {
              await fetchMetaData();
            }
          } catch (error) {
            console.error(`[MetaTab] Error fetching data for date range (requestId: ${currentRequestId}):`, error);
          } finally {
            // Release the global fetch lock
            releaseMetaFetchLock(`date-range-${currentRequestId}`);
            
            // Clear all flags and loading states
            if (isMounted.current) {
              // Reset loading states
              setIsDateChangeLoading(false);
              
              // Wait a short time before allowing new requests to prevent immediate re-triggers
              setTimeout(() => {
                isProcessingDateChange.current = false;
                isFetching.current = false;
                console.log(`[MetaTab] ✅ Date range fetch complete (requestId: ${currentRequestId})`);
              }, 50);
            } else {
              // Component unmounted, just clean up flags
              isProcessingDateChange.current = false;
              isFetching.current = false;
            }
          }
        };
        
        // Execute the data fetch
        fetchData();
      } else {
        // Not mounted or already fetching, just clean up
        isProcessingDateChange.current = false;
        console.log(`[MetaTab] 🛑 Skipped date range fetch - component unmounted or already fetching (requestId: ${currentRequestId})`);
      }
    };
    
    // Use a timeout to debounce rapid changes
    const timeoutId = setTimeout(fetchWithLoopProtection, 300);
    
    // Track the timeout for cleanup
    if (window._metaTimeouts) {
      window._metaTimeouts.push(timeoutId);
    } else {
      window._metaTimeouts = [timeoutId];
    }
    
    // Cleanup function
    return () => {
      if (timeoutId) {
      clearTimeout(timeoutId);
      }
    };
  }, [dateRange, brandId, campaigns]);

  // Add an effect to handle data refresh that maintains date ranges

  // Add a new useEffect after the initial load one that handles refreshes
  useEffect(() => {
    // Only run if there's already data loaded and this is a refresh
    if (isRefreshingData && brandId) {
      console.log("Handling Meta data refresh with current date range:");
      if (dateRange) {
        console.log(`Date range: ${dateRange.from?.toISOString().split('T')[0]} to ${dateRange.to?.toISOString().split('T')[0]}`);
      } else {
        console.log("No date range set");
      }
      
      // Save the current metrics data to avoid flicker
      const currentMetrics = { ...metricsData };
      
      try {
        // Don't show loading state on refresh to avoid flickering
        const refreshData = async () => {
          try {
            // Check if this is a yesterday preset
            const isYesterdayPreset = (dateRange as any)?._preset === 'yesterday' || 
                                      (dateRange?.from && dateRange?.to && 
                                       isSameDay(dateRange.from, dateRange.to) && 
                                       isYesterday(dateRange.from));
                                       
            // CRITICAL: Create appropriate parameters based on date range type
            const forceParams = new URLSearchParams({
              brandId: brandId as string,
              refresh: 'true',
              bypass_cache: 'true',
              strict_date_range: 'true'
            });
            
            // Special handling for yesterday preset to ensure exact date match
            if (isYesterdayPreset) {
              // Use exactly yesterday's date for both from and to
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];
              
              // Set the same exact date for both parameters to ensure single-day data
              forceParams.append('from', yesterdayStr);
              forceParams.append('to', yesterdayStr);
              forceParams.append('preset', 'yesterday');
              
              console.log(`META REFRESH: Using yesterday preset with exact same date for both: ${yesterdayStr}`);
            }
            // Regular date range handling - ensure we respect the exact range
            else if (dateRange?.from) {
              const formattedFromDate = new Date(dateRange.from);
              formattedFromDate.setHours(0, 0, 0, 0);
              const fromStr = formattedFromDate.toISOString().split('T')[0];
              forceParams.append('from', fromStr);
              
              if (dateRange?.to) {
                const formattedToDate = new Date(dateRange.to);
                formattedToDate.setHours(23, 59, 59, 999);
                const toStr = formattedToDate.toISOString().split('T')[0];
                
                // If from and to are the same date, use the same date for both
                if (isSameDay(formattedFromDate, formattedToDate)) {
                  forceParams.append('to', fromStr);
                  console.log(`META REFRESH: Single day selection detected - using same date for both: ${fromStr}`);
                } else {
                  forceParams.append('to', toStr);
                }
              }
            }
            
            console.log(`META REFRESH: Exact params used: ${forceParams.toString()}`);
            
            const response = await fetch(`/api/metrics/meta?${forceParams.toString()}`, {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed to refresh Meta data: ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log("META REFRESH: Received data for refresh:", JSON.stringify({
              adSpend: data.adSpend,
              impressions: data.impressions,
              clicks: data.clicks,
              roas: data.roas,
              dateRange: data._dateRange,
              dailyData: Array.isArray(data.dailyData) ? data.dailyData.length : 0
            }));
            
            // Validate if the data is for the right date range before updating
            if (data._dateRange) {
              const dataMatchesRequest = 
                (!isYesterdayPreset || 
                 (data._dateRange.from === data._dateRange.to)) && // For yesterday, ensure single day
                (!dateRange?.from || data._dateRange.from === forceParams.get('from')) &&
                (!dateRange?.to || data._dateRange.to === forceParams.get('to'));
                
              console.log(`META REFRESH: Data matches requested date range: ${dataMatchesRequest}`);
              
              // Extra validation for yesterday preset
              if (isYesterdayPreset && data._dateRange.from !== data._dateRange.to) {
                console.warn("META REFRESH: Yesterday data spans multiple days - not updating");
                return; // Don't update if we get multi-day data for yesterday preset
              }
              
              if (dataMatchesRequest) {
                // If data has real values and matches our date range, update
                if (data.adSpend > 0 || data.impressions > 0 || data.clicks > 0 || 
                    (Array.isArray(data.dailyData) && data.dailyData.length > 0)) {
                      
                  console.log("META REFRESH: Updating with new data");
                  // Update metrics state with the data we received
                  setMetricsData({
                    adSpend: data.adSpend ?? currentMetrics.adSpend,
                    adSpendGrowth: data.adSpendGrowth ?? currentMetrics.adSpendGrowth,
                    impressions: data.impressions ?? currentMetrics.impressions,
                    impressionGrowth: data.impressionGrowth ?? currentMetrics.impressionGrowth,
                    clicks: data.clicks ?? currentMetrics.clicks,
                    clickGrowth: data.clickGrowth ?? currentMetrics.clickGrowth,
                    conversions: data.conversions ?? currentMetrics.conversions,
                    conversionGrowth: data.conversionGrowth ?? currentMetrics.conversionGrowth,
                    ctr: data.ctr ?? currentMetrics.ctr,
                    ctrGrowth: data.ctrGrowth ?? currentMetrics.ctrGrowth,
                    cpc: data.cpc ?? currentMetrics.cpc,
                    cpcLink: data.cpcLink ?? currentMetrics.cpcLink,
                    costPerResult: data.costPerResult ?? currentMetrics.costPerResult,
                    cprGrowth: data.cprGrowth ?? currentMetrics.cprGrowth,
                    roas: data.roas ?? currentMetrics.roas,
                    roasGrowth: data.roasGrowth ?? currentMetrics.roasGrowth,
                    frequency: data.frequency ?? currentMetrics.frequency,
                    budget: data.budget ?? currentMetrics.budget,
                    reach: data.reach ?? currentMetrics.reach,
                    dailyData: Array.isArray(data.dailyData) && data.dailyData.length > 0 ? 
                      data.dailyData : currentMetrics.dailyData
                  });
                } else {
                  console.log("META REFRESH: No meaningful data in response, keeping existing data");
                }
              } else {
                console.log("META REFRESH: Received data doesn't match requested date range, keeping current data");
              }
            } else {
              console.log("META REFRESH: No date range info in response, keeping current data");
            }
          } catch (err) {
            console.error("META REFRESH: Error refreshing Meta data:", err);
            // Keep the current data on error
          }
        };
        
        refreshData();
      } catch (err) {
        console.error("Error in refresh effect:", err);
      }
    }
  }, [isRefreshingData, brandId, dateRange]);

  // Also update the useEffect that handles date range changes
  useEffect(() => {
    // Only fetch data if we have a brand ID and the component is visible
    if (brandId && dateRange && !window._blockMetaApiCalls) {
      console.log("Date range changed, fetching Meta data");
      
      // Only start loading if the tab is visible
      setIsDateChangeLoading(true);
      
      // Set a debounce timer to prevent multiple fetches
      const timer = setTimeout(() => {
        // Check if this is a yesterday preset before fetching
        const isYesterdayPreset = (dateRange as any)?._preset === 'yesterday' || 
                                  (dateRange?.from && dateRange?.to && 
                                  isSameDay(dateRange.from, dateRange.to) && 
                                  isYesterday(dateRange.from));
                                   
        if (isYesterdayPreset) {
          console.log("DATE CHANGE: Yesterday preset detected, using direct data loading");
          
          // Use a more direct approach for yesterday data
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          const directParams = new URLSearchParams({
            brandId: brandId,
            from: yesterdayStr,
            to: yesterdayStr,
            preset: 'yesterday',
            strict_date_range: 'true',
            bypass_cache: 'true',
            refresh: 'true'
          });
          
          console.log(`DATE CHANGE: Loading yesterday data with params: ${directParams.toString()}`);
          
          // Direct fetch for yesterday
          (async () => {
            try {
              const response = await fetch(`/api/metrics/meta?${directParams.toString()}`, {
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache'
                }
              });
              
              if (!response.ok) {
                throw new Error(`Failed to fetch yesterday's data: ${response.status}`);
              }
              
              const data = await response.json();
              
              // Validate the data is for yesterday only
              if (data._dateRange && data._dateRange.from === yesterdayStr && data._dateRange.to === yesterdayStr) {
                console.log("DATE CHANGE: Successfully loaded yesterday's data");
                
                // Update with the fetched data
                setMetricsData({
                  adSpend: data.adSpend ?? 0,
                  adSpendGrowth: data.adSpendGrowth ?? 0,
                  impressions: data.impressions ?? 0,
                  impressionGrowth: data.impressionGrowth ?? 0,
                  clicks: data.clicks ?? 0,
                  clickGrowth: data.clickGrowth ?? 0,
                  conversions: data.conversions ?? 0,
                  conversionGrowth: data.conversionGrowth ?? 0,
                  ctr: data.ctr ?? 0,
                  ctrGrowth: data.ctrGrowth ?? 0,
                  cpc: data.cpc ?? 0,
                  cpcLink: data.cpcLink ?? 0,
                  costPerResult: data.costPerResult ?? 0,
                  cprGrowth: data.cprGrowth ?? 0,
                  roas: data.roas ?? 0,
                  roasGrowth: data.roasGrowth ?? 0,
                  frequency: data.frequency ?? 0,
                  budget: data.budget ?? 0,
                  reach: data.reach ?? 0,
                  dailyData: Array.isArray(data.dailyData) ? data.dailyData : []
                });
              } else {
                console.warn("DATE CHANGE: Received data doesn't match yesterday - falling back to regular fetch");
                fetchMetaData();
              }
            } catch (error) {
              console.error("DATE CHANGE: Error fetching yesterday's data:", error);
              // Fall back to regular fetch
              fetchMetaData();
            } finally {
              setIsDateChangeLoading(false);
            }
          })();
        } else {
          // Regular fetch for other date ranges
          fetchMetaData();
        }
      }, 300);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [dateRange, brandId]);

  // Prevent unnecessary refetches by tracking if dates have changed
  const dateRangeChanged = (oldRange: any, newRange: any) => {
    if (!oldRange || !newRange) return true;
    
    const oldFrom = oldRange.from?.toISOString();
    const oldTo = oldRange.to?.toISOString();
    const newFrom = newRange.from?.toISOString();
    const newTo = newRange.to?.toISOString();
    
    return oldFrom !== newFrom || oldTo !== newTo;
  };

  // Effect to track component mount state
  useEffect(() => {
    isMounted.current = true;
    window._blockMetaApiCalls = false;
    window._disableAutoMetaFetch = false;
    
    return () => {
      isMounted.current = false;
      window._blockMetaApiCalls = true;
      console.log("Meta tab unmounting, blocking API calls");
    };
  }, []);

  // Update the state types to include previous period data
  const [adSpendData, setAdSpendData] = useState({
    value: 0,
    previousValue: 0,
    isLoading: true,
    lastUpdated: null as Date | null
  })
  
  const [roasData, setRoasData] = useState({
    value: 0,
    previousValue: 0,
    isLoading: true,
    lastUpdated: null as Date | null
  })
  
  const [impressionsData, setImpressionsData] = useState({
    value: 0,
    previousValue: 0,
    isLoading: true,
    lastUpdated: null as Date | null
  })
  
  const [clicksData, setClicksData] = useState({
    value: 0,
    previousValue: 0,
    isLoading: true,
    lastUpdated: null as Date | null
  })
  
  // Add state for the new Purchase Conversion Value widget
  const [purchaseValueData, setPurchaseValueData] = useState({
    value: 0,
    previousValue: 0,
    isLoading: true,
    lastUpdated: null as Date | null
  })
  
  // Add state for the new Results widget
  const [resultsData, setResultsData] = useState({
    value: 0,
    previousValue: 0,
    isLoading: true,
    lastUpdated: null as Date | null
  })
  
  // Add state for Cost Per Result widget
  const [costPerResultData, setCostPerResultData] = useState({
    value: 0,
    previousValue: 0,
    isLoading: true,
    lastUpdated: null as Date | null
  })
  
  // Add state for Cost Per Click widget
  const [costPerClickData, setCostPerClickData] = useState({
    value: 0,
    previousValue: 0,
    isLoading: true,
    lastUpdated: null as Date | null
  })
  
  // Add state for CTR (Click-Through Rate) widget
  const [ctrData, setCtrData] = useState({
    value: 0,
    previousValue: 0,
    isLoading: true,
    lastUpdated: null as Date | null
  })
  
  // Add state for reach data
  const [reachData, setReachData] = useState<MetricDataState>({
    value: 0,
    previousValue: 0,
    isLoading: false,
    lastUpdated: null
  })
  
  const [linkClicksData, setLinkClicksData] = useState<MetricDataState>({
    value: 0,
    previousValue: 0,
    isLoading: false,
    lastUpdated: null
  })
  
  // Add budgetData state after linkClicksData
  const [budgetData, setBudgetData] = useState<MetricDataState>({
    value: 0,
    previousValue: 0,
    isLoading: false,
    lastUpdated: null
  })
  
  // Improved helper function to calculate the previous period date range
  const getPreviousPeriodDates = (from: Date, to: Date): { prevFrom: string, prevTo: string } => {
    // Normalize dates to avoid timezone issues - work with dates at the day level only
    const fromNormalized = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toNormalized = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    
    console.log(`Calculating previous dates for range: ${toLocalISODateString(fromNormalized)} to ${toLocalISODateString(toNormalized)}`);
    
    // Case 1: Single day - always compare to the day before
    const isSingleDay = isSameDay(fromNormalized, toNormalized);
    if (isSingleDay) {
      // For a single day view, previous period is always the day before
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

  // Helper function to convert a Date to a consistent ISO date string (YYYY-MM-DD) in local time
  const toLocalISODateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
      const response = await fetch(`/api/metrics/meta/single?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      prevParams.append('metric', 'adSpend')
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
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
      prevParams.append('metric', 'roas')
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
      prevParams.append('metric', 'impressions')
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
      prevParams.append('metric', 'clicks')
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
      prevParams.append('metric', 'purchaseValue')
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
      params.append('metric', 'ctr')
      
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
      prevParams.append('metric', 'ctr')
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/click-through-rate?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      if (!data.error && !prevData.error) {
        setCtrData({
          value: data.value || 0,
          previousValue: prevData.value || 0,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`CTR data fetched directly: ${data.value}, Previous: ${prevData.value}`)
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
      
      // Fetch data for current period
      const response = await fetch(`/api/metrics/meta/single/reach?${params.toString()}`)
      
      // Fetch data for previous period
      const prevParams = new URLSearchParams()
      prevParams.append('brandId', brandId)
      prevParams.append('metric', 'reach')
      prevParams.append('from', prevFrom)
      prevParams.append('to', prevTo)
      const prevResponse = await fetch(`/api/metrics/meta/single/reach?${prevParams.toString()}`)
      
      // Process responses
      const data = await response.json()
      const prevData = await prevResponse.json()
      
      if (!data.error && !prevData.error) {
        setReachData({
          value: data.value || 0,
          previousValue: prevData.value || 0,
          isLoading: false,
          lastUpdated: new Date()
        })
        console.log(`Reach data fetched directly: ${data.value}, Previous: ${prevData.value}`)
      } else {
        console.error("Error fetching Reach data:", data.error || prevData.error)
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
      prevParams.append('metric', 'link_clicks')
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
      fetchBudgetDirectly()
    ])
  }

  // Update the useEffect to call the new fetch functions
  useEffect(() => {
    if (dateRange && dateRange.from && dateRange.to && brandId) {
      console.log("Date range changed, fetching all metrics directly")
      fetchAllMetricsDirectly()
    }
  }, [dateRange, brandId])

  // Add a separate effect for initial load
  useEffect(() => {
    if (dateRange && dateRange.from && dateRange.to && brandId) {
      console.log("Initial load, fetching all metrics directly")
      fetchAllMetricsDirectly()
    }
  }, [])

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
    
    // Set loading states for all widgets
    setAdSpendData(prev => ({ ...prev, isLoading: true }))
    setRoasData(prev => ({ ...prev, isLoading: true }))
    setImpressionsData(prev => ({ ...prev, isLoading: true }))
    setClicksData(prev => ({ ...prev, isLoading: true }))
    setPurchaseValueData(prev => ({ ...prev, isLoading: true }))
    setResultsData(prev => ({ ...prev, isLoading: true }))
    setCostPerResultData(prev => ({ ...prev, isLoading: true }))
    setCostPerClickData(prev => ({ ...prev, isLoading: true }))
    setCtrData(prev => ({ ...prev, isLoading: true }))
    setReachData(prev => ({ ...prev, isLoading: true }))
    setLinkClicksData(prev => ({ ...prev, isLoading: true }))
    setBudgetData(prev => ({ ...prev, isLoading: true }))
    
    // Set global refreshing state for UI feedback
    setIsManuallyRefreshing(true)
    
    try {
      console.log("Refreshing all metrics directly")
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
        fetchBudgetDirectly()
      ])
      
      // Show success toast
      toast.success("Metrics refreshed successfully")
    } catch (error) {
      console.error("Error refreshing metrics:", error)
      toast.error("Failed to refresh metrics")
    } finally {
      setIsManuallyRefreshing(false)
    }
  }, [dateRange, brandId, 
     fetchAdSpendDirectly, fetchRoasDirectly, fetchImpressionsDirectly, 
     fetchClicksDirectly, fetchPurchaseValueDirectly, fetchResultsDirectly,
     fetchCostPerResultDirectly, fetchCostPerClickDirectly, fetchCtrDirectly,
     fetchReachDirectly, fetchLinkClicksDirectly, fetchBudgetDirectly]);
  
  // Setup auto-refresh on a 5-minute interval
  useEffect(() => {
    // Clear any existing timer first
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }
    
    // Set up a new 5-minute refresh interval
    const timer = setInterval(() => {
      console.log("Auto-refreshing metrics (5-minute interval)")
      refreshAllMetricsDirectly()
    }, 5 * 60 * 1000) // 5 minutes in milliseconds
    
    setRefreshTimer(timer)
    
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
  const handleManualRefresh = () => {
    refreshAllMetricsDirectly()
  }

  // Store a stable reference to the refresh function
  const refreshAllMetricsDirectlyRef = useRef(refreshAllMetricsDirectly);

  // Update the ref when the function changes
  useEffect(() => {
    refreshAllMetricsDirectlyRef.current = refreshAllMetricsDirectly;
  }, [refreshAllMetricsDirectly]);

  // Add a listener for the metaDataRefreshed event from the dashboard
  useEffect(() => {
    // Define the event handler
    const handleMetaDataRefreshed = (event: CustomEvent) => {
      // Check if this event is for our brand
      if (event.detail?.brandId === brandId) {
        console.log("Received metaDataRefreshed event", event.detail);
        
        // If forceRefresh is set to true in the event, force a full refresh
        if (event.detail?.forceRefresh) {
          console.log("Force refresh requested, fetching latest campaigns data");
          
          // Force a fetch from the API to get the most up-to-date data
          fetchCampaigns();
        }
        
        // Always refresh the metrics display
        refreshAllMetricsDirectlyRef.current();
      }
    };

    // Add the event listener
    window.addEventListener('metaDataRefreshed', handleMetaDataRefreshed as EventListener);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('metaDataRefreshed', handleMetaDataRefreshed as EventListener);
    };
  }, [brandId]);

  // Function to manually sync Meta insights data
  const syncMetaInsights = async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      toast.error("Cannot sync data - missing brand ID or date range");
      return;
    }
    
    toast.info("Syncing Meta insights data...", {
      description: "This might take a moment depending on the date range.",
      duration: 5000
    });
    
    setIsManuallyRefreshing(true);
    
    try {
      // Format dates in YYYY-MM-DD format
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      
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
        
        // After successful sync, refresh the data
        refreshMetaData();
      } else {
        throw new Error(result.error || 'Failed to sync Meta insights');
      }
    } catch (error) {
      console.error('Error syncing Meta insights:', error);
      toast.error("Failed to sync Meta insights", {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      });
    } finally {
      setIsManuallyRefreshing(false);
    }
  };

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
    
    setIsLoadingCampaigns(true);
    
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
      setIsLoadingCampaigns(false);
    }
  }, [fetchCampaigns, refreshCampaignAdSetBudgets, refreshMetricsDirectly]);
  
  // Refresh data when date range changes
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
      
      // Step 3: Refresh ad sets data
      await fetch(`/api/meta/update-campaign-budgets?brandId=${triggerBrandId}&forceRefresh=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      
      // Success! Dispatch a custom event to notify any components that might be listening
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('meta-data-refreshed', {
          detail: {
            success: true,
            refreshId,
            timestamp: new Date().toISOString()
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
      const intervalId = setInterval(() => {
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
      }, 5 * 60 * 1000); // 5 minutes in milliseconds
      
      // Clean up the interval when the component unmounts
      return () => {
        clearInterval(intervalId);
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
  const prevDateRangeRef = useRef<{from?: Date, to?: Date}>({});

  // Add a useEffect to log date range changes
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;

    // Compare with previous date range to avoid unnecessary refreshes
    const fromChanged = !areDatesEqual(prevDateRangeRef.current.from, dateRange.from);
    const toChanged = !areDatesEqual(prevDateRangeRef.current.to, dateRange.to);
    
    // Only refresh if dates actually changed
    if (!fromChanged && !toChanged) {
      return;
    }
    
    console.log("[MetaTab] Date range changed, refreshing data");
    
    // Update the reference for next comparison
    prevDateRangeRef.current = {
      from: dateRange.from,
      to: dateRange.to
    };
    
    const fromDateStr = dateRange.from.toISOString().split('T')[0]; 
    const toDateStr = dateRange.to.toISOString().split('T')[0];
    
    // If the date is today, log specifically that we're looking at today's data
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (fromDateStr === todayStr && toDateStr === todayStr) {
      console.log(`[MetaTab] Today's date detected: ${todayStr}`);
    }
    
    // Use a debounce to avoid multiple rapid fetches
    const fetchId = Date.now();
    console.log(`[MetaTab] 🔐 Acquired fetch lock for fetchId: ${fetchId}`);
    
    if (acquireMetaFetchLock(fetchId)) {
      // First show loading state
      setIsLoadingCampaigns(true);
      
      // Fetch campaigns data with the new date range
      fetchCampaigns()
        .then(() => {
          console.log('[MetaTab] Campaigns refreshed after date range change');
          
          // Also refresh metric data
          if (typeof refreshMetricsDirectly === 'function') {
            return refreshMetricsDirectly();
          }
        })
        .then(() => {
          console.log('[MetaTab] Metrics refreshed after date range change');
        })
        .finally(() => {
          releaseMetaFetchLock(fetchId);
          console.log(`[MetaTab] 🔓 Released fetch lock (fetchId: ${fetchId})`);
        });
    } else {
      console.log(`[MetaTab] ⛔ Failed to acquire fetch lock, skipping fetch (fetchId: ${fetchId})`);
    }
  }, [dateRange]);

  return (
    <TooltipProvider>
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
                            onClick={manuallyLoadData}
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
                          
                          {debugMode && (
                            <button
                              onClick={() => {
                                // Force refresh campaigns with debug params
                                const today = new Date().toISOString().split('T')[0];
                                fetch(`/api/meta/campaigns/date-range?brandId=${brandId}&from=${today}&to=${today}&include_all=true&debug=true`)
                                  .then(res => res.json())
                                  .then(data => {
                                    console.log('[DEBUG] Today\'s campaigns data:', data);
                                    toast.info(`Found ${data.campaignsWithData} campaigns with data today`);
                                  })
                                  .catch(err => console.error('Debug fetch error:', err));
                              }}
                              className="px-3 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded-md"
                            >
                              Check Today's Data
                            </button>
                          )}
                          
                          <div className="text-xs text-gray-400">
                            <div>Meta Data Status:</div>
                            <div>Ad Spend: {metricsData.adSpend}</div>
                            <div>ROAS: {metricsData.roas}</div>
                            <div>Impressions: {metricsData.impressions}</div>
                            <div>Clicks: {metricsData.clicks}</div>
                            <div>Loading: {loading ? 'Yes' : 'No'}</div>
                            <div>Auto-Fetch Disabled: {window._disableAutoMetaFetch ? 'Yes' : 'No'}</div>
                            {dateRange?.from && dateRange?.to && (
                              <div className="mt-2 pt-2 border-t border-gray-700">
                                <div>Date Range:</div>
                                <div>From: {dateRange.from.toISOString().split('T')[0]}</div>
                                <div>To: {dateRange.to.toISOString().split('T')[0]}</div>
                                {(() => {
                                  const today = new Date().toISOString().split('T')[0];
                                  const fromStr = dateRange.from.toISOString().split('T')[0];
                                  const toStr = dateRange.to.toISOString().split('T')[0];
                                  
                                  if (fromStr === today && toStr === today) {
                                    return (
                                      <div className="text-green-500 font-bold">
                                        Today's Date Selected!
                          </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

      {/* Header Section with refresh button - Removed as requested */}

                {/* Add a hidden button in the corner to trigger debug mode */}
                <div 
                  className="fixed bottom-4 right-4 w-6 h-6 bg-transparent z-50 cursor-pointer"
                  onClick={toggleDebugControls}
                  title="Toggle debug controls (hidden)"
                ></div>
      
      {/* Meta Connection Status Banner - Removed as requested */}
      
                {/* Meta KPIs - Add failsafe checks to prevent infinite loading */}
      <div className="space-y-4">
        {/* Meta Data Overview Heading */}
        <div className="flex items-center mb-4">
          <LineChart className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold">Meta Data Overview - All Ads Combined</h2>
          <div className="ml-auto">
            <Badge variant="outline" className="bg-gray-900/30 text-gray-400 border-gray-800 px-2">
              Aggregated Metrics
            </Badge>
          </div>
        </div>
        
        {/* Direct DB connection widgets with grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span className="ml-0.5">Ad Spend</span>
              </div>
            }
            value={adSpendData.value}
            data={[]}
            loading={adSpendData.isLoading || isManuallyRefreshing}
            hideChange={true}
            valueFormat="currency"
            prefix="$"
            hideGraph={true}
            previousValue={adSpendData.previousValue}
            previousValueFormat="currency"
            previousValuePrefix="$"
            showPreviousPeriod={true}
            previousPeriodLabel={getPreviousPeriodLabel()}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <span className="ml-0.5">ROAS</span>
              </div>
            }
            value={roasData.value}
            data={[]}
            loading={roasData.isLoading || isManuallyRefreshing}
            hideChange={true}
            valueFormat="number"
            suffix="x"
            hideGraph={true}
            previousValue={roasData.previousValue}
            previousValueFormat="number"
            previousValueSuffix="x"
            showPreviousPeriod={true}
            previousPeriodLabel={getPreviousPeriodLabel()}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-amber-400" />
                <span className="ml-0.5">Impressions</span>
              </div>
            }
            value={impressionsData.value}
            data={[]}
            loading={impressionsData.isLoading || isManuallyRefreshing}
            hideChange={true}
            valueFormat="number"
            hideGraph={true}
            previousValue={impressionsData.previousValue}
            previousValueFormat="number"
            showPreviousPeriod={true}
            previousPeriodLabel={getPreviousPeriodLabel()}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-purple-400" />
                <span className="ml-0.5">Reach</span>
              </div>
            }
            value={reachData.value}
            data={[]}
            loading={reachData.isLoading || isManuallyRefreshing}
            hideChange={true}
            valueFormat="number"
            hideGraph={true}
            previousValue={reachData.previousValue}
            previousValueFormat="number"
            showPreviousPeriod={true}
            previousPeriodLabel={getPreviousPeriodLabel()}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <MousePointer className="h-4 w-4 text-indigo-400" />
                <span className="ml-0.5">Clicks</span>
              </div>
            }
            value={clicksData.value}
            data={[]}
            loading={clicksData.isLoading || isManuallyRefreshing}
            hideChange={true}
            valueFormat="number"
            hideGraph={true}
            previousValue={clicksData.previousValue}
            previousValueFormat="number"
            showPreviousPeriod={true}
            previousPeriodLabel={getPreviousPeriodLabel()}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-purple-400" />
                <span className="ml-0.5">Avg. Purchase Value</span>
              </div>
            }
            value={purchaseValueData.value}
            data={[]}
            loading={purchaseValueData.isLoading || isManuallyRefreshing}
            hideChange={true}
            valueFormat="currency"
            prefix="$"
            hideGraph={true}
            previousValue={purchaseValueData.previousValue}
            previousValueFormat="currency"
            previousValuePrefix="$"
            showPreviousPeriod={true}
            previousPeriodLabel={getPreviousPeriodLabel()}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <Target className="h-4 w-4 text-red-400" />
                <span className="ml-0.5">Results</span>
              </div>
            }
            value={resultsData.value}
            data={[]}
            loading={resultsData.isLoading || isManuallyRefreshing}
            hideChange={true}
            valueFormat="number"
            hideGraph={true}
            previousValue={resultsData.previousValue}
            previousValueFormat="number"
            showPreviousPeriod={true}
            previousPeriodLabel={getPreviousPeriodLabel()}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-orange-400" />
                <span className="ml-0.5">Cost Per Result</span>
              </div>
            }
            value={costPerResultData.value}
            data={[]}
            loading={costPerResultData.isLoading || isManuallyRefreshing}
            hideChange={true}
            valueFormat="currency"
            prefix="$"
            hideGraph={true}
            previousValue={costPerResultData.previousValue}
            previousValueFormat="currency"
            previousValuePrefix="$"
            showPreviousPeriod={true}
            previousPeriodLabel={getPreviousPeriodLabel()}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-teal-400" />
                <span className="ml-0.5">Cost Per Click</span>
              </div>
            }
            value={costPerClickData.value}
            data={[]}
            loading={costPerClickData.isLoading || isManuallyRefreshing}
            hideChange={true}
            valueFormat="currency"
            prefix="$"
            hideGraph={true}
            previousValue={costPerClickData.previousValue}
            previousValueFormat="currency"
            previousValuePrefix="$"
            showPreviousPeriod={true}
            previousPeriodLabel={getPreviousPeriodLabel()}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <MousePointerClick className="h-4 w-4 text-orange-400" />
                <span className="ml-0.5">CTR</span>
              </div>
            }
            value={ctrData.value}
            data={[]}
            loading={ctrData.isLoading || isManuallyRefreshing}
            hideChange={true}
            valueFormat="percentage"
            hideGraph={true}
            previousValue={ctrData.previousValue}
            previousValueFormat="percentage"
            showPreviousPeriod={true}
            previousPeriodLabel={getPreviousPeriodLabel()}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <MousePointer className="h-4 w-4 text-green-400" />
                <span className="ml-0.5">Link Clicks</span>
              </div>
            }
            value={linkClicksData.value}
            data={[]}
            loading={linkClicksData.isLoading || isManuallyRefreshing}
            hideChange={true}
            valueFormat="number"
            hideGraph={true}
            previousValue={linkClicksData.previousValue}
            previousValueFormat="number"
            showPreviousPeriod={true}
            previousPeriodLabel={getPreviousPeriodLabel()}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="ml-0.5">Budget</span>
              </div>
            }
            value={budgetData.value}
            data={[]}
            loading={budgetData.isLoading || isManuallyRefreshing}
            hideChange={true}
            valueFormat="currency"
            hideGraph={true}
            previousValue={budgetData.previousValue}
            previousValueFormat="currency"
            showPreviousPeriod={true}
            previousPeriodLabel={getPreviousPeriodLabel()}
          />
        </div>
      </div>
      
      {/* NEW CAMPAIGN PERFORMANCE SECTION - REPLACES ALL CARDS BELOW THE MAIN METRICS */}
      <div className="space-y-6 mt-6">
        <CampaignWidget 
          brandId={brandId || ''}
          campaigns={campaigns.length > 0 ? campaigns : cachedCampaigns}
          isLoading={isLoadingCampaigns}
          isSyncing={isSyncing}
          dateRange={dateRange}
          onRefresh={fetchCampaigns}
          onSync={async () => {
            toast.loading("Syncing Meta campaigns...", { id: "meta-campaigns-sync" })
            
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
              })
              
              if (response.ok) {
                toast.success("Meta campaigns synced", { id: "meta-campaigns-sync" })
                // Reload campaigns after sync
                fetchCampaigns()
              } else {
                toast.error("Failed to sync Meta campaigns", { id: "meta-campaigns-sync" })
              }
            } catch (error) {
              console.error("Error syncing Meta campaigns:", error)
              toast.error("Error syncing Meta campaigns", { id: "meta-campaigns-sync" })
            }
          }}
        />
      </div>
              </>
            )
          } catch (error) {
            console.error('Error rendering MetaTab:', error);
            // Return a fallback UI in case of rendering errors
            return (
              <div className="p-6 border border-red-800 bg-red-900/10 rounded-lg">
                <h2 className="text-xl font-semibold mb-4 text-red-400">Something went wrong</h2>
                <p className="mb-4">There was an error rendering the Meta dashboard.</p>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="destructive"
                >
                  Reload Page
                </Button>
    </div>
            );
          }
        })()}
      </div>
    </TooltipProvider>
  )
}

// Wrap the component with the error boundary at export
export default withErrorBoundary(MetaTab, {
  onError: (error) => {
    console.error("MetaTab error caught by boundary:", error)
  }
})
