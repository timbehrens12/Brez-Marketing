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
  
  // Simplified refs
  const isLoadingInProgress = useRef(false);
  const isMountedRef = useRef(true);
  
  // Track in-flight API requests to cancel them if needed
  const pendingRequestsRef = useRef<AbortController[]>([]);
  
  // Add state to track campaigns with fetched ad sets
  const [campaignsWithAdSets, setCampaignsWithAdSets] = useState<Set<string>>(new Set());
  
  // Add more robust state tracking for loading state
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
  
  // The single, robust function to load ad sets
  const loadAdSetsForCampaign = useCallback(async (campaignId: string, isRefresh: boolean = false) => {
    // Prevent concurrent loads
    if (isLoadingInProgress.current) {
      logger.debug(`[CW] Load already in progress, skipping request for ${campaignId}.`);
      return;
    }
    isLoadingInProgress.current = true;
    
    logger.debug(`[CW] Starting ad set load for ${campaignId}, isRefresh: ${isRefresh}`);
    
    // Set loading state and placeholder immediately
    setIsLoadingAdSets(true);
    setAdSets([{ 
      id: 0,
      brand_id: brandId,
      adset_id: 'loading',
      adset_name: 'Loading...',
      campaign_id: campaignId,
      status: 'Loading',
      budget: 0, budget_type: '', spent: 0, impressions: 0, clicks: 0, 
      conversions: 0, ctr: 0, cpc: 0, cost_per_conversion: 0, 
      optimization_goal: null, updated_at: new Date().toISOString(), daily_insights: []
    }]);
    
    const minDisplayTime = 600; // Increased minimum display time
    const startTime = Date.now();
    
    let fetchedAdSets: AdSet[] = [];
    
    try {
      // Fetch status (non-blocking)
      fetch(`/api/meta/campaign-status-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, campaignId, forceRefresh: true }),
      }).then(res => res.ok ? res.json() : null)
        .then(statusData => {
          if (isMountedRef.current && statusData?.status) {
            setLocalCampaigns(prev => 
              prev.map(c => 
                c.campaign_id === campaignId ? { ...c, status: statusData.status, last_refresh_date: statusData.timestamp } : c
              )
            );
          }
        }).catch(err => logger.debug(`[CW] Status check failed during ad set load: ${err.message}`));

      // Fetch ad sets
      let url = `/api/meta/adsets?brandId=${brandId}&campaignId=${campaignId}&forceRefresh=${isRefresh}`;
      if (dateRange?.from && dateRange?.to) {
        const from = dateRange.from.toISOString().split('T')[0];
        const to = dateRange.to.toISOString().split('T')[0];
        url += `&from=${from}&to=${to}`;
      }
      
      const response = await fetch(url);
      if (!isMountedRef.current) {
        isLoadingInProgress.current = false;
        return; // Component unmounted
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ad sets: ${response.status}`);
      }
      
      const data = await response.json();
      fetchedAdSets = Array.isArray(data.adSets) ? data.adSets : [];
      logger.debug(`[CW] Fetched ${fetchedAdSets.length} ad sets for ${campaignId}`);

      // Update tracking set
      if (fetchedAdSets.length > 0) {
        setCampaignsWithAdSets(prev => new Set(prev).add(campaignId));
      }

    } catch (error) {
      fetchedAdSets = []; // Ensure empty on error
      logger.error(`[CW] Error loading ad sets for ${campaignId}: ${(error as Error).message}`);
      if (isRefresh) {
        toast.error(`Failed to refresh ad sets: ${(error as Error).message}`);
      }
    } finally {
      // Ensure minimum display time for loading state
      const elapsedTime = Date.now() - startTime;
      const remainingTime = minDisplayTime - elapsedTime;
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // Final state update only if component is still mounted and campaign is still expanded
      if (isMountedRef.current && expandedCampaign === campaignId) {
        logger.debug(`[CW] Updating state for ${campaignId} with ${fetchedAdSets.length} sets.`);
        setAdSets(fetchedAdSets); // Set actual data or empty array
        setIsLoadingAdSets(false);
      } else {
        logger.debug(`[CW] Campaign changed/unmounted for ${campaignId} before state update.`);
        // If the campaign changed, ensure loading is false for the *current* expanded one if it's not this one
        if (isLoadingAdSets && expandedCampaign !== campaignId) {
           setIsLoadingAdSets(false);
        }
      }
      
      // Release lock *last*
      isLoadingInProgress.current = false;
    }
  }, [brandId, dateRange, expandedCampaign, isMountedRef]); // Minimal dependencies

  // Simplified toggle function
  const toggleCampaignExpand = useCallback((campaignId: string) => {
    if (isLoadingInProgress.current) {
        logger.debug(`[CW] Ignoring toggle - load already in progress.`);
        return; 
    }
    
    if (expandedCampaign === campaignId) {
      // Collapse
      setExpandedCampaign(null);
      setAdSets([]); 
      setIsLoadingAdSets(false); 
      logger.debug(`[CW] Collapsed campaign ${campaignId}`);
    } else {
      // Expand
      if (!brandId || !campaignId) {
          toast.error("Cannot expand campaign: Missing required IDs.");
          return;
      }
      setExpandedCampaign(campaignId); 
      loadAdSetsForCampaign(campaignId, false); // Start loading process
    }
  }, [brandId, expandedCampaign, loadAdSetsForCampaign]); // Minimal dependencies
  
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
                loadAdSetsForCampaign(campaign.campaign_id, true);
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
  }, [brandId, onRefresh, isMountedRef, expandedCampaign, loadAdSetsForCampaign]);
  
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

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
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

  // Toggle metric visibility
  const toggleMetric = (metricId: string) => {
    setVisibleMetrics(prev => 
        prev.includes(metricId) 
            ? prev.filter(id => id !== metricId)
            : [...prev, metricId]
    );
  };

  // Format values based on type
  const formatValue = useCallback((value: number | undefined | null, format: string): string => {
    const numValue = typeof value === 'number' ? value : 0;
    switch (format) {
      case 'currency':
        return formatCurrency(numValue);
      case 'percentage':
        return formatPercentage(numValue);
      case 'roas':
        return `${numValue.toFixed(2)}x`;
      default:
        return formatNumber(numValue);
    }
  }, []); // Empty dependency array as formatters are pure

  // Filter campaigns based on search query and inactive status
  const filteredCampaigns = useMemo(() => {
    const campaignsToFilter = Array.isArray(localCampaigns) ? localCampaigns : [];
    return campaignsToFilter.filter(campaign => {
      if (!campaign || !campaign.campaign_name || !campaign.account_name || !campaign.status) return false;
      const searchMatch = !searchQuery || 
        campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.account_name.toLowerCase().includes(searchQuery.toLowerCase());
      const statusMatch = showInactive || campaign.status.toUpperCase() === 'ACTIVE';
      return searchMatch && statusMatch;
    }).sort((a, b) => {
      if (!a || !b) return 0;
      if (sortBy === 'status') {
        const statusA = a.status?.toUpperCase() || '';
        const statusB = b.status?.toUpperCase() || '';
        if (statusA === 'ACTIVE' && statusB !== 'ACTIVE') return sortOrder === 'asc' ? 1 : -1;
        if (statusA !== 'ACTIVE' && statusB === 'ACTIVE') return sortOrder === 'asc' ? -1 : 1;
        return statusA.localeCompare(statusB) * (sortOrder === 'asc' ? 1 : -1);
      }
      const aValue = (typeof a[sortBy as keyof Campaign] === 'number' ? a[sortBy as keyof Campaign] : 0) as number;
      const bValue = (typeof b[sortBy as keyof Campaign] === 'number' ? b[sortBy as keyof Campaign] : 0) as number;
      return (aValue - bValue) * (sortOrder === 'asc' ? 1 : -1);
    });
  }, [localCampaigns, searchQuery, showInactive, sortBy, sortOrder]);

  // Toggle ad set expansion
  const toggleAdSetExpand = useCallback((adSetId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedAdSet(prev => prev === adSetId ? null : adSetId);
  }, []);
  
  // Handle clicks on ad set rows
  const handleAdSetRowClick = useCallback((adSetId: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    toggleAdSetExpand(adSetId);
  }, [toggleAdSetExpand]);

  // Add getCampaignBudget back inside the component scope
  const getCampaignBudget = useCallback((campaign: Campaign, campaignAdSets: AdSet[] | null = null) => {
    if (expandedCampaign === campaign.campaign_id && campaignAdSets && campaignAdSets.length > 0) {
      const totalAdSetBudget = campaignAdSets.reduce((sum, adSet) => sum + (adSet.budget || 0), 0);
      return {
        budget: totalAdSetBudget,
        formatted_budget: formatCurrency(totalAdSetBudget),
        budget_type: campaignAdSets.some(adSet => adSet.budget_type === 'daily') ? 'daily' : 'lifetime',
        budget_source: 'adsets'
      };
    }
    if (campaign.adset_budget_total && campaign.adset_budget_total > 0) {
      return {
        budget: campaign.adset_budget_total,
        formatted_budget: formatCurrency(campaign.adset_budget_total),
        budget_type: campaign.budget_type || 'unknown',
        budget_source: 'adsets_total'
      };
    }
    const currentBudgetData = currentBudgets[campaign.id];
    const budget = currentBudgetData?.budget || campaign.budget || 0;
    return {
      budget,
      formatted_budget: currentBudgetData?.formatted_budget || formatCurrency(budget),
      budget_type: currentBudgetData?.budget_type || campaign.budget_type || 'unknown',
      budget_source: currentBudgetData?.budget_source || 'campaign'
    };
  }, [expandedCampaign, currentBudgets]);

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
                                loadAdSetsForCampaign(campaign.campaign_id, true);
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
                                      if (isLoadingInProgress.current) {
                                        return;
                                      }
                                      // Use stable expand to refresh
                                      loadAdSetsForCampaign(campaign.campaign_id);
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
                                      if (!isLoadingInProgress.current) {
                                        loadAdSetsForCampaign(campaign.campaign_id);
                                      }
                                    }}
                                    className="text-white border-[#333] hover:bg-black/20"
                                    disabled={isLoadingInProgress.current}
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