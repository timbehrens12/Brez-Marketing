"use client"

import React, { useState, useMemo, useEffect, useCallback, useRef, FC } from 'react'
import { 
  BarChart, LineChart, PieChart, AreaChart, Gauge, ArrowUpRight, ArrowDownRight, 
  Calendar, Filter, MoreHorizontal, Download, ChevronDown, Settings, Table, RefreshCw,
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

// Debug flag to control verbosity
const DEBUG_LOGGING = false;

// Logger for controlled output
const logger = {
  debug: (...args: any[]) => {
    if (DEBUG_LOGGING) {
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    console.log(...args);
  },
  warn: console.warn,
  error: console.error
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
  onRefresh: () => void
  onSync: () => void
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
  onSync 
}: CampaignWidgetProps): JSX.Element => {
  
  // *** DEBUG LOGGING START ***
  console.log("--- CampaignWidget Render --- ");
  console.log(`[CW DEBUG] Received Props: isLoading=${isLoading}, isSyncing=${isSyncing}`);
  console.log(`[CW DEBUG] Received Date Range Prop:`, dateRange ? { from: dateRange.from?.toISOString(), to: dateRange.to?.toISOString() } : 'undefined');
  console.log(`[CW DEBUG] Received Campaigns Prop Count: ${campaigns?.length ?? 0}`);
  if (campaigns && campaigns.length > 0) {
    console.log(`[CW DEBUG] First Campaign Prop Metrics:`, {
        name: campaigns[0].campaign_name,
        id: campaigns[0].campaign_id,
        spend: campaigns[0].spent,
        impressions: campaigns[0].impressions,
        clicks: campaigns[0].clicks,
        status: campaigns[0].status
    });
  }
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
  
  // Need state to track campaign status changes
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
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cancel any pending requests
      pendingRequestsRef.current.forEach(controller => {
        try {
          controller.abort();
        } catch (e) {
          console.error("Error aborting request:", e);
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
    console.log(`[CampaignWidget] [DEBUG] fetchAdSets called with dateRange:`, dateRange);
    if (!dateRange || !dateRange.from || !dateRange.to) {
      console.warn(`[CampaignWidget] [WARNING] Date range is missing or incomplete when fetching ad sets for campaign ${campaignId}`);
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
        console.log(`[CampaignWidget] [DEBUG] Adding date query params: ${dateQuery}`);
        url += dateQuery;
      } else {
        console.warn(`[CampaignWidget] [WARNING] No date range available for ad sets fetch`);
      }
      
      if (forceRefresh) {
          url += `&forceRefresh=true`;
      }
      
      console.log(`[CampaignWidget] [DEBUG] Fetching ad sets from: ${url}`);
      
      let response = await fetch(url, { 
          signal: controller.signal,
          cache: 'no-store', // Add cache busting here too
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      
      // If the regular endpoint fails, try the direct-fetch endpoint
      if (!response.ok) {
        console.log(`[CampaignWidget] Regular endpoint failed with status ${response.status}, response:`, await response.text());
        console.log(`[CampaignWidget] Trying direct-fetch endpoint with date range...`);
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
        
        console.log(`[CampaignWidget] [DEBUG] Direct fetch body:`, directFetchBody);
        
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
      console.log(`[CampaignWidget] [DEBUG] Raw ad sets response (from ${usedDirectFetch ? 'direct' : 'regular'} endpoint): ${responseText.substring(0, 500)}...`);
      
      // Parse the response as JSON (safely)
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error(`[CampaignWidget] Error parsing ad sets response: ${parseError}`);
        throw new Error(`Failed to parse response: ${responseText.substring(0, 100)}`);
      }
      
      // *** Add logging for the actual ad set data received ***
      console.log(`[CampaignWidget] [DEBUG] Parsed ad sets data for campaign ${campaignId}:`, 
        data.adSets ? {
          count: data.adSets.length,
          source: data.source || 'unknown',
          timestamp: data.timestamp || 'unknown',
          dateRange: data.dateRange || 'not specified',
          firstAdSetMetrics: data.adSets[0] ? {
            spent: data.adSets[0].spent,
            impressions: data.adSets[0].impressions,
            clicks: data.adSets[0].clicks,
            reach: data.adSets[0].reach
          } : 'no ad sets'
        } : 'no ad sets data');
      
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
              console.warn(`[CampaignWidget] [WARNING] Response date range (${data.dateRange.from} to ${data.dateRange.to}) does not match requested date range (${requestedDateFrom} to ${requestedDateTo})`);
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
            forceRefresh: forceRefresh
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
          mutate(`/api/meta/campaigns?brandId=${brandId}`);
        }
      }, (campaignsToProcess.length * (forceRefresh ? 600 : 1200)) + 1000); // Wait for all status checks plus a buffer
    }
  }, [brandId, onRefresh, isMountedRef, expandedCampaign, fetchAdSets]);
  
  // Keep local state in sync with props & Log changes
  useEffect(() => {
    console.log("[CW DEBUG] Syncing localCampaigns with props");
    setLocalCampaigns(campaigns);
    
    // Temporarily disable status check on prop update for debugging
    // if (campaigns.length > 0 && brandId) {
    //   console.log("[CW DEBUG] Props updated, checking campaign statuses (throttled)");
    //   setTimeout(() => {
    //     checkCampaignStatuses(campaigns);
    //   }, 500);
    // }
  }, [campaigns, brandId]); // Removed checkCampaignStatuses dependency to simplify

  // Load saved preferences from localStorage
  const loadUserPreferences = useCallback(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    
    try {
      const savedPrefs = localStorage.getItem(`campaign-widget-prefs-${brandId}`);
      if (savedPrefs) {
        return JSON.parse(savedPrefs);
      }
    } catch (error) {
      console.error("Error loading user preferences:", error);
    }
    
    return DEFAULT_PREFERENCES;
  }, [brandId]);
  
  // Save user preferences to localStorage
  const saveUserPreferences = useCallback((prefs: any) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(`campaign-widget-prefs-${brandId}`, JSON.stringify(prefs));
    } catch (error) {
      console.error("Error saving user preferences:", error);
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
    
    console.log(`[CampaignWidget] Starting bulk refresh of all campaign statuses for brand ${brandId}`);
    
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
      
      console.log(`[CampaignWidget] Bulk refresh completed: ${data.message}`);
      
      // Force refresh the campaigns data
      mutate(`/api/meta/campaigns?brandId=${brandId}`);
      
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
      console.error('[CampaignWidget] Error during bulk refresh:', error);
      toast.error("Failed to refresh campaign statuses", { id: toastId });
      return false;
    } finally {
      setRefreshing(false);
    }
  }, [brandId]);

  // Find the useEffect that sets up event listeners and update it
  useEffect(() => {
    let isRefreshing = false;
    let lastRefreshTime = 0;
    const REFRESH_COOLDOWN = 60000; // 60 seconds cooldown between refreshes
    
    const handleForceRefresh = (event: any) => {
      if (!brandId || !campaigns.length) return;
      
      const now = Date.now();
      
      // If we're already refreshing or it's been less than the cooldown period, skip
      if (isRefreshing || (now - lastRefreshTime < REFRESH_COOLDOWN)) {
        logger.debug(`[CampaignWidget] Skipping refresh - already refreshing: ${isRefreshing}, last refresh: ${(now - lastRefreshTime) / 1000}s ago`);
        return;
      }
      
      // Apply throttling to prevent refresh storm
      if (!throttle('force-refresh-events', 30000)) {
        logger.debug('[CampaignWidget] Throttled force refresh event');
        return;
      }
      
      const eventDetails = event.detail || {};
      
      logger.debug(`[CampaignWidget] 🔄 Received force refresh event: ${event.type}`, eventDetails);
      
      // Set refreshing indicator
      isRefreshing = true;
      setRefreshing(true);
      
      // Only take the first 3 campaigns to avoid too many simultaneous requests
      const limitedCampaigns = campaigns.slice(0, 3);
      logger.debug(`[CampaignWidget] Limited refresh to first ${limitedCampaigns.length} campaigns`);
      
      // Do a full force check of limited campaign statuses
      checkCampaignStatuses(limitedCampaigns, true);
      
      // Update state for tracking
      lastRefreshTime = now;
      
      // Update loading indicator after a reasonable time
      setTimeout(() => {
        isRefreshing = false;
        setRefreshing(false);
      }, 5000);
    };
    
    // Handle direct force refresh with higher priority but still with rate limiting
    const handleDirectForceRefresh = (event: any) => {
      if (!brandId || !campaigns.length) return;
      
      const now = Date.now();
      
      // If it's been less than 10 seconds since last refresh, ignore (shorter cooldown for direct refreshes)
      if (now - lastRefreshTime < 30000) {
        logger.debug(`[CampaignWidget] Skipping direct refresh - last refresh: ${(now - lastRefreshTime) / 1000}s ago`);
        return;
      }
      
      // Apply throttling to prevent refresh storm
      if (!throttle('direct-force-refresh', 30000)) {
        logger.debug('[CampaignWidget] Throttled direct force refresh event');
        return;
      }
      
      const eventDetails = event.detail || {};
      
      logger.debug(`[CampaignWidget] 🔥 Received DIRECT force refresh event: ${event.type}`, eventDetails);
      
      // Use the bulk refresh API instead of individual API calls
      bulkRefreshCampaignStatuses().then(() => {
        // Update state for tracking
        lastRefreshTime = Date.now();
      });
    };
    
    // Listen for all possible refresh events
    window.addEventListener('page-refresh', handleForceRefresh);
    window.addEventListener('metaDataRefreshed', handleForceRefresh);
    window.addEventListener('meta_platform_refresh', handleForceRefresh);
    window.addEventListener('meta-data-refreshed', handleForceRefresh);
    document.addEventListener('meta-refresh-all', handleForceRefresh);
    
    // Listen for the direct force refresh events
    window.addEventListener('force-refresh-campaign-status', handleDirectForceRefresh);
    document.addEventListener('force-refresh-campaign-status', handleDirectForceRefresh);
    
    return () => {
      window.removeEventListener('page-refresh', handleForceRefresh);
      window.removeEventListener('metaDataRefreshed', handleForceRefresh);
      window.removeEventListener('meta_platform_refresh', handleForceRefresh);
      window.removeEventListener('meta-data-refreshed', handleForceRefresh);
      document.removeEventListener('meta-refresh-all', handleForceRefresh);
      
      window.removeEventListener('force-refresh-campaign-status', handleDirectForceRefresh);
      document.removeEventListener('force-refresh-campaign-status', handleDirectForceRefresh);
    };
  }, [brandId, campaigns, checkCampaignStatuses, bulkRefreshCampaignStatuses]);
  
  // Handle platform refresh event - fetch ad sets for currently loaded campaigns
  const handlePlatformRefresh = useCallback((event?: Event) => {
    if (!brandId || !isMountedRef.current) return;
    
    // Log the event for debugging
    if (event) {
      console.log(`[CampaignWidget] Received platform refresh event:`, 
        event instanceof CustomEvent ? event.detail : 'Non-custom event');
    } else {
      console.log(`[CampaignWidget] Handle platform refresh called directly`);
    }
    
    // Skip if there are no campaigns with ad sets loaded
    if (campaignsWithAdSets.size === 0) {
      console.log(`[CampaignWidget] No campaigns with ad sets to refresh`);
      return;
    }
    
    // Skip refresh if already loading ad sets to prevent spam loading
    if (isLoadingAdSets) {
      console.log(`[CampaignWidget] Skipping refresh because ad sets are already loading`);
      return;
    }
    
    console.log(`[CampaignWidget] Refreshing ad sets for ${campaignsWithAdSets.size} campaigns`);
    
    // We'll only refresh the expanded campaign if one is open to avoid spamming
    if (expandedCampaign && campaignsWithAdSets.has(expandedCampaign)) {
      console.log(`[CampaignWidget] Prioritizing refresh for expanded campaign: ${expandedCampaign}`);
      fetchAdSets(expandedCampaign, true);
      return;
    }
    
    // If no campaign is expanded, refresh all campaigns with ad sets one at a time
    const campaignIds = Array.from(campaignsWithAdSets);
    if (campaignIds.length > 0) {
      console.log(`[CampaignWidget] Auto-refreshing ad sets for first campaign: ${campaignIds[0]}`);
      fetchAdSets(campaignIds[0], true);
    }
  }, [brandId, fetchAdSets, campaignsWithAdSets, isMountedRef, isLoadingAdSets, expandedCampaign]);

  // Add event listeners for refresh events
  useEffect(() => {
    if (!brandId) return;
    
    console.log(`[CampaignWidget] Setting up refresh event listeners`);
    
    // Define the event handlers
    const handleMetaRefresh = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.brandId === brandId) {
        handlePlatformRefresh(event);
      }
    };
    
    const handlePageRefresh = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.brandId === brandId) {
        handlePlatformRefresh(event);
      }
    };
    
    // Create a debounced function for handling refresh events
    let refreshTimeoutId: NodeJS.Timeout;
    const debouncedRefresh = (event: Event) => {
      clearTimeout(refreshTimeoutId);
      refreshTimeoutId = setTimeout(() => {
        handleMetaRefresh(event);
      }, 300); // 300ms debounce to prevent multiple rapid refreshes
    };
    
    // Add the event listeners with debouncing
    window.addEventListener('meta_platform_refresh', debouncedRefresh);
    window.addEventListener('page-refresh', debouncedRefresh);
    window.addEventListener('metaDataRefreshed', debouncedRefresh);
    
    // Initial refresh on mount (don't do this automatically)
    // The campaignsWithAdSets set will be empty on initial mount anyway
    
    // Cleanup on unmount
    return () => {
      clearTimeout(refreshTimeoutId);
      window.removeEventListener('meta_platform_refresh', debouncedRefresh);
      window.removeEventListener('page-refresh', debouncedRefresh);
      window.removeEventListener('metaDataRefreshed', debouncedRefresh);
    };
  }, [brandId, handlePlatformRefresh, localCampaigns.length]);

  // Add event listeners for date range changes
  useEffect(() => {
    if (!brandId || !dateRange?.from || !dateRange?.to) return;
    
    // Save the date range values to local storage to persist
    try {
      localStorage.setItem('meta-date-range', JSON.stringify({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      }));
    } catch (e) {
      console.error('Error saving date range:', e);
    }
    
    // When date range changes, refresh all data
    console.log(`[CampaignWidget] Date range changed: ${dateRange.from.toISOString()} - ${dateRange.to.toISOString()}`);
    
    // Clear cached ad sets data for all campaigns when date range changes
    console.log(`[CampaignWidget] Date range changed - clearing cached ad sets data for all campaigns`);
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
    const filtered = localCampaigns.filter(campaign => {
      const searchMatch = 
        !searchQuery || 
        campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.account_name.toLowerCase().includes(searchQuery.toLowerCase());
      const statusMatch = showInactive || campaign.status.toUpperCase() === 'ACTIVE';
      return searchMatch && statusMatch;
    }).sort((a, b) => {
      if (sortBy === 'status') {
        if (a.status.toUpperCase() === 'ACTIVE' && b.status.toUpperCase() !== 'ACTIVE') return sortOrder === 'asc' ? 1 : -1;
        if (a.status.toUpperCase() !== 'ACTIVE' && b.status.toUpperCase() === 'ACTIVE') return sortOrder === 'asc' ? -1 : 1;
        return a.status.localeCompare(b.status) * (sortOrder === 'asc' ? 1 : -1);
      }
      const aValue = a[sortBy as keyof Campaign] as number || 0;
      const bValue = b[sortBy as keyof Campaign] as number || 0;
      return (aValue - bValue) * (sortOrder === 'asc' ? 1 : -1);
    });
    console.log(`[CW DEBUG] Filtered Campaigns Count: ${filtered.length}`);
    if (filtered.length > 0) {
        console.log(`[CW DEBUG] First Filtered Campaign Metrics:`, {
            name: filtered[0].campaign_name,
            id: filtered[0].campaign_id,
            spend: filtered[0].spent,
            impressions: filtered[0].impressions,
            clicks: filtered[0].clicks,
            status: filtered[0].status
        });
    }
    return filtered;
  }, [localCampaigns, searchQuery, showInactive, sortBy, sortOrder]);

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

  // Calculate campaign budget (keep existing)
  const getCampaignBudget = (campaign: Campaign, campaignAdSets: AdSet[] | null = null): CampaignBudgetData => { // Added : CampaignBudgetData return type
    // If we have ad sets for this campaign, use their combined budget
    if (expandedCampaign === campaign.campaign_id && campaignAdSets && campaignAdSets.length > 0) {
      const totalAdSetBudget = campaignAdSets.reduce((sum, adSet) => sum + adSet.budget, 0);
      return {
        budget: totalAdSetBudget,
        formatted_budget: formatCurrency(totalAdSetBudget),
        budget_type: campaignAdSets.some(adSet => adSet.budget_type === 'daily') ? 'daily' : 'lifetime',
        budget_source: 'adsets'
      };
    }
    
    // If campaign has adset_budget_total, use that
    if (campaign.adset_budget_total && campaign.adset_budget_total > 0) {
      return {
        budget: campaign.adset_budget_total,
        formatted_budget: formatCurrency(campaign.adset_budget_total),
        budget_type: campaign.budget_type || 'unknown',
        budget_source: 'adsets_total'
      };
    }
    
    // Otherwise use current budget from API or campaign budget as fallback
    const currentBudgetData = currentBudgets[campaign.id];
    const budget = currentBudgetData?.budget || campaign.budget || 0;
    const formatted_budget = currentBudgetData?.formatted_budget || formatCurrency(budget);
    const budget_type = currentBudgetData?.budget_type || campaign.budget_type || 'unknown';
    const budget_source = currentBudgetData?.budget_source || 'campaign';
    
    return {
      budget,
      formatted_budget,
      budget_type,
      budget_source
    };
  };

  // Function to refresh single campaign status (keep existing)
  const refreshCampaignStatus = async (campaignId: string, force: boolean = false) => {
    // ... (keep existing refreshCampaignStatus logic) ...
  };

  // Return the JSX for the component
  return (
    <Card className="mb-6 border-[#333] shadow-md overflow-hidden transition-all duration-200 hover:border-[#444] bg-[#111]">
      <CardHeader className="pb-3 border-b border-[#333]">
        <div className="flex items-center mb-4">
          <BarChart className="h-5 w-5 text-white" />
          <CardTitle className="text-lg font-medium text-white ml-2">Campaign Performance</CardTitle>
          <Badge className="ml-2 bg-zinc-800 text-white border-[#333]">
            {filteredCampaigns.length} Campaign{filteredCampaigns.length !== 1 ? 's' : ''}
          </Badge>
          <div className="flex items-center gap-2 mx-2">
            {dateRange?.from && dateRange?.to && (
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="flex items-center gap-1.5 bg-zinc-800 text-white border-[#333]">
                  <CalendarRange className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                  </span>
                </Badge>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs text-white border-[#333] hover:bg-black/20">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Customize
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border border-[#333] bg-[#111]">
                <DropdownMenuLabel className="text-white">Visible Metrics</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#333]" />
                {AVAILABLE_METRICS.map(metric => (
                  <DropdownMenuItem 
                    key={metric.id}
                    onClick={() => toggleMetric(metric.id)}
                    className="cursor-pointer text-white hover:bg-black/20"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {metric.icon}
                        <span>{metric.name}</span>
                      </div>
                      <div className="flex items-center h-4">
                        {visibleMetrics.includes(metric.id) && <Zap className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-[#333]" />
                <DropdownMenuItem 
                  onClick={() => setShowInactive(!showInactive)}
                  className="cursor-pointer text-white hover:bg-black/20"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Show Inactive Campaigns</span>
                    <Switch checked={showInactive} />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mt-3">
          <Input
            className="max-w-xs h-8 text-sm text-white border-[#333]"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={bulkRefreshCampaignStatuses}
            disabled={refreshing}
            className="h-8 text-sm flex items-center gap-1.5 text-white border-[#333] hover:bg-black/20"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh Statuses</span>
              </>
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 text-sm flex items-center gap-1.5 text-white border-[#333] hover:bg-black/20">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Sort by: {AVAILABLE_METRICS.find(m => m.id === sortBy)?.name || 'Status'}
                {sortOrder === 'desc' ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 border border-[#333] bg-[#111]">
              <DropdownMenuItem 
                onClick={handleStatusSortClick}
                className="cursor-pointer text-white hover:bg-black/20"
              >
                <CircleIcon className="h-3.5 w-3.5 mr-2" />
                <span>Status</span>
              </DropdownMenuItem>
              {AVAILABLE_METRICS.map(metric => (
                <DropdownMenuItem 
                  key={metric.id}
                  onClick={() => handleMetricSortClick(metric.id)}
                  className="cursor-pointer text-white hover:bg-black/20"
                >
                  <div className="mr-2">{metric.icon}</div>
                  <span>{metric.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="px-0 pb-0">
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <RefreshCw className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <BarChart className="h-10 w-10 mb-3 text-white" />
            <h3 className="text-lg font-medium mb-1 text-white">No campaigns found</h3>
            <p className="text-sm text-gray-400 max-w-sm mb-4">
              {searchQuery ? 'Try adjusting your search query or filters' : 'Create a campaign in Meta Ads Manager to get started'}
            </p>
            <Button variant="outline" size="sm" onClick={onSync} disabled={isSyncing} className="text-white border-[#333] hover:bg-black/20">
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Campaigns
            </Button>
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
                    // Calculate aggregate metrics if this is the expanded campaign and ad sets are loaded
                    let aggregateMetrics: Partial<Campaign> | null = null;
                    if (expandedCampaign === campaign.campaign_id && adSets.length > 0) {
                        const totalSpent = adSets.reduce((sum, adSet) => sum + (Number(adSet.spent) || 0), 0);
                        const totalClicks = adSets.reduce((sum, adSet) => sum + (Number(adSet.clicks) || 0), 0);
                        const totalImpressions = adSets.reduce((sum, adSet) => sum + (Number(adSet.impressions) || 0), 0);
                        const totalReach = adSets.reduce((sum, adSet) => sum + (Number(adSet.reach) || 0), 0); // Assuming reach can be summed (might need clarification on this metric)
                        const totalConversions = adSets.reduce((sum, adSet) => sum + (Number(adSet.conversions) || 0), 0);
                        
                        // Recalculate derived metrics based on aggregates
                        const aggregateCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
                        const aggregateCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0; // Multiply by 100 for percentage
                        const aggregateCostPerConversion = totalConversions > 0 ? totalSpent / totalConversions : 0;
                        // ROAS calculation might need more info (e.g., conversion value) - using 0 for now if not available directly
                        const aggregateRoas = 0; // Placeholder - Adjust if conversion value data is available

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
                            // Keep other campaign properties as they are not directly aggregated
                        };
                        console.log(`[CW DEBUG] Calculated Aggregate Metrics for ${campaign.campaign_id}:`, aggregateMetrics);
                    }

                    // *** DEBUG LOGGING for rendered row ***
                    console.log(`[CW DEBUG] Rendering Campaign Row: ${campaign.campaign_name} (${campaign.campaign_id})`, {
                        spend: campaign.spent,
                        impressions: campaign.impressions,
                        clicks: campaign.clicks,
                        status: campaign.status,
                        has_data_in_range: campaign.has_data_in_range
                    });
                    // *** END DEBUG LOGGING ***
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
                              {formatBudgetWithType(
                                getCampaignBudget(campaign, expandedCampaign === campaign.campaign_id ? adSets : null).budget,
                                getCampaignBudget(campaign, expandedCampaign === campaign.campaign_id ? adSets : null).budget_type
                              )}
                            </div>
                          </td>
                          {visibleMetrics.map(metricId => {
                            const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                            if (!metric) return null;
                            
                            // Use aggregate metric if available for the expanded campaign, otherwise use campaign data
                            const value = aggregateMetrics ? (aggregateMetrics[metricId as keyof Campaign] as number ?? 0) : (campaign[metricId as keyof Campaign] as number);
                            
                            // Debug log the value being used
                            // console.log(`[CW DEBUG] Metric: ${metricId}, Using value: ${value}, aggregate available: ${!!aggregateMetrics}`);

                            return (
                              <td key={metricId} className="p-3 text-right text-white">
                                <div className="font-medium">
                                  {formatValue(value, metric.format)}
                                </div>
                              </td>
                            );
                          })}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-white hover:bg-black/20 border border-[#333]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCampaignExpand(campaign.campaign_id);
                                }}
                                title={expandedCampaign === campaign.campaign_id ? "Hide Ad Sets" : "Show Ad Sets"}
                              >
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${
                                  expandedCampaign === campaign.campaign_id ? 'rotate-180' : ''
                                }`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-white hover:bg-black/20 border border-[#333]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  refreshCampaignStatus(campaign.campaign_id);
                                }}
                                title="Refresh Campaign Status"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-white hover:bg-black/20 border border-[#333]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`https://www.facebook.com/ads/manager/account/campaigns?act=${campaign.account_id.replace('act_', '')}&selected_campaign_ids=${campaign.campaign_id}`, '_blank')
                                }}
                                title="View in Meta Ads Manager"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded Row Content */}
                        {expandedCampaign === campaign.campaign_id && (
                          <tr className="bg-[#111] border-b border-[#333]">
                            <td colSpan={visibleMetrics.length + 4} className="p-0">
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
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs text-white border-[#333] hover:bg-black/20"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // No need to clear here, fetchAdSets will handle showing loading state
                                        fetchAdSets(campaign.campaign_id); // Use default (non-forced) refresh
                                      }}
                                      disabled={isLoadingAdSets}
                                    >
                                      {isLoadingAdSets ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                      ) : (
                                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                      )}
                                      Refresh Ad Sets
                                    </Button>
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
                                            <th className="text-xs font-medium text-center p-2 w-16 text-white">Actions</th>
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
                                                  
                                                  // Map campaign metrics to ad set metrics
                                                  let value: number;
                                                  switch (metricId) {
                                                    case 'spent':
                                                      value = adSet.spent || 0;
                                                      break;
                                                    case 'impressions':
                                                      value = adSet.impressions || 0;
                                                      break;
                                                    case 'clicks':
                                                      value = adSet.clicks || 0;
                                                      break;
                                                    case 'ctr':
                                                      value = adSet.ctr || 0;
                                                      break;
                                                    case 'cpc':
                                                      value = adSet.cpc || 0;
                                                      break;
                                                    case 'conversions':
                                                      value = adSet.conversions || 0;
                                                      break;
                                                    case 'cost_per_conversion':
                                                      value = adSet.cost_per_conversion || 0;
                                                      break;
                                                    case 'reach':
                                                      value = adSet.reach || 0;
                                                      break;
                                                    case 'roas':
                                                      if (adSet.conversions > 0 && adSet.spent > 0) {
                                                        const estimatedRevenue = adSet.conversions * 25;
                                                        value = estimatedRevenue / adSet.spent;
                                                      } else {
                                                        value = 0;
                                                      }
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
                                                <td className="p-2 text-center">
                                                  <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-7 w-7 rounded-full text-white hover:bg-black/20 border border-[#333]"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAdSetRowClick(adSet.adset_id, e);
                                                      }}
                                                      title={expandedAdSet === adSet.adset_id ? "Hide Ads" : "Show Ads"}
                                                    >
                                                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${
                                                        expandedAdSet === adSet.adset_id ? 'rotate-180' : ''
                                                      }`} />
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-7 w-7 rounded-full text-white hover:bg-black/20 border border-[#333]"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(`https://www.facebook.com/ads/manager/account/campaigns?act=${campaign.account_id.replace('act_', '')}&selected_campaign_ids=${campaign.campaign_id}`, '_blank')
                                                      }}
                                                      title="View in Meta Ads Manager"
                                                    >
                                                      <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                  </div>
                                                </td>
                                              </tr>
                                              {/* Ad Set expanded content */}
                                              {expandedAdSet === adSet.adset_id && (
                                                <tr className="border-t border-[#333] bg-[#111]">
                                                  <td colSpan={visibleMetrics.length + 4} className="p-0">
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
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // No need to clear here, fetchAdSets will handle showing loading state
                                        fetchAdSets(campaign.campaign_id); // Use default (non-forced) refresh
                                      }}
                                      className="text-white border-[#333] hover:bg-black/20"
                                    >
                                      <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isLoadingAdSets ? 'animate-spin' : ''}`} />
                                      Refresh Ad Sets
                                    </Button>
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
      bgColor: 'bg-blue-950/30',
      textColor: 'text-blue-500',
      borderColor: 'border-blue-800/50',
      dotColor: 'bg-blue-500 animate-pulse'
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