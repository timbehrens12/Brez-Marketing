"use client"

import React, { useState, useMemo, useEffect, useCallback, useRef, FC, memo } from 'react'
import { 
  BarChart, LineChart, PieChart, AreaChart, Gauge, ArrowUpRight, ArrowDownRight, 
  Calendar, Filter, MoreHorizontal, Download, ChevronDown, Settings, Table, RefreshCw,
  Eye, EyeOff, Zap, DollarSign, Users, MousePointerClick, Target, Wallet, BarChart2, ChevronRight,
  CalendarRange, Loader2, RefreshCcw, SlidersHorizontal, CircleIcon, Search
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
  
  // Add a stable ref to track loading states and prevent refresh loops
  const lastLoadedCampaignRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add more robust state tracking for loading state
  const adSetLoadingLockRef = useRef<boolean>(false);
  const stableLoadingRef = useRef<boolean>(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCountRef = useRef(0);
  
  // Add stronger state locking to prevent loops
  const dataStabilizationLockRef = useRef<boolean>(false);
  const lastSuccessfulFetchTimeRef = useRef(0);
  const STABILITY_LOCK_PERIOD = 5000; // 5 seconds where no state changes are allowed after successful data display
  
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
  
  // Modify the fetchAdSets function to prevent twitching and spam refreshing
  const fetchAdSets = useCallback(async (campaignId: string, forceRefresh: boolean = false) => {
    if (!brandId || !isMountedRef.current || !campaignId) return;
    
    // Prevent duplicate fetches of the same campaign in quick succession
    if (lastLoadedCampaignRef.current === campaignId && !forceRefresh && !isInitialLoadRef.current) {
      if (!throttle(`fetch-adsets-${campaignId}`, 3000)) {
        logger.debug(`[CampaignWidget] Throttled duplicate ad set fetch for campaign ${campaignId}`);
        return;
      }
    }
    
    // Update refs
    lastLoadedCampaignRef.current = campaignId;
    isInitialLoadRef.current = false;
    
    // Cancel any existing loading timers
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    
    // If we're already in a loading state, we don't need to clear the ad sets again
    // This prevents flickering when expanding and ensures continuity from the placeholder
    if (!isLoadingAdSets) {
      setIsLoadingAdSets(true);
    }
    
    // Cancel any existing ad set fetch
    pendingRequestsRef.current.forEach(controller => {
      try {
        controller.abort();
      } catch (e) {
        // Ignore abort errors
      }
    });
    
    // Only clear existing ad sets if they're not already placeholders
    if (adSets.length === 0 || (adSets.length === 1 && adSets[0].adset_id !== 'loading')) {
      setAdSets([{ 
        id: 0,
        brand_id: brandId,
        adset_id: 'loading',
        adset_name: 'Loading ad sets...',
        campaign_id: campaignId,
        status: 'Loading',
        budget: 0,
        budget_type: '',
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cost_per_conversion: 0,
        optimization_goal: null,
        updated_at: new Date().toISOString(),
        daily_insights: []
      }]);
    }
    
    const controller = createAbortController();
    logger.debug(`[CampaignWidget] Starting ad sets fetch for campaign ${campaignId}`);
    
    // Try the regular endpoint first
    let usedDirectFetch = false;
    let usedCachedData = false;
    
    try {
      let url = `/api/meta/adsets?brandId=${brandId}&campaignId=${campaignId}&forceRefresh=${forceRefresh}`;
      
      // Add date range parameters if available
      if (dateRange?.from && dateRange?.to) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        const toDate = dateRange.to.toISOString().split('T')[0];
        url += `&from=${fromDate}&to=${toDate}`;
      }
      
      logger.debug(`[CampaignWidget] Fetching ad sets from: ${url}`);
      
      // Add a minimum loading time to allow visual feedback
      const fetchStartTime = Date.now();
      const minLoadingTime = 800; // minimum 800ms of loading to prevent flicker
      
      let response = await fetch(url, { signal: controller.signal });
      
      // If the regular endpoint fails, try the direct-fetch endpoint
      if (!response.ok) {
        logger.debug(`[CampaignWidget] Regular endpoint failed with status ${response.status}, trying direct-fetch endpoint...`);
        usedDirectFetch = true;
        
        response = await fetch(`/api/meta/adsets/direct-fetch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brandId,
            campaignId,
          }),
          signal: controller.signal
        });
      }
      
      if (!isMountedRef.current) return;
      
      // Parse the response as JSON (safely)
      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error(`[CampaignWidget] Error parsing ad sets response: ${parseError}`);
        throw new Error(`Failed to parse response`);
      }
      
      // Ensure minimum loading time for visual feedback
      const elapsedTime = Date.now() - fetchStartTime;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
      
      if (!isMountedRef.current) return;
      
      if (response.ok) {
        // Check if this is a rate limit response with cached data
        if (data.source === 'cached_due_to_rate_limit') {
          usedCachedData = true;
          logger.debug(`[CampaignWidget] Using cached ad sets due to Meta API rate limits`);
        }
        
        // Ensure we have a valid array of ad sets
        const validAdSets = Array.isArray(data.adSets) ? data.adSets : [];
        logger.debug(`[CampaignWidget] Response OK, adSets: ${validAdSets.length}`);
        
        if (isMountedRef.current) {
          // Add this campaign to the tracking set if ad sets were found
          if (validAdSets.length > 0) {
            setCampaignsWithAdSets(prev => {
              const newSet = new Set(prev);
              newSet.add(campaignId);
              return newSet;
            });
            
            // Set the ad sets data in a single update to prevent flicker
            setAdSets(validAdSets);
            
            // Use a timer to ensure we don't toggle loading state too quickly
            loadingTimerRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                setIsLoadingAdSets(false);
              }
              loadingTimerRef.current = null;
            }, 200);
          } else {
            // If no ad sets were found, schedule clearing
            loadingTimerRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                // Clear loading placeholder with empty set
                setAdSets([]);
                setIsLoadingAdSets(false);
              }
              loadingTimerRef.current = null;
            }, 200);
          }
          
          // Toast notification that ad sets were loaded - but not on every refresh
          if (validAdSets.length > 0 && forceRefresh) {
            toast.success(`Loaded ${validAdSets.length} ad sets${usedCachedData ? ' (cached data)' : usedDirectFetch ? ' (basic data)' : ''}`);
          } else if (validAdSets.length === 0) {
            // Check if this was because of a rate limit
            if (data.warning === 'Meta API rate limit reached') {
              toast.warning(`Meta API rate limit reached`, {
                description: data.message || 'Please try again in a few minutes',
                duration: 8000
              });
            } else if (forceRefresh) {
              toast.info("No ad sets found for this campaign");
            }
          }
          
          // Dispatch events for budgets to update regardless of ad set count
          // But throttle them to prevent excessive events
          if (throttle('adset-events', 5000)) {
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
          }
        }
      } else {
        // Handle errors...
        loadingTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setIsLoadingAdSets(false);
          }
          loadingTimerRef.current = null;
        }, 200);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logger.debug("[CampaignWidget] Ad set fetch aborted");
        return;
      }
      
      logger.error("[CampaignWidget] Error fetching ad sets:", error);
      
      if (isMountedRef.current) {
        // Show error if explicitly requested
        if (forceRefresh) {
          toast.error(`Error loading ad sets: ${(error as Error).message}`);
        }
        
        // Schedule clearing loading state
        loadingTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setAdSets([]);
            setIsLoadingAdSets(false);
          }
          loadingTimerRef.current = null;
        }, 200);
      }
    } finally {
      // Clean up abort controller
      removeAbortController(controller);
    }
  }, [brandId, createAbortController, dateRange, removeAbortController, isMountedRef, isLoadingAdSets, adSets]);
  
  // Function to periodically check campaigns that are active/important
  const checkCampaignStatuses = useCallback((campaignsToCheck: Campaign[], forceRefresh = false) => {
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
  
  // Keep local state in sync with props
  useEffect(() => {
    setLocalCampaigns(campaigns);
    
    // When campaigns are loaded or updated, check statuses of active campaigns
    // This ensures statuses are always up-to-date without requiring user interaction
    if (campaigns.length > 0 && brandId) {
      // Slight delay to allow the UI to render first
      setTimeout(() => {
        checkCampaignStatuses(campaigns);
      }, 500);
    }
  }, [campaigns, brandId, checkCampaignStatuses]);
  
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
      console.log("[CampaignWidget] Saved user preferences to localStorage");
    }, 500); // 500ms debounce to prevent too many writes
    
    return () => clearTimeout(timeoutId);
  }, [visibleMetrics, sortBy, sortOrder, showInactive, saveUserPreferences]);
  
  // Function to fetch current campaign budgets - EXACT COPY from original widget
  const fetchCurrentBudgets = useCallback(async (forceRefresh = false) => {
    if (!brandId || !isMountedRef.current) return;
    
    setIsLoadingBudgets(true);
    console.log("[CampaignWidget] Fetching current budget data, force refresh:", forceRefresh);
    
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
          console.log(`[CampaignWidget] Loaded current budgets for ${Object.keys(budgetMap).length} campaigns via ${data.refreshMethod}`);
        }
        
        // Show toast notification when budgets are updated and forceRefresh was requested
        if (forceRefresh && isMountedRef.current) {
          toast.success(`Updated budget data for ${Object.keys(budgetMap).length} campaigns`);
        }
      } else {
        console.error("[CampaignWidget] Failed to fetch current budgets");
        
        // Show error toast
        if (forceRefresh && isMountedRef.current) {
          toast.error("Failed to fetch latest budget data from Meta");
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log("[CampaignWidget] Budget fetch aborted");
        return;
      }
      
      console.error("[CampaignWidget] Error fetching current budgets:", error);
      
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
  
  // Add a hard stabilization cleanup method near the top of the component
  useEffect(() => {
    // When unmounting, make sure we clean up all locks and timers
    return () => {
      // Clear all timers and locks
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      adSetLoadingLockRef.current = false;
      dataStabilizationLockRef.current = false;
      stableLoadingRef.current = false;
    };
  }, []);
  
  // Declare the bulletproof fetch function first
  const stableFetchAdSets = useCallback(async (campaignId: string, forceRefresh: boolean = false) => {
    // If we're in a data stabilization period, block all fetches
    const now = Date.now();
    if (dataStabilizationLockRef.current && now - lastSuccessfulFetchTimeRef.current < STABILITY_LOCK_PERIOD) {
      logger.debug(`[CampaignWidget] In stabilization period - blocking fetch, time remaining: ${Math.round((STABILITY_LOCK_PERIOD - (now - lastSuccessfulFetchTimeRef.current))/1000)}s`);
      return;
    }
    
    // Normal safety checks
    if (!brandId || !isMountedRef.current || !campaignId) {
      adSetLoadingLockRef.current = false;
      return;
    }
    
    // Check if we've tried too many times
    refreshCountRef.current++;
    if (refreshCountRef.current > 3) {
      logger.debug(`[CampaignWidget] Too many fetch attempts (${refreshCountRef.current}), stopping`);
      adSetLoadingLockRef.current = false;
      stableLoadingRef.current = false;
      setIsLoadingAdSets(false);
      return;
    }
    
    // Set hard loading lock
    adSetLoadingLockRef.current = true;
    stableLoadingRef.current = true;
    setIsLoadingAdSets(true);
    dataStabilizationLockRef.current = false; // Allow changes during fetch
    
    logger.debug(`[CampaignWidget] Starting bulletproof fetch for ${campaignId} (attempt ${refreshCountRef.current})`);
    
    // Create a placeholder if we don't have one
    setAdSets(current => {
      // Only replace if we don't have a loading placeholder
      if (current.length === 0 || (current.length === 1 && current[0].adset_id !== 'loading')) {
        return [{ 
          id: 0,
          brand_id: brandId,
          adset_id: 'loading',
          adset_name: 'Loading ad sets...',
          campaign_id: campaignId,
          status: 'Loading',
          budget: 0,
          budget_type: '',
          spent: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          ctr: 0,
          cpc: 0,
          cost_per_conversion: 0,
          optimization_goal: null,
          updated_at: new Date().toISOString(),
          daily_insights: []
        }];
      }
      return current;
    });
    
    // Proceed with the fetch
    try {
      // Track what we're doing
      logger.debug(`[CampaignWidget] Bulletproof fetch starting for campaign ${campaignId}, attempt ${refreshCountRef.current}`);
      
      // Create our URL
      let url = `/api/meta/adsets?brandId=${brandId}&campaignId=${campaignId}&forceRefresh=${forceRefresh}`;
      
      // Add date range parameters if available
      if (dateRange?.from && dateRange?.to) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        const toDate = dateRange.to.toISOString().split('T')[0];
        url += `&from=${fromDate}&to=${toDate}`;
      }
      
      // Ensure always showing loading state for at least 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Bail if component unmounted or campaign changed during the delay
      if (!isMountedRef.current || expandedCampaign !== campaignId) {
        logger.debug(`[CampaignWidget] Component unmounted or campaign changed during fetch delay`);
        adSetLoadingLockRef.current = false;
        stableLoadingRef.current = false;
        return;
      }
      
      // Perform the fetch
      const response = await fetch(url);
      
      // Bail if component unmounted or campaign changed during the fetch
      if (!isMountedRef.current || expandedCampaign !== campaignId) {
        logger.debug(`[CampaignWidget] Component unmounted or campaign changed during fetch`);
        adSetLoadingLockRef.current = false;
        stableLoadingRef.current = false;
        return;
      }
      
      // Process the response
      const data = await response.json();
      const validAdSets = Array.isArray(data.adSets) ? data.adSets : [];
      
      // Only update if we're still showing the same campaign
      if (isMountedRef.current && expandedCampaign === campaignId) {
        logger.debug(`[CampaignWidget] Fetch complete - ${validAdSets.length} ad sets found`);
        
        // IMPORTANT: Set the stabilization lock BEFORE updating any state
        dataStabilizationLockRef.current = true;
        lastSuccessfulFetchTimeRef.current = Date.now();
        
        // Clear any existing timers
        if (cooldownTimerRef.current) {
          clearTimeout(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }
        
        if (validAdSets.length > 0) {
          // We have data, update the ad sets
          setAdSets(validAdSets);
          
          // Mark this campaign as having ad sets
          setCampaignsWithAdSets(prev => {
            const newSet = new Set(prev);
            newSet.add(campaignId);
            return newSet;
          });
          
          // Give the UI time to render the data, then hide loading state
          setTimeout(() => {
            if (isMountedRef.current && expandedCampaign === campaignId && dataStabilizationLockRef.current) {
              logger.debug(`[CampaignWidget] Setting loading state to false after data`);
              stableLoadingRef.current = false;
              setIsLoadingAdSets(false);
            }
          }, 200);
          
          // Cleanup the locks after the stability period
          setTimeout(() => {
            adSetLoadingLockRef.current = false;
            logger.debug(`[CampaignWidget] Stabilization period ended`);
          }, STABILITY_LOCK_PERIOD);
        } else {
          // No data, show empty state
          setTimeout(() => {
            if (isMountedRef.current && expandedCampaign === campaignId && dataStabilizationLockRef.current) {
              logger.debug(`[CampaignWidget] No data found, showing empty state`);
              setAdSets([]);
              stableLoadingRef.current = false;
              setIsLoadingAdSets(false);
              adSetLoadingLockRef.current = false;
              dataStabilizationLockRef.current = false;
            }
          }, 300);
        }
      } else {
        // Component unmounted or campaign changed, just release lock
        adSetLoadingLockRef.current = false;
        stableLoadingRef.current = false;
        dataStabilizationLockRef.current = false;
      }
    } catch (error) {
      logger.error(`[CampaignWidget] Bulletproof fetch error: ${(error as Error).message}`);
      
      // Release all locks and clear loading state
      adSetLoadingLockRef.current = false;
      stableLoadingRef.current = false;
      dataStabilizationLockRef.current = false;
      
      if (isMountedRef.current && expandedCampaign === campaignId) {
        setIsLoadingAdSets(false);
        setAdSets([]);
      }
    }
  }, [brandId, dateRange, expandedCampaign, isMountedRef]);
  
  // Then define the stable expand function that calls it
  const stableExpandAdSets = useCallback((campaignId: string) => {
    // Disable ALL background polling and automatic updates while displaying ad sets
    window._disableAutoMetaFetch = true;
    
    // If we're currently in a loading operation or stabilization period, ignore additional requests
    if (adSetLoadingLockRef.current || dataStabilizationLockRef.current) {
      logger.debug('[CampaignWidget] Ignoring expand request - loading or stabilization lock active');
      return;
    }
    
    // Reset refresh counter
    refreshCountRef.current = 0;
    
    // Block all events being processed
    adSetLoadingLockRef.current = true;
    
    // Set expanded immediately 
    setExpandedCampaign(campaignId);
    
    // Start the bulletproof fetch process directly
    stableFetchAdSets(campaignId);
  }, [stableFetchAdSets]);
  
  // Modify the toggleCampaignExpand function to use our stable expand method
  const toggleCampaignExpand = useCallback(async (campaignId: string) => {
    // If there's a cooldown timer running, clear it
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    
    if (expandedCampaign === campaignId) {
      // If we have a loading lock, wait briefly before collapsing
      if (adSetLoadingLockRef.current) {
        setTimeout(() => {
          adSetLoadingLockRef.current = false;
          setExpandedCampaign(null);
          setAdSets([]);
          setIsLoadingAdSets(false);
        }, 100);
      } else {
        // Normal collapse
        setExpandedCampaign(null);
        setAdSets([]);
        setIsLoadingAdSets(false);
      }
      return;
    }
    
    // Validate campaignId before making API call
    if (!campaignId || typeof campaignId !== 'string' || campaignId.trim() === '') {
      logger.debug('[CampaignWidget] Invalid campaign ID for status check:', campaignId);
      toast.error("Cannot expand campaign - invalid campaign ID");
      return;
    }
    
    if (!brandId) {
      logger.debug('[CampaignWidget] Missing brand ID for status check');
      toast.error("Cannot expand campaign - missing brand ID");
      return;
    }
    
    // Use our stable expand method
    stableExpandAdSets(campaignId);
    
    // Status check (but don't block UI)
    try {
      const response = await fetch('/api/meta/campaign-status-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          campaignId,
          forceRefresh: true
        }),
      });
      
      if (!isMountedRef.current) return;
      
      if (response.ok) {
        const statusData = await response.json();
        
        // Update the campaign in local state if needed
        if (statusData.status) {
          setLocalCampaigns(currentCampaigns => 
            currentCampaigns.map(c => 
              c.campaign_id === campaignId 
                ? { ...c, status: statusData.status, last_refresh_date: statusData.timestamp } 
                : c
            )
          );
        }
      }
    } catch (error) {
      logger.debug(`[CampaignWidget] Error checking campaign status during expand:`, error);
      // Continue with expansion even if status check fails
    }
  }, [brandId, expandedCampaign, stableExpandAdSets, isMountedRef]);
  
  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };
  
  // Handle sort click for status
  const handleStatusSortClick = () => {
    setSortBy('status');
    toggleSortOrder();
  };
  
  // Handle sort click for metrics
  const handleMetricSortClick = (metricId: string) => {
    setSortBy(metricId);
    toggleSortOrder();
  };
  
  // Handle column header click
  const handleColumnHeaderClick = (metricId: string) => {
    if (sortBy === metricId) {
      toggleSortOrder();
    } else {
      setSortBy(metricId);
      setSortOrder('desc');
    }
  };
  
  // Create memoized dateRangeKey to detect changes in date range
  const dateRangeKey = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 'no-range';
    return `${dateRange.from.toISOString().split('T')[0]}-${dateRange.to.toISOString().split('T')[0]}`;
  }, [dateRange]);
  
  // Store previous date range key to detect actual changes
  const prevDateRangeKeyRef = useRef(dateRangeKey);
  
  // Add a debounce mechanism for date range changes
  useEffect(() => {
    // Only trigger on actual date range changes
    if (dateRangeKey !== prevDateRangeKeyRef.current && expandedCampaign) {
      console.log(`[CampaignWidget] Date range changed from ${prevDateRangeKeyRef.current} to ${dateRangeKey}`);
      prevDateRangeKeyRef.current = dateRangeKey;
      
      // Refresh ad sets if a campaign is expanded, but use a debounce to prevent rapid fetches
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          console.log(`[CampaignWidget] Fetching ad sets after date range change`);
          fetchAdSets(expandedCampaign);
        }
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [dateRangeKey, expandedCampaign, fetchAdSets]);
  
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
    return localCampaigns.filter(campaign => {
      // Filter by search query
      const searchMatch = 
        !searchQuery || 
        campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.account_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by active status if showInactive is false
      const statusMatch = showInactive || campaign.status.toUpperCase() === 'ACTIVE';
      
      return searchMatch && statusMatch;
    }).sort((a, b) => {
      if (sortBy === 'status') {
        // Put active campaigns first for better UX
        if (a.status.toUpperCase() === 'ACTIVE' && b.status.toUpperCase() !== 'ACTIVE') return sortOrder === 'asc' ? 1 : -1;
        if (a.status.toUpperCase() !== 'ACTIVE' && b.status.toUpperCase() === 'ACTIVE') return sortOrder === 'asc' ? -1 : 1;
        return a.status.localeCompare(b.status) * (sortOrder === 'asc' ? 1 : -1);
      }
      
      const aValue = a[sortBy as keyof Campaign] as number || 0;
      const bValue = b[sortBy as keyof Campaign] as number || 0;
      
      return (aValue - bValue) * (sortOrder === 'asc' ? 1 : -1);
    });
  }, [localCampaigns, searchQuery, showInactive, sortBy, sortOrder]);
  
  // Toggle metric visibility
  const toggleMetric = (metricId: string) => {
    if (visibleMetrics.includes(metricId)) {
      setVisibleMetrics(visibleMetrics.filter(id => id !== metricId));
    } else {
      setVisibleMetrics([...visibleMetrics, metricId]);
    }
  };
  
  // Format values based on type
  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      case 'roas':
        return `${value.toFixed(2)}x`;
      default:
        return formatNumber(value);
    }
  };
  
  // Function to refresh campaign status
  const refreshCampaignStatus = async (campaignId: string, force: boolean = false) => {
    if (!brandId) return;
    
    // Find the campaign in local state
    const campaign = localCampaigns.find(c => c.campaign_id === campaignId);
    if (!campaign) return;
    
    try {
      // Update local state to show loading
      setLocalCampaigns(prev => prev.map(c =>
        c.campaign_id === campaignId ? { ...c, status: 'Refreshing' } : c
      ));
      
      const response = await fetch('/api/meta/campaign-status-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          campaignId,
          forceRefresh: force,
        }),
      });
      
      if (!response.ok) {
        // Handle error cases
        if (response.status === 429) {
          console.warn(`Campaign refresh rate limited for ${campaignId}`);
          
          // Restore original status
          setLocalCampaigns(prev => prev.map(c =>
            c.campaign_id === campaignId ? { ...c, status: campaign.status } : c
          ));
          
          return;
        }
        
        const errorText = await response.text();
        console.error(`Error refreshing campaign ${campaignId}:`, errorText);
        
        // Only show toast for explicit user-triggered refreshes
        if (force) {
          toast.error(`Failed to refresh campaign: ${errorText || response.statusText}`);
        }
        
        // Update local state to show error
        setLocalCampaigns(prev => prev.map(c =>
          c.campaign_id === campaignId ? { ...c, status: campaign.status } : c
        ));
        
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state with new status
        setLocalCampaigns(prev => prev.map(c =>
          c.campaign_id === campaignId ? { ...c, status: data.status, last_refresh_date: new Date().toISOString() } : c
        ));
        
        // Only show success toast for explicit refreshes
        if (force) {
          toast.success(`Campaign status updated: ${data.status}`);
        }
        
        // If force refresh was requested, trigger a full refresh of campaigns
        if (force && onRefresh) {
          // Call the parent refresh function to update all campaigns
          setTimeout(() => {
            onRefresh();
          }, 500);
        }
        
        // Dispatch an event to notify other components
        const refreshEvent = new CustomEvent('campaign-status-updated', {
          detail: { campaignId, status: data.status }
        });
        window.dispatchEvent(refreshEvent);
        
        // Return success
        return { success: true, status: data.status };
      } else {
        // Handle API errors
        console.error(`API error refreshing campaign ${campaignId}:`, data.error);
        
        // Restore original status on error
        setLocalCampaigns(prev => prev.map(c =>
          c.campaign_id === campaignId ? { ...c, status: campaign.status } : c
        ));
        
        // Show error toast only for force refreshes
        if (force) {
          toast.error(`Failed to refresh campaign: ${data.error || 'Unknown error'}`);
        }
        
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error(`Error refreshing campaign ${campaignId}:`, error);
      
      // Restore original status on error
      setLocalCampaigns(prev => prev.map(c =>
        c.campaign_id === campaignId ? { ...c, status: campaign.status } : c
      ));
      
      // Only show error toast for force refreshes
      if (force) {
        toast.error(`Failed to refresh campaign: ${(error as Error).message}`);
      }
      
      return { success: false, error: (error as Error).message };
    }
  };
  
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

  // Add a polling mechanism for automatic status updates
  useEffect(() => {
    if (!brandId || !isMountedRef.current || campaigns.length === 0) return;
    
    // Set up a polling interval to refresh campaign statuses
    logger.info('[CampaignWidget] Setting up automatic status polling');
    
    // Refresh active campaign statuses every 30 seconds
    const statusPollInterval = setInterval(() => {
      if (!isMountedRef.current || campaigns.length === 0) return;
      
      // Only poll if not already refreshing and throttle properly
      if (!refreshing && throttle('auto-poll-status', 30000)) {
        logger.debug('[CampaignWidget] Auto-polling campaign statuses');
        
        // Filter only active campaigns to reduce API calls
        const activeCampaigns = campaigns.filter(c => 
          c.status.toUpperCase() === 'ACTIVE' || c.status.toUpperCase() === 'REFRESHING'
        );
        
        if (activeCampaigns.length > 0) {
          // Limit to just a few campaigns per polling cycle
          const campaignsToCheck = activeCampaigns.slice(0, 2);
          checkCampaignStatuses(campaignsToCheck, false);
        }
      }
    }, 30000);
    
    // Refresh all campaign budgets every 2 minutes
    const budgetPollInterval = setInterval(() => {
      if (!isMountedRef.current) return;
      
      // Only refresh budgets if not already doing so and throttle properly
      if (!isLoadingBudgets && throttle('auto-poll-budgets', 120000)) {
        logger.debug('[CampaignWidget] Auto-refreshing campaign budgets');
        fetchCurrentBudgets(false);
      }
    }, 120000);
    
    // Clean up intervals on unmount
    return () => {
      clearInterval(statusPollInterval);
      clearInterval(budgetPollInterval);
      logger.debug('[CampaignWidget] Cleared automatic polling intervals');
    };
  }, [brandId, campaigns, isMountedRef, refreshing, isLoadingBudgets, checkCampaignStatuses, fetchCurrentBudgets]);

  // Enhanced budget monitoring
  useEffect(() => {
    // Update campaign budgets whenever campaigns change or on mount
    if (brandId && campaigns.length > 0 && !isLoadingBudgets) {
      // Use throttling to prevent excessive calls
      if (throttle('initial-budget-fetch', 60000)) {
        logger.debug('[CampaignWidget] Initial campaign budget refresh');
        fetchCurrentBudgets(false);
      }
    }
  }, [brandId, campaigns.length, isLoadingBudgets, fetchCurrentBudgets]);

  // Add a listener for budget updates from other components
  useEffect(() => {
    const handleMetaBudgetsUpdated = (event: CustomEvent) => {
      if (!brandId || !isMountedRef.current) return;
      
      logger.debug('[CampaignWidget] Received meta-budgets-updated event', event.detail);
      
      // Refresh our budget data
      if (throttle('budget-event-refresh', 5000)) {
        fetchCurrentBudgets(false);
      }
    };
    
    window.addEventListener('meta-budgets-updated', handleMetaBudgetsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('meta-budgets-updated', handleMetaBudgetsUpdated as EventListener);
    };
  }, [brandId, isMountedRef, fetchCurrentBudgets]);

  // Add the getCampaignBudget function inside the component
  const getCampaignBudget = useCallback((campaign: Campaign, campaignAdSets: AdSet[] | null = null) => {
    // Force budget update for expanded campaign if we have ad sets
    if (expandedCampaign === campaign.campaign_id && campaignAdSets && campaignAdSets.length > 0) {
      const totalAdSetBudget = campaignAdSets.reduce((sum, adSet) => sum + adSet.budget, 0);
      
      // Dispatch a budget update event so other components can react
      window.dispatchEvent(new CustomEvent('campaign-budget-updated', { 
        detail: { 
          campaignId: campaign.campaign_id,
          budget: totalAdSetBudget,
          budgetType: campaignAdSets.some(adSet => adSet.budget_type === 'daily') ? 'daily' : 'lifetime',
          source: 'adsets'
        }
      }));
      
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
  }, [expandedCampaign, currentBudgets]);

  // Create a memoized version of the ad sets table to prevent re-renders
  const AdSetTable = memo(({ adSets, visibleMetrics, campaign, handleAdSetRowClick, expandedAdSet }: {
    adSets: AdSet[];
    visibleMetrics: string[];
    campaign: Campaign;
    handleAdSetRowClick: (adSetId: string, e: React.MouseEvent) => void;
    expandedAdSet: string | null;
  }) => {
    return (
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
            {adSets.map((adSet) => {
              // Special case for loading placeholder
              if (adSet.adset_id === 'loading') {
                return (
                  <tr key="loading" className="border-b border-[#333] bg-black/20">
                    <td colSpan={visibleMetrics.length + 4} className="p-0">
                      <div className="p-4 h-12 flex items-center animate-pulse">
                        <div className="w-1/3 h-4 bg-gray-800 rounded"></div>
                      </div>
                    </td>
                  </tr>
                );
              }
              
              return (
                <React.Fragment key={adSet.adset_id}>
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
                      <Badge 
                        variant="outline" 
                        className={`px-2 py-0.5 text-xs flex items-center gap-1 ${
                          adSet.status.toUpperCase() === 'ACTIVE' 
                            ? 'bg-green-950/30 text-green-500 border border-green-800/50' 
                            : 'bg-gray-950/30 text-gray-500 border border-gray-800/50'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          adSet.status.toUpperCase() === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'
                        }`}></div>
                        {adSet.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex flex-col items-end">
                        <Badge 
                          className="px-2 py-0.5 bg-[#111] border-[#333] text-white"
                          variant="outline"
                        >
                          {formatCurrency(adSet.budget)}
                          {adSet.budget_type === 'daily' && <span className="text-xs text-gray-500 ml-1">/day</span>}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {adSet.budget_type}
                        </span>
                      </div>
                    </td>
                    {/* Metrics columns */}
                    {/* Remaining columns rendered as before */}
                  </tr>
                  {/* Ad set expanded content - rendered as before */}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  });

  AdSetTable.displayName = 'AdSetTable';

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
                  {filteredCampaigns.map(campaign => (
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
                            campaign.status.toUpperCase() === 'ACTIVE' 
                              ? 'bg-green-950/30 text-green-500 border border-green-800/50' 
                              : 'bg-gray-950/30 text-gray-500 border border-gray-800/50'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              campaign.status.toUpperCase() === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'
                            }`}></div>
                            {campaign.status}
                          </Badge>
                          {!campaign.has_data_in_range && (
                            <Badge className="text-xs px-1.5 py-0 h-5 bg-[#111] text-gray-500 border border-[#333] ml-1">
                              No data in range
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right text-white">
                          <div className="font-medium">
                            {getCampaignBudget(campaign, expandedCampaign === campaign.campaign_id ? adSets : null).formatted_budget}
                            {(campaign.budget_type === 'daily') && 
                              <span className="text-xs text-gray-400 ml-1">/day</span>
                            }
                          </div>
                        </td>
                        {visibleMetrics.map(metricId => {
                          const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                          if (!metric) return null;
                          
                          const value = campaign[metricId as keyof Campaign] as number;
                          
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
                                      // Prevent repeat clicks during loading
                                      if (adSetLoadingLockRef.current || stableLoadingRef.current) {
                                        return;
                                      }
                                      // Use stable expand to refresh
                                      stableExpandAdSets(campaign.campaign_id);
                                    }}
                                    disabled={isLoadingAdSets}
                                  >
                                    {isLoadingAdSets ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                    ) : (
                                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    {isLoadingAdSets ? "Loading..." : "Refresh Ad Sets"}
                                  </Button>
                                </div>
                              </div>
                              
                              {isLoadingAdSets ? (
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                  <div className="relative">
                                    <RefreshCw className="h-8 w-8 animate-spin text-white mb-3" />
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#111] rounded-full w-4 h-4 flex items-center justify-center">
                                      <span className="text-xs text-white">•</span>
                                    </div>
                                  </div>
                                  <h3 className="text-md font-medium mb-1 text-white">Loading Ad Sets</h3>
                                  <p className="text-sm text-gray-400">Fetching latest ad set data from Meta...</p>
                                  <div className="w-64 mt-4">
                                    <Progress value={45} className="h-1 bg-gray-800" />
                                  </div>
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
                                        {adSets.map((adSet) => (
                                          <React.Fragment key={adSet.adset_id}>
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
                                                <Badge 
                                                  variant="outline" 
                                                  className={`px-2 py-0.5 text-xs flex items-center gap-1 ${
                                                    adSet.status.toUpperCase() === 'ACTIVE' 
                                                      ? 'bg-green-950/30 text-green-500 border border-green-800/50' 
                                                      : 'bg-gray-950/30 text-gray-500 border border-gray-800/50'
                                                  }`}
                                                >
                                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                                    adSet.status.toUpperCase() === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'
                                                  }`}></div>
                                                  {adSet.status}
                                                </Badge>
                                              </td>
                                              <td className="p-2 text-right">
                                                <div className="flex flex-col items-end">
                                                  <Badge 
                                                    className="px-2 py-0.5 bg-[#111] border-[#333] text-white"
                                                    variant="outline"
                                                  >
                                                    {formatCurrency(adSet.budget)}
                                                    {adSet.budget_type === 'daily' && <span className="text-xs text-gray-500 ml-1">/day</span>}
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
                                      if (!adSetLoadingLockRef.current) {
                                        stableExpandAdSets(campaign.campaign_id);
                                      }
                                    }}
                                    className="text-white border-[#333] hover:bg-black/20"
                                    disabled={adSetLoadingLockRef.current || stableLoadingRef.current}
                                  >
                                    <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isLoadingAdSets ? 'animate-spin' : ''}`} />
                                    Retry Loading Ad Sets
                                  </Button>
                                </div>
                              )}
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
        )}
      </CardContent>
    </Card>
  )
};

// Export the component
export { CampaignWidget };

// Add global listener to disable background refreshes when the component mounts
useEffect(() => {
  // Disable auto-fetch when the component mounts to prevent background interference
  const originalDisableState = window._disableAutoMetaFetch;
  const originalBlockState = window._blockMetaApiCalls;
  
  // This handler will intercept any API calls that might interfere with our data display
  const handleBeforeFetch = (event: Event) => {
    if (event.type === 'fetch' && dataStabilizationLockRef.current) {
      // If we're in a stabilization period, block potential interfering calls
      if ((event as any).url?.includes('meta') || (event as any).url?.includes('campaign')) {
        logger.debug('[CampaignWidget] Intercepted potential interfering API call during stabilization');
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    }
  };
  
  // Add a global fetch interceptor
  window.addEventListener('fetch', handleBeforeFetch, true);
  
  // Return cleanup function
  return () => {
    // Restore original states
    window._disableAutoMetaFetch = originalDisableState;
    window._blockMetaApiCalls = originalBlockState;
    
    // Remove fetch interceptor
    window.removeEventListener('fetch', handleBeforeFetch, true);
    
    // Ensure all locks are released
    adSetLoadingLockRef.current = false;
    dataStabilizationLockRef.current = false;
    stableLoadingRef.current = false;
    
    // Clear all timers
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };
}, []);

// Add an effect to prevent all loops by disabling automatic refreshes
useEffect(() => {
  // Mechanism to prevent loop refreshes
  const preventLoops = () => {
    if (expandedCampaign && dataStabilizationLockRef.current) {
      logger.debug(`[CampaignWidget] Ensuring no refresh loops during stabilization`);
      window._disableAutoMetaFetch = true;
      window._blockMetaApiCalls = true;
    }
  };
  
  // Run the prevention mechanism immediately
  preventLoops();
  
  // Add a periodic check to ensure the prevention stays active
  const intervalId = setInterval(preventLoops, 1000);
  
  return () => {
    clearInterval(intervalId);
  };
}, [expandedCampaign]);