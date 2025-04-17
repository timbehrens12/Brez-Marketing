"use client"

import React, { useState, useMemo, useEffect, useCallback, useRef, FC } from 'react'
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
  
  // Modify the existing fetchAdSets implementation to track campaigns with ad sets
  const fetchAdSets = useCallback(async (campaignId: string, forceRefresh: boolean = false) => {
    if (!brandId || !isMountedRef.current || !campaignId) return;
    
    // Cancel any existing ad set fetch
    pendingRequestsRef.current.forEach(controller => {
      try {
        controller.abort();
      } catch (e) {
        // Ignore abort errors
      }
    });
    
    // Clear any existing ad sets to show fresh loading state
    setAdSets([]);
    setIsLoadingAdSets(true);
    
    const controller = createAbortController();
    console.log(`[CampaignWidget] Starting ad sets fetch for campaign ${campaignId}`);
    
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
      
      console.log(`[CampaignWidget] Fetching ad sets from: ${url}`);
      
      let response = await fetch(url, { signal: controller.signal });
      
      // If the regular endpoint fails, try the direct-fetch endpoint
      if (!response.ok) {
        console.log(`[CampaignWidget] Regular endpoint failed with status ${response.status}, trying direct-fetch endpoint...`);
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
      
      // Log the raw response for debugging
      const responseText = await response.text();
      console.log(`[CampaignWidget] Raw ad sets response (from ${usedDirectFetch ? 'direct' : 'regular'} endpoint): ${responseText.substring(0, 200)}...`);
      
      // Parse the response as JSON (safely)
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[CampaignWidget] Error parsing ad sets response: ${parseError}`);
        throw new Error(`Failed to parse response: ${responseText.substring(0, 100)}`);
      }
      
      if (response.ok) {
        // Check if this is a rate limit response with cached data
        if (data.source === 'cached_due_to_rate_limit') {
          usedCachedData = true;
          console.log(`[CampaignWidget] Using cached ad sets due to Meta API rate limits`);
        }
        
        console.log(`[CampaignWidget] Response OK, adSets:`, data.adSets ? data.adSets.length : 0);
        
        if (isMountedRef.current) {
          // Ensure we have a valid array of ad sets
          const validAdSets = Array.isArray(data.adSets) ? data.adSets : [];
          setAdSets(validAdSets);
          
          // Add this campaign to the tracking set if ad sets were found
          if (validAdSets.length > 0) {
            setCampaignsWithAdSets(prev => {
              const newSet = new Set(prev);
              newSet.add(campaignId);
              return newSet;
            });
          }
          
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
              console.log(`[CampaignWidget] No ad sets found for campaign ${campaignId}`);
            }
          }
          
          // Dispatch events for budgets to update regardless of ad set count
          console.log('[CampaignWidget] Dispatching status changed events');
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
          console.log(`[CampaignWidget] Meta API rate limit reached`);
          
          if (isMountedRef.current) {
            toast.warning(`Meta API rate limit reached`, {
              description: data.message || 'Please try again in a few minutes',
              duration: 8000
            });
            setAdSets([]);
          }
        } else {
          console.error(`[CampaignWidget] Failed to fetch ad sets: ${response.status} ${response.statusText}`, data);
          
          if (isMountedRef.current) {
            toast.error(`Failed to load ad sets: ${data?.error || response.statusText}`);
            setAdSets([]);
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log("[CampaignWidget] Ad set fetch aborted");
        return;
      }
      
      console.error("[CampaignWidget] Error fetching ad sets:", error);
      
      if (isMountedRef.current) {
        toast.error(`Error loading ad sets: ${(error as Error).message}`);
        setAdSets([]);
      }
    } finally {
      if (isMountedRef.current) {
        // Add a slight delay to avoid flickering
        setTimeout(() => {
          setIsLoadingAdSets(false);
        }, 300);
      }
      
      // Clean up abort controller
      removeAbortController(controller);
    }
  }, [brandId, createAbortController, dateRange, removeAbortController, isMountedRef]);
  
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
  
  // Fix toggleCampaignExpand implementation
  const toggleCampaignExpand = useCallback(async (campaignId: string) => {
    if (expandedCampaign === campaignId) {
      // Collapse if already expanded
      setExpandedCampaign(null);
      // Clear the ad sets data
      setAdSets([]);
    } else {
      // Validate campaignId before making API call
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
      
      // First, check the status to ensure it's current
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
        } else {
          logger.warn(`[CampaignWidget] Failed to check campaign status during expand: ${response.status}`);
          // Continue with expansion even if status check fails
        }
      } catch (error) {
        logger.error(`[CampaignWidget] Error checking campaign status during expand:`, error);
        // Continue with expansion even if status check fails
      }
      
      // Set as expanded
      setExpandedCampaign(campaignId);
      // Fetch ad sets for this campaign
      fetchAdSets(campaignId);
    }
  }, [brandId, expandedCampaign, fetchAdSets]);
  
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
      }, 300);
      
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
  const toggleMetric = useCallback((metricId: string) => {
    setVisibleMetrics(prev => {
      if (prev.includes(metricId)) {
        return prev.filter(id => id !== metricId);
      } else {
        return [...prev, metricId];
      }
    });
  }, []);
  
  // Format values based on type with protection for invalid values
  const formatValue = useCallback((value: number | null | undefined, format: string) => {
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
  
  // Calculate campaign budget from ad sets - EXACT COPY from original widget
  const getCampaignBudget = useCallback((campaign: Campaign, campaignAdSets: AdSet[] | null = null) => {
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
  }, [expandedCampaign, currentBudgets]);
  
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

  // Add this function to update campaign statuses regularly
  useEffect(() => {
    if (!campaigns.length || !brandId) return;
    
    // Check statuses on initial load
    checkCampaignStatuses(campaigns);
    
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
      
      logger.debug("[CampaignWidget] Auto-refreshing campaign statuses");
      // Only check active campaigns to minimize API calls
      const activeCampaigns = campaigns.filter(c => c.status.toUpperCase() === 'ACTIVE');
      if (activeCampaigns.length > 0) {
        checkCampaignStatuses(activeCampaigns.slice(0, 2));
      }
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

  // Add a function to automatically fetch budgets for all campaigns
  const fetchAllCampaignBudgets = useCallback(async () => {
    if (!brandId || !isMountedRef.current) return;
    
    if (!throttle('fetch-all-budgets', 30000)) {
      logger.debug('[CampaignWidget] Throttled budget fetch');
      return;
    }
    
    logger.debug('[CampaignWidget] Fetching budgets for all campaigns');
    setIsLoadingBudgets(true);
    
    try {
      const response = await fetch(`/api/meta/campaign-budgets?brandId=${brandId}&forceRefresh=true`);
      
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
          logger.debug(`[CampaignWidget] Updated budgets for ${Object.keys(budgetMap).length} campaigns`);
        }
      } else {
        logger.debug('[CampaignWidget] Failed to fetch campaign budgets');
      }
    } catch (error) {
      logger.debug('[CampaignWidget] Error fetching campaign budgets:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingBudgets(false);
        setLastBudgetRefresh(new Date());
      }
    }
  }, [brandId, isMountedRef]);

  // Use an effect to fetch budgets on mount and periodically
  useEffect(() => {
    if (!brandId || !campaigns.length) return;
    
    // Fetch budgets on mount
    fetchAllCampaignBudgets();
    
    // Also refresh budgets periodically
    const intervalId = setInterval(() => {
      if (isMountedRef.current) {
        fetchAllCampaignBudgets();
      }
    }, 300000); // Every 5 minutes
    
    return () => {
      clearInterval(intervalId);
    };
  }, [brandId, campaigns.length, fetchAllCampaignBudgets, isMountedRef]);

  // Add a status formatter function INSIDE the component
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
        displayText: 'Paused',
        bgColor: 'bg-yellow-950/30',
        textColor: 'text-yellow-500',
        borderColor: 'border-yellow-800/50',
        dotColor: 'bg-yellow-500'
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
  
  // Return the JSX for the component
  return (
    <Card className="mb-6 border-[#333] shadow-md overflow-hidden transition-all duration-200 hover:border-[#444] bg-[#111]">
      <CardHeader className="pb-3 border-b border-[#333]">
        {/* ... Header Content ... */}
      </CardHeader>
      
      <CardContent className="px-0 pb-0">
        {/* ... Content with Table ... */}
      </CardContent>
    </Card>
  );
};

// Export the component
export { CampaignWidget };