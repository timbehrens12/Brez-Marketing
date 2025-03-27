"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Metrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { 
  LineChart, 
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
  DollarSign, 
  TrendingUp, 
  MousePointer, 
  Activity, 
  Users, 
  BarChart2, 
  ArrowRight, 
  CalendarRange, 
  Percent, 
  BrainCircuit, 
  Info, 
  Loader2,
  RefreshCw,
  Settings,
  Target,
  AlertCircle
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
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import MetaResyncButton from "@/components/meta-resync-button"
import { withErrorBoundary } from '@/components/ui/error-boundary'
import { format } from 'date-fns'

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
  }
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
  const [aiInsights, setAiInsights] = useState<string | null>(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string>("7d")
  const [topCampaigns, setTopCampaigns] = useState<any[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [cachedCampaigns, setCachedCampaigns] = useState<any[]>([])
  const [metricsData, setMetricsData] = useState<MetricsDataType>(createDefaultMetricsData)

  // Add a new state to track date change loading
  const [isDateChangeLoading, setIsDateChangeLoading] = useState(false);

  // Add a flag to prevent concurrent fetches
  const isFetching = useRef(false);

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
  async function fetchCampaigns() {
    // Don't make API calls if the block flags are set
    if (window._blockMetaApiCalls || window._disableAutoMetaFetch) {
      console.log("Blocking Meta campaigns API call - auto fetch disabled or component unmounted");
      return;
    }
    
    if (!brandId) return
    
    // Don't set loading state immediately to prevent flashing UI
    let tempCampaigns = [] as any[];
    
    try {
      const response = await fetch(`/api/analytics/meta/campaigns?brandId=${brandId}`, {
        // Add a signal to abort the request after 10 seconds
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (!response.ok) {
        console.error('Campaign fetch failed with status:', response.status);
        // Don't update the UI with empty data - use cached data instead
        if (cachedCampaigns.length > 0) {
          toast.warning("Using cached campaign data", {
            description: "There was an issue fetching the latest campaign data. Using previously cached data instead.",
            duration: 4000
          });
          // Keep using the cached data but update loading state
          setIsLoadingCampaigns(false);
        }
        return;
      }
      
      const data = await response.json();
      tempCampaigns = data.campaigns || [];
      
      // Only update state if we got valid data
      if (Array.isArray(tempCampaigns)) {
        setCampaigns(tempCampaigns);
        setIsLoadingCampaigns(false);
      }
    } catch (error) {
      console.error('Error fetching Meta campaigns:', error);
      // If there's cached data available, use it
      if (cachedCampaigns.length > 0) {
        toast.warning("Using cached campaign data", {
          description: "There was an issue fetching the latest campaign data. Using previously cached data instead.",
          duration: 4000
        });
        // Keep using the cached data but update loading state
        setIsLoadingCampaigns(false);
      }
    }
  }

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
    
    // Create a local variable to track if component is still mounted
    let isMounted = true;
    
    try {
      // Format date range correctly to ensure proper filtering
      let fromDate = dateRange?.from;
      let toDate = dateRange?.to;
      
      // Detect the special yesterday preset
      const isYesterdayPreset = (dateRange as any)?._preset === 'yesterday';

      // Important: Do not modify the dates for yesterday when handling specific presets
      // This is ensuring only yesterday's data shows without combining today's data
      
      const params = new URLSearchParams({
        brandId: brandId as string
      });
      
      // For yesterday preset, calculate yesterday's date exactly to ensure consistency
      if (isYesterdayPreset) {
        // Always override with server-calculated yesterday
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
        
        console.log(`YESTERDAY OVERRIDE: Forcing yesterday date to ${yesterdayStr} regardless of URL params`);
        
        // Set both from and to to exactly yesterday
        params.append('from', yesterdayStr);
        params.append('to', yesterdayStr);
        params.append('preset', 'yesterday');
        params.append('enforce_single_day', 'true');
      } 
      // Handle normal date ranges
      else {
        if (fromDate) {
          // Ensure from date is set to the beginning of the day
          const formattedFromDate = new Date(fromDate);
          formattedFromDate.setHours(0, 0, 0, 0);
          params.append('from', formattedFromDate.toISOString().split('T')[0]);
        }
        
        if (toDate) {
          // Ensure to date is set to the end of the day
          const formattedToDate = new Date(toDate);
          formattedToDate.setHours(23, 59, 59, 999);
          params.append('to', formattedToDate.toISOString().split('T')[0]);
        }
        
        // Add the preset identifier if it exists (for non-yesterday presets)
        if ((dateRange as any)?._preset) {
          params.append('preset', (dateRange as any)._preset);
        }
      }
      
      // Add parameters to help debugging
      params.append('date_debug', 'true'); 
      params.append('bypass_cache', 'true');
      params.append('force_load', 'true');
      params.append('strict_date_range', 'true'); // Add this to force strict date handling
      
      // Check URL parameters for current date settings
      const urlParams = new URL(window.location.href).searchParams;
      const preset = urlParams.get('preset');
      const isTodayPreset = preset === 'today';
      const isSingleDayPreset = isYesterdayPreset || isTodayPreset;
      
      // Correctly log date range based on preset
      if (isYesterdayPreset) {
        // Calculate yesterday's date to use in the log
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
        
        console.log(`YESTERDAY PRESET: Fetching Meta data for yesterday: ${yesterdayStr}`);
      } else if (isTodayPreset) {
        console.log(`TODAY PRESET: Fetching Meta data for today: ${params.get('from')}`);
      } else {
        // Check if date parameters are the same (single day selection)
        const fromParam = params.get('from');
        const toParam = params.get('to');
        const isSingleDaySelection = fromParam && toParam && fromParam === toParam;
        
        if (isSingleDaySelection) {
          console.log(`SINGLE DAY: Fetching Meta data for specific date: ${fromParam}`);
        } else {
          console.log(`DATE RANGE: Fetching Meta data from ${params.get('from')} to ${params.get('to')}`);
        }
      }
      
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Create cleanup handler that will be returned by the useEffect
      const cleanup = () => {
        isMounted = false;
        controller.abort();
      };
      
      // Set timeout to prevent request hanging indefinitely
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          controller.abort();
          if (isMounted) {
            setError("Request timed out. Please try again.");
            setLoading(false);
            setIsDateChangeLoading(false);
          }
        }
      }, 30000); // 30 second timeout
      
      // Add a maximum wait time for the loading state, even if API never responds
      const maxLoadingTimeout = setTimeout(() => {
        if (isMounted) {
          setLoading(false);
          setIsDateChangeLoading(false);
        }
      }, 20000); // Force loading to end after 20 seconds maximum
      
      const response = await fetch(`/api/metrics/meta?${params.toString()}`, { 
        signal,
        // Force refresh from network, not cache
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      clearTimeout(maxLoadingTimeout);
      
      // Check if component is still mounted before proceeding
      if (!isMounted) {
        return cleanup;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch Meta data: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log("Fetched Meta data:", JSON.stringify({
        adSpend: data.adSpend,
        impressions: data.impressions,
        clicks: data.clicks,
        roas: data.roas,
        dailyData: Array.isArray(data.dailyData) ? data.dailyData.length : 0
      }));
      
      // Check if component is still mounted before updating state
      if (!isMounted) {
        return cleanup;
      }
      
      // Skip update if we got all zeros and no daily data, unless it's the first load
      const hasRealData = data.adSpend > 0 || data.impressions > 0 || data.clicks > 0 || 
                         (Array.isArray(data.dailyData) && data.dailyData.length > 0);
                           
      // If we have a valid response but no actual meta data for the period, 
      // show a toast warning the user instead of resetting metrics to 0
      if (!hasRealData && metricsData.adSpend > 0) {
        toast.warning("No Meta data for period", {
          description: "No Meta ad data found for the selected date range. Showing previous data.",
          duration: 4000
        });
        // Keep the previous metrics but end loading state
        setLoading(false);
        setIsDateChangeLoading(false);
        return cleanup;
      }

      // Update metrics state with the data we received
      setMetricsData({
        adSpend: typeof data.adSpend === 'number' ? parseFloat(data.adSpend.toString()) : 0,
        adSpendGrowth: typeof data.adSpendGrowth === 'number' ? parseFloat(data.adSpendGrowth.toString()) : 0,
        impressions: typeof data.impressions === 'number' ? parseInt(data.impressions.toString(), 10) : 0,
        impressionGrowth: typeof data.impressionGrowth === 'number' ? parseFloat(data.impressionGrowth.toString()) : 0,
        clicks: typeof data.clicks === 'number' ? parseInt(data.clicks.toString(), 10) : 0,
        clickGrowth: typeof data.clickGrowth === 'number' ? parseFloat(data.clickGrowth.toString()) : 0,
        conversions: typeof data.conversions === 'number' ? parseInt(data.conversions.toString(), 10) : 0,
        conversionGrowth: typeof data.conversionGrowth === 'number' ? parseFloat(data.conversionGrowth.toString()) : 0,
        ctr: typeof data.ctr === 'number' ? parseFloat(data.ctr.toString()) : 0,
        ctrGrowth: typeof data.ctrGrowth === 'number' ? parseFloat(data.ctrGrowth.toString()) : 0,
        cpc: typeof data.cpc === 'number' ? parseFloat(data.cpc.toString()) : 0,
        costPerResult: typeof data.costPerResult === 'number' ? parseFloat(data.costPerResult.toString()) : 0,
        cprGrowth: typeof data.cprGrowth === 'number' ? parseFloat(data.cprGrowth.toString()) : 0,
        roas: typeof data.roas === 'number' ? parseFloat(data.roas.toString()) : 0,
        roasGrowth: typeof data.roasGrowth === 'number' ? parseFloat(data.roasGrowth.toString()) : 0,
        frequency: typeof data.frequency === 'number' ? parseFloat(data.frequency.toString()) : 0,
        budget: typeof data.budget === 'number' ? parseFloat(data.budget.toString()) : 0,
        reach: typeof data.reach === 'number' ? parseFloat(data.reach.toString()) : 0,
        dailyData: Array.isArray(data.dailyData) ? data.dailyData : []
      });
      
      // Log the values we just set to help with debugging
      console.log("Updated metrics data:", JSON.stringify({
        adSpend: data.adSpend,
        impressions: data.impressions,
        clicks: data.clicks,
        roas: data.roas
      }));

      setLoading(false);
      setIsDateChangeLoading(false);
      isFetching.current = false;
      
      return cleanup;
    } catch (error) {
      console.error('Error fetching Meta data:', error);
      
      if (isMounted) {
        setError(error instanceof Error ? error.message : 'An error occurred');
        
        // Don't reset metrics data on error - keep displaying what we had
        setLoading(false);
        setIsDateChangeLoading(false);
        isFetching.current = false;
      }
      
      return () => {
        isMounted = false;
      };
    }
  }

  // Add a separate effect to manually load Meta data when this component mounts
  useEffect(() => {
    if (brandId && !window._disableAutoMetaFetch) {
      console.log("Manually triggering Meta data load on component mount");
      fetchMetaData();
    }
  }, [brandId]);

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
              adSpend: typeof data.adSpend === 'number' ? parseFloat(data.adSpend.toString()) : 0,
              adSpendGrowth: typeof data.adSpendGrowth === 'number' ? parseFloat(data.adSpendGrowth.toString()) : 0,
              impressions: typeof data.impressions === 'number' ? parseInt(data.impressions.toString(), 10) : 0,
              impressionGrowth: typeof data.impressionGrowth === 'number' ? parseFloat(data.impressionGrowth.toString()) : 0,
              clicks: typeof data.clicks === 'number' ? parseInt(data.clicks.toString(), 10) : 0,
              clickGrowth: typeof data.clickGrowth === 'number' ? parseFloat(data.clickGrowth.toString()) : 0,
              conversions: typeof data.conversions === 'number' ? parseInt(data.conversions.toString(), 10) : 0,
              conversionGrowth: typeof data.conversionGrowth === 'number' ? parseFloat(data.conversionGrowth.toString()) : 0,
              ctr: typeof data.ctr === 'number' ? parseFloat(data.ctr.toString()) : 0,
              ctrGrowth: typeof data.ctrGrowth === 'number' ? parseFloat(data.ctrGrowth.toString()) : 0,
              cpc: typeof data.cpc === 'number' ? parseFloat(data.cpc.toString()) : 0,
              costPerResult: typeof data.costPerResult === 'number' ? parseFloat(data.costPerResult.toString()) : 0,
              cprGrowth: typeof data.cprGrowth === 'number' ? parseFloat(data.cprGrowth.toString()) : 0,
              roas: typeof data.roas === 'number' ? parseFloat(data.roas.toString()) : 0,
              roasGrowth: typeof data.roasGrowth === 'number' ? parseFloat(data.roasGrowth.toString()) : 0,
              frequency: typeof data.frequency === 'number' ? parseFloat(data.frequency.toString()) : 0,
              budget: typeof data.budget === 'number' ? parseFloat(data.budget.toString()) : 0,
              reach: typeof data.reach === 'number' ? parseFloat(data.reach.toString()) : 0,
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

  const generateAiInsights = async () => {
    setIsLoadingInsights(true)
    try {
      // Check if the metricsData has been initialized with safe values - if not, use empty values
      if (!metricsData || typeof metricsData !== 'object') {
        setAiInsights("No data available to generate insights. Please ensure your Meta account is connected and has active campaigns.")
        return;
      }
      
      // Create a clean data object with default values for all required properties
      const data = {
        adSpend: 0,
        adSpendGrowth: 0,
        roas: 0,
        roasGrowth: 0,
        clicks: 0,
        impressions: 0,
        // Add any other properties needed for insights
      };
      
      // Safely merge in values from metricsData (not metrics) since that's the sanitized state
      if (typeof metricsData.adSpend === 'number' && !isNaN(metricsData.adSpend)) data.adSpend = metricsData.adSpend;
      if (typeof metricsData.adSpendGrowth === 'number' && !isNaN(metricsData.adSpendGrowth)) data.adSpendGrowth = metricsData.adSpendGrowth;
      if (typeof metricsData.roas === 'number' && !isNaN(metricsData.roas)) data.roas = metricsData.roas;
      if (typeof metricsData.roasGrowth === 'number' && !isNaN(metricsData.roasGrowth)) data.roasGrowth = metricsData.roasGrowth;
      if (typeof metricsData.clicks === 'number' && !isNaN(metricsData.clicks)) data.clicks = metricsData.clicks;
      if (typeof metricsData.impressions === 'number' && !isNaN(metricsData.impressions)) data.impressions = metricsData.impressions;
      
      // We would call an AI endpoint here
      // This is a simulated response for now
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Use our safe data object directly (no need for optional chaining now)
      const spendTrend = data.adSpendGrowth > 0 ? "increased" : "decreased"
      const roasTrend = data.roasGrowth > 0 ? "improved" : "declined"
      
      setAiInsights(`Your Meta ad spend has ${spendTrend} by ${Math.abs(data.adSpendGrowth).toFixed(1)}% while your ROAS has ${roasTrend} by ${Math.abs(data.roasGrowth).toFixed(1)}%. Based on your campaign performance, you could improve results by optimizing your targeting for the audiences that generate the highest conversion rates. Consider testing different creative formats, especially video content which is currently performing well on the platform.`)
    } catch (error) {
      console.error("Error generating AI insights:", error)
      setAiInsights("Unable to generate insights at this time. Please try again later.")
    } finally {
      setIsLoadingInsights(false)
    }
  }

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
        <Activity className="h-8 w-8 animate-spin text-blue-500 mr-3" />
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

  // Add a special effect just for initial component mount
  useEffect(() => {
    // Only run once on component mount
    const loadInitialData = async () => {
      // Don't attempt to load if no brand ID
      if (!brandId) return;
      
      console.log("Running initial Meta data load on component mount");
      setLoading(true);
      
      try {
        // Create a date range for the last 30 days to ensure we get real data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        const currentDateRange = {
          from: startDate,
          to: endDate
        };
        
        // Temporary remove block flags to ensure this initial load works
        const originalBlockFlag = window._blockMetaApiCalls;
        const originalDisableFlag = window._disableAutoMetaFetch;
        
        window._blockMetaApiCalls = false;
        window._disableAutoMetaFetch = false;
        
        try {
          // Create a custom fetch function that uses the current date range
          const params = new URLSearchParams({
            brandId: brandId as string
          });
          
          // Use the current date range instead of the global one
          params.append('from', currentDateRange.from.toISOString().split('T')[0]);
          params.append('to', currentDateRange.to.toISOString().split('T')[0]);
          params.append('initial_load', 'true');
          
          console.log(`Initial Meta data load with params: ${params.toString()}`);
          
          const response = await fetch(`/api/metrics/meta?${params.toString()}`, { 
            cache: 'no-store'
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch Meta data: ${response.status}`);
          }
          
          const data = await response.json();
          
          console.log("Initial Meta data load received:", JSON.stringify({
            adSpend: data.adSpend,
            impressions: data.impressions,
            clicks: data.clicks,
            roas: data.roas,
            dailyData: Array.isArray(data.dailyData) ? data.dailyData.length : 0
          }));
          
          // Only update if we got meaningful data
          if (data && (data.adSpend > 0 || data.impressions > 0 || data.clicks > 0)) {
            // Update metrics state with the data we received
            setMetricsData({
              adSpend: typeof data.adSpend === 'number' ? parseFloat(data.adSpend.toString()) : 0,
              adSpendGrowth: typeof data.adSpendGrowth === 'number' ? parseFloat(data.adSpendGrowth.toString()) : 0,
              impressions: typeof data.impressions === 'number' ? parseInt(data.impressions.toString(), 10) : 0,
              impressionGrowth: typeof data.impressionGrowth === 'number' ? parseFloat(data.impressionGrowth.toString()) : 0,
              clicks: typeof data.clicks === 'number' ? parseInt(data.clicks.toString(), 10) : 0,
              clickGrowth: typeof data.clickGrowth === 'number' ? parseFloat(data.clickGrowth.toString()) : 0,
              conversions: typeof data.conversions === 'number' ? parseInt(data.conversions.toString(), 10) : 0,
              conversionGrowth: typeof data.conversionGrowth === 'number' ? parseFloat(data.conversionGrowth.toString()) : 0,
              ctr: typeof data.ctr === 'number' ? parseFloat(data.ctr.toString()) : 0,
              ctrGrowth: typeof data.ctrGrowth === 'number' ? parseFloat(data.ctrGrowth.toString()) : 0,
              cpc: typeof data.cpc === 'number' ? parseFloat(data.cpc.toString()) : 0,
              costPerResult: typeof data.costPerResult === 'number' ? parseFloat(data.costPerResult.toString()) : 0,
              cprGrowth: typeof data.cprGrowth === 'number' ? parseFloat(data.cprGrowth.toString()) : 0,
              roas: typeof data.roas === 'number' ? parseFloat(data.roas.toString()) : 0,
              roasGrowth: typeof data.roasGrowth === 'number' ? parseFloat(data.roasGrowth.toString()) : 0,
              frequency: typeof data.frequency === 'number' ? parseFloat(data.frequency.toString()) : 0,
              budget: typeof data.budget === 'number' ? parseFloat(data.budget.toString()) : 0,
              reach: typeof data.reach === 'number' ? parseFloat(data.reach.toString()) : 0,
              dailyData: Array.isArray(data.dailyData) ? data.dailyData : []
            });
          }
        } finally {
          // Always restore the original flags
          window._blockMetaApiCalls = originalBlockFlag;
          window._disableAutoMetaFetch = originalDisableFlag;
        }
        
        // Also load campaigns data if needed
        if (campaigns.length === 0) {
          setIsLoadingCampaigns(true);
          await fetchCampaigns();
        }
      } catch (err) {
        console.error("Error in initial Meta data load:", err);
      } finally {
        setLoading(false);
        setIsDateChangeLoading(false);
      }
    };
    
    // Run the initial data load
    loadInitialData();
    
  }, []); // Empty dependency array to run only once on mount

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
      
      // Don't show loading state on refresh to avoid flickering
      const refreshData = async () => {
        try {
          // Keep current date range when refreshing
          const params = new URLSearchParams({
            brandId: brandId as string
          });
          
          // CRITICAL: Make sure we have an explicit date range - never use defaults
          if (!dateRange?.from || !dateRange?.to) {
            console.log("META REFRESH: Skipping refresh - no explicit date range");
            return;
          }
          
          // Detect the special yesterday preset
          const isYesterdayPreset = (dateRange as any)?._preset === 'yesterday';
          
          // Use the current date range - this is important!
          if (dateRange?.from) {
            const formattedFromDate = new Date(dateRange.from);
            formattedFromDate.setHours(0, 0, 0, 0);
            params.append('from', formattedFromDate.toISOString().split('T')[0]);
          }
          
          if (dateRange?.to) {
            const formattedToDate = new Date(dateRange.to);
            formattedToDate.setHours(23, 59, 59, 999);
            
            // CRITICAL: If this is yesterday preset, use the same date for both from and to
            if (isYesterdayPreset) {
              params.append('to', params.get('from') || '');
              console.log("META REFRESH: YESTERDAY PRESET - Setting exact date match");
            } else {
              params.append('to', formattedToDate.toISOString().split('T')[0]);
            }
          }
          
          // Check for yesterday preset
          if (isYesterdayPreset) {
            params.append('preset', 'yesterday');
            console.log("META REFRESH: Adding yesterday preset parameter to force exact day match");
          }
          
          params.append('refresh', 'true');
          params.append('bypass_cache', 'true');
          params.append('strict_date_range', 'true'); // Add this to signal strict date filtering
          
          console.log(`META REFRESH: Exact params used: ${params.toString()}`);
          
          const response = await fetch(`/api/metrics/meta?${params.toString()}`, {
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
          
          // Only update if we got meaningful data AND it's for the specified date range
          // This is crucial to prevent showing all-time data when a specific range is selected
          if (data && data._dateRange) {
            // Check if the returned data matches our requested date range
            const dataMatchesRequest = 
              (!dateRange?.from || data._dateRange.from === params.get('from')) &&
              (!dateRange?.to || data._dateRange.to === params.get('to'));
            
            console.log(`META REFRESH: Data matches requested date range: ${dataMatchesRequest}`);
            
            if (dataMatchesRequest) {
              // If data has real values and matches our date range, update
              if (data.adSpend > 0 || data.impressions > 0 || data.clicks > 0) {
                console.log("META REFRESH: Updating with new data");
                // Update metrics state with the data we received
                setMetricsData({
                  adSpend: typeof data.adSpend === 'number' ? parseFloat(data.adSpend.toString()) : 0,
                  adSpendGrowth: typeof data.adSpendGrowth === 'number' ? parseFloat(data.adSpendGrowth.toString()) : 0,
                  impressions: typeof data.impressions === 'number' ? parseInt(data.impressions.toString(), 10) : 0,
                  impressionGrowth: typeof data.impressionGrowth === 'number' ? parseFloat(data.impressionGrowth.toString()) : 0,
                  clicks: typeof data.clicks === 'number' ? parseInt(data.clicks.toString(), 10) : 0,
                  clickGrowth: typeof data.clickGrowth === 'number' ? parseFloat(data.clickGrowth.toString()) : 0,
                  conversions: typeof data.conversions === 'number' ? parseInt(data.conversions.toString(), 10) : 0,
                  conversionGrowth: typeof data.conversionGrowth === 'number' ? parseFloat(data.conversionGrowth.toString()) : 0,
                  ctr: typeof data.ctr === 'number' ? parseFloat(data.ctr.toString()) : 0,
                  ctrGrowth: typeof data.ctrGrowth === 'number' ? parseFloat(data.ctrGrowth.toString()) : 0,
                  cpc: typeof data.cpc === 'number' ? parseFloat(data.cpc.toString()) : 0,
                  costPerResult: typeof data.costPerResult === 'number' ? parseFloat(data.costPerResult.toString()) : 0,
                  cprGrowth: typeof data.cprGrowth === 'number' ? parseFloat(data.cprGrowth.toString()) : 0,
                  roas: typeof data.roas === 'number' ? parseFloat(data.roas.toString()) : 0,
                  roasGrowth: typeof data.roasGrowth === 'number' ? parseFloat(data.roasGrowth.toString()) : 0,
                  frequency: typeof data.frequency === 'number' ? parseFloat(data.frequency.toString()) : 0,
                  budget: typeof data.budget === 'number' ? parseFloat(data.budget.toString()) : 0,
                  reach: typeof data.reach === 'number' ? parseFloat(data.reach.toString()) : 0,
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
        fetchMetaData();
      }, 300);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [dateRange, brandId]);

  // Add references to hold the last valid metric values
  const lastValidMetricsRef = useRef<MetricsDataType>(createDefaultMetricsData());
  
  // Use the lastValidMetricsRef to prevent flickering to zero
  const displayMetrics = useMemo(() => {
    // If current metrics has zero values but we have valid prior data, use the prior data
    if (
      metricsData.adSpend === 0 && 
      metricsData.impressions === 0 && 
      metricsData.clicks === 0 && 
      lastValidMetricsRef.current.adSpend > 0
    ) {
      console.log('Using last valid metrics to prevent flickering to zero');
      return lastValidMetricsRef.current;
    }
    
    // If we have valid data, update the ref
    if (metricsData.adSpend > 0 || metricsData.impressions > 0 || metricsData.clicks > 0) {
      lastValidMetricsRef.current = {...metricsData};
    }
    
    return metricsData;
  }, [metricsData]);

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {(() => {
          try {
            return (
              <>
      {/* Header Section with refresh button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Meta Ads Performance</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
                      onClick={fetchMetaData}
                      disabled={loading || isDateChangeLoading}
                      className="flex items-center gap-1"
                    >
                      {loading || isDateChangeLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span>Refresh Data</span>
          </Button>
                    {brandId && (
                      <MetaResyncButton 
                        brandId={brandId} 
                        days={60}
                        onSuccess={() => {
                          toast.success("Meta data resynced. Refreshing data...")
                          fetchMetaData()
                        }}
                      />
                    )}
        </div>
      </div>
                
                {/* Debug controls - add a keyboard shortcut to show/hide it */}
                <div className="mb-4">
                  {showDebugControls && (
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-md mb-4">
                      <div className="flex flex-col gap-2">
                        <div className="text-sm font-semibold mb-2">Debug Controls</div>
                        
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={manuallyLoadData}
                            className="px-3 py-1 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded-md"
                          >
                            Force Fetch Meta Data
                          </button>
                          
                          <div className="text-xs text-gray-400">
                            <div>Meta Data Status:</div>
                            <div>Ad Spend: {metricsData.adSpend}</div>
                            <div>ROAS: {metricsData.roas}</div>
                            <div>Impressions: {metricsData.impressions}</div>
                            <div>Clicks: {metricsData.clicks}</div>
                            <div>Loading: {loading ? 'Yes' : 'No'}</div>
                            <div>Auto-Fetch Disabled: {window._disableAutoMetaFetch ? 'Yes' : 'No'}</div>
                          </div>
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
      
      {/* Meta Connection Status Banner */}
      {hasData() ? (
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#111] border border-[#333] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <p className="text-sm">
              Meta connection active
            </p>
          </div>
        </div>
      ) : (
        <AlertBox type="info" icon={<Info className="h-4 w-4" />}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <p className="text-sm mb-1">No Meta data available for the selected date range</p>
              <p className="text-xs text-gray-400">
                Connect your Meta Ads account or run campaigns to see metrics. 
                <Link href="/help/meta-setup" className="ml-1 underline">Learn more</Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="default"
                size="sm"
                onClick={runDiagnostics}
                className="whitespace-nowrap"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Run Diagnostics
              </Button>
            </div>
          </div>
        </AlertBox>
      )}
      
                {/* Meta KPIs - Add failsafe checks to prevent infinite loading */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-blue-400" />
                <span className="ml-0.5">Ad Spend</span>
              </div>
            }
            value={typeof displayMetrics?.adSpend === 'number' && !isNaN(displayMetrics.adSpend) ? displayMetrics.adSpend : 0}
            change={typeof displayMetrics?.adSpendGrowth === 'number' && !isNaN(displayMetrics.adSpendGrowth) ? displayMetrics.adSpendGrowth : 0}
                      data={[]}
                      loading={false}
            refreshing={isRefreshingData}
            platform="meta"
            prefix="$"
            valueFormat="currency"
            dateRange={dateRange}
            infoTooltip="Total amount spent on Meta ads"
            brandId={brandId}
                      hideGraph={true}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-blue-400" />
                <span className="ml-0.5">ROAS</span>
              </div>
            }
            value={typeof displayMetrics?.roas === 'number' && !isNaN(displayMetrics.roas) ? displayMetrics.roas : 0}
            change={typeof displayMetrics?.roasGrowth === 'number' && !isNaN(displayMetrics.roasGrowth) ? displayMetrics.roasGrowth : 0}
                      data={[]}
                      loading={false}
            refreshing={isRefreshingData}
            platform="meta"
            suffix="x"
            dateRange={dateRange}
            infoTooltip="Return On Ad Spend (revenue divided by ad spend)"
            brandId={brandId}
                      hideGraph={true}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="ml-0.5">Impressions</span>
              </div>
            }
            value={typeof displayMetrics?.impressions === 'number' && !isNaN(displayMetrics.impressions) ? displayMetrics.impressions : 0}
            change={typeof displayMetrics?.impressionGrowth === 'number' && !isNaN(displayMetrics.impressionGrowth) ? displayMetrics.impressionGrowth : 0}
                      data={[]}
                      loading={false}
            refreshing={isRefreshingData}
            platform="meta"
            dateRange={dateRange}
            infoTooltip="Number of times your ads were displayed to users"
            brandId={brandId}
                      hideGraph={true}
          />
          
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <MousePointer className="h-4 w-4 text-blue-400" />
                <span className="ml-0.5">Clicks</span>
              </div>
            }
            value={typeof displayMetrics?.clicks === 'number' && !isNaN(displayMetrics.clicks) ? displayMetrics.clicks : 0}
            change={typeof displayMetrics?.clickGrowth === 'number' && !isNaN(displayMetrics.clickGrowth) ? displayMetrics.clickGrowth : 0}
                      data={[]}
                      loading={false}
            refreshing={isRefreshingData}
            platform="meta"
            dateRange={dateRange}
            infoTooltip="Number of clicks on your ads"
            brandId={brandId}
                      hideGraph={true}
          />
        </div>
      </div>
      
                {/* Spend Distribution - Add failsafe check */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Spend Trends */}
        <Card className="bg-[#111] border-[#333] shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Spend Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {displayMetrics?.adSpend && displayMetrics.adSpend > 0 ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Ad Spend', value: displayMetrics.adSpend || 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#3B82F6"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell key="cell-0" fill="#3B82F6" />
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: '#222', 
                        border: '1px solid #444',
                        borderRadius: '4px',
                        color: '#fff'
                      }} 
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 h-[240px]">
                <BarChart className="h-10 w-10 text-gray-500 mb-4" />
                <p className="text-gray-400 mb-2">No Meta spend data available</p>
                <p className="text-sm text-gray-500">Run ads in Meta Ads Manager to view spend distribution.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Platform KPIs */}
                  <Card className="bg-[#111] border-[#333] shadow-lg overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              Campaign Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
                      {isLoadingCampaigns && !cachedCampaigns.length ? (
              <div className="flex justify-center items-center h-[240px]">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
                      ) : (campaigns && campaigns.length > 0) || (cachedCampaigns && cachedCampaigns.length > 0) ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#333] hover:border-[#444] transition-colors">
                    <p className="text-xs text-gray-400 mb-1">Active Campaigns</p>
                    <p className="text-lg font-medium">
                                {campaigns.length > 0 
                                  ? campaigns.filter(c => c.status === 'ACTIVE').length
                                  : cachedCampaigns.filter(c => c.status === 'ACTIVE').length}
                    </p>
                  </div>
                            <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#333] hover:border-[#444] transition-colors">
                    <p className="text-xs text-gray-400 mb-1">Avg. CPC</p>
                    <p className="text-lg font-medium">
                      ${typeof displayMetrics?.cpc === 'number' && !isNaN(displayMetrics.cpc) ? displayMetrics.cpc.toFixed(2) : '0.00'}
                    </p>
                  </div>
                            <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#333] hover:border-[#444] transition-colors">
                    <p className="text-xs text-gray-400 mb-1">Conversions</p>
                    <p className="text-lg font-medium">
                      {typeof displayMetrics?.conversions === 'number' && !isNaN(displayMetrics.conversions) ? Math.round(displayMetrics.conversions) : 0}
                    </p>
                  </div>
                            <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#333] hover:border-[#444] transition-colors">
                    <p className="text-xs text-gray-400 mb-1">Cost/Conv.</p>
                    <p className="text-lg font-medium">
                      ${typeof displayMetrics?.costPerResult === 'number' && !isNaN(displayMetrics.costPerResult) ? displayMetrics.costPerResult.toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full bg-[#1a1a1a] hover:bg-[#222] border-[#333]"
                    onClick={() => window.location.href = "/analytics"}
                  >
                    View Full Analytics
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 h-[240px]">
                <Activity className="h-10 w-10 text-gray-500 mb-4" />
                <p className="text-gray-400 mb-2">No campaign metrics available</p>
                <p className="text-sm text-gray-500">You'll see metrics here once you have active campaigns with data.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Top Campaigns & AI Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Campaigns */}
                  <Card className="bg-[#111] border-[#333] shadow-lg overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-blue-400" />
              Top Performing Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
                      {isLoadingCampaigns && !cachedCampaigns.length ? (
              <div className="flex justify-center items-center h-[240px]">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
                      ) : (campaigns && campaigns.length > 0) || (cachedCampaigns && cachedCampaigns.length > 0) ? (
              <div className="space-y-4">
                          {(campaigns.length > 0 ? campaigns : cachedCampaigns).slice(0, 3).map((campaign, index) => (
                            <div key={index} className="flex items-center justify-between border-b border-[#222] pb-3 last:border-0 last:pb-0 hover:bg-[#1a1a1a1a] p-2 rounded-md transition-colors">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-200 truncate w-[200px]">{campaign.campaign_name}</h4>
                                <div className="flex items-center gap-1 mt-1">
                                  <span className={`w-2 h-2 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                  <p className="text-xs text-gray-400">{campaign.status}</p>
                                </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-sm font-medium">${typeof campaign.spend === 'number' ? campaign.spend.toFixed(2) : '0.00'}</p>
                      <p className="text-xs text-gray-400">ROAS: {typeof campaign.roas === 'number' ? campaign.roas.toFixed(2) : '0.00'}x</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 h-[240px]">
                <Settings className="h-10 w-10 text-gray-500 mb-4" />
                <p className="text-gray-400 mb-2">No campaign data available</p>
                <p className="text-sm text-gray-500">Create campaigns in Meta Ads Manager to see performance data here.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* AI Insights */}
                  <Card className="bg-[#111] border-[#333] shadow-lg overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-indigo-400" />
              AI Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingInsights ? (
              <div className="h-[200px] flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                <p className="text-sm text-gray-400">Generating insights...</p>
              </div>
            ) : aiInsights ? (
              <div className="space-y-4">
                          <div className="p-3 bg-indigo-900/20 border border-indigo-800/30 rounded-md">
                <p className="text-sm">{aiInsights}</p>
                          </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-[#1a1a1a] hover:bg-[#222] border-[#333]"
                  onClick={generateAiInsights}
                >
                  Refresh Insights
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center gap-3">
                <BrainCircuit className="h-6 w-6 text-indigo-400" />
                <p className="text-sm text-gray-400">Generate AI insights about your Meta Ads performance</p>
                <Button 
                  variant="outline" 
                  className="bg-indigo-900/30 border-indigo-600/30 hover:bg-indigo-900/50 text-indigo-300"
                  onClick={generateAiInsights}
                >
                  Generate Insights
                  <BrainCircuit className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Actionable Recommendations */}
                <Card className="bg-[#111] border-[#333] shadow-lg overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            Optimize Your Meta Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-[#1a1a1a] border border-[#333] hover:border-[#444] rounded-lg p-4 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-full bg-blue-900/40 p-1.5">
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <h3 className="font-medium text-sm">Audience Targeting</h3>
              </div>
              <p className="text-xs text-gray-400">Create lookalike audiences based on your high-value customers to improve conversion rates.</p>
            </div>
            
                      <div className="bg-[#1a1a1a] border border-[#333] hover:border-[#444] rounded-lg p-4 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-full bg-green-900/40 p-1.5">
                  <DollarSign className="h-4 w-4 text-green-400" />
                </div>
                <h3 className="font-medium text-sm">Budget Optimization</h3>
              </div>
              <p className="text-xs text-gray-400">Shift budget from underperforming campaigns to your top performers to maximize ROAS.</p>
            </div>
            
                      <div className="bg-[#1a1a1a] border border-[#333] hover:border-[#444] rounded-lg p-4 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-full bg-amber-900/40 p-1.5">
                  <BarChart2 className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="font-medium text-sm">Ad Creative</h3>
              </div>
              <p className="text-xs text-gray-400">Test different ad formats, including video content which typically outperforms static images.</p>
            </div>
      </div>
        </CardContent>
      </Card>
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
