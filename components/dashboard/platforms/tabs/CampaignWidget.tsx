"use client"

import React, { useState, useMemo, useEffect, useCallback, useRef, FC } from 'react'
import { 
  BarChart, LineChart, PieChart, AreaChart, Gauge, ArrowUpRight, ArrowDownRight, 
  Calendar, Filter, MoreHorizontal, Download, ChevronDown, Settings, Table,
  Eye, EyeOff, Zap, DollarSign, Users, MousePointerClick, Target, Wallet, BarChart2, ChevronRight,
  CalendarRange, Loader2, RefreshCcw, SlidersHorizontal, CircleIcon, Search, ChevronUp
} from 'lucide-react'
import { AdComponent } from './AdComponent'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { 
  ResponsiveContainer, 
  LineChart as ReLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReTooltip, 
  Legend,
  BarChart as ReBarChart,
  Bar
} from 'recharts'
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/formatters'
import type { DateRange } from "react-day-picker"
import { useToast } from "@/components/ui/use-toast"
import { mutate } from 'swr'
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { format } from "date-fns"
import { fetchMetaAdSets } from '@/lib/services/meta-service'; // Ensure correct import if needed, might be fetched via API though
import { DateRange as DateRangePicker } from 'react-day-picker'; // Make sure DateRange type is imported
import { supabase } from '@/lib/supabase'; // Import supabase
import { startOfDay, endOfDay } from 'date-fns'; // Import date-fns functions

// Debug flag to control verbosity
const DEBUG_LOGGING = false; // Disabled for production

// Logger for controlled output
const logger = {
  debug: (...args: any[]) => {
    // Debug logging disabled for production
  },
  info: (...args: any[]) => {
    // Info logging disabled for production
  },
  warn: (...args: any[]) => {
    // Warning logging disabled for production
  },
  error: (...args: any[]) => {
    // Error logging disabled for production
  }
};

// Throttle mechanism to prevent too many operations
const throttleMap = new Map<string, number>();
const throttle = (key: string, minInterval: number = 3000): boolean => {
  const now = Date.now();
  const last = throttleMap.get(key) || 0;
  
  if (now - last < minInterval) {
    return false; // Throttled
  }
  
  throttleMap.set(key, now);
  return true; // Not throttled
};

// Add a global render counter to prevent log storms
let renderCount = 0;
const MAX_LOGS_PER_SESSION = 10; // Limit logs per session

// Add a debounce mechanism
const debounceMap = new Map<string, NodeJS.Timeout>();
const debounce = (key: string, fn: Function, delay: number = 300): Function => {
  return (...args: any[]) => {
    // Clear existing timeout
    if (debounceMap.has(key)) {
      clearTimeout(debounceMap.get(key) as NodeJS.Timeout);
    }
    
    // Set new timeout
    debounceMap.set(key, setTimeout(() => {
      fn(...args);
      debounceMap.delete(key);
    }, delay));
  };
};

// Define the types needed for the component
type DailyInsight = {
  date: string
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cpa: number
  [key: string]: string | number
}

// Define the AdSet interface to match the original widget
type AdSet = {
  id: number
  brand_id: string
  adset_id: string
  adset_name: string
  campaign_id: string
  status: string
  budget: number
  budget_type: string
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cost_per_conversion: number
  optimization_goal: string | null
  updated_at: string
  reach?: number
  daily_insights?: Array<{
    date: string
    spent: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
    cost_per_conversion: number
    reach?: number
  }>
}

interface Campaign {
  id: string
  campaign_id: string
  campaign_name: string
  status: string
  objective: string
  budget: number
  budget_type: string
  budget_source?: string
  spent: number
  impressions: number
  reach: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  cost_per_conversion: number
  roas: number
  account_name: string
  account_id: string
  start_date: string | null
  end_date: string | null
  last_refresh_date: string
  daily_insights: DailyInsight[]
  has_data_in_range?: boolean
  adset_budget_total?: number
}

interface CampaignWidgetProps {
  brandId: string
  campaigns: Campaign[]
  isLoading: boolean
  isSyncing: boolean
  dateRange?: DateRange
  onRefresh?: () => void
  onReachValuesCalculated?: (reachValues: {[key: string]: number | null}) => void
}

// Same available metrics as the original widget
const AVAILABLE_METRICS = [
  { id: 'spent', name: 'Spend', icon: <DollarSign className="h-3.5 w-3.5" />, format: 'currency' },
  { id: 'impressions', name: 'Impressions', icon: <Eye className="h-3.5 w-3.5" />, format: 'number' },
  { id: 'reach', name: 'Reach', icon: <Users className="h-3.5 w-3.5" />, format: 'number' },
  { id: 'clicks', name: 'Clicks', icon: <MousePointerClick className="h-3.5 w-3.5" />, format: 'number' },
  { id: 'ctr', name: 'CTR', icon: <Target className="h-3.5 w-3.5" />, format: 'percentage' },
  { id: 'cpc', name: 'CPC', icon: <DollarSign className="h-3.5 w-3.5" />, format: 'currency' },
  { id: 'conversions', name: 'Conversions', icon: <Zap className="h-3.5 w-3.5" />, format: 'number' },
  { id: 'cost_per_conversion', name: 'Cost/Conv.', icon: <DollarSign className="h-3.5 w-3.5" />, format: 'currency' },
  { id: 'roas', name: 'ROAS', icon: <BarChart2 className="h-3.5 w-3.5" />, format: 'roas' },
]

// Default preferences
const DEFAULT_PREFERENCES = {
  view: 'table',
  visibleMetrics: ['spent', 'impressions', 'clicks', 'ctr', 'roas'],
  sortBy: 'spent',
  sortOrder: 'desc',
  showInactive: true,
  chartMetric: 'spent'
}

// Helper function to format budget with currency
const formatBudget = (amount: number | null, budgetType: string | null) => {
  if (amount === null || amount === undefined) return '$0';
  
  const formattedAmount = formatCurrency(amount);
  
  if (budgetType === 'daily') {
    return `${formattedAmount}`;
  }
  
  return formattedAmount;
};

// Define the component as a React FC (Function Component) with JSX return
const CampaignWidget = ({
  brandId,
  campaigns,
  isLoading,
  isSyncing,
  dateRange,
  onRefresh,
  onReachValuesCalculated
}: CampaignWidgetProps): JSX.Element => {

  
  // *** DEBUG LOGGING START ***
  // Only log once per 10 renders to prevent log floods
  if (DEBUG_LOGGING && renderCount % MAX_LOGS_PER_SESSION === 0) {
  // console.log("--- CampaignWidget Render --- ");
  // console.log(`[CW DEBUG] Received Props: isLoading=${isLoading}, isSyncing=${isSyncing}`);
    if (dateRange) {
      // console.log(`[CW DEBUG] Received Date Range Prop:`, dateRange ? { 
      //   from: dateRange.from?.toISOString(), 
      //   to: dateRange.to?.toISOString() 
      // } : 'undefined');
    }
  // console.log(`[CW DEBUG] Received Campaigns Prop Count: ${campaigns?.length ?? 0}`);
    if (campaigns && campaigns.length > 0 && renderCount === 0) {
    // console.log(`[CW DEBUG] First Campaign Prop Metrics:`, {
    //     name: campaigns[0].campaign_name,
    //     id: campaigns[0].campaign_id,
    //     spend: campaigns[0].spent,
    //     impressions: campaigns[0].impressions,
    //     clicks: campaigns[0].clicks,
    //     status: campaigns[0].status
    // });
  }
  }
  renderCount++; // Increment render counter each time
  // *** DEBUG LOGGING END ***

  type SortOrderType = 'asc' | 'desc';
  
  // Use states from the original widget
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleMetrics, setVisibleMetrics] = useState(DEFAULT_PREFERENCES.visibleMetrics);
  const [sortBy, setSortBy] = useState(DEFAULT_PREFERENCES.sortBy);
  const [sortOrder, setSortOrder] = useState<SortOrderType>(DEFAULT_PREFERENCES.sortOrder as SortOrderType);
  const [showInactive, setShowInactive] = useState(DEFAULT_PREFERENCES.showInactive);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [expandedAdSet, setExpandedAdSet] = useState<string | null>(null);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [isLoadingAdSets, setIsLoadingAdSets] = useState(false);
  const [currentBudgets, setCurrentBudgets] = useState<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState(false);
  
  // Add missing state variables
  const [isPreloading, setIsPreloading] = useState(false);
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>([]);
  
  // Add state to track loading status
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [lastBudgetRefresh, setLastBudgetRefresh] = useState<Date | null>(null);
  
  // Use a ref to track if the component is mounted
  const isMountedRef = useRef(true);
  
  // Track in-flight API requests to cancel them if needed
  const pendingRequestsRef = useRef<AbortController[]>([]);
  
  // Add state to track campaigns with fetched ad sets
  const [campaignsWithAdSets, setCampaignsWithAdSets] = useState<Set<string>>(new Set());
  
  // Add back state for storing all campaign ad sets
  const [allCampaignAdSets, setAllCampaignAdSets] = useState<Map<string, AdSet[]>>(new Map());
  const [isPreloadingAdSets, setIsPreloadingAdSets] = useState(false);
  
  // Track when the last refresh happened
  const lastRefresh = useRef<number>(0);
  
  // Track the calculated reach values for each campaign to provide to parent component
  const calculatedReachValues = useRef<{[key: string]: number | null}>({});
  
  // Add a flag to track if we've already logged a message to reduce log spam
  const loggedMessages = useRef<Set<string>>(new Set());
  
  // Add a ref to track the current requests in progress
  const refreshInProgressRef = useRef<boolean>(false);

  // Log only once per session for certain messages to reduce log spam
  const logOnce = useCallback((key: string, message: string, data?: any) => {
    if (!loggedMessages.current.has(key)) {
      if (data) {
      } else {
      }
      loggedMessages.current.add(key);
    }
  }, []);
  
  // Ensure a loading state is shown when mounting, even if campaigns array is empty but not an error condition
  useEffect(() => {
    // Set preloading state if campaigns array is empty and not explicitly in loading state
    // This prevents "No campaigns found" from flashing before API data arrives
    if (!isLoading && campaigns.length === 0 && !isPreloading) {
      setIsPreloading(true);
      
      // Set a brief timeout to keep preloading state showing
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setIsPreloading(false);
        }
      }, 1500); // Show preloader for at least 1.5 seconds
      
      return () => clearTimeout(timer);
    }
    
    // If campaigns come in, clear the preloading state
    if (campaigns.length > 0 && isPreloading) {
      setIsPreloading(false);
    }
  }, [campaigns, isLoading, isPreloading]);
  
  // Sync campaigns from props to localCampaigns
  useEffect(() => {
    // Always update localCampaigns when campaigns prop changes significantly
    // Don't compare with localCampaigns to avoid circular dependencies
    // console.log('[CampaignWidget] Campaigns prop updated, checking for changes...');
    
    // Always update if the campaigns have changed
      setLocalCampaigns(campaigns);
    
    // Log what we're updating
    if (campaigns.length > 0) {
      const testCampaign = campaigns.find(c => c.campaign_id === '120218263352990058');
      if (testCampaign) {
        // console.log('[CampaignWidget] Test campaign budget info:', {
        //   campaign_id: testCampaign.campaign_id,
        //   budget: testCampaign.budget,
        //   adset_budget_total: testCampaign.adset_budget_total,
        //   budget_type: testCampaign.budget_type,
        //   budget_source: testCampaign.budget_source
        // });
      }
    }
  }, [campaigns]);
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cancel any pending requests
      pendingRequestsRef.current.forEach(controller => {
        try {
          controller.abort();
        } catch (e) {
        }
      });
      pendingRequestsRef.current = [];
    };
  }, []);
  
  // Function to create an abort controller and track it
  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    pendingRequestsRef.current.push(controller);
    return controller;
  }, []);
  
  // Clean up abort controller after use
  const removeAbortController = useCallback((controller: AbortController) => {
    pendingRequestsRef.current = pendingRequestsRef.current.filter(c => c !== controller);
  }, []);
  
  // Declare functions using standard syntax first
  
  const fetchAdSets = useCallback(async (campaignId: string, forceRefresh: boolean = false): Promise<void> => {
    if (!brandId || !isMountedRef.current || !campaignId) return;
    
    // Log detailed debugging info about the date range
    // console.log(`[CampaignWidget] [DEBUG] fetchAdSets called with dateRange:`, dateRange);
    if (!dateRange || !dateRange.from || !dateRange.to) {
      // console.warn(`[CampaignWidget] [WARNING] Date range is missing or incomplete when fetching ad sets for campaign ${campaignId}`);
    }
    
    // Only abort requests if forcing a refresh, otherwise let existing fetches for other campaigns complete.
    if (forceRefresh) {
        pendingRequestsRef.current.forEach(controller => {
          try {
            controller.abort();
          } catch (e) {
            // Ignore abort errors
          }
        });
        // Clear specific controller if exists? Might be complex.
    }
    
    // Cancel any existing ad set fetch
    pendingRequestsRef.current.forEach(controller => {
      try {
        controller.abort();
      } catch (e) {
        // Ignore abort errors
      }
    });
    
    // Clear ad sets ONLY if forcing refresh OR if the current ad sets belong to a different campaign
    if (forceRefresh || (adSets.length > 0 && adSets[0].campaign_id !== campaignId)) {
        setAdSets([]);
    }
    
    setIsLoadingAdSets(true);
    
    const controller = createAbortController();
    logger.debug(`[CampaignWidget] Starting ad sets fetch for campaign ${campaignId}`);
    
    // Add throttling specific to ad set fetching for a campaign
    const adSetFetchKey = `fetch-adsets-${brandId}-${campaignId}`;
    if (!forceRefresh && !throttle(adSetFetchKey, 5000)) { // Throttle non-forced ad set fetches
        logger.debug(`[CampaignWidget] Throttled ad set fetch for campaign ${campaignId}`);
        // If throttled but we have existing ad sets, don't clear them or show loading
        if (adSets.length > 0) {
            setIsLoadingAdSets(false); // Ensure loading state is off
            return; 
        }
        // If no ad sets exist, allow fetch but maybe log a warning
        logger.warn(`[CampaignWidget] Allowing potentially throttled ad set fetch as none exist for ${campaignId}`);
    }

    setIsLoadingAdSets(true);
    // Clear existing ad sets ONLY if forcing refresh or none exist, to avoid flicker
    if (forceRefresh || adSets.length === 0) {
      setAdSets([]);
    }
    
    let usedDirectFetch = false;
    let usedCachedData = false;
    let success = false; // Track if fetch was successful
    
    try {
      let url = `/api/meta/adsets?brandId=${brandId}&campaignId=${campaignId}`;
      let dateQuery = '';
      
      // Ensure date range is valid and format it properly
      if (dateRange?.from && dateRange?.to) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        const toDate = dateRange.to.toISOString().split('T')[0];
        dateQuery = `&from=${fromDate}&to=${toDate}`;
        // console.log(`[CampaignWidget] [DEBUG] Adding date query params: ${dateQuery}`);
        url += dateQuery;
      } else {
        // console.warn(`[CampaignWidget] [WARNING] No date range available for ad sets fetch`);
      }
      
      if (forceRefresh) {
          url += `&forceRefresh=true`;
      }
      
      // console.log(`[CampaignWidget] [DEBUG] Fetching ad sets from: ${url}`);
      
      let response = await fetch(url, { 
          signal: controller.signal,
          cache: 'no-store', // Add cache busting here too
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      
      // If the regular endpoint fails, try the direct-fetch endpoint
      if (!response.ok) {
        // console.log(`[CampaignWidget] Regular endpoint failed with status ${response.status}, response:`, await response.text());
        // console.log(`[CampaignWidget] Trying direct-fetch endpoint with date range...`);
        usedDirectFetch = true;
        
        // Make sure we still include date range in the direct fetch
        const directFetchBody = {
          brandId,
          campaignId
        };
        
        // Add date range to direct fetch request if available
        if (dateRange?.from && dateRange?.to) {
          Object.assign(directFetchBody, {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          });
        }
        
        // console.log(`[CampaignWidget] [DEBUG] Direct fetch body:`, directFetchBody);
        
        response = await fetch(`/api/meta/adsets/direct-fetch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(directFetchBody),
          signal: controller.signal
        });
      }
      
      if (!isMountedRef.current) return;
      
      // Log the raw response for debugging
      const responseText = await response.text();
      // console.log(`[CampaignWidget] [DEBUG] Raw ad sets response (from ${usedDirectFetch ? 'direct' : 'regular'} endpoint): ${responseText.substring(0, 500)}...`);
      
      // Parse the response as JSON (safely)
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error(`[CampaignWidget] Error parsing ad sets response: ${parseError}`);
        throw new Error(`Failed to parse response: ${responseText.substring(0, 100)}`);
      }
      
      // *** Add logging for the actual ad set data received ***
      // console.log(`[CampaignWidget] [DEBUG] Parsed ad sets data for campaign ${campaignId}:`, 
      //   data.adSets ? {
      //     count: data.adSets.length,
      //     source: data.source || 'unknown',
      //     timestamp: data.timestamp || 'unknown',
      //     dateRange: data.dateRange || 'not specified',
      //     firstAdSetMetrics: data.adSets[0] ? {
      //       spent: data.adSets[0].spent,
      //       impressions: data.adSets[0].impressions,
      //       clicks: data.adSets[0].clicks,
      //       reach: data.adSets[0].reach
      //     } : 'no ad sets'
      //   } : 'no ad sets data');
      
      if (response.ok) {
        // Check if this is a rate limit response with cached data
        if (data.source === 'cached_due_to_rate_limit') {
          usedCachedData = true;
          logger.debug(`[CampaignWidget] Using cached ad sets due to Meta API rate limits`);
        }
        
        logger.debug(`[CampaignWidget] Response OK, adSets:`, data.adSets ? data.adSets.length : 0);
        
        if (isMountedRef.current) {
          // Ensure we have a valid array of ad sets
          const validAdSets = Array.isArray(data.adSets) ? data.adSets : [];
          
          // Verify date range was respected in the response data
          if (dateRange?.from && dateRange?.to && validAdSets.length > 0) {
            const requestedDateFrom = dateRange.from.toISOString().split('T')[0];
            const requestedDateTo = dateRange.to.toISOString().split('T')[0];
            
            // Check if the response has date range info
            if (data.dateRange && (data.dateRange.from !== requestedDateFrom || data.dateRange.to !== requestedDateTo)) {
              // console.warn(`[CampaignWidget] [WARNING] Response date range (${data.dateRange.from} to ${data.dateRange.to}) does not match requested date range (${requestedDateFrom} to ${requestedDateTo})`);
            }
          }
          
          setAdSets(validAdSets);
          success = true; // Mark as successful
          
          // Add this campaign ID to the set regardless of whether ad sets were found,
          // indicating that a fetch attempt was completed.
          setCampaignsWithAdSets(prev => {
            const newSet = new Set(prev);
            newSet.add(campaignId);
            logger.debug(`[CampaignWidget] Added ${campaignId} to campaignsWithAdSets set.`);
            return newSet;
          });
          
          // Toast notification that ad sets were loaded
          if (validAdSets.length > 0) {
            toast.success(`Loaded ${validAdSets.length} ad sets${usedCachedData ? ' (cached data)' : usedDirectFetch ? ' (basic data)' : ''}`);
          } else {
            // Check if this was because of a rate limit
            if (data.warning === 'Meta API rate limit reached') {
              toast.warning(`Meta API rate limit reached`, {
                description: data.message || 'Please try again in a few minutes',
                duration: 8000
              });
            } else {
              toast.info("No ad sets found for this campaign");
              logger.debug(`[CampaignWidget] No ad sets found for campaign ${campaignId}`);
            }
          }
          
          // Dispatch events for budgets to update regardless of ad set count
          logger.debug('[CampaignWidget] Dispatching status changed events');
          window.dispatchEvent(
            new CustomEvent('adSetStatusChanged', {
              detail: {
                brandId,
                campaignId,
                timestamp: new Date().toISOString()
              }
            })
          );
          
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('campaignStatusChanged', {
                detail: {
                  brandId,
                  timestamp: new Date().toISOString()
                }
              })
            );
          }, 100);
        }
      } else {
        // Check if this is a rate limit error response
        if (data.warning === 'Meta API rate limit reached') {
          logger.debug(`[CampaignWidget] Meta API rate limit reached`);
          
          if (isMountedRef.current) {
            toast.warning(`Meta API rate limit reached`, {
              description: data.message || 'Please try again in a few minutes',
              duration: 8000
            });
            setAdSets([]);
          }
        } else {
          logger.error(`[CampaignWidget] Failed to fetch ad sets: ${response.status} ${response.statusText}`, data);
          
          if (isMountedRef.current) {
            toast.error(`Failed to load ad sets: ${data?.error || response.statusText}`);
            setAdSets([]);
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logger.debug("[CampaignWidget] Ad set fetch aborted");
        return;
      }
      
      logger.error("[CampaignWidget] Error fetching ad sets:", error);
      
      if (isMountedRef.current) {
        toast.error(`Error loading ad sets: ${(error as Error).message}`);
        setAdSets([]);
      }
    } finally {
      if (isMountedRef.current) {
        // Set loading false immediately
        setIsLoadingAdSets(false);
      }
      
      // Clean up abort controller
      removeAbortController(controller);

      // *** NEW: If ad sets were successfully fetched, trigger parent refresh ***
      if (success && adSets.length > 0 && onRefresh) {
          logger.info(`[CampaignWidget] Ad sets loaded for ${campaignId}, triggering parent campaign refresh.`);
          // Add a small delay to allow state to settle before triggering parent refresh
          setTimeout(() => {
              if (isMountedRef.current) { // Add check if component still mounted
                onRefresh(); 
              }
          }, 500); 
      }
    }
  }, [brandId, dateRange, expandedCampaign, onRefresh, isMountedRef, createAbortController, removeAbortController]);

  const toggleCampaignExpand = useCallback(async (campaignId: string): Promise<void> => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
      // Optional: Clear ad sets when collapsing if desired, or keep them cached.
      // setAdSets([]); 
    } else {
      if (!campaignId || typeof campaignId !== 'string' || campaignId.trim() === '') {
        logger.error('[CampaignWidget] Invalid campaign ID for status check:', campaignId);
        toast.error("Cannot expand campaign - invalid campaign ID");
        return;
      }
      
      if (!brandId) {
        logger.error('[CampaignWidget] Missing brand ID for status check');
        toast.error("Cannot expand campaign - missing brand ID");
        return;
      }
      
      logger.debug(`[CampaignWidget] Expanding campaign ${campaignId} with brand ${brandId}`);
      
      // --- Expansion Logic --- 
      // 1. Set expanded state immediately
      setExpandedCampaign(campaignId);
      
      // 2. Fetch ad sets only if not already fetched for this campaign
      if (!campaignsWithAdSets.has(campaignId)) {
        logger.debug(`[CampaignWidget] Ad sets for ${campaignId} not cached, fetching...`);
        // Don't await here, let it run in the background
        fetchAdSets(campaignId, false); 
      } else {
        logger.debug(`[CampaignWidget] Ad sets for ${campaignId} already fetched, using cached data (or refetching if necessary within fetchAdSets)`);
        // If ad sets are cached but empty, trigger fetch again?
        // Or rely on fetchAdSets internal logic/throttling? For now, assume fetchAdSets handles it.
      }
      
      // --- End Expansion Logic ---
    }
  }, [brandId, expandedCampaign, fetchAdSets, campaignsWithAdSets]);

  const checkCampaignStatuses = useCallback((campaignsToCheck: Campaign[], forceRefresh = false): void => {
    if (!brandId || !isMountedRef.current || campaignsToCheck.length === 0) return;
    
    // Apply throttling to prevent multiple status checks
    const key = `check-statuses-${brandId}`;
    if (!forceRefresh && !throttle(key, 15000)) {
      logger.debug(`[CampaignWidget] Throttled status check - skipping`);
      return;
    }
    
    // Log what we're doing - but only in debug mode
    logger.debug(`[CampaignWidget] Checking statuses for ${campaignsToCheck.length} campaigns, forceRefresh: ${forceRefresh}`);
    
    // Filter out campaigns with invalid campaign_id values
    const validCampaigns = campaignsToCheck.filter(campaign => 
      campaign && campaign.campaign_id && typeof campaign.campaign_id === 'string' && campaign.campaign_id.trim() !== ''
    );
    
    if (validCampaigns.length === 0) {
      logger.debug('[CampaignWidget] No valid campaigns to check statuses for');
      return;
    }
    
    // Prioritize campaigns: expanded > active > recently modified > others
    const prioritizedCampaigns = [...validCampaigns].sort((a, b) => {
      // Put expanded campaign first
      if (a.campaign_id === expandedCampaign) return -1;
      if (b.campaign_id === expandedCampaign) return 1;
      
      // Then active campaigns
      const aActive = a.status.toUpperCase() === 'ACTIVE';
      const bActive = b.status.toUpperCase() === 'ACTIVE';
      
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      
      // Then recently modified ones
      const aDate = new Date(a.last_refresh_date || 0);
      const bDate = new Date(b.last_refresh_date || 0);
      
      // More recent ones first
      return bDate.getTime() - aDate.getTime();
    });
    
    // Process more campaigns when forceRefresh is true, but limit to avoid rate limits
    const batchSize = forceRefresh ? Math.min(5, prioritizedCampaigns.length) : Math.min(2, prioritizedCampaigns.length);
    const campaignsToProcess = prioritizedCampaigns.slice(0, batchSize);
    
    logger.debug(`[CampaignWidget] Processing ${campaignsToProcess.length} campaigns for status check`);
    
    let updatedCount = 0;
    let pendingRequests = campaignsToProcess.length;
    
    // Check each campaign's status with a slight delay between requests
    campaignsToProcess.forEach((campaign, index) => {
      // Add a small delay between requests to avoid rate limiting
      setTimeout(() => {
        if (!isMountedRef.current) return;
        
        // Extra validation before API call
        if (!campaign || !campaign.campaign_id) {
          logger.debug('[CampaignWidget] Invalid campaign object or missing campaign_id');
          pendingRequests--;
          return;
        }
        
        // Only log in debug mode
        logger.debug(`[CampaignWidget] Checking status for campaign: ${campaign.campaign_id}`);
        
        fetch(`/api/meta/campaign-status-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brandId,
            campaignId: campaign.campaign_id,
            forceRefresh: forceRefresh,
            isManualCheck: forceRefresh // Manual checks are when forceRefresh is true
          })
        })
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          
          // Check for different types of errors
          if (response.status === 400) {
            // Bad request - likely invalid parameters
            logger.debug(`[CampaignWidget] Bad request when checking campaign ${campaign.campaign_id} status`);
            return { error: 'Invalid campaign parameters', status: campaign.status };
          } else if (response.status === 429) {
            // Rate limiting
            logger.debug(`[CampaignWidget] Rate limited when checking campaign ${campaign.campaign_id} status`);
            return { error: 'Rate limited', status: campaign.status };
          } else if (response.status === 404) {
            // Campaign not found
            logger.debug(`[CampaignWidget] Campaign ${campaign.campaign_id} not found in Meta`);
            return { error: 'Campaign not found', status: campaign.status };
          }
          
          // For other errors, return a generic error with the current status
          logger.debug(`[CampaignWidget] Error ${response.status} when checking campaign ${campaign.campaign_id} status`);
          return { error: `API error (${response.status})`, status: campaign.status };
        })
        .then(statusData => {
          pendingRequests--;
          
          // Skip update if we have an error
          if (statusData.error) {
            return;
          }
          
          if (statusData.status) {
            // Always update local state when force refreshing, otherwise only update if status changed
            const shouldUpdate = forceRefresh || statusData.status.toUpperCase() !== campaign.status.toUpperCase();
            
            if (shouldUpdate) {
              logger.debug(`[CampaignWidget] Status update: ${campaign.campaign_id} from ${campaign.status} to ${statusData.status}`);
              updatedCount++;
              
              // Update the local campaigns state
              setLocalCampaigns(currentCampaigns => 
                currentCampaigns.map(c => 
                  c.campaign_id === campaign.campaign_id 
                    ? { ...c, status: statusData.status, last_refresh_date: statusData.timestamp } 
                    : c
                )
              );
              
              // If this is the expanded campaign, refresh its ad sets
              if (expandedCampaign === campaign.campaign_id) {
                logger.debug(`[CampaignWidget] Refreshing ad sets for expanded campaign after status change`);
                fetchAdSets(campaign.campaign_id, true);
              }
            }
          }
          
          // If this is the last request and any statuses were updated, notify parent
          if (pendingRequests === 0 && updatedCount > 0) {
            logger.debug(`[CampaignWidget] ${updatedCount} campaign statuses were updated. Triggering refresh...`);
            // Notify parent component to refresh the data
            if (onRefresh) {
              onRefresh();
            }
          }
        })
        .catch(error => {
          pendingRequests--;
          // Log the actual error object for more details, but only in debug mode
          logger.debug(`[CampaignWidget] Error checking status for campaign ${campaign.campaign_id}:`, error);
          
          // If this is the last request and any statuses were updated, notify parent
          if (pendingRequests === 0 && updatedCount > 0 && onRefresh) {
            onRefresh();
          }
        });
      }, index * (forceRefresh ? 500 : 2000)); // Increase delay between requests to reduce rate limiting and log spam
    });
    
      // Also refresh the campaigns list data after all status checks, but with less frequency
  if (forceRefresh) {
    setTimeout(() => {
      if (isMountedRef.current) {
        logger.debug(`[CampaignWidget] Refreshing campaigns data from API after status checks`);
        
        // 🚨 REMOVED: CampaignWidget should NOT call campaigns API directly
        // This was causing race conditions with MetaTab2's fetchCampaigns
        // Campaign data is passed as props from MetaTab2
        logger.debug(`[CampaignWidget] 🚨 RACE CONDITION PREVENTED: Not calling campaigns API directly`);
        
        // Trigger parent refresh instead of direct API call
        if (onRefresh) {
          onRefresh();
        }
      }
    }, (campaignsToProcess.length * (forceRefresh ? 600 : 1200)) + 1000); // Wait for all status checks plus a buffer
  }
  }, [brandId, onRefresh, isMountedRef, expandedCampaign, fetchAdSets, dateRange]);

  // Load saved preferences from localStorage
  const loadUserPreferences = useCallback(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    
    try {
      const savedPrefs = localStorage.getItem(`campaign-widget-prefs-${brandId}`);
      if (savedPrefs) {
        return JSON.parse(savedPrefs);
      }
    } catch (error) {
    }
    
    return DEFAULT_PREFERENCES;
  }, [brandId]);
  
  // Save user preferences to localStorage
  const saveUserPreferences = useCallback((prefs: any) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(`campaign-widget-prefs-${brandId}`, JSON.stringify(prefs));
    } catch (error) {
    }
  }, [brandId]);
  
  // Initialize state with saved preferences on mount
  useEffect(() => {
    const userPrefs = loadUserPreferences();
    setVisibleMetrics(userPrefs.visibleMetrics || DEFAULT_PREFERENCES.visibleMetrics);
    setSortBy(userPrefs.sortBy || DEFAULT_PREFERENCES.sortBy);
    setSortOrder(userPrefs.sortOrder || DEFAULT_PREFERENCES.sortOrder);
    setShowInactive(userPrefs.showInactive !== undefined ? userPrefs.showInactive : DEFAULT_PREFERENCES.showInactive);
  }, [loadUserPreferences]);
  
  // Save preferences when they change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentPrefs = {
        visibleMetrics,
        sortBy,
        sortOrder,
        showInactive
      };
      
      saveUserPreferences(currentPrefs);
      logger.debug("[CampaignWidget] Saved user preferences to localStorage");
    }, 500); // 500ms debounce to prevent too many writes
    
    return () => clearTimeout(timeoutId);
  }, [visibleMetrics, sortBy, sortOrder, showInactive, saveUserPreferences]);
  
  // Function to fetch current campaign budgets - EXACT COPY from original widget
  const fetchCurrentBudgets = useCallback(async (forceRefresh = false) => {
    if (!brandId || !isMountedRef.current) return;
    
    setIsLoadingBudgets(true);
    logger.debug("[CampaignWidget] Fetching current budget data, force refresh:", forceRefresh);
    
    const controller = createAbortController();
    
    try {
      const response = await fetch(
        `/api/meta/campaign-budgets?brandId=${brandId}${forceRefresh ? '&forceRefresh=true' : ''}`,
        { signal: controller.signal }
      );
      
      if (!isMountedRef.current) return;
      
      if (response.ok) {
        const data = await response.json();
        
        // Create a map of campaign_id to budget data
        const budgetMap: Record<string, any> = {};
        data.budgets.forEach((budget: any) => {
          budgetMap[budget.campaign_id] = {
            budget: budget.budget,
            budget_type: budget.budget_type,
            formatted_budget: budget.formatted_budget,
            budget_source: budget.budget_source
          };
        });
        
        if (isMountedRef.current) {
          setCurrentBudgets(budgetMap);
          logger.debug(`[CampaignWidget] Loaded current budgets for ${Object.keys(budgetMap).length} campaigns via ${data.refreshMethod}`);
        }
        
        // Show toast notification when budgets are updated and forceRefresh was requested
        if (forceRefresh && isMountedRef.current) {
          toast.success(`Updated budget data for ${Object.keys(budgetMap).length} campaigns`);
        }
      } else {
        logger.error("[CampaignWidget] Failed to fetch current budgets");
        
        // Show error toast
        if (forceRefresh && isMountedRef.current) {
          toast.error("Failed to fetch latest budget data from Meta");
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logger.debug("[CampaignWidget] Budget fetch aborted");
        return;
      }
      
      logger.error("[CampaignWidget] Error fetching current budgets:", error);
      
      // Show error toast
      if (forceRefresh && isMountedRef.current) {
        toast.error("An unexpected error occurred");
      }
    } finally {
      removeAbortController(controller);
      if (isMountedRef.current) {
        setIsLoadingBudgets(false);
      }
    }
  }, [brandId, createAbortController, removeAbortController]);
  
  // Fetch budgets on mount and when brandId changes
  useEffect(() => {
    if (brandId) {
      fetchCurrentBudgets(true);
    }
  }, [brandId, fetchCurrentBudgets]);
  
  // Add a function to bulk refresh all campaign statuses
  const bulkRefreshCampaignStatuses = useCallback(async () => {
    if (!brandId) return;
    
    // console.log(`[CampaignWidget] Starting bulk refresh of all campaign statuses for brand ${brandId}`);
    
    const toastId = toast.loading("Refreshing campaign statuses...");
    setRefreshing(true);
    
    try {
      // Call the new bulk refresh API
      const response = await fetch('/api/meta/refresh-campaign-statuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh campaign statuses: ${response.status}`);
      }
      
      const data = await response.json();
      
      // console.log(`[CampaignWidget] Bulk refresh completed: ${data.message}`);
      
      // 🚨 REMOVED: CampaignWidget should NOT call campaigns API directly
      // This was causing race conditions with MetaTab2's fetchCampaigns
      // Campaign data is passed as props from MetaTab2
      logger.debug(`[CampaignWidget] 🚨 RACE CONDITION PREVENTED: Not calling campaigns API directly in bulk refresh`);
      
      // Trigger parent refresh instead of direct API call
      if (onRefresh) {
        onRefresh();
      }
      
      toast.success(`Updated ${data.refreshedCount} campaign statuses`, { id: toastId });
      
      // Update our local campaigns with the new statuses
      if (data.details && data.details.length > 0) {
        const updatedMap = new Map();
        
        data.details.forEach((result: any) => {
          if (result.success && result.campaignId && result.status) {
            updatedMap.set(result.campaignId, result.status);
          }
        });
        
        if (updatedMap.size > 0) {
          setLocalCampaigns(currentCampaigns => 
            currentCampaigns.map(c => {
              const newStatus = updatedMap.get(c.campaign_id);
              return newStatus 
                ? { ...c, status: newStatus, last_refresh_date: new Date().toISOString() } 
                : c;
            })
          );
        }
      }
      
      return true;
    } catch (error) {
      toast.error("Failed to refresh campaign statuses", { id: toastId });
      return false;
    } finally {
      setRefreshing(false);
    }
  }, [brandId, dateRange]);

  // Add event listeners for refresh events
  useEffect(() => {
    if (!brandId) return;
    
    logger.debug(`[CampaignWidget] Setting up refresh event listeners`);
    
    // Define the event handler function
    const handleRefresh = (event: Event) => {
      if (!isMountedRef.current || refreshing || refreshInProgressRef.current) {
        logger.debug('[CampaignWidget] Skipping refresh - component refreshing or not mounted');
        return;
      }
      
      const now = Date.now();
      const lastRefreshTime = lastRefresh.current || 0;
      
      // Very aggressive throttling - minimum 10 seconds between refreshes
      if (now - lastRefreshTime < 10000) {
        logger.debug(`[CampaignWidget] Throttling refresh - last refresh ${Math.round((now - lastRefreshTime)/1000)}s ago`);
        return;
      }
      
      // Update last refresh time immediately to block other events
      lastRefresh.current = now;
      
      // First, set loading states to prevent repeated calls
      setRefreshing(true);
      refreshInProgressRef.current = true;
      
      // Look for CustomEvent details
      let eventBrandId: string | undefined;
      let forceRefresh: boolean = false;
      if (event instanceof CustomEvent && event.detail) {
        eventBrandId = event.detail.brandId;
        forceRefresh = !!event.detail.forceRefresh;
      }
      
      logger.debug(`[CampaignWidget] Processing ${event.type} event, force=${forceRefresh}`);
      
      // Call refresh with slight delay
      setTimeout(() => {
        if (isMountedRef.current && typeof onRefresh === 'function') {
          onRefresh(forceRefresh);
          
          // Clear refreshing state after minimum time
      setTimeout(() => {
            if (isMountedRef.current) {
        setRefreshing(false);
              refreshInProgressRef.current = false;
            }
          }, 2000);
        }
      }, 100);
    };
    
    // Create debounced version of the handler
    const debouncedHandler = debounce('global-refresh-handler', handleRefresh, 300);
    
    // Add listeners for all event types using the debounced handler
    window.addEventListener('page-refresh', debouncedHandler as EventListener);
    window.addEventListener('metaDataRefreshed', debouncedHandler as EventListener);
    window.addEventListener('meta_platform_refresh', debouncedHandler as EventListener);
    window.addEventListener('meta-data-refreshed', debouncedHandler as EventListener);
    document.addEventListener('meta-refresh-all', debouncedHandler as EventListener);
    window.addEventListener('force-refresh-campaign-status', debouncedHandler as EventListener);
    document.addEventListener('force-refresh-campaign-status', debouncedHandler as EventListener);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('page-refresh', debouncedHandler as EventListener);
      window.removeEventListener('metaDataRefreshed', debouncedHandler as EventListener);
      window.removeEventListener('meta_platform_refresh', debouncedHandler as EventListener);
      window.removeEventListener('meta-data-refreshed', debouncedHandler as EventListener);
      document.removeEventListener('meta-refresh-all', debouncedHandler as EventListener);
      window.removeEventListener('force-refresh-campaign-status', debouncedHandler as EventListener);
      document.removeEventListener('force-refresh-campaign-status', debouncedHandler as EventListener);
    };
  }, [brandId, onRefresh, refreshing, refreshInProgressRef, isMountedRef]);
  
  // Handle platform refresh event - fetch ad sets for currently loaded campaigns
  const handlePlatformRefresh = useCallback((event?: Event) => {
    if (!brandId || !isMountedRef.current) return;
    
    // Apply very aggressive throttling to this function - once per 30 seconds max
    if (!throttle('platform-refresh', 30000)) {
      logger.debug(`[CampaignWidget] Throttling platform refresh - called too frequently`);
      return;
    }
    
    // Log the event for debugging only when debug logging is enabled
    if (DEBUG_LOGGING) {
    if (event) {
      // console.log(`[CampaignWidget] Received platform refresh event:`, 
      //   event instanceof CustomEvent ? event.detail : 'Non-custom event');
    } else {
      // console.log(`[CampaignWidget] Handle platform refresh called directly`);
      }
    }
    
    // Skip if there are no campaigns with ad sets loaded
    if (campaignsWithAdSets.size === 0) {
      logger.debug(`[CampaignWidget] No campaigns with ad sets to refresh`);
      return;
    }
    
    // Skip refresh if already loading ad sets to prevent spam loading
    if (isLoadingAdSets || refreshing || refreshInProgressRef.current) {
      logger.debug(`[CampaignWidget] Skipping refresh because ad sets are already loading or component is refreshing`);
      return;
    }
    
    logger.debug(`[CampaignWidget] Refreshing ad sets for ${campaignsWithAdSets.size} campaigns`);
    
    // We'll only refresh the expanded campaign if one is open to avoid spamming
    if (expandedCampaign && campaignsWithAdSets.has(expandedCampaign)) {
      logger.debug(`[CampaignWidget] Prioritizing refresh for expanded campaign: ${expandedCampaign}`);
      fetchAdSets(expandedCampaign, true);
      return;
    }
    
    // If no campaign is expanded, refresh all campaigns with ad sets one at a time
    const campaignIds = Array.from(campaignsWithAdSets);
    if (campaignIds.length > 0) {
      // Limit to refreshing only the first campaign to reduce API load
      logger.debug(`[CampaignWidget] Auto-refreshing ad sets for first campaign: ${campaignIds[0]}`);
      fetchAdSets(campaignIds[0], true);
    }
  }, [brandId, fetchAdSets, campaignsWithAdSets, isMountedRef, isLoadingAdSets, expandedCampaign, refreshing, refreshInProgressRef]);

  // Add event listeners for date range changes
  useEffect(() => {
    if (!brandId || !dateRange?.from || !dateRange?.to) return;
    
    // When date range changes, refresh all data
    // console.log(`[CampaignWidget] Date range changed: ${dateRange.from.toISOString()} - ${dateRange.to.toISOString()}`);
    
    // Clear cached ad sets data for all campaigns when date range changes
    // console.log(`[CampaignWidget] Date range changed - clearing cached ad sets data for all campaigns`);
    setAdSets([]); // Clear all ad sets data
    setCampaignsWithAdSets(new Set()); // Reset the cache of fetched campaigns
    
    if (expandedCampaign) {
      // Add a slight delay to prevent multiple fetches
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          fetchAdSets(expandedCampaign, true);
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [dateRange, brandId, expandedCampaign, fetchAdSets]);

  // Add this function to update campaign statuses regularly
  useEffect(() => {
    if (!campaigns.length || !brandId) return;
    
    // Temporarily disable status check on initial load for debugging
    // checkCampaignStatuses(campaigns);
    
    // Check for recent status updates every 1-2 minutes to keep them fresh
    const intervalId = setInterval(() => {
      // Don't refresh if the user has manually refreshed recently
      if (refreshing) {
        logger.debug("[CampaignWidget] Skipping auto refresh because manual refresh is in progress");
        return;
      }
      
      // Check if we should refresh (apply throttling)
      if (!throttle('auto-refresh-campaign-statuses', 120000)) {
        logger.debug("[CampaignWidget] Throttled auto-refresh of campaign statuses");
        return;
      }
      
      // Temporarily disable periodic status check for debugging
      // logger.debug("[CampaignWidget] Auto-refreshing campaign statuses");
      // // Only check active campaigns to minimize API calls
      // const activeCampaigns = campaigns.filter(c => c.status.toUpperCase() === 'ACTIVE');
      // if (activeCampaigns.length > 0) {
      //   checkCampaignStatuses(activeCampaigns.slice(0, 2));
      // }
    }, 120000); // 2 minutes interval
    
    return () => {
      clearInterval(intervalId);
    };
  }, [campaigns, brandId, checkCampaignStatuses, refreshing]);

  // Add helper function for budget display
  const formatBudgetWithType = useCallback((budget: number, budgetType: string | null | undefined) => {
    if (!budget || budget <= 0) return '$0.00';
    
    const formattedAmount = formatCurrency(budget);
    
    if (budgetType?.toLowerCase() === 'daily') {
      return `${formattedAmount}/day`;
    }
    
    return formattedAmount;
  }, []);

  // Toggle sort order function
  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  }, [sortOrder]);

  // Handle sort click for status
  const handleStatusSortClick = useCallback(() => {
    setSortBy('status');
    toggleSortOrder();
  }, [setSortBy, toggleSortOrder]);

  // Handle sort click for metrics
  const handleMetricSortClick = useCallback((metricId: string) => {
    setSortBy(metricId);
    toggleSortOrder();
  }, [setSortBy, toggleSortOrder]);

  // Handle column header click
  const handleColumnHeaderClick = useCallback((metricId: string) => {
    if (sortBy === metricId) {
      toggleSortOrder();
    } else {
      setSortBy(metricId);
      setSortOrder('desc');
    }
  }, [sortBy, setSortBy, setSortOrder, toggleSortOrder]);

  // Toggle ad set expansion with improved event handling
  const toggleAdSetExpand = useCallback((adSetId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedAdSet(prev => prev === adSetId ? null : adSetId);
  }, []);

  // Handle clicks on ad set rows
  const handleAdSetRowClick = useCallback((adSetId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent campaign toggle
    toggleAdSetExpand(adSetId);
  }, [toggleAdSetExpand]);

  // Filter campaigns based on search query and inactive status
  const filteredCampaigns = useMemo(() => {
    const processedCampaigns = localCampaigns.map(campaign => {
      // DEBUG LOG campaign details to diagnose zero values
      // console.log(`[CW DEBUG] Processing campaign ${campaign.campaign_id}:`, {
      //   name: campaign.campaign_name,
      //   spent: campaign.spent, 
      //   impressions: campaign.impressions,
      //   clicks: campaign.clicks,
      //   hasDailyInsights: campaign.daily_insights?.length > 0,
      //   insightsCount: campaign.daily_insights?.length || 0
      // });
      
      // ALWAYS try to aggregate metrics from daily_insights when they exist
      // This ensures we use the most detailed data available
      const hasDailyInsights = campaign.daily_insights && campaign.daily_insights.length > 0;

      if (hasDailyInsights) {
        // console.log(`[CW DEBUG] Campaign ${campaign.campaign_id} has ${campaign.daily_insights.length} daily insights`);
        
        // Log current date range
        // console.log(`[CW DEBUG RANGE] Current dateRange:`, {
        //   from: dateRange?.from?.toISOString(),
        //   to: dateRange?.to?.toISOString(),
        //   fromLocal: dateRange?.from?.toString(),
        //   toLocal: dateRange?.to?.toString()
        // });
        
        let aggregatedSpent = 0;
        let aggregatedImpressions = 0;
        let aggregatedClicks = 0;
        let aggregatedConversions = 0;
        
        let aggregatedPurchaseValue = 0;
        let insightsInRange = 0;

        campaign.daily_insights.forEach(insight => {
          const insightDateStr = insight.date; // e.g., "2025-05-22"
          // Parse as local midnight by appending T00:00:00
          const insightDateObj = new Date(insightDateStr + "T00:00:00"); 

          let effectiveRangeStart = dateRange?.from;
          let effectiveRangeEnd = dateRange?.to;

          // If dateRange is a single day, adjust effectiveRangeEnd to be end of that day
          if (effectiveRangeStart && effectiveRangeEnd && 
              effectiveRangeStart.getFullYear() === effectiveRangeEnd.getFullYear() &&
              effectiveRangeStart.getMonth() === effectiveRangeEnd.getMonth() &&
              effectiveRangeStart.getDate() === effectiveRangeEnd.getDate()) {
            
            // console.log(`[CW DEBUG SINGLE] Detected single day range, adjusting end time`);
            // Create a new Date object for effectiveRangeEnd to avoid mutating the prop
            effectiveRangeEnd = new Date(effectiveRangeStart);
            effectiveRangeEnd.setHours(23, 59, 59, 999);
          }

          // Log all date objects in ISO format for consistent comparison across timezones
          // console.log(`[CW DEBUG DATE] Insight "${insightDateStr}" -> Parsed: ${insightDateObj.toISOString()}, Range: ${effectiveRangeStart?.toISOString()} to ${effectiveRangeEnd?.toISOString()}`);
          // console.log(`[CW DEBUG DATE] Insight metrics:`, {
          //   spent: insight.spent,
          //   impressions: insight.impressions, 
          //   clicks: insight.clicks,
          //   conversions: insight.conversions
          // });

          let isInRange = false;
          if (effectiveRangeStart && effectiveRangeEnd && insightDateObj >= effectiveRangeStart && insightDateObj <= effectiveRangeEnd) {
            isInRange = true;
          }
          
          // console.log(`[CW DEBUG DATE] Is "${insightDateStr}" in range? ${isInRange}`);
          
          if (isInRange) {
            insightsInRange++;
            aggregatedSpent += Number(insight.spent || 0);
            aggregatedImpressions += Number(insight.impressions || 0);
            aggregatedClicks += Number(insight.clicks || 0);
            aggregatedConversions += Number(insight.conversions || 0);
            if (insight.value) {
              aggregatedPurchaseValue += Number(insight.value || 0);
            }
          }
        });

        // Log the aggregated metrics for debugging
        // console.log(`[CW DEBUG] Campaign ${campaign.campaign_id}: Found ${insightsInRange} insights in selected date range. Aggregated metrics:`, {
        //   spent: aggregatedSpent,
        //   impressions: aggregatedImpressions,
        //   clicks: aggregatedClicks,
        //   conversions: aggregatedConversions,
        //   purchaseValue: aggregatedPurchaseValue
        // });

        const calculatedRoas = aggregatedSpent > 0 ? aggregatedPurchaseValue / aggregatedSpent : 0;
        
        
        // 🚨 CRITICAL FIX: Don't override spent - API provides correct aggregated value
        // The aggregation from daily_insights is incomplete and causes wrong display values
        // Use API spent value as source of truth, only aggregate other metrics
        return {
          ...campaign,
          // spent: aggregatedSpent, // ❌ REMOVED: This was overriding correct API value
          // Keep original campaign.spent from API
          impressions: aggregatedImpressions,
          clicks: aggregatedClicks,
          conversions: aggregatedConversions,
          roas: calculatedRoas > 0 ? calculatedRoas : campaign.roas || 0,
          ctr: aggregatedImpressions > 0 ? (aggregatedClicks / aggregatedImpressions) : 0,
          cpc: aggregatedClicks > 0 ? aggregatedSpent / aggregatedClicks : 0,
          cost_per_conversion: aggregatedConversions > 0 ? aggregatedSpent / aggregatedConversions : 0,
          has_data_in_range: insightsInRange > 0
        };
      }
      return campaign;
    });

    const filteredAndSortedCampaigns = processedCampaigns.filter(campaign => {
      const searchMatch = 
        !searchQuery || 
        (campaign.campaign_name && campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (campaign.account_name && campaign.account_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const statusMatch = showInactive || campaign.status.toUpperCase() === 'ACTIVE';
      return searchMatch && statusMatch;
    }).sort((a, b) => {
      if (sortBy === 'status') {
        const aActive = a.status.toUpperCase() === 'ACTIVE';
        const bActive = b.status.toUpperCase() === 'ACTIVE';
        if (aActive && !bActive) return sortOrder === 'asc' ? 1 : -1;
        if (!aActive && bActive) return sortOrder === 'asc' ? -1 : 1;
        return a.status.localeCompare(b.status) * (sortOrder === 'asc' ? 1 : -1);
      }
      const aValue = a[sortBy as keyof Campaign] as number || 0;
      const bValue = b[sortBy as keyof Campaign] as number || 0;
      return (aValue - bValue) * (sortOrder === 'asc' ? 1 : -1);
    });

    if (DEBUG_LOGGING) {
      // console.log(`[CW DEBUG] Filtered & Sorted Campaigns Count: ${filteredAndSortedCampaigns.length}`);
      if (filteredAndSortedCampaigns.length > 0) {
          // console.log(`[CW DEBUG] First Filtered & Sorted Campaign Prop Metrics:`, {
          //     name: filteredAndSortedCampaigns[0].campaign_name,
          //     id: filteredAndSortedCampaigns[0].campaign_id,
          //     spend: filteredAndSortedCampaigns[0].spent,
          //     impressions: filteredAndSortedCampaigns[0].impressions,
          //     clicks: filteredAndSortedCampaigns[0].clicks,
          //     status: filteredAndSortedCampaigns[0].status,
          //     roas: filteredAndSortedCampaigns[0].roas
          // });
      }
    }
    return filteredAndSortedCampaigns;
  }, [localCampaigns, searchQuery, showInactive, sortBy, sortOrder, dateRange]);

  // Toggle metric visibility
  const toggleMetric = useCallback((metricId: string) => {
    setVisibleMetrics(prev => {
      if (prev.includes(metricId)) {
        return prev.filter(id => id !== metricId);
      } else {
        return [...prev, metricId];
      }
    });
  }, []);

  // Format values based on type (keep existing)
  const formatValue = useCallback((value: number | null | undefined, format: string): string => { // Added : string return type
    // Handle null/undefined/NaN values
    if (value === null || value === undefined || isNaN(value)) {
      return format === 'currency' ? '$0.00' : format === 'percentage' ? '0%' : '0';
    }
    
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      case 'roas':
        return value <= 0 ? '0.00x' : `${value.toFixed(2)}x`;
      default:
        return formatNumber(value);
    }
  }, []);

  // Define the return type for the budget object
  type CampaignBudgetData = {
    budget: number;
    formatted_budget: string;
    budget_type: string;
    budget_source: string;
  };

  // Calculate campaign budget - enhanced to work like TotalBudgetMetricCard
  const getCampaignBudget = (campaign: Campaign, campaignAdSets: AdSet[] | null = null): CampaignBudgetData => {
    // console.log(`[CampaignWidget] Getting budget for campaign ${campaign.campaign_id}:`, {
    //   campaign_budget: campaign.budget,
    //   adset_budget_total: campaign.adset_budget_total,
    //   budget_type: campaign.budget_type,
    //   isLoading,
    //   isSyncing
    // });
    
    // If we have ad sets for this campaign (from expansion), use their combined budget
    if (expandedCampaign === campaign.campaign_id && campaignAdSets && campaignAdSets.length > 0) {
      // Corrected filter: Only sum up ACTIVE ad sets for the expanded view
      const activeAdSets = campaignAdSets.filter(adSet => adSet.status === 'ACTIVE');
      const totalAdSetBudget = activeAdSets.reduce((sum, adSet) => sum + (adSet.budget || 0), 0);
      
      // console.log(`[CampaignWidget] Using expanded ad sets budget (ACTIVE only): $${totalAdSetBudget} from ${activeAdSets.length} of ${campaignAdSets.length} ad sets.`);
      
      return {
        budget: totalAdSetBudget,
        formatted_budget: formatCurrency(totalAdSetBudget),
        budget_type: activeAdSets.some(adSet => adSet.budget_type === 'daily') ? 'daily' : 'lifetime',
        budget_source: 'adsets'
      };
    }
    
    // If campaign has adset_budget_total (the preferred source from the campaigns API)
    if (campaign.adset_budget_total && campaign.adset_budget_total > 0) {
      // console.log(`[CampaignWidget] Using adset_budget_total: $${campaign.adset_budget_total}`);
      return {
        budget: campaign.adset_budget_total,
        formatted_budget: formatCurrency(campaign.adset_budget_total),
        budget_type: campaign.budget_type || 'unknown',
        budget_source: 'adsets_total'
      };
    }
    
    // If campaign has a budget field that's greater than 0, use that
    if (campaign.budget && campaign.budget > 0) {
      // console.log(`[CampaignWidget] Using campaign.budget: $${campaign.budget}`);
      return {
        budget: campaign.budget,
        formatted_budget: formatCurrency(campaign.budget),
        budget_type: campaign.budget_type || 'unknown',
        budget_source: 'campaign'
      };
    }
    
    // Check current budgets from API
    const currentBudgetData = currentBudgets[campaign.id];
    if (currentBudgetData?.budget && currentBudgetData.budget > 0) {
      // console.log(`[CampaignWidget] Using currentBudgets API data: $${currentBudgetData.budget}`);
      return {
        budget: currentBudgetData.budget,
        formatted_budget: currentBudgetData.formatted_budget || formatCurrency(currentBudgetData.budget),
        budget_type: currentBudgetData.budget_type || 'unknown',
        budget_source: 'api'
      };
    }
    
    // If we're still loading or syncing, don't show $0.00 - this is key!
    if (isLoading || isSyncing || isLoadingBudgets) {
      // console.log(`[CampaignWidget] Still loading/syncing, returning placeholder budget`);
    return {
        budget: 0,
        formatted_budget: '...', // Show loading indicator instead of $0.00
        budget_type: 'unknown',
        budget_source: 'loading'
      };
    }
    
    // Last resort - return 0 but only if we're not loading
    // console.log(`[CampaignWidget] No budget data found, returning $0.00`);
    return {
      budget: 0,
      formatted_budget: formatCurrency(0),
      budget_type: 'unknown',
      budget_source: 'none'
    };
  };

  // Function to refresh single campaign status
  const refreshCampaignStatus = useCallback(async (campaignId: string, force: boolean = false): Promise<void> => {
    if (!brandId || !campaignId) return;
    
    logger.debug(`[CampaignWidget] Refreshing status for campaign ${campaignId}`);
    
    try {
      const response = await fetch(`/api/meta/campaign-status-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          campaignId,
          forceRefresh: force,
          isManualCheck: force // Manual checks are when force is true
        })
      });
      
      if (response.ok) {
        const statusData = await response.json();
        logger.debug(`[CampaignWidget] Status refresh successful for ${campaignId}`);
        
        if (statusData.status) {
          // Update the local campaigns state
          setLocalCampaigns(currentCampaigns => 
            currentCampaigns.map(c => 
              c.campaign_id === campaignId 
                ? { ...c, status: statusData.status, last_refresh_date: statusData.timestamp } 
                : c
            )
          );
          
          // If this is the expanded campaign, refresh its ad sets
          if (expandedCampaign === campaignId) {
            logger.debug(`[CampaignWidget] Refreshing ad sets for expanded campaign after status change`);
            fetchAdSets(campaignId, false);
          }
          
          // Optionally refresh the parent
          if (onRefresh) {
            onRefresh();
          }
        }
      } else {
        logger.error(`[CampaignWidget] Status refresh failed for ${campaignId}`);
        toast.error("Failed to refresh campaign status");
      }
    } catch (error) {
      logger.error(`[CampaignWidget] Error refreshing status: ${error}`);
      toast.error("An error occurred while refreshing campaign status");
    }
  }, [brandId, expandedCampaign, fetchAdSets, onRefresh]);

  // Updated getCampaignReach to use preloaded data more safely
  // --> PRIORITIZE campaign.reach from props first!
  const getCampaignReach = (campaign: Campaign): number => {
    // 1. Use the reach value provided in the campaign prop (from the backend API)
    // Check if it exists and is a valid number
    if (campaign && typeof campaign.reach === 'number' && !isNaN(campaign.reach) && campaign.reach >= 0) {
        let finalReach = campaign.reach;
        
        // Apply safety check to campaign.reach: If all other metrics are 0, reach should also be 0
        // This prevents stale cached reach data from showing when there's no activity
        const spent = Number(campaign.spent) || 0;
        const impressions = Number(campaign.impressions) || 0;
        const clicks = Number(campaign.clicks) || 0;
        
        if (finalReach > 0 && spent === 0 && impressions === 0 && clicks === 0) {
            // console.log(`[CampaignWidget] Safety override: Setting reach to 0 for ${campaign.campaign_id} because all other metrics are 0 (preventing stale data)`);
            finalReach = 0;
        }
        
        // Store the calculated value for this campaign
        calculatedReachValues.current[campaign.campaign_id] = finalReach;
        return finalReach;
    }

    // -- Fallback logic if campaign.reach is missing or invalid --
    let reachValue: number = 0; // Default to 0 instead of null
    // console.warn(`[CampaignWidget] Missing or invalid campaign.reach for ${campaign.campaign_id}. Falling back to ad set calculations.`);

    // 2. Check expanded/loaded API data (less accurate sum)
    if (expandedCampaign === campaign.campaign_id && adSets.length > 0) {
      const calculatedReach = adSets.reduce((sum: number, adSet: AdSet) => {
        const adSetReach = Number(adSet.reach);
        return sum + (isNaN(adSetReach) || adSetReach < 0 ? 0 : adSetReach);
      }, 0);
      reachValue = calculatedReach;
      // console.log(`Using EXPANDED/LOADED (API fetch) reach (fallback) for campaign ${campaign.campaign_id}: ${reachValue}`);
    }
    // 3. Check proactively fetched data (less accurate sum)
    else {
      const preloadedAdSets = allCampaignAdSets.get(campaign.campaign_id);
      if (preloadedAdSets && preloadedAdSets.length > 0) {
        // Calculate total, but ensure it's reasonable and valid
        const totalReach = preloadedAdSets.reduce((sum: number, adSet: AdSet) => {
          const adSetReach = Number(adSet.reach);
          return sum + (isNaN(adSetReach) || adSetReach < 0 ? 0 : adSetReach);
        }, 0);

        // If total reach is suspiciously high or invalid, use 0
        if (totalReach > 10000 || isNaN(totalReach)) {
          // console.warn(`Suspicious or invalid preloaded reach value (${totalReach}) for campaign ${campaign.campaign_id}. Using 0 instead.`);
          reachValue = 0;
        } else {
          reachValue = totalReach;
          // console.log(`Using PRELOADED reach (fallback) for campaign ${campaign.campaign_id}: ${reachValue}`);
        }
      } else {
        // 4. Return 0 when no data is available
        // console.log(`No fallback ad set data available for campaign ${campaign.campaign_id}. Returning 0 for reach.`);
        reachValue = 0;
      }
    }
    
    // Final safety check for fallback calculations: If all other metrics are 0, reach should also be 0
    // This prevents stale cached reach data from showing when there's no activity
    const spent = Number(campaign.spent) || 0;
    const impressions = Number(campaign.impressions) || 0;
    const clicks = Number(campaign.clicks) || 0;
    
    if (reachValue > 0 && spent === 0 && impressions === 0 && clicks === 0) {
      // console.log(`[CampaignWidget] Safety override: Setting fallback reach to 0 for ${campaign.campaign_id} because all other metrics are 0 (preventing stale data)`);
      reachValue = 0;
    }
    
    // Store the calculated value for this campaign
    calculatedReachValues.current[campaign.campaign_id] = reachValue;
    
    return reachValue;
  };

  // Add back the proactive fetch function to load ad sets for all campaigns on page load
  const proactivelyFetchAdSets = useCallback(async (campaignsToFetch: Campaign[]): Promise<void> => {
    // --- EARLY RETURN TO DISABLE PROACTIVE FETCH --- 
    // console.log("[CW DEBUG] Proactive fetch DISABLED - returning early.");
    if (true) { // Ensure code below is technically reachable for linter
      return; 
    }
    // --- END DISABLE ---
    
    // Linter thinks this is unreachable, but keep for potential re-enablement
    /*
    if (!brandId || !isMountedRef.current || isPreloadingAdSets || campaignsToFetch.length === 0) return;
    
    // Ensure we have a valid date range before fetching
    if (!dateRange?.from || !dateRange?.to) {
      // console.log(`[CW DEBUG] Skipping proactive fetch - missing date range`);
      return;
    }
    
    const fromDate = dateRange.from.toISOString().split('T')[0];
    const toDate = dateRange.to.toISOString().split('T')[0];
    // console.log(`[CW DEBUG] Starting proactive fetch for ${campaignsToFetch.length} campaigns with date range: ${fromDate} to ${toDate}`);
    
    setIsPreloadingAdSets(true);
    
    const newAdSetsMap = new Map<string, AdSet[]>(allCampaignAdSets); // Start with existing map
    let successCount = 0;
    let failureCount = 0;
    
    // Use Promise.all with a limited batch size to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < campaignsToFetch.length; i += batchSize) {
      if (!isMountedRef.current) break;
      
      const batch = campaignsToFetch.slice(i, i + batchSize);
      // console.log(`[CW DEBUG] Processing batch ${Math.floor(i/batchSize) + 1} with ${batch.length} campaigns`);
      
      // Use Promise.all for parallel processing within the batch with timeout protection
      const batchResults = await Promise.all(batch.map(async (campaign) => {
        if (!isMountedRef.current) return null;
        
        const campaignId = campaign.campaign_id;
        // console.log(`[CW DEBUG] Proactively fetching ad sets for ${campaignId} with date range: ${fromDate} to ${toDate}`);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        try {
          // Construct URL with date range parameters - ALWAYS include date range
          let url = `/api/meta/adsets?brandId=${brandId}&campaignId=${campaignId}&from=${fromDate}&to=${toDate}`;
          
          // Add forceRefresh=true to ensure we get the latest data
          url += '&forceRefresh=true';
          
          // console.log(`[CW DEBUG] Fetching from: ${url}`);
          
          const response = await fetch(url, { 
            signal: controller.signal,
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          clearTimeout(timeoutId);
          if (!isMountedRef.current) return null;
          
          if (response.ok) {
            const responseText = await response.text();
            
            // Debug the raw response to see what we're getting
            // console.log(`[CW DEBUG] Raw response first 200 chars: ${responseText.substring(0, 200)}...`);
            
            let data;
            try {
              data = JSON.parse(responseText);
            } catch (error) {
              console.error(`[CW DEBUG] Failed to parse response: ${error}`);
              failureCount++;
              return null;
            }
            
            // Verify date range is respected
            if (data.dateRange) {
              if (data.dateRange.from !== fromDate || data.dateRange.to !== toDate) {
                // console.warn(`[CW DEBUG] Date range mismatch! Requested: ${fromDate}-${toDate}, Got: ${data.dateRange.from}-${data.dateRange.to}`);
                // Consider skipping this data if dates don't match
              }
            }
            
            const validAdSets = Array.isArray(data.adSets) ? data.adSets : [];
            
            // Verify that the ad sets actually have reach data
            const adSetsWithReach = validAdSets.filter((adSet: AdSet) => 
              adSet.reach !== undefined && 
              adSet.reach !== null && 
              typeof adSet.reach === 'number' && 
              !isNaN(adSet.reach)
            );
            
            // Calculate total reach to verify it's reasonable
            const totalReach = adSetsWithReach.reduce((sum: number, adSet: AdSet) => sum + (Number(adSet.reach) || 0), 0);
            
            if (adSetsWithReach.length > 0) {
              // console.log(`[CW DEBUG] Proactive fetch SUCCESS for ${campaignId} - ${adSetsWithReach.length}/${validAdSets.length} ad sets have reach data. Total reach: ${totalReach}`);
              
              // Skip campaigns with suspiciously high reach values (empirical threshold)
              if (totalReach > 5000) {
                // console.warn(`[CW DEBUG] Suspiciously high reach value (${totalReach}) for campaign ${campaignId}. Skipping.`);
                failureCount++;
                return null;
              }
              
              return { campaignId, adSets: validAdSets, hasReachData: true, totalReach };
            } else if (validAdSets.length > 0) {
              // console.log(`[CW DEBUG] Proactive fetch OK for ${campaignId} but no reach data found in ${validAdSets.length} ad sets.`);
              return { campaignId, adSets: validAdSets, hasReachData: false, totalReach: 0 };
            } else {
              // console.log(`[CW DEBUG] Proactive fetch OK but no ad sets found for ${campaignId}.`);
              return { campaignId, adSets: [], hasReachData: false, totalReach: 0 };
            }
          } else {
            // console.warn(`[CW DEBUG] Proactive fetch FAILED for ${campaignId} - Status: ${response.status}`);
            failureCount++;
            return null;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          if ((error as Error).name === 'AbortError') {
            // console.warn(`[CW DEBUG] Proactive fetch TIMEOUT for ${campaignId}`);
          } else {
            console.error(`[CW DEBUG] Proactive fetch ERROR for ${campaignId}:`, error);
          }
          failureCount++;
          return null;
        }
      }));
      
      // Process successful results from this batch
      for (const result of batchResults) {
        if (result) {
          newAdSetsMap.set(result.campaignId, result.adSets);
          if (result.hasReachData) {
            successCount++;
          }
        }
      }
      
      // Small delay between batches to avoid overwhelming the server
      if (i + batchSize < campaignsToFetch.length && isMountedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (isMountedRef.current) {
      // Show a toast notification with preload results if we get actual data or have failures
      if (successCount > 0 || failureCount > 0) {
        if (successCount > 0) {
          toast.success(`Preloaded data for ${successCount} campaigns`, { 
            duration: 3000,
            position: 'bottom-right'
          });
        }
        if (failureCount > 0 && successCount === 0) {
          toast.error(`Failed to preload data for ${failureCount} campaigns`, {
            duration: 3000,
            position: 'bottom-right'
          });
        }
      }
      
      // console.log(`[CW DEBUG] Completed proactive fetch. Success: ${successCount}, Failed: ${failureCount}`);
      setAllCampaignAdSets(newAdSetsMap);
      setIsPreloadingAdSets(false);
    }
    */
  }, [brandId, dateRange, isPreloadingAdSets, allCampaignAdSets, isMountedRef]);

  // Add back useEffect to trigger proactive fetch when the page loads with campaigns
  useEffect(() => {
    // COMPLETELY DISABLED to avoid unnecessary API calls and render loops
    return; // Early return - never execute this effect
    
    /* Original code commented out to preserve behavior while preventing execution
    if (campaigns && campaigns.length > 0 && !isLoading && !isPreloadingAdSets) {
      // Filter campaigns that don't have ad sets loaded yet
      const campaignsToFetch = campaigns.filter(c => !allCampaignAdSets.has(c.campaign_id));
      if (campaignsToFetch.length > 0) {
        // console.log(`[CW DEBUG] Triggering proactive fetch for ${campaignsToFetch.length} campaigns.`);
        proactivelyFetchAdSets(campaignsToFetch);
      }
    }
    */
  }, [campaigns, isLoading, proactivelyFetchAdSets, allCampaignAdSets]);

  // Reset proactively fetched data when brand or date range changes
  useEffect(() => {
    // --- MODIFIED: Only clear currently viewed ad sets, not the whole proactive cache ---
    // setAllCampaignAdSets(new Map()); 
    setAdSets([]); // Clear currently viewed ad sets
    setCampaignsWithAdSets(new Set()); // Reset fetched tracker
    // console.log("[CW DEBUG] Brand ID or Date Range changed, cleared current ad sets view and fetched tracker.");
  }, [brandId, dateRange]);

  // Near the end of the component, add this effect to notify the parent when reach values change:
  useEffect(() => {
    // Notify parent of all calculated reach values
    if (onReachValuesCalculated && Object.keys(calculatedReachValues.current).length > 0) {
      onReachValuesCalculated(calculatedReachValues.current);
    }
  }, [calculatedReachValues.current, onReachValuesCalculated]);

  // Function to refresh single ad set status
  const refreshAdSetStatus = useCallback(async (adsetId: string, force: boolean = false): Promise<void> => {
    if (!brandId || !adsetId) return;
    
    logger.debug(`[CampaignWidget] Refreshing status for ad set ${adsetId}`);
    
    try {
      const response = await fetch(`/api/meta/adset-status-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          adsetId,
          forceRefresh: force
        })
      });
      
      if (response.ok) {
        const statusData = await response.json();
        logger.debug(`[CampaignWidget] Status refresh successful for ad set ${adsetId}`);
        
        if (statusData.status) {
          // Update the local ad sets state
          setAdSets(currentAdSets => 
            currentAdSets.map(a => 
              a.adset_id === adsetId 
                ? { ...a, status: statusData.status, updated_at: statusData.timestamp } 
                : a
            )
          );
          
          // Also update allCampaignAdSets
          setAllCampaignAdSets(current => {
            const newMap = new Map(current);
            
            // Find which campaign this adset belongs to
            for (const [campaignId, adsets] of newMap.entries()) {
              const updatedAdsets = adsets.map(a => 
                a.adset_id === adsetId 
                  ? { ...a, status: statusData.status, updated_at: statusData.timestamp } 
                  : a
              );
              
              // If we found and updated the ad set, update the map
              if (updatedAdsets.some(a => a.adset_id === adsetId)) {
                newMap.set(campaignId, updatedAdsets);
              }
            }
            
            return newMap;
          });
          
          // If this is the expanded ad set, refresh its ads
          if (expandedAdSet === adsetId) {
            logger.debug(`[CampaignWidget] Ad set status changed, notifying ad component to refresh`);
            // Instead of directly calling a function, we'll dispatch a custom event that AdComponent can listen to
            window.dispatchEvent(new CustomEvent('adset-status-changed', { detail: { adsetId } }));
          }
        }
      } else {
        logger.error(`[CampaignWidget] Status refresh failed for ad set ${adsetId}`);
        // toast.error("Failed to refresh ad set status");
      }
    } catch (error) {
      logger.error(`[CampaignWidget] Error refreshing ad set status: ${error}`);
      // toast.error("An error occurred while refreshing ad set status");
    }
  }, [brandId, expandedAdSet]);

  // Function to check multiple ad set statuses
  const checkAdSetStatuses = useCallback((adSetsToCheck: AdSet[], forceRefresh = false): void => {
    if (!brandId || !isMountedRef.current || adSetsToCheck.length === 0) return;
    
    // Apply throttling to prevent multiple status checks
    const key = `check-adset-statuses-${brandId}`;
    if (!forceRefresh && !throttle(key, 15000)) {
      logger.debug(`[CampaignWidget] Throttled ad set status check - skipping`);
      return;
    }
    
    // Log what we're doing
    logger.debug(`[CampaignWidget] Checking statuses for ${adSetsToCheck.length} ad sets, forceRefresh: ${forceRefresh}`);
    
    // Filter out ad sets with invalid adset_id values
    const validAdSets = adSetsToCheck.filter(adSet => 
      adSet && adSet.adset_id && typeof adSet.adset_id === 'string' && adSet.adset_id.trim() !== ''
    );
    
    if (validAdSets.length === 0) {
      logger.debug('[CampaignWidget] No valid ad sets to check statuses for');
      return;
    }
    
    // Prioritize ad sets: expanded > active > recently modified > others
    const prioritizedAdSets = [...validAdSets].sort((a, b) => {
      // Put expanded ad set first
      if (a.adset_id === expandedAdSet) return -1;
      if (b.adset_id === expandedAdSet) return 1;
      
      // Then active ad sets
      const aActive = a.status.toUpperCase() === 'ACTIVE';
      const bActive = b.status.toUpperCase() === 'ACTIVE';
      
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      
      // Then recently modified ones
      const aDate = new Date(a.updated_at || 0);
      const bDate = new Date(b.updated_at || 0);
      
      // More recent ones first
      return bDate.getTime() - aDate.getTime();
    });
    
    // Process more ad sets when forceRefresh is true, but limit to avoid rate limits
    const batchSize = forceRefresh ? Math.min(5, prioritizedAdSets.length) : Math.min(2, prioritizedAdSets.length);
    const adSetsToProcess = prioritizedAdSets.slice(0, batchSize);
    
    logger.debug(`[CampaignWidget] Processing ${adSetsToProcess.length} ad sets for status check`);
    
    let updatedCount = 0;
    let pendingRequests = adSetsToProcess.length;
    
    // Check each ad set's status with a slight delay between requests
    adSetsToProcess.forEach((adSet, index) => {
      // Add a small delay between requests to avoid rate limiting
      setTimeout(() => {
        if (!isMountedRef.current) return;
        
        // Extra validation before API call
        if (!adSet || !adSet.adset_id) {
          logger.debug('[CampaignWidget] Invalid ad set object or missing adset_id');
          pendingRequests--;
          return;
        }
        
        // Only log in debug mode
        logger.debug(`[CampaignWidget] Checking status for ad set: ${adSet.adset_id}`);
        
        fetch(`/api/meta/adset-status-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brandId,
            adsetId: adSet.adset_id,
            forceRefresh
          })
        })
        .then(response => response.json())
        .then(statusData => {
          pendingRequests--;
          
          // Skip update if we have an error
          if (statusData.error) {
            return;
          }
          
          if (statusData.status) {
            // Always update local state when force refreshing, otherwise only update if status changed
            const shouldUpdate = forceRefresh || statusData.status.toUpperCase() !== adSet.status.toUpperCase();
            
            if (shouldUpdate) {
              logger.debug(`[CampaignWidget] Status update: ${adSet.adset_id} from ${adSet.status} to ${statusData.status}`);
              updatedCount++;
              
              // Update the ad sets state
              setAdSets(currentAdSets => 
                currentAdSets.map(a => 
                  a.adset_id === adSet.adset_id 
                    ? { ...a, status: statusData.status, updated_at: statusData.timestamp } 
                    : a
                )
              );
              
              // Also update allCampaignAdSets
              setAllCampaignAdSets(current => {
                const newMap = new Map(current);
                
                // Find which campaign this adset belongs to
                for (const [campaignId, adsets] of newMap.entries()) {
                  const updatedAdsets = adsets.map(a => 
                    a.adset_id === adSet.adset_id 
                      ? { ...a, status: statusData.status, updated_at: statusData.timestamp } 
                      : a
                  );
                  
                  // If we found and updated the ad set, update the map
                  if (updatedAdsets.some(a => a.adset_id === adSet.adset_id)) {
                    newMap.set(campaignId, updatedAdsets);
                  }
                }
                
                return newMap;
              });
              
              // If this is the expanded ad set, notify the AdComponent
              if (expandedAdSet === adSet.adset_id) {
                window.dispatchEvent(new CustomEvent('adset-status-changed', { detail: { adsetId: adSet.adset_id } }));
              }
            }
          }
        })
        .catch(error => {
          pendingRequests--;
          logger.debug(`[CampaignWidget] Error checking status for ad set ${adSet.adset_id}:`, error);
        });
      }, index * (forceRefresh ? 500 : 2000)); // Increase delay between requests to reduce rate limiting
    });
  }, [brandId, expandedAdSet, isMountedRef]);

  // Add effect to check ad set statuses when ad sets change
  useEffect(() => {
    if (adSets.length > 0) {
      // Check ad set statuses when we have ad sets loaded
      checkAdSetStatuses(adSets);
    }
  }, [adSets, checkAdSetStatuses]);

  // Add effect to periodically check ad set statuses when the expanded campaign changes
  useEffect(() => {
    if (!expandedCampaign || adSets.length === 0) return;
    
    // Check statuses immediately when a campaign is expanded
    checkAdSetStatuses(adSets);
    
    // Set up interval to check statuses periodically
    const intervalId = setInterval(() => {
      if (adSets.length > 0) {
        // Only check active ad sets during interval updates to reduce API calls
        const activeAdSets = adSets.filter(a => a.status.toUpperCase() === 'ACTIVE');
        if (activeAdSets.length > 0) {
          checkAdSetStatuses(activeAdSets.slice(0, 2)); // Limit to 2 ad sets at a time
        }
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, [expandedCampaign, adSets, checkAdSetStatuses]);

  // Return the JSX for the component
  return (
    <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] shadow-md overflow-hidden transition-all duration-200 hover:border-[#444]">
      <CardHeader className="p-3 pb-1.5 border-b border-[#333]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-xNnLSFG1hEPttp3zbiVUSkeeKN3EXY.png" className="w-4 h-4" alt="Meta Logo" />
            <CardTitle className="text-sm font-medium text-white">Campaign Performance</CardTitle>
            <Badge className="bg-zinc-800 text-white border-[#333] text-xs">
              {!isLoading && filteredCampaigns.length} Campaign{!isLoading && filteredCampaigns.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent border-[#333] text-white hover:bg-black/20">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Customize
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#111] border-[#333] text-white">
                <DropdownMenuLabel>Visible Metrics</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#333]" />
                {AVAILABLE_METRICS.map(metric => (
                  <DropdownMenuItem key={metric.id} onSelect={e => { e.preventDefault(); toggleMetric(metric.id); }} className="hover:bg-black/20">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {metric.icon}
                        <span>{metric.name}</span>
                      </div>
                      <div className="flex items-center h-4">
                        {visibleMetrics.includes(metric.id) && <Zap className="h-3.5 w-3.5 text-gray-400" />}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-[#333]" />
                <DropdownMenuItem onSelect={e => { e.preventDefault(); setShowInactive(!showInactive); }} className="hover:bg-black/20">
                  <div className="flex items-center justify-between w-full">
                    <span>Show Inactive Campaigns</span>
                    <Switch checked={showInactive} />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0 pt-0">
        {isLoading || isPreloading || refreshing ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-white/20 border-t-white rounded-full"></div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <BarChart className="h-10 w-10 mb-3 text-white" />
            <h3 className="text-lg font-medium mb-1 text-white">No campaigns found</h3>
            <p className="text-sm text-gray-400 max-w-sm mb-4">
              {searchQuery ? 'Try adjusting your search query or filters' : 'Create a campaign in Meta Ads Manager to get started'}
            </p>

          </div>
        ) : (
          <div className="p-4">
            <div className="pb-3 mb-3 border-b border-[#333] flex items-center">
              <h3 className="text-sm font-medium text-white">Campaign Performance Data</h3>
              <span className="text-xs text-gray-400 ml-2">
                {dateRange?.from && dateRange?.to ? 
                  `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}` : 
                  'All time'}
              </span>
            </div>
            <div className="border border-[#333] rounded-md overflow-hidden bg-[#111]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#333] bg-zinc-900">
                    <th className="text-xs font-medium text-left p-3 text-white">Campaign</th>
                    <th className="text-xs font-medium text-left p-3 text-white">Status</th>
                    <th className="text-xs font-medium text-right p-3 text-white">Budget</th>
                    {visibleMetrics.map(metricId => {
                      const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                      if (!metric) return null;
                      
                      return (
                        <th 
                          key={metricId} 
                          className="text-xs font-medium text-right p-3 cursor-pointer hover:text-gray-100 transition-colors text-white"
                          onClick={() => {
                            handleColumnHeaderClick(metricId);
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {metric.name}
                            {/* Add Tooltip specifically for Reach header */}
                            {metricId === 'reach' && (
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="ml-1 text-xs text-gray-500 cursor-help select-none whitespace-nowrap">
                                      ?
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-black border border-[#333] text-white text-xs max-w-xs">
                                    <p>
                                      Uses Meta's reported campaign reach. This might differ slightly from Meta's dashboard due to API reporting delays or different attribution window settings.
                                      It may also differ from the sum of Ad Set reach below, as campaign reach de-duplicates users across ad sets.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {sortBy === metricId && (
                              sortOrder === 'desc' ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="text-xs font-medium text-center p-3 w-10 text-white"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map(campaign => {
                    // Calculate aggregate metrics ONLY when expanded
                    let isExpandedAndLoaded = expandedCampaign === campaign.campaign_id && adSets.length > 0;
                    let aggregateMetrics: Partial<Campaign> | null = null;
                    if (isExpandedAndLoaded) {
                        // Calculate all aggregates needed
                        const totalSpent = adSets.reduce((sum, adSet) => sum + (Number(adSet.spent) || 0), 0);
                        const totalClicks = adSets.reduce((sum, adSet) => sum + (Number(adSet.clicks) || 0), 0);
                        const totalImpressions = adSets.reduce((sum, adSet) => sum + (Number(adSet.impressions) || 0), 0);
                        const totalReach = adSets.reduce((sum, adSet) => sum + (Number(adSet.reach) || 0), 0); 
                        const totalConversions = adSets.reduce((sum, adSet) => sum + (Number(adSet.conversions) || 0), 0);
                        const aggregateCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
                        const aggregateCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) : 0; // Removed * 100
                        const aggregateCostPerConversion = totalConversions > 0 ? totalSpent / totalConversions : 0;
                        const aggregateRoas = 0; // Needs value calculation

                        aggregateMetrics = {
                            spent: totalSpent,
                            clicks: totalClicks,
                            impressions: totalImpressions,
                            reach: totalReach, 
                            conversions: totalConversions,
                            cpc: aggregateCpc,
                            ctr: aggregateCtr,
                            cost_per_conversion: aggregateCostPerConversion,
                            roas: aggregateRoas,
                        };
                    }
                    
                    return (
                      <React.Fragment key={campaign.id}>
                        <tr 
                          className={`border-b border-[#333] hover:bg-black/10 transition-colors cursor-pointer border-l-4 ${
                            expandedCampaign === campaign.campaign_id 
                              ? 'border-l-gray-600 bg-black/10' 
                              : 'border-l-[#333]'
                          }`}
                          onClick={() => toggleCampaignExpand(campaign.campaign_id)}
                        >
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-medium truncate max-w-xs text-white" title={campaign.campaign_name}>
                                {campaign.campaign_name}
                              </span>
                              <span className="text-xs text-gray-400 truncate max-w-xs" title={campaign.account_name}>
                                {campaign.account_name}
                              </span>
                              {currentBudgets[campaign.id]?.budget_source === 'api' && (
                                <Badge variant="outline" className="mt-1 text-xs text-white border-[#333]">Live Budget</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={`text-xs px-1.5 py-0 h-5 flex items-center gap-1 ${
                              formatCampaignStatus(campaign.status).bgColor} ${
                              formatCampaignStatus(campaign.status).textColor} border ${
                              formatCampaignStatus(campaign.status).borderColor}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                formatCampaignStatus(campaign.status).dotColor}`}></div>
                              {formatCampaignStatus(campaign.status).displayText}
                            </Badge>
                            {!campaign.has_data_in_range && (
                              <Badge className="text-xs px-1.5 py-0 h-5 bg-[#111] text-gray-500 border border-[#333] ml-1">
                                No data in range
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-right text-white">
                            <div className="font-medium">
                              {(() => {
                                const budgetInfo = getCampaignBudget(campaign, expandedCampaign === campaign.campaign_id ? adSets : null);
                                
                                // Show loading skeleton if still loading or budget source is loading
                                if (budgetInfo.budget_source === 'loading' || isLoading || isSyncing) {
                                  return (
                                    <div className="h-5 w-20 animate-pulse bg-gray-700/30 rounded"></div>
                                  );
                                }
                                
                                return formatBudgetWithType(budgetInfo.budget, budgetInfo.budget_type);
                              })()}
                            </div>
                          </td>
                          {visibleMetrics.map(metricId => {
                            const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                            if (!metric) return null;
                            
                            let value: number | null = null;
                            let displayValue: string = '--'; // Default placeholder
                            let isLoading = false;
                            
                            if (metricId === 'reach') {
                              value = getCampaignReach(campaign); // Will always be a number (0 or higher)
                              // Show loading indicator if we're preloading ad sets for this campaign
                              isLoading = isPreloadingAdSets && !allCampaignAdSets.has(campaign.campaign_id);
                              
                              if (isLoading) {
                                displayValue = '···'; // Loading indicator
                              } else {
                                displayValue = formatValue(value, metric.format);
                              }
                            } else {
                              // Metrics should come from the 'campaign' object,
                              // which is processed by 'filteredCampaigns' useMemo and should have daily_insights aggregated.
                              let rawValue = campaign[metricId as keyof Campaign];
                              
                              // Special handling for CTR: campaign CTR is stored as percentage string, convert to decimal
                              if (metricId === 'ctr' && typeof rawValue === 'string') {
                                value = parseFloat(rawValue) / 100; // Convert percentage to decimal for proper formatting
                              } else {
                                value = rawValue as number;
                              }
                              
                              displayValue = formatValue(value, metric.format);
                                }

                            return (
                              <td key={metricId} className="p-3 text-right text-white">
                                <div className="font-medium">
                                  {isLoading && metricId === 'reach' && (
                                    <Loader2 className="inline-block mr-1 h-3 w-3 animate-spin" />
                                  )}
                                  {displayValue}
                                </div>
                                {/* REMOVED Tooltip from here - moved to header */}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center">
                            <div className="flex justify-center">
                              {expandedCampaign === campaign.campaign_id ? (
                                <ChevronUp className="h-4 w-4 text-gray-400 transition-transform duration-200" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200" />
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Row Content */}
                        {expandedCampaign === campaign.campaign_id && (
                          <tr className="bg-[#111] border-b border-[#333]">
                            <td colSpan={visibleMetrics.length + 3} className="p-0">
                              <div className="p-4 border-t border-[#333]">
                                <div className="flex flex-col mb-4">
                                  <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className="border-l-4 border-[#333] pl-2">
                                        <h5 className="text-sm font-semibold text-white">
                                          Ad Sets for Campaign: <span className="text-gray-300">{campaign.campaign_name}</span>
                                        </h5>
                                        <p className="text-xs text-gray-400">
                                          Campaign ID: {campaign.campaign_id} • {campaign.status} • {campaign.objective}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Ad Set Display Logic */}
                                {isLoadingAdSets || !campaignsWithAdSets.has(campaign.campaign_id) && adSets.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-6 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-white mb-3" />
                                    <h3 className="text-md font-medium mb-1 text-white">Loading Ad Sets</h3>
                                    <p className="text-sm text-gray-400">Please wait while we fetch the latest ad set data...</p>
                                  </div>
                                ) : adSets.length > 0 ? (
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                      <Badge variant="outline" className="bg-[#111] text-white border-[#333]">
                                        {adSets.length} Ad Sets
                                      </Badge>
                                      <Badge variant="outline" className="bg-[#111] text-white border-[#333]">
                                        Total Budget: {formatCurrency(adSets.reduce((sum, adSet) => sum + adSet.budget, 0))}
                                      </Badge>
                                      <Badge variant="outline" className="bg-[#111] text-white border-[#333]">
                                        Total Spent: {formatCurrency(adSets.reduce((sum, adSet) => sum + adSet.spent, 0))}
                                      </Badge>
                                    </div>
                                    
                                    <div className="rounded-md overflow-hidden border border-[#333] bg-[#111]">
                                      <table className="w-full">
                                        <thead>
                                          <tr className="border-b border-[#333] bg-zinc-900">
                                            <th className="text-xs font-medium text-left p-2 pl-3 text-white">Ad Set</th>
                                            <th className="text-xs font-medium text-left p-2 text-white">Status</th>
                                            <th className="text-xs font-medium text-right p-2 text-white">Budget</th>
                                            {visibleMetrics.map(metricId => {
                                              if (metricId === 'budget') return null;
                                              
                                              const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                                              if (!metric) return null;
                                              
                                              return (
                                                <th 
                                                  key={metricId} 
                                                  className="text-xs font-medium text-right p-2 text-white"
                                                >
                                                  {metric.name}
                                                </th>
                                              );
                                            })}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {adSets.map((adSet, index) => (
                                            <React.Fragment key={adSet.id}>
                                              <tr 
                                                className={`
                                                  border-b border-[#333] hover:bg-black/10 
                                                  cursor-pointer relative border-l-2 ${
                                                    expandedAdSet === adSet.adset_id 
                                                      ? 'border-l-gray-600 bg-black/5' 
                                                      : 'border-l-[#333]'
                                                  }
                                                `}
                                                onClick={(e) => handleAdSetRowClick(adSet.adset_id, e)}
                                              >
                                                <td className="p-2 pl-3 flex items-center gap-2">
                                                  <div className="flex items-center">
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAdSetRowClick(adSet.adset_id, e);
                                                      }}
                                                      className="mr-2 text-white hover:text-gray-400 transition-colors"
                                                    >
                                                      <ChevronDown className={`h-4 w-4 transition-transform ${
                                                        expandedAdSet === adSet.adset_id ? 'rotate-180' : ''
                                                      }`} />
                                                    </button>
                                                    <div>
                                                      <div className="font-medium text-white">{adSet.adset_name}</div>
                                                      <div className="text-xs text-gray-400">{adSet.adset_id}</div>
                                                    </div>
                                                  </div>
                                                </td>
                                                <td className="p-2">
                                                  <Badge className={`text-xs px-1.5 py-0 h-5 flex items-center gap-1 ${
                                                    formatAdSetStatus(adSet.status).bgColor} ${
                                                    formatAdSetStatus(adSet.status).textColor} border ${
                                                    formatAdSetStatus(adSet.status).borderColor}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                                      formatAdSetStatus(adSet.status).dotColor}`}></div>
                                                    {formatAdSetStatus(adSet.status).displayText}
                                                  </Badge>
                                                </td>
                                                <td className="p-2 text-right">
                                                  <div className="flex flex-col items-end">
                                                    <Badge 
                                                      className="px-2 py-0.5 bg-[#111] border-[#333] text-white"
                                                      variant="outline"
                                                    >
                                                      {formatBudgetWithType(adSet.budget, adSet.budget_type)}
                                                    </Badge>
                                                    <span className="text-xs text-gray-500">
                                                      {adSet.budget_type}
                                                    </span>
                                                  </div>
                                                </td>
                                                {visibleMetrics.map(metricId => {
                                                  if (metricId === 'budget') return null;
                                                  
                                                  const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                                                  if (!metric) return null;
                                                  
                                                  // Map campaign metrics to ad set metrics using 'adSet'
                                                  let value: number;
                                                  switch (metricId) {
                                                    case 'spent':
                                                      value = adSet.spent || 0; // Use adSet
                                                      break;
                                                    case 'impressions':
                                                      value = adSet.impressions || 0; // Use adSet
                                                      break;
                                                    case 'clicks':
                                                      value = adSet.clicks || 0; // Use adSet
                                                      break;
                                                    case 'ctr':
                                                      // Calculate CTR if it's 0 but we have impressions and clicks
                                                      let calculatedCtr = adSet.ctr || 0;
                                                      if ((calculatedCtr === 0) && adSet.impressions > 0 && adSet.clicks > 0) {
                                                        // Correct CTR calculation is clicks / impressions, result is a ratio
                                                        calculatedCtr = (adSet.clicks / adSet.impressions);
                                                      }
                                                      // AdSet CTR is already stored as decimal in database, no conversion needed
                                                      value = calculatedCtr;
                                                      // *** ADDED DEBUG LOG ***
                                                      // console.log(`[CW DEBUG] AdSet CTR Calculation: ID=${adSet.adset_id}, Clicks=${adSet.clicks}, Impressions=${adSet.impressions}, API CTR=${adSet.ctr}, Calculated Value=${value}`);
                                                      break;
                                                    case 'cpc':
                                                      value = adSet.cpc || 0; // Use adSet
                                                      break;
                                                    case 'conversions':
                                                      value = adSet.conversions || 0; // Use adSet
                                                      break;
                                                    case 'cost_per_conversion':
                                                      value = adSet.cost_per_conversion || 0; // Use adSet
                                                      break;
                                                    case 'reach':
                                                      value = adSet.reach || 0; // Use adSet
                                                      break;
                                                    case 'roas':
                                                      // Use adSet for ROAS calculation
                                                      // Placeholder calculation - needs actual revenue data if available
                                                      // if (adSet.conversions > 0 && adSet.spent > 0) {
                                                      //   const estimatedRevenue = adSet.conversions * 25; 
                                                      //   value = estimatedRevenue / adSet.spent;
                                                      // } else {
                                                        value = 0; // Default ROAS to 0 if data is missing
                                                      // }
                                                      break;
                                                    default:
                                                      value = 0;
                                                  }
                                                  
                                                  return (
                                                    <td key={metricId} className="p-2 text-right">
                                                      <div className="font-medium text-white">
                                                        {formatValue(value, metric.format)}
                                                      </div>
                                                    </td>
                                                  );
                                                })}
                                              </tr>
                                              {/* Ad Set expanded content */}
                                              {expandedAdSet === adSet.adset_id && (
                                                <tr className="border-t border-[#333] bg-[#111]">
                                                  <td colSpan={visibleMetrics.length + 3} className="p-0">
                                                    <div className="p-4 border-l-4 border-[#333] mx-2 rounded-md bg-[#111]">
                                                      <AdComponent 
                                                        brandId={brandId}
                                                        adsetId={adSet.adset_id}
                                                        dateRange={dateRange}
                                                        visibleMetrics={visibleMetrics}
                                                        adSetBudget={{
                                                          budget: adSet.budget || 0,
                                                          budget_type: adSet.budget_type || 'daily'
                                                        }}
                                                      />
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <h3 className="text-lg font-medium mb-1 text-white">No ad sets found</h3>
                                    <p className="text-sm text-gray-400 max-w-sm mb-4">
                                      This campaign doesn't have any ad sets or they couldn't be loaded.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
};

// Export the component
export { CampaignWidget };

// Add a status formatter function
const formatCampaignStatus = (status: string) => {
  const normalizedStatus = status.toUpperCase();
  
  if (normalizedStatus === 'ACTIVE') {
    return {
      displayText: 'Active',
      bgColor: 'bg-green-950/30',
      textColor: 'text-green-500',
      borderColor: 'border-green-800/50',
      dotColor: 'bg-green-500'
    };
  } else if (normalizedStatus === 'PAUSED') {
    return {
      displayText: 'Inactive',
      bgColor: 'bg-slate-800/50',
      textColor: 'text-slate-400',
      borderColor: 'border-slate-700/50',
      dotColor: 'bg-slate-400'
    };
  } else if (normalizedStatus === 'DELETED' || normalizedStatus === 'ARCHIVED') {
    return {
      displayText: normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase(),
      bgColor: 'bg-red-950/30',
      textColor: 'text-red-500',
      borderColor: 'border-red-800/50',
      dotColor: 'bg-red-500'
    };
  } else if (normalizedStatus === 'REFRESHING') {
    return {
      displayText: 'Refreshing',
      bgColor: 'bg-gray-950/30',
      textColor: 'text-gray-400',
      borderColor: 'border-gray-800/50',
      dotColor: 'bg-gray-400 animate-pulse'
    };
  } else {
    return {
      displayText: normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase(),
      bgColor: 'bg-gray-950/30',
      textColor: 'text-gray-500',
      borderColor: 'border-gray-800/50',
      dotColor: 'bg-gray-500'
    };
  }
};

// Also create a formatter for adset statuses to ensure consistency
const formatAdSetStatus = (status: string) => {
  return formatCampaignStatus(status); // Reuse the same formatter for consistency
};