"use client"

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { 
  BarChart, ArrowUpRight, ArrowDownRight, 
  ChevronDown, Settings, RefreshCw,
  Eye, Zap, DollarSign, Users, MousePointerClick, 
  CalendarRange, Loader2, SlidersHorizontal, CircleIcon
} from 'lucide-react'
import {
  Card,
  CardContent,
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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { DateRange } from "react-day-picker"

// Create a simple logger
const logger = {
  debug: (message: string, ...args: any[]) => console.debug(message, ...args),
  info: (message: string, ...args: any[]) => console.info(message, ...args),
  warn: (message: string, ...args: any[]) => console.warn(message, ...args),
  error: (message: string, ...args: any[]) => console.error(message, ...args)
};

// Type definitions for consistent data handling
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
}

interface WorkingCampaignWidgetProps {
  brandId: string
  campaigns: Campaign[]
  isLoading: boolean
  isSyncing: boolean
  dateRange?: DateRange
  onRefresh: () => void
  onSync: () => void
}

// Define available metrics for the campaign display
const AVAILABLE_METRICS = [
  { 
    id: 'spent', 
    name: 'Spend', 
    format: 'currency',
    icon: <DollarSign className="h-3.5 w-3.5" />
  },
  { 
    id: 'impressions', 
    name: 'Impressions', 
    format: 'number',
    icon: <Users className="h-3.5 w-3.5" />
  },
  { 
    id: 'clicks', 
    name: 'Clicks', 
    format: 'number',
    icon: <MousePointerClick className="h-3.5 w-3.5" />
  },
  { 
    id: 'ctr', 
    name: 'CTR', 
    format: 'percentage',
    icon: <BarChart className="h-3.5 w-3.5" />
  },
  { 
    id: 'cpc', 
    name: 'CPC', 
    format: 'currency',
    icon: <DollarSign className="h-3.5 w-3.5" />
  },
  { 
    id: 'conversions', 
    name: 'Conversions', 
    format: 'number',
    icon: <Zap className="h-3.5 w-3.5" />
  },
  { 
    id: 'cost_per_conversion', 
    name: 'Cost per Conversion', 
    format: 'currency',
    icon: <DollarSign className="h-3.5 w-3.5" />
  },
  { 
    id: 'roas', 
    name: 'ROAS', 
    format: 'roas',
    icon: <BarChart className="h-3.5 w-3.5" />
  }
];

// Format helpers
const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const formatNumber = (value: number): string => {
  return value.toLocaleString();
};

const formatRoas = (value: number): string => {
  return value === 0 ? '0x' : `${value.toFixed(1)}x`;
};

const formatBudgetWithType = (amount: number | null, budgetType: string | null) => {
  if (amount === null) return 'No budget';
  
  const formattedAmount = formatCurrency(amount);
  if (!budgetType || budgetType.toLowerCase() === 'unknown') return formattedAmount;
  
  return budgetType.toLowerCase() === 'daily' ? `${formattedAmount}/day` : `${formattedAmount} lifetime`;
};

// Main component implementation with better data loading
export function WorkingCampaignWidget({ 
  brandId, 
  campaigns, 
  isLoading, 
  isSyncing, 
  dateRange, 
  onRefresh, 
  onSync 
}: WorkingCampaignWidgetProps): JSX.Element {
  // State management
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [isLoadingAdSets, setIsLoadingAdSets] = useState(false);
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleMetrics, setVisibleMetrics] = useState(['spent', 'clicks', 'ctr', 'cpc', 'conversions']);
  const [sortBy, setSortBy] = useState<string>('spent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showInactive, setShowInactive] = useState(true);
  
  // Refs for tracking state across renders
  const isMountedRef = useRef(true);
  const dataLoadedRef = useRef(false);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Initialize with campaign data from props
  useEffect(() => {
    if (campaigns.length > 0) {
      setLocalCampaigns(campaigns);
    }
  }, [campaigns]);
  
  // Format a value based on its type
  const formatValue = (value: number | undefined | null, format: string): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return format === 'currency' ? '$0.00' : format === 'percentage' ? '0%' : '0';
    }
    
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      case 'roas':
        return formatRoas(value);
      default:
        return formatNumber(value);
    }
  };
  
  // Calculate campaign budget
  const getCampaignBudget = (campaign: Campaign, campaignAdSets: AdSet[] | null = null) => {
    // Use adsets for budget if available
    if (campaignAdSets && campaignAdSets.length > 0) {
      const totalBudget = campaignAdSets.reduce((sum, adSet) => sum + (adSet.budget || 0), 0);
      const budgetType = campaignAdSets[0]?.budget_type || 'daily';
      
      return {
        budget: totalBudget,
        budget_type: budgetType,
        budget_source: 'adsets'
      };
    }
    
    // Fallback to campaign budget
    return {
      budget: campaign.budget || 0,
      budget_type: campaign.budget_type || 'daily',
      budget_source: 'campaign'
    };
  };
  
  // Fetch ad sets for a campaign with proper data loading
  const fetchAdSets = useCallback(async (campaignId: string) => {
    if (!brandId || !campaignId || !dateRange?.from || !dateRange?.to) {
      logger.debug(`[WorkingCampaignWidget] Missing required data for ad sets fetch`);
      return;
    }
    
    // Update loading state
    setIsLoadingAdSets(true);
    
    try {
      // Format date range params
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      logger.debug(`[WorkingCampaignWidget] Fetching ad sets for campaign ${campaignId} with date range ${fromDate} to ${toDate}`);
      
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
        logger.warn(`[WorkingCampaignWidget] No ad sets returned for campaign: ${campaignId}`);
        setAdSets([]);
        return;
      }
      
      // Ensure all numeric values are proper numbers
      const processedAdSets = data.adSets.map((adSet: AdSet) => ({
        ...adSet,
        budget: Number(adSet.budget || 0),
        spent: Number(adSet.spent || 0),
        impressions: Number(adSet.impressions || 0),
        clicks: Number(adSet.clicks || 0),
        conversions: Number(adSet.conversions || 0),
        ctr: Number(adSet.ctr || 0),
        cpc: Number(adSet.cpc || 0),
        cost_per_conversion: Number(adSet.cost_per_conversion || 0),
        reach: Number(adSet.reach || 0),
      }));
      
      // Update adset state with the processed data
      setAdSets(processedAdSets);
      
      // Calculate totals from ad sets to update campaign metrics
      const adSetTotals = processedAdSets.reduce((acc, adSet) => {
        acc.spent += Number(adSet.spent || 0);
        acc.impressions += Number(adSet.impressions || 0);
        acc.clicks += Number(adSet.clicks || 0);
        acc.conversions += Number(adSet.conversions || 0);
        acc.reach += Number(adSet.reach || 0);
        return acc;
      }, { spent: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 });
      
      // Update campaign with ad set metrics if they exist
      if (adSetTotals.spent > 0 || adSetTotals.impressions > 0) {
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
        
        // Update the campaign with accurate metrics
        setLocalCampaigns(prev => prev.map(campaign => {
          if (campaign.campaign_id === campaignId) {
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
              budget_source: 'adsets'
            };
          }
          return campaign;
        }));
      }
      
      logger.debug(`[WorkingCampaignWidget] Loaded ${processedAdSets.length} ad sets for campaign ${campaignId}`);
    } catch (error) {
      logger.error(`[WorkingCampaignWidget] Error fetching ad sets:`, error);
      toast.error("Failed to load ad sets", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
      
      // Clear adsets in case of error
      setAdSets([]);
    } finally {
      setIsLoadingAdSets(false);
    }
  }, [brandId, dateRange]);
  
  // Load all campaign data with metrics based on the date range
  const loadAllCampaignData = useCallback(async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      logger.warn('[WorkingCampaignWidget] Missing date range or brandId for data load');
      return;
    }
    
    setRefreshing(true);
    
    try {
      // Format dates for API
      const from = dateRange.from.toISOString().split('T')[0];
      const to = dateRange.to.toISOString().split('T')[0];
      
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      
      // Full URL with all required parameters
      const url = `/api/meta/campaigns/bulk-data?brandId=${brandId}&from=${from}&to=${to}&t=${timestamp}`;
      
      logger.info(`[WorkingCampaignWidget] Fetching bulk campaign data from: ${from} to ${to}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign data: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.campaigns && Array.isArray(data.campaigns) && data.campaigns.length > 0) {
        logger.info(`[WorkingCampaignWidget] Loaded ${data.campaigns.length} campaigns from bulk API`);
        
        // Process campaigns to ensure metrics are properly calculated
        const processedCampaigns = data.campaigns.map((campaign: Campaign) => {
          return {
            ...campaign,
            // Make sure all values are proper numbers
            spent: Number(campaign.spent || 0),
            impressions: Number(campaign.impressions || 0),
            clicks: Number(campaign.clicks || 0),
            reach: Number(campaign.reach || 0),
            ctr: Number(campaign.ctr || 0),
            cpc: Number(campaign.cpc || 0),
            conversions: Number(campaign.conversions || 0),
            cost_per_conversion: Number(campaign.cost_per_conversion || 0),
            roas: Number(campaign.roas || 0),
            budget: Number(campaign.budget || 0),
            // Mark if the campaign has data
            has_data_in_range: (
              Number(campaign.spent) > 0 || 
              Number(campaign.impressions) > 0 || 
              Number(campaign.clicks) > 0
            )
          };
        });
        
        setLocalCampaigns(processedCampaigns);
        dataLoadedRef.current = true;
        
        // Now we immediately preload ALL ad set data
        // This is done after updating the UI to prevent freezing
        setTimeout(() => {
          preloadAllCampaignAdSetData(processedCampaigns);
        }, 100);
      } else {
        logger.warn('[WorkingCampaignWidget] Bulk API returned no data');
        setLocalCampaigns([]);
      }
    } catch (error) {
      logger.error('[WorkingCampaignWidget] Error during initial data load:', error);
      toast.error("Failed to load campaign data", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setRefreshing(false);
    }
  }, [brandId, dateRange]);
  
  // Preload ad set data for all campaigns to ensure accurate metrics
  const preloadAllCampaignAdSetData = useCallback((campaigns: Campaign[]) => {
    if (!brandId || !dateRange?.from || !dateRange?.to || !campaigns.length) {
      return;
    }
    
    logger.info(`[WorkingCampaignWidget] Starting to preload ad set data for all campaigns`);
    
    // Process campaigns sequentially to avoid overwhelming the API
    // But wrap in self-executing async function
    (async () => {
      try {
        for (const campaign of campaigns) {
          if (!campaign.campaign_id) continue;
          
          // Format date params
          const fromDate = dateRange.from.toISOString().split('T')[0];
          const toDate = dateRange.to.toISOString().split('T')[0];
          
          // Build the request URL
          const url = `/api/meta/adsets?brandId=${brandId}&campaignId=${campaign.campaign_id}&from=${fromDate}&to=${toDate}&t=${Date.now()}&forceRefresh=true`;
          
          try {
            const response = await fetch(url, {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });
            
            if (!response.ok) continue;
            
            const data = await response.json();
            
            if (!data.adSets || !Array.isArray(data.adSets) || !data.adSets.length) {
              continue;
            }
            
            // Calculate totals from ad sets
            const adSetTotals = data.adSets.reduce((acc: any, adSet: any) => {
              acc.spent += Number(adSet.spent || 0);
              acc.impressions += Number(adSet.impressions || 0);
              acc.clicks += Number(adSet.clicks || 0);
              acc.conversions += Number(adSet.conversions || 0);
              acc.reach += Number(adSet.reach || 0);
              return acc;
            }, { spent: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 });
            
            // Only update if we have non-zero metrics
            if (adSetTotals.spent > 0 || adSetTotals.impressions > 0) {
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
              
              // Update the campaign metrics
              if (isMountedRef.current) {
                setLocalCampaigns(prev => prev.map(c => {
                  if (c.campaign_id === campaign.campaign_id) {
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
                      roas: roas,
                      has_data_in_range: true,
                      budget_source: 'adsets'
                    };
                  }
                  return c;
                }));
              }
              
              logger.debug(`[WorkingCampaignWidget] Updated campaign ${campaign.campaign_id} with ad set metrics`);
            }
          } catch (error) {
            logger.error(`[WorkingCampaignWidget] Error preloading ad set data for campaign ${campaign.campaign_id}:`, error);
            // Continue with next campaign even if this one fails
            continue;
          }
        }
        
        logger.info('[WorkingCampaignWidget] Finished preloading ad set data for all campaigns');
      } catch (error) {
        logger.error('[WorkingCampaignWidget] Error in preloading process:', error);
      }
    })();
  }, [brandId, dateRange]);
  
  // Toggle campaign expansion and load ad sets
  const toggleCampaignExpand = useCallback((campaignId: string) => {
    if (expandedCampaign === campaignId) {
      // Collapse if already expanded
      setExpandedCampaign(null);
      setAdSets([]);
    } else {
      // Set expanded state immediately for better UX
      setExpandedCampaign(campaignId);
      // Then fetch the ad sets
      fetchAdSets(campaignId);
    }
  }, [expandedCampaign, fetchAdSets]);
  
  // Handle bulk refresh of campaign statuses
  const refreshAllCampaignData = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await loadAllCampaignData();
      toast.success("Campaign data refreshed");
    } catch (error) {
      toast.error("Failed to refresh campaign data");
    } finally {
      setRefreshing(false);
    }
  }, [loadAllCampaignData, refreshing]);
  
  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  }, [sortOrder]);
  
  // Handle sort click for metrics
  const handleMetricSortClick = useCallback((metricId: string) => {
    if (sortBy === metricId) {
      toggleSortOrder();
    } else {
      setSortBy(metricId);
      setSortOrder('desc');
    }
  }, [sortBy, toggleSortOrder]);
  
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
  
  // Filter campaigns based on search query and inactive status
  const filteredCampaigns = useMemo(() => {
    return localCampaigns.filter(campaign => {
      // Filter by search query
      const searchMatch = 
        !searchQuery || 
        campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.account_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by active status if showInactive is false
      const statusMatch = showInactive || campaign.status.toUpperCase() === 'ACTIVE';
      
      return searchMatch && statusMatch;
    }).sort((a, b) => {
      if (sortBy === 'status') {
        // Special handling for status sorting
        if (a.status.toUpperCase() === 'ACTIVE' && b.status.toUpperCase() !== 'ACTIVE') {
          return sortOrder === 'asc' ? 1 : -1;
        }
        if (a.status.toUpperCase() !== 'ACTIVE' && b.status.toUpperCase() === 'ACTIVE') {
          return sortOrder === 'asc' ? -1 : 1;
        }
        return a.status.localeCompare(b.status) * (sortOrder === 'asc' ? 1 : -1);
      }
      
      // For numeric values
      const aValue = a[sortBy as keyof Campaign] as number || 0;
      const bValue = b[sortBy as keyof Campaign] as number || 0;
      
      return (aValue - bValue) * (sortOrder === 'asc' ? 1 : -1);
    });
  }, [localCampaigns, searchQuery, showInactive, sortBy, sortOrder]);
  
  // Initial data load on mount
  useEffect(() => {
    if (!dataLoadedRef.current && brandId && dateRange?.from && dateRange?.to) {
      loadAllCampaignData();
    }
  }, [brandId, dateRange, loadAllCampaignData]);
  
  // Reload data when date range changes
  useEffect(() => {
    if (dataLoadedRef.current && brandId && dateRange?.from && dateRange?.to) {
      loadAllCampaignData();
    }
  }, [dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), brandId, loadAllCampaignData]);
  
  // Format campaign status for display
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
  
  return (
    <Card className="mb-6 border-[#333] shadow-md overflow-hidden transition-all duration-200 hover:border-[#444] bg-[#111]">
      <CardHeader className="pb-3 border-b border-[#333]">
        <div className="flex items-center mb-4">
          <BarChart className="h-5 w-5 text-white" />
          <CardTitle className="text-lg font-medium text-white ml-2">Campaign Performance (Working Version)</CardTitle>
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
            onClick={refreshAllCampaignData}
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
                <span>Refresh Data</span>
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
                onClick={() => handleMetricSortClick('status')}
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
        {isLoading || (localCampaigns.length === 0 && refreshing) ? (
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
                          onClick={() => handleMetricSortClick(metricId)}
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
                            {campaign.budget_source === 'adsets' && (
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
                                window.open(`https://www.facebook.com/ads/manager/account/campaigns?act=${campaign.account_id.replace('act_', '')}&selected_campaign_ids=${campaign.campaign_id}`, '_blank')
                              }}
                              title="View in Meta Ads Manager"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      
                      {expandedCampaign === campaign.campaign_id && (
                        <tr className="bg-[#111] border-b border-[#333]">
                          <td colSpan={visibleMetrics.length + 4} className="p-4">
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
                                      {adSets.map(adSet => (
                                        <tr 
                                          key={adSet.id}
                                          className="border-b border-[#333] hover:bg-black/10 cursor-pointer border-l-2 border-l-[#333]"
                                        >
                                          <td className="p-2 pl-3">
                                            <div className="font-medium text-white">{adSet.adset_name}</div>
                                            <div className="text-xs text-gray-400">{adSet.adset_id}</div>
                                          </td>
                                          <td className="p-2">
                                            <Badge className={`text-xs px-1.5 py-0 h-5 flex items-center gap-1 ${
                                              formatCampaignStatus(adSet.status).bgColor} ${
                                              formatCampaignStatus(adSet.status).textColor} border ${
                                              formatCampaignStatus(adSet.status).borderColor}`}>
                                              <div className={`w-1.5 h-1.5 rounded-full ${
                                                formatCampaignStatus(adSet.status).dotColor}`}></div>
                                              {formatCampaignStatus(adSet.status).displayText}
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
                                            
                                            let value = 0;
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
                                          </td>
                                        </tr>
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
                                    fetchAdSets(campaign.campaign_id);
                                  }}
                                  className="text-white border-[#333] hover:bg-black/20"
                                >
                                  <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isLoadingAdSets ? 'animate-spin' : ''}`} />
                                  Refresh Ad Sets
                                </Button>
                              </div>
                            )}
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
  );
} 