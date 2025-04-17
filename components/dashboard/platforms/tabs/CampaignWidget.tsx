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
  
  // Update the useEffect to ensure campaign data is calculated from adsets correctly
  useEffect(() => {
    // Initialize campaigns with data from props
    if (campaigns?.length) {
      // Deep clone to avoid reference issues
      const updatedCampaigns = JSON.parse(JSON.stringify(campaigns));
      
      // Apply date range filtering to campaign data
      updatedCampaigns.forEach((campaign: Campaign) => {
        // Set has_data_in_range based on daily insights within date range
        if (dateRange?.from && dateRange?.to && campaign.daily_insights?.length) {
          const fromDate = dateRange.from.toISOString().split('T')[0];
          const toDate = dateRange.to.toISOString().split('T')[0];
          
          // Filter insights within date range
          const insightsInRange = campaign.daily_insights.filter((insight: DailyInsight) => {
            const insightDate = insight.date;
            return insightDate >= fromDate && insightDate <= toDate;
          });
          
          // Set flag if no data in range
          campaign.has_data_in_range = insightsInRange.length > 0;
          
          // Recalculate metrics based on filtered insights
          if (insightsInRange.length > 0) {
            // Sum up metrics for the date range
            const metrics = insightsInRange.reduce((acc: { spent: number; impressions: number; clicks: number; conversions: number }, insight: DailyInsight) => {
              acc.spent += (insight.spent || 0);
              acc.impressions += (insight.impressions || 0);
              acc.clicks += (insight.clicks || 0);
              acc.conversions += (insight.conversions || 0);
              return acc;
            }, { spent: 0, impressions: 0, clicks: 0, conversions: 0 });
            
            // Recalculate derived metrics
            campaign.spent = metrics.spent;
            campaign.impressions = metrics.impressions;
            campaign.clicks = metrics.clicks;
            campaign.conversions = metrics.conversions;
            
            // Only calculate CTR if we have impressions
            if (metrics.impressions > 0) {
              campaign.ctr = (metrics.clicks / metrics.impressions) * 100;
            } else {
              campaign.ctr = 0;
            }
            
            // Only calculate CPC if we have clicks
            if (metrics.clicks > 0) {
              campaign.cpc = metrics.spent / metrics.clicks;
            } else {
              campaign.cpc = 0;
            }
            
            // Only calculate cost per conversion if we have conversions
            if (metrics.conversions > 0) {
              campaign.cost_per_conversion = metrics.spent / metrics.conversions;
            } else {
              campaign.cost_per_conversion = 0;
            }
            
            // Calculate ROAS using a standard conversion value estimate
            const conversionValue = metrics.conversions * 25; // Assuming $25 avg value
            if (metrics.spent > 0) {
              campaign.roas = conversionValue / metrics.spent;
            } else {
              campaign.roas = 0;
            }
          } else {
            // No data in range, zero out metrics
            campaign.spent = 0;
            campaign.impressions = 0;
            campaign.clicks = 0;
            campaign.conversions = 0;
            campaign.ctr = 0;
            campaign.cpc = 0;
            campaign.cost_per_conversion = 0;
            campaign.roas = 0;
          }
        }
      });
      
      setLocalCampaigns(updatedCampaigns);
    }
  }, [campaigns, dateRange]);
  
  // Ensure adsets are loaded correctly for the given campaign and date range
  const fetchAdSets = useCallback(async (campaignId: string, forceRefresh = false) => {
    if (!brandId || !campaignId || !dateRange?.from || !dateRange?.to) {
      logger.debug(`[CampaignWidget] Missing required data for ad sets fetch`);
      return;
    }
    
    // Update loading state
    setIsLoadingAdSets(true);
    
    // Create an abort controller for this request
    const abortController = new AbortController();
    pendingRequestsRef.current.push(abortController);
    
    try {
      // Add campaign to the list of campaigns with ad sets
      setCampaignsWithAdSets(prev => new Set(prev).add(campaignId));
      
      // Format date range params
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      logger.debug(`[CampaignWidget] Fetching ad sets for campaign ${campaignId} with date range ${fromDate} to ${toDate}`);
      
      // Add a unique timestamp to avoid caching issues
      const url = `/api/meta/adsets?brandId=${brandId}&campaignId=${campaignId}&from=${fromDate}&to=${toDate}&t=${Date.now()}${forceRefresh ? '&forceRefresh=true' : ''}`;
      
      const response = await fetch(url, {
        signal: abortController.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ad sets: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.adSets || !Array.isArray(data.adSets)) {
        logger.warn(`[CampaignWidget] No ad sets returned for campaign: ${campaignId}`);
        setAdSets([]);
        return;
      }
      
      // Process ad sets data with date filtering
      const processedAdSets = data.adSets.map((adSet: AdSet) => {
        // Filter daily insights by date range
        if (adSet.daily_insights?.length) {
          const filteredInsights = adSet.daily_insights.filter(insight => {
            const insightDate = typeof insight.date === 'string' ? insight.date : '';
            return insightDate >= fromDate && insightDate <= toDate;
          });
          
          // Recalculate metrics for the adset based on filtered insights
          if (filteredInsights.length > 0) {
            const metrics = filteredInsights.reduce((acc: { spent: number; impressions: number; clicks: number; conversions: number; reach: number }, insight: any) => {
              acc.spent += (insight.spent || 0);
              acc.impressions += (insight.impressions || 0);
              acc.clicks += (insight.clicks || 0);
              acc.conversions += (insight.conversions || 0);
              acc.reach += (insight.reach || 0);
              return acc;
            }, { spent: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 });
            
            adSet.spent = metrics.spent;
            adSet.impressions = metrics.impressions;
            adSet.clicks = metrics.clicks;
            adSet.conversions = metrics.conversions;
            adSet.reach = metrics.reach;
            
            // Calculate derived metrics
            if (metrics.impressions > 0) {
              adSet.ctr = (metrics.clicks / metrics.impressions) * 100;
            } else {
              adSet.ctr = 0;
            }
            
            if (metrics.clicks > 0) {
              adSet.cpc = metrics.spent / metrics.clicks;
            } else {
              adSet.cpc = 0;
            }
            
            if (metrics.conversions > 0) {
              adSet.cost_per_conversion = metrics.spent / metrics.conversions;
            } else {
              adSet.cost_per_conversion = 0;
            }
          } else {
            // No data in the date range, zero out metrics
            adSet.spent = 0;
            adSet.impressions = 0;
            adSet.clicks = 0;
            adSet.conversions = 0;
            adSet.reach = 0;
            adSet.ctr = 0;
            adSet.cpc = 0;
            adSet.cost_per_conversion = 0;
          }
          
          // Update the daily insights to the filtered set
          adSet.daily_insights = filteredInsights;
        }
        
        return adSet;
      });
      
      // Update adset state with the processed data
      setAdSets(processedAdSets);
      
      // After loading ad sets, compute and update campaign metrics from adsets
      // This ensures the campaign row shows the correct sum of adset data
      const adSetTotals = processedAdSets.reduce((acc: { spent: number; impressions: number; clicks: number; conversions: number; reach: number }, adSet: AdSet) => {
        acc.spent += (adSet.spent || 0);
        acc.impressions += (adSet.impressions || 0);
        acc.clicks += (adSet.clicks || 0);
        acc.conversions += (adSet.conversions || 0);
        acc.reach += (adSet.reach || 0);
        return acc;
      }, { spent: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 });
      
      // Update the corresponding campaign with adset data
      setLocalCampaigns(prevCampaigns => 
        prevCampaigns.map(campaign => {
          if (campaign.campaign_id === campaignId) {
            // Calculate updated derived metrics
            const updatedCampaign = { ...campaign };
            
            // Update metrics from ad sets
            updatedCampaign.spent = adSetTotals.spent;
            updatedCampaign.impressions = adSetTotals.impressions;
            updatedCampaign.clicks = adSetTotals.clicks;
            updatedCampaign.conversions = adSetTotals.conversions;
            updatedCampaign.reach = adSetTotals.reach;
            
            // Recalculate derived metrics
            if (adSetTotals.impressions > 0) {
              updatedCampaign.ctr = (adSetTotals.clicks / adSetTotals.impressions) * 100;
            } else {
              updatedCampaign.ctr = 0;
            }
            
            if (adSetTotals.clicks > 0) {
              updatedCampaign.cpc = adSetTotals.spent / adSetTotals.clicks;
            } else {
              updatedCampaign.cpc = 0;
            }
            
            if (adSetTotals.conversions > 0) {
              updatedCampaign.cost_per_conversion = adSetTotals.spent / adSetTotals.conversions;
            } else {
              updatedCampaign.cost_per_conversion = 0;
            }
            
            // Calculate ROAS
            const conversionValue = adSetTotals.conversions * 25; // Assuming $25 avg value
            if (adSetTotals.spent > 0) {
              updatedCampaign.roas = conversionValue / adSetTotals.spent;
            } else {
              updatedCampaign.roas = 0;
            }
            
            return updatedCampaign;
          }
          return campaign;
        })
      );
      
      // Dispatch an event to notify that ad sets were loaded
      const adSetsLoadedEvent = new CustomEvent('adSetsLoaded', {
        detail: {
          campaignId,
          count: processedAdSets.length,
          from: fromDate,
          to: toDate
        }
      });
      window.dispatchEvent(adSetsLoadedEvent);
      
      logger.debug(`[CampaignWidget] Loaded ${processedAdSets.length} ad sets for campaign ${campaignId}`);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.debug(`[CampaignWidget] Ad sets fetch aborted for campaign ${campaignId}`);
      } else {
        logger.error(`[CampaignWidget] Error fetching ad sets for campaign ${campaignId}:`, error);
        toast.error(`Failed to load ad sets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Clear adsets in case of error
      setAdSets([]);
    } finally {
      setIsLoadingAdSets(false);
      
      // Remove this abort controller from the pending list
      pendingRequestsRef.current = pendingRequestsRef.current.filter(
        controller => controller !== abortController
      );
    }
  }, [brandId, dateRange]);
  
  // Add this function to update campaign totals based on all adsets
  const updateCampaignTotalsFromAdSets = useCallback((campaignId: string) => {
    if (!campaignId || !adSets.length) return;
    
    // Calculate totals from all adsets
    const adSetTotals = adSets.reduce((acc: { spent: number; impressions: number; clicks: number; conversions: number; reach: number }, adSet: AdSet) => {
      acc.spent += (adSet.spent || 0);
      acc.impressions += (adSet.impressions || 0);
      acc.clicks += (adSet.clicks || 0);
      acc.conversions += (adSet.conversions || 0);
      acc.reach += (adSet.reach || 0);
      return acc;
    }, { spent: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 });
    
    // Update the campaign with these totals
    setLocalCampaigns(prevCampaigns => 
      prevCampaigns.map(campaign => {
        if (campaign.campaign_id === campaignId) {
          // Calculate updated derived metrics
          const updatedCampaign = { ...campaign };
          
          // Update metrics from ad sets
          updatedCampaign.spent = adSetTotals.spent;
          updatedCampaign.impressions = adSetTotals.impressions;
          updatedCampaign.clicks = adSetTotals.clicks;
          updatedCampaign.conversions = adSetTotals.conversions;
          updatedCampaign.reach = adSetTotals.reach;
          
          // Recalculate derived metrics
          if (adSetTotals.impressions > 0) {
            updatedCampaign.ctr = (adSetTotals.clicks / adSetTotals.impressions) * 100;
          } else {
            updatedCampaign.ctr = 0;
          }
          
          if (adSetTotals.clicks > 0) {
            updatedCampaign.cpc = adSetTotals.spent / adSetTotals.clicks;
          } else {
            updatedCampaign.cpc = 0;
          }
          
          if (adSetTotals.conversions > 0) {
            updatedCampaign.cost_per_conversion = adSetTotals.spent / adSetTotals.conversions;
          } else {
            updatedCampaign.cost_per_conversion = 0;
          }
          
          // Calculate ROAS
          const conversionValue = adSetTotals.conversions * 25; // Assuming $25 avg value
          if (adSetTotals.spent > 0) {
            updatedCampaign.roas = conversionValue / adSetTotals.spent;
          } else {
            updatedCampaign.roas = 0;
          }
          
          updatedCampaign.has_data_in_range = adSetTotals.spent > 0 || adSetTotals.impressions > 0;
          
          return updatedCampaign;
        }
        return campaign;
      })
    );
  }, [adSets]);
  
  // Add an effect to update campaign totals whenever adsets change
  useEffect(() => {
    if (expandedCampaign && adSets.length > 0) {
      updateCampaignTotalsFromAdSets(expandedCampaign);
    }
  }, [expandedCampaign, adSets, updateCampaignTotalsFromAdSets]);
  
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
  const getCampaignBudget = (campaign: Campaign, campaignAdSets: AdSet[] | null = null) => {
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

  // Add a function to fetch campaign data directly with the right date range
  const fetchCampaignData = useCallback(async (campaignId: string, forceRefresh = false) => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      logger.debug(`[CampaignWidget] Missing required data for campaign data fetch`);
      return;
    }
    
    try {
      // Format date range params
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      logger.debug(`[CampaignWidget] Fetching campaign data for ${campaignId} with date range ${fromDate} to ${toDate}`);
      
      // Add a unique timestamp to avoid caching issues
      const url = `/api/meta/campaigns/data?brandId=${brandId}&campaignId=${campaignId}&from=${fromDate}&to=${toDate}&t=${Date.now()}${forceRefresh ? '&forceRefresh=true' : ''}`;
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign data: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.campaign) {
        logger.warn(`[CampaignWidget] No campaign data returned for: ${campaignId}`);
        return null;
      }
      
      // Process the campaign data to ensure all metrics are properly formatted
      const processedCampaign = {
        ...data.campaign,
        // Ensure numeric values
        spent: Number(data.campaign.spent || 0),
        impressions: Number(data.campaign.impressions || 0),
        clicks: Number(data.campaign.clicks || 0),
        conversions: Number(data.campaign.conversions || 0),
        reach: Number(data.campaign.reach || 0),
        // Recalculate derived metrics to ensure consistency
        ctr: data.campaign.impressions > 0 
          ? (Number(data.campaign.clicks || 0) / Number(data.campaign.impressions)) * 100 
          : 0,
        cpc: data.campaign.clicks > 0 
          ? Number(data.campaign.spent || 0) / Number(data.campaign.clicks) 
          : 0,
        cost_per_conversion: data.campaign.conversions > 0 
          ? Number(data.campaign.spent || 0) / Number(data.campaign.conversions) 
          : 0,
        // Mark as having data if any of these metrics are non-zero
        has_data_in_range: (
          Number(data.campaign.spent || 0) > 0 || 
          Number(data.campaign.impressions || 0) > 0 || 
          Number(data.campaign.clicks || 0) > 0
        )
      };
      
      // Update the local campaigns with this updated data
      setLocalCampaigns(prev => 
        prev.map(campaign => 
          campaign.campaign_id === campaignId ? processedCampaign : campaign
        )
      );
      
      // Also check if we need to update metrics from ad sets for even more accuracy
      if (expandedCampaign === campaignId && adSets.length > 0) {
        // Calculate totals from ad sets for the most accurate data
        const adSetTotals = adSets.reduce((acc, adSet) => {
          acc.spent += Number(adSet.spent || 0);
          acc.impressions += Number(adSet.impressions || 0);
          acc.clicks += Number(adSet.clicks || 0);
          acc.conversions += Number(adSet.conversions || 0);
          acc.reach += Number(adSet.reach || 0);
          return acc;
        }, { spent: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 });
        
        // Update the campaign metrics with ad set data if it has any
        if (adSetTotals.spent > 0 || adSetTotals.impressions > 0 || adSetTotals.clicks > 0) {
          setLocalCampaigns(prev => 
            prev.map(campaign => {
              if (campaign.campaign_id === campaignId) {
                return {
                  ...campaign,
                  spent: adSetTotals.spent,
                  impressions: adSetTotals.impressions,
                  clicks: adSetTotals.clicks,
                  conversions: adSetTotals.conversions,
                  reach: adSetTotals.reach,
                  ctr: adSetTotals.impressions > 0 
                    ? (adSetTotals.clicks / adSetTotals.impressions) * 100 
                    : 0,
                  cpc: adSetTotals.clicks > 0 
                    ? adSetTotals.spent / adSetTotals.clicks 
                    : 0,
                  cost_per_conversion: adSetTotals.conversions > 0 
                    ? adSetTotals.spent / adSetTotals.conversions 
                    : 0,
                  has_data_in_range: true
                };
              }
              return campaign;
            })
          );
        }
      }
      
      return processedCampaign;
    } catch (error) {
      logger.error(`[CampaignWidget] Error fetching campaign data:`, error);
      return null;
    }
  }, [brandId, dateRange, expandedCampaign, adSets]);

  // Update the refreshAllCampaignData function to be more aggressive
  const refreshAllCampaignData = useCallback(async (forceRefresh = false) => {
    if (!brandId || !dateRange?.from || !dateRange?.to) return;
    
    // Never throttle initial loads to ensure data is always correct
    if (!forceRefresh && localCampaigns.length > 0 && !throttle('refresh-all-campaigns', 10000)) {
      logger.debug('[CampaignWidget] Throttled campaign refresh');
      return;
    }
    
    logger.info('[CampaignWidget] Refreshing all campaign data with current date range');
    
    // Show a loading indicator for the user
    setRefreshing(true);
    
    try {
      // Start by updating the date-filtered campaign data without API calls
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      // Use API calls to refresh ALL campaign data for maximum accuracy
      const refreshPromises = campaigns.map(campaign => {
        return fetchCampaignData(campaign.campaign_id, forceRefresh)
          .catch(err => {
            logger.error(`Error refreshing campaign ${campaign.campaign_id}:`, err);
            return null;
          });
      });
      
      // Wait for all refresh calls to complete
      await Promise.all(refreshPromises);
      
      // If no API call worked, fall back to local filtering
      if (!localCampaigns.some(c => c.has_data_in_range)) {
        logger.debug('[CampaignWidget] API refresh failed, using local data filtering');
        
        const updatedCampaigns = JSON.parse(JSON.stringify(campaigns));
        
        // Apply date filtering to each campaign's data
        updatedCampaigns.forEach((campaign: Campaign) => {
          if (campaign.daily_insights?.length) {
            // Filter insights within date range
            const insightsInRange = campaign.daily_insights.filter((insight: DailyInsight) => {
              const insightDate = insight.date;
              return insightDate >= fromDate && insightDate <= toDate;
            });
            
            campaign.has_data_in_range = insightsInRange.length > 0;
            
            if (insightsInRange.length > 0) {
              // Sum up metrics for the filtered date range
              const metrics = insightsInRange.reduce((acc: any, insight: DailyInsight) => {
                acc.spent += (insight.spent || 0);
                acc.impressions += (insight.impressions || 0);
                acc.clicks += (insight.clicks || 0);
                acc.conversions += (insight.conversions || 0);
                return acc;
              }, { spent: 0, impressions: 0, clicks: 0, conversions: 0 });
              
              // Update campaign metrics
              campaign.spent = metrics.spent;
              campaign.impressions = metrics.impressions;
              campaign.clicks = metrics.clicks;
              campaign.conversions = metrics.conversions;
              
              // Calculate derived metrics
              campaign.ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
              campaign.cpc = metrics.clicks > 0 ? metrics.spent / metrics.clicks : 0;
              campaign.cost_per_conversion = metrics.conversions > 0 ? metrics.spent / metrics.conversions : 0;
              
              // Calculate ROAS (assuming $25 per conversion)
              const conversionValue = metrics.conversions * 25;
              campaign.roas = metrics.spent > 0 ? conversionValue / metrics.spent : 0;
            } else {
              // Zero out metrics for no data in range
              campaign.spent = 0;
              campaign.impressions = 0;
              campaign.clicks = 0;
              campaign.conversions = 0;
              campaign.ctr = 0;
              campaign.cpc = 0;
              campaign.cost_per_conversion = 0;
              campaign.roas = 0;
            }
          }
        });
        
        setLocalCampaigns(updatedCampaigns);
      }
      
      // Show toast confirmation to indicate data is fresh
      if (forceRefresh) {
        toast.success("Campaign data refreshed", { 
          description: "Data has been updated for the current date range."
        });
      }
    } catch (error) {
      logger.error('[CampaignWidget] Error refreshing campaign data:', error);
      toast.error("Failed to refresh campaign data");
    } finally {
      setRefreshing(false);
    }
  }, [brandId, dateRange, campaigns, localCampaigns, fetchCampaignData]);

  // Make a direct server call on component mount to get accurate data
  useEffect(() => {
    // This will run when the component first mounts
    const initializeData = async () => {
      // If no date range or brand ID, exit early
      if (!dateRange?.from || !dateRange?.to || !brandId) {
        logger.warn('[CampaignWidget] Missing date range or brandId for data load');
        return;
      }
      
      setRefreshing(true);
      
      try {
        // Make sure to get the latest api url format
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const endpoint = `${baseUrl}/api/meta/campaigns/bulk-data`;
        
        // Format dates for API
        const from = dateRange.from.toISOString().split('T')[0];
        const to = dateRange.to.toISOString().split('T')[0];
        
        // Add timestamp to prevent caching
        const timestamp = Date.now();
        
        // Full URL with all required parameters
        const url = `${endpoint}?brandId=${brandId}&from=${from}&to=${to}&t=${timestamp}`;
        
        logger.info(`[CampaignWidget] Fetching bulk campaign data from: ${from} to ${to}`);
        
        const response = await fetch(
          url,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch campaign data: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.campaigns && Array.isArray(data.campaigns) && data.campaigns.length > 0) {
          logger.info(`[CampaignWidget] Loaded ${data.campaigns.length} campaigns from bulk API`);
          // Process campaigns to ensure metrics are properly calculated and set
          const processedCampaigns = data.campaigns.map((campaign: Campaign) => {
            // Ensure campaign has metrics even if not directly provided
            return {
              ...campaign,
              // Make sure these are numeric values to avoid display issues
              spent: Number(campaign.spent || 0),
              impressions: Number(campaign.impressions || 0),
              clicks: Number(campaign.clicks || 0),
              reach: Number(campaign.reach || 0),
              ctr: Number(campaign.ctr || 0),
              cpc: Number(campaign.cpc || 0),
              conversions: Number(campaign.conversions || 0),
              cost_per_conversion: Number(campaign.cost_per_conversion || 0),
              // Force update has_data_in_range flag
              has_data_in_range: (
                Number(campaign.spent) > 0 || 
                Number(campaign.impressions) > 0 || 
                Number(campaign.clicks) > 0
              )
            };
          });
          setLocalCampaigns(processedCampaigns);
        } else {
          // If bulk API fails, fall back to refreshing all
          logger.warn('[CampaignWidget] Bulk API returned no data, falling back to individual refresh');
          refreshAllCampaignData(true);
        }
      } catch (error) {
        logger.error('[CampaignWidget] Error during initial data load:', error);
        // Fall back to refresh method
        refreshAllCampaignData(true);
      } finally {
        setRefreshing(false);
      }
    };
    
    // Run immediately
    initializeData();
    
    // Also set up a timer to refresh data every 60 seconds
    const intervalId = setInterval(() => {
      refreshAllCampaignData(false);
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [brandId, campaigns.length, dateRange?.from, dateRange?.to]);

  // Create a useEffect with the right dependencies that will re-render when the date range changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      // When date range changes, immediately refresh data
      refreshAllCampaignData(true);
    }
  }, [dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]);

  // Update the toggle function to ensure campaign data is accurate
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
      
      // Force refresh campaign data immediately to ensure it's accurate
      await fetchCampaignData(campaignId, true);
      
      // Set as expanded
      setExpandedCampaign(campaignId);
      
      // Fetch ad sets for this campaign
      await fetchAdSets(campaignId);
      
      // After fetching ad sets, update campaign metrics based on ad set totals
      // This ensures the parent campaign row shows consistent data with its ad sets
      const campaign = localCampaigns.find(c => c.campaign_id === campaignId);
      if (campaign && adSets.length > 0) {
        const updatedCampaigns = localCampaigns.map(c => {
          if (c.campaign_id === campaignId) {
            // Calculate totals from ad sets for more accurate data
            const adSetTotals = adSets.reduce((acc, adSet) => {
              acc.spent += Number(adSet.spent || 0);
              acc.impressions += Number(adSet.impressions || 0);
              acc.clicks += Number(adSet.clicks || 0);
              acc.conversions += Number(adSet.conversions || 0);
              acc.reach += Number(adSet.reach || 0);
              return acc;
            }, { spent: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 });
            
            // Calculate derived metrics
            const ctr = adSetTotals.impressions > 0 
              ? (adSetTotals.clicks / adSetTotals.impressions) * 100 
              : 0;
            const cpc = adSetTotals.clicks > 0 
              ? adSetTotals.spent / adSetTotals.clicks 
              : 0;
            const costPerConversion = adSetTotals.conversions > 0 
              ? adSetTotals.spent / adSetTotals.conversions 
              : 0;
            
            return {
              ...c,
              spent: adSetTotals.spent,
              impressions: adSetTotals.impressions,
              clicks: adSetTotals.clicks,
              conversions: adSetTotals.conversions,
              reach: adSetTotals.reach,
              ctr: ctr,
              cpc: cpc,
              cost_per_conversion: costPerConversion,
              has_data_in_range: true
            };
          }
          return c;
        });
        
        setLocalCampaigns(updatedCampaigns);
      }
    }
  }, [brandId, expandedCampaign, fetchAdSets, fetchCampaignData, localCampaigns, adSets]);

  // Add this effect to initialize localCampaigns from campaigns prop
  useEffect(() => {
    // When campaigns first arrive from props, make sure to set them to local state
    if (campaigns.length > 0) {
      setLocalCampaigns(campaigns);
    }
  }, [campaigns]);

  // Add a useEffect to sync metrics whenever ad sets change
  useEffect(() => {
    // When ad sets change, sync the parent campaign metrics
    if (expandedCampaign && adSets.length > 0) {
      const updatedCampaigns = localCampaigns.map(campaign => {
        if (campaign.campaign_id === expandedCampaign) {
          // Calculate totals from ad sets
          const adSetTotals = adSets.reduce((acc, adSet) => {
            acc.spent += Number(adSet.spent || 0);
            acc.impressions += Number(adSet.impressions || 0);
            acc.clicks += Number(adSet.clicks || 0);
            acc.conversions += Number(adSet.conversions || 0);
            return acc;
          }, { spent: 0, impressions: 0, clicks: 0, conversions: 0 });
          
          return {
            ...campaign,
            spent: adSetTotals.spent,
            impressions: adSetTotals.impressions,
            clicks: adSetTotals.clicks,
            conversions: adSetTotals.conversions,
            has_data_in_range: true
          };
        }
        return campaign;
      });
      
      setLocalCampaigns(updatedCampaigns);
    }
  }, [adSets, expandedCampaign, localCampaigns]);

  // Add a function to force-load ad set data for a specific campaign without UI updates
  const preloadAdSetData = useCallback(async (campaignId: string) => {
    if (!brandId || !campaignId || !dateRange?.from || !dateRange?.to) {
      return;
    }

    try {
      // Format date range params
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      // Add a unique timestamp to avoid caching issues
      const url = `/api/meta/adsets?brandId=${brandId}&campaignId=${campaignId}&from=${fromDate}&to=${toDate}&t=${Date.now()}&forceRefresh=true`;
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ad sets: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.adSets || !Array.isArray(data.adSets)) {
        return;
      }
      
      // Calculate ad set totals directly from the response
      const adSetTotals = data.adSets.reduce((acc: any, adSet: any) => {
        acc.spent += Number(adSet.spent || 0);
        acc.impressions += Number(adSet.impressions || 0);
        acc.clicks += Number(adSet.clicks || 0);
        acc.conversions += Number(adSet.conversions || 0);
        acc.reach += Number(adSet.reach || 0);
        return acc;
      }, { spent: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 });
      
      // Only update the campaign if we actually have data
      if (adSetTotals.spent > 0 || adSetTotals.impressions > 0 || adSetTotals.clicks > 0) {
        // Update the corresponding campaign with adset data
        setLocalCampaigns(prevCampaigns => 
          prevCampaigns.map(campaign => {
            if (campaign.campaign_id === campaignId) {
              // Calculate derived metrics
              const ctr = adSetTotals.impressions > 0 
                ? (adSetTotals.clicks / adSetTotals.impressions) * 100 
                : 0;
              const cpc = adSetTotals.clicks > 0 
                ? adSetTotals.spent / adSetTotals.clicks 
                : 0;
              const costPerConversion = adSetTotals.conversions > 0 
                ? adSetTotals.spent / adSetTotals.conversions 
                : 0;
              
              // Calculate ROAS
              const conversionValue = adSetTotals.conversions * 25; // Assuming $25 avg value
              const roas = adSetTotals.spent > 0 ? conversionValue / adSetTotals.spent : 0;
              
              return {
                ...campaign,
                spent: adSetTotals.spent,
                impressions: adSetTotals.impressions,
                clicks: adSetTotals.clicks,
                conversions: adSetTotals.conversions,
                reach: adSetTotals.reach,
                ctr: ctr,
                cpc: cpc,
                cost_per_conversion: costPerConversion,
                roas: roas,
                has_data_in_range: true,
                // Mark this campaign as having ad set synchronized data
                budget_source: 'api'
              };
            }
            return campaign;
          })
        );
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`[CampaignWidget] Error preloading ad sets for campaign ${campaignId}:`, error);
      return false;
    }
  }, [brandId, dateRange]);

  // Modify the initializeData function to preload ad set data for all campaigns immediately after fetching bulk data
  const initializeData = async () => {
    // If no date range or brand ID, exit early
    if (!dateRange?.from || !dateRange?.to || !brandId) {
      logger.warn('[CampaignWidget] Missing date range or brandId for data load');
      return;
    }
    
    setRefreshing(true);
    
    try {
      // Make sure to get the latest api url format
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const endpoint = `${baseUrl}/api/meta/campaigns/bulk-data`;
      
      // Format dates for API
      const from = dateRange.from.toISOString().split('T')[0];
      const to = dateRange.to.toISOString().split('T')[0];
      
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      
      // Full URL with all required parameters
      const url = `${endpoint}?brandId=${brandId}&from=${from}&to=${to}&t=${timestamp}`;
      
      logger.info(`[CampaignWidget] Fetching bulk campaign data from: ${from} to ${to}`);
      
      const response = await fetch(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign data: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.campaigns && Array.isArray(data.campaigns) && data.campaigns.length > 0) {
        logger.info(`[CampaignWidget] Loaded ${data.campaigns.length} campaigns from bulk API`);
        // Process campaigns to ensure metrics are properly calculated and set
        const processedCampaigns = data.campaigns.map((campaign: Campaign) => {
          // Ensure campaign has metrics even if not directly provided
          return {
            ...campaign,
            // Make sure these are numeric values to avoid display issues
            spent: Number(campaign.spent || 0),
            impressions: Number(campaign.impressions || 0),
            clicks: Number(campaign.clicks || 0),
            reach: Number(campaign.reach || 0),
            ctr: Number(campaign.ctr || 0),
            cpc: Number(campaign.cpc || 0),
            conversions: Number(campaign.conversions || 0),
            cost_per_conversion: Number(campaign.cost_per_conversion || 0),
            // Force update has_data_in_range flag
            has_data_in_range: (
              Number(campaign.spent) > 0 || 
              Number(campaign.impressions) > 0 || 
              Number(campaign.clicks) > 0
            )
          };
        });
        
        // Set initial campaigns from bulk API
        setLocalCampaigns(processedCampaigns);
        
        // CRITICAL FIX: Preload ad set data for all campaigns to ensure metrics are correct
        // Only get data for the first 5 campaigns to avoid performance issues
        const campaignsToPreload = processedCampaigns.slice(0, 5);
        logger.info(`[CampaignWidget] Preloading ad set data for ${campaignsToPreload.length} campaigns`);
        
        // Use Promise.all to load ad set data for multiple campaigns in parallel
        await Promise.all(
          campaignsToPreload.map(async (campaign: Campaign) => {
            if (campaign.campaign_id) {
              const result = await preloadAdSetData(campaign.campaign_id);
              logger.debug(`[CampaignWidget] Preloaded ad set data for campaign ${campaign.campaign_id}: ${result ? 'Success' : 'No data'}`);
            }
          })
        );
        
        logger.info('[CampaignWidget] Initial data load complete with ad set data preloading');
      } else {
        // If bulk API fails, fall back to refreshing all
        logger.warn('[CampaignWidget] Bulk API returned no data, falling back to individual refresh');
        refreshAllCampaignData(true);
      }
    } catch (error) {
      logger.error('[CampaignWidget] Error during initial data load:', error);
      // Fall back to refresh method
      refreshAllCampaignData(true);
    } finally {
      setRefreshing(false);
    }
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
                                      setAdSets([]); // Clear current ad sets to show loading
                                      fetchAdSets(campaign.campaign_id);
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
                              
                              {isLoadingAdSets ? (
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                  <RefreshCw className="h-8 w-8 animate-spin text-white mb-3" />
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
                                      setAdSets([]); // Clear current ad sets to show loading
                                      fetchAdSets(campaign.campaign_id);
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