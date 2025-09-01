"use client"

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { 
  BarChart, LineChart, PieChart, AreaChart, Gauge, ArrowUpRight, ArrowDownRight, 
  Calendar, Filter, MoreHorizontal, Download, ChevronDown, Settings, Table, RefreshCw,
  Eye, EyeOff, Zap, DollarSign, Users, MousePointerClick, Target, Wallet, BarChart2, ChevronRight,
  CalendarRange, Loader2, RefreshCcw, SlidersHorizontal, CircleIcon
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

// Types
type DailyInsight = {
  date: string
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cpa: number
  [key: string]: string | number  // Add index signature for dynamic access
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

// User preferences interface
interface UserPreferences {
  view: 'table'
  visibleMetrics: string[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
  showInactive: boolean
  chartMetric: string
}

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  view: 'table',
  visibleMetrics: ['spent', 'impressions', 'clicks', 'ctr', 'roas'],
  sortBy: 'spent',
  sortOrder: 'desc',
  showInactive: true,
  chartMetric: 'spent'
}

// Available metrics config - remove the budget metric
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

export function CampaignWidget({ brandId, campaigns, isLoading, isSyncing, dateRange, onRefresh, onSync }: CampaignWidgetProps) {
  // Use a stable date range key that won't change on every render
  const dateRangeKey = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return `${dateRange.from.toISOString().split('T')[0]}-${dateRange.to.toISOString().split('T')[0]}`;
    }
    return 'no-date-range';
  }, [dateRange?.from, dateRange?.to]);
  
  // Store previous date range key to detect actual changes
  const prevDateRangeKeyRef = useRef(dateRangeKey);
  
  // Get toast from hook
  const { toast } = useToast();
  
  // Track in-flight API requests to cancel them if needed
  const pendingRequestsRef = useRef<AbortController[]>([]);
  
  // State for campaign budgets from API
  const [currentBudgets, setCurrentBudgets] = useState<Record<string, any>>({});
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [lastBudgetRefresh, setLastBudgetRefresh] = useState<Date | null>(null);
  
  // State for ad sets
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [isLoadingAdSets, setIsLoadingAdSets] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [expandedAdSet, setExpandedAdSet] = useState<string | null>(null);
  
  // Keep track of previous campaigns to prevent unnecessary renders
  const [previousCampaigns, setPreviousCampaigns] = useState<Campaign[]>([]);
  
  // Use a ref to track if the component is mounted
  const isMountedRef = useRef(true);
  
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
  
  // Function to fetch current campaign budgets
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
          setLastBudgetRefresh(new Date());
          console.log(`[CampaignWidget] Loaded current budgets for ${Object.keys(budgetMap).length} campaigns via ${data.refreshMethod}`);
        }
        
        // Show toast notification when budgets are updated and forceRefresh was requested
        if (forceRefresh && isMountedRef.current) {
          toast({
            title: "Budgets refreshed",
            description: `Updated budget data for ${Object.keys(budgetMap).length} campaigns`,
          });
        }
      } else {
        console.error("[CampaignWidget] Failed to fetch current budgets");
        
        // Show error toast
        if (forceRefresh && isMountedRef.current) {
          toast({
            title: "Error refreshing budgets",
            description: "Failed to fetch latest budget data from Meta",
          });
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
        toast({
          title: "Error refreshing budgets",
          description: "An unexpected error occurred",
        });
      }
    } finally {
      removeAbortController(controller);
      if (isMountedRef.current) {
        setIsLoadingBudgets(false);
      }
    }
  }, [brandId, toast, createAbortController, removeAbortController]);
  
  // Fetch budgets on mount and when brandId changes, but not on every render
  useEffect(() => {
    if (brandId) {
      fetchCurrentBudgets(false);
    }
  }, [brandId, fetchCurrentBudgets]);
  
  // Function to fetch ad sets for a campaign
  const fetchAdSets = useCallback(async (campaignId: string) => {
    if (!brandId || !isMountedRef.current || !campaignId) return;
    
    // Cancel any existing ad set fetch
    pendingRequestsRef.current.forEach(controller => {
      try {
        controller.abort();
      } catch (e) {
        // Ignore abort errors
      }
    });
    
    setIsLoadingAdSets(true);
    
    const controller = createAbortController();
    
    try {
      let url = `/api/meta/adsets?brandId=${brandId}&campaignId=${campaignId}&forceRefresh=true`;
      
      // Add date range parameters if available
      if (dateRange?.from && dateRange?.to) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        const toDate = dateRange.to.toISOString().split('T')[0];
        url += `&from=${fromDate}&to=${toDate}`;
      }
      
      console.log(`[CampaignWidget] Fetching ad sets for campaign ${campaignId} with date range: ${dateRange?.from?.toLocaleDateString()} to ${dateRange?.to?.toLocaleDateString()}`);
      
      const response = await fetch(url, { signal: controller.signal });
      
      if (!isMountedRef.current) return;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[CampaignWidget] Loaded ${data.adSets?.length || 0} ad sets for campaign ${campaignId} from ${data.source || 'unknown'}`);
        
        if (isMountedRef.current) {
          setAdSets(data.adSets || []);
          
          // Toast notification that ad sets were loaded
          toast({
            title: "Ad sets loaded",
            description: `Loaded ${data.adSets?.length || 0} ad sets for this campaign`,
          });
        }
      } else {
        if (isMountedRef.current) {
          toast({
            title: "Failed to load ad sets",
            description: "There was an error loading ad sets for this campaign",
          });
          setAdSets([]);
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log("[CampaignWidget] Ad set fetch aborted");
        return;
      }
      
      console.error("Error fetching ad sets:", error);
      
      if (isMountedRef.current) {
        toast({
          title: "Error loading ad sets",
          description: "Unexpected error occurred",
        });
        setAdSets([]);
      }
    } finally {
      removeAbortController(controller);
      if (isMountedRef.current) {
        setIsLoadingAdSets(false);
      }
    }
  }, [brandId, dateRange, toast, createAbortController, removeAbortController]);
  
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
  
  // Update previous campaigns when campaigns change, but don't trigger a re-render
  useEffect(() => {
    // Only update previous campaigns reference when we have valid data and not loading
    if (campaigns.length > 0 && !isLoading) {
      const campaignsJson = JSON.stringify(campaigns);
      const previousJson = JSON.stringify(previousCampaigns);
      
      if (campaignsJson !== previousJson) {
        console.log("[CampaignWidget] Updating cached campaigns");
        setPreviousCampaigns(campaigns);
        
        // Close expanded campaign if it no longer exists
        if (expandedCampaign) {
          const stillExists = campaigns.some(c => c.campaign_id === expandedCampaign);
          if (!stillExists) {
            setExpandedCampaign(null);
          }
        }
      }
    }
  }, [campaigns, expandedCampaign, previousCampaigns, isLoading]);
  
  // Load saved preferences or use defaults
  const loadUserPreferences = (): UserPreferences => {
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
  };
  
  // Save user preferences to localStorage
  const saveUserPreferences = (prefs: UserPreferences) => {
    try {
      localStorage.setItem(`campaign-widget-prefs-${brandId}`, JSON.stringify(prefs));
    } catch (error) {
      console.error("Error saving user preferences:", error);
    }
  };
  
  // Initialize state with saved preferences
  const userPrefs = useMemo(() => loadUserPreferences(), [brandId]); 
  
  // State - use useMemo to prevent unnecessary re-renders
  const [view, setView] = useState<'table'>('table')
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState(userPrefs.sortBy)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(userPrefs.sortOrder)
  const [visibleMetrics, setVisibleMetrics] = useState(userPrefs.visibleMetrics)
  const [showInactive, setShowInactive] = useState(userPrefs.showInactive)
  const [chartMetric, setChartMetric] = useState(userPrefs.chartMetric)
  
  // Save preferences when they change, but debounce to reduce writes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentPrefs: UserPreferences = {
        view,
        visibleMetrics,
        sortBy,
        sortOrder,
        showInactive,
        chartMetric
      };
      
      saveUserPreferences(currentPrefs);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [view, visibleMetrics, sortBy, sortOrder, showInactive, chartMetric, brandId]);
  
  // Memoize the processed campaigns to avoid recalculation on every render
  const processedCampaigns = useMemo(() => {
    // If we're loading, return the cached campaigns to prevent flickering
    if (isLoading && previousCampaigns.length > 0) {
      console.log("[CampaignWidget] Using cached campaigns during loading");
      return previousCampaigns;
    }

    return campaigns.map(campaign => {
      // Create a copy of the campaign to avoid mutating props
      const processedCampaign = { ...campaign };
      
      // Force initialize the has_data_in_range flag to false until we verify data exists
      processedCampaign.has_data_in_range = Boolean(campaign.has_data_in_range);
      
      return processedCampaign;
    });
  }, [campaigns, isLoading, previousCampaigns]);
  
  // Memoize filtered campaigns to avoid recalculation on every render
  const filteredCampaigns = useMemo(() => {
    let filtered = [...processedCampaigns];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(campaign => 
        campaign.campaign_name.toLowerCase().includes(query) ||
        campaign.campaign_id.toLowerCase().includes(query) ||
        campaign.account_name.toLowerCase().includes(query)
      );
    }
    
    // Only filter by status if showInactive is false
    if (!showInactive) {
      filtered = filtered.filter(campaign => campaign.status === 'ACTIVE');
    }
    
    // Sort campaigns
    return filtered.sort((a, b) => {
      // First, prioritize campaigns with data in the selected date range
      if (a.has_data_in_range && !b.has_data_in_range) return -1;
      if (!a.has_data_in_range && b.has_data_in_range) return 1;
      
      // Then, sort by the selected metric
      const valueA = a[sortBy as keyof Campaign] as number;
      const valueB = b[sortBy as keyof Campaign] as number;
      
      if (sortOrder === 'asc') {
        return (valueA || 0) - (valueB || 0);
      } else {
        return (valueB || 0) - (valueA || 0);
      }
    });
  }, [processedCampaigns, searchQuery, sortBy, sortOrder, showInactive]);
  
  // Toggle campaign expand
  const toggleCampaignExpand = useCallback((campaignId: string) => {
    setExpandedCampaign(prev => {
      // If we're closing the current expanded campaign, also close any expanded ad set
      if (prev === campaignId) {
        setExpandedAdSet(null);
        return null;
      }
      return campaignId;
    });
    
    // If we're opening a different campaign, close any expanded ad set
    if (expandedCampaign !== campaignId) {
      setExpandedAdSet(null);
    }
    
    // If we're expanding a campaign and there are no ad sets, fetch them
    if (expandedCampaign !== campaignId) {
      fetchAdSets(campaignId);
    }
  }, [expandedCampaign, fetchAdSets]);
  
  // Toggle expanded ad set
  const toggleAdSetExpand = useCallback((adSetId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedAdSet(prev => prev === adSetId ? null : adSetId);
  }, []);
  
  // Format values based on metric type
  const formatValue = (value: number, format: string) => {
    if (value === undefined || value === null) return '-';
    
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      case 'number':
        return formatNumber(value);
      case 'roas':
        // Use consistent format with 2 decimal places and 'x' suffix
        if (value > 0) {
          return `${value.toFixed(2)}x`;
        }
        return '0.00x';
      default:
        return value.toString();
    }
  };
  
  // Calculate campaign budget from ad sets
  const getCampaignBudget = (campaign: Campaign, campaignAdSets: AdSet[] | null = null) => {
    // If we have ad sets for this campaign, use their combined budget
    if (expandedCampaign === campaign.campaign_id && campaignAdSets && campaignAdSets.length > 0) {
      const totalAdSetBudget = campaignAdSets.reduce((sum, adSet) => sum + adSet.budget, 0);
      return {
        budget: totalAdSetBudget,
        formattedBudget: formatCurrency(totalAdSetBudget),
        budgetType: campaignAdSets.some(adSet => adSet.budget_type === 'daily') ? 'daily' : 'lifetime',
        budgetSource: 'adsets'
      };
    }
    
    // If campaign has adset_budget_total, use that
    if (campaign.adset_budget_total && campaign.adset_budget_total > 0) {
      return {
        budget: campaign.adset_budget_total,
        formattedBudget: formatCurrency(campaign.adset_budget_total),
        budgetType: campaign.budget_type || 'unknown',
        budgetSource: 'adsets_total'
      };
    }
    
    // Otherwise use current budget from API or campaign budget as fallback
    const currentBudgetData = currentBudgets[campaign.id];
    const budget = currentBudgetData?.budget || campaign.budget || 0;
    const formattedBudget = currentBudgetData?.formatted_budget || formatCurrency(budget);
    const budgetType = currentBudgetData?.budget_type || campaign.budget_type || 'unknown';
    const budgetSource = currentBudgetData?.budget_source || 'campaign';
    
    return {
      budget,
      formattedBudget,
      budgetType,
      budgetSource
    };
  };

  function getCampaignData(campaigns: Campaign[]): any[] {
    const sortedCampaigns = [...campaigns].sort((a, b) => {
      // Budget is a number - we just need to extract it safely
      const budgetA = a.budget || 0;
      const budgetB = b.budget || 0;
      return budgetB - budgetA;
    });

    const data = sortedCampaigns.map((campaign) => {
      // Get campaign budget from ad sets or API
      const budgetInfo = getCampaignBudget(campaign);
      
      return {
        id: campaign.id,
        name: campaign.campaign_name,
        status: campaign.status,
        // Display budget info
        budget: budgetInfo.formattedBudget,
        raw_budget: budgetInfo.budget,
        budget_type: budgetInfo.budgetType,
        budget_source: budgetInfo.budgetSource,
        // Rest of campaign data comes from date range filtered data
        spend: campaign.spent,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        cpc: campaign.cpc,
        ctr: campaign.ctr,
        events: campaign.conversions,
        cpa: campaign.cost_per_conversion,
        lastUpdated: campaign.last_refresh_date,
        daily_stats: campaign.daily_insights || [],
      };
    });

    return data;
  }
  
  // Get campaign trend (compared to previous period)
  const getCampaignTrend = (campaign: Campaign, metric: string) => {
    if (!campaign.daily_insights || campaign.daily_insights.length < 2) return 0
    
    // Get last two days of data
    const sortedInsights = [...campaign.daily_insights].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    if (sortedInsights.length < 2) return 0
    
    const latest = Number(sortedInsights[0][metric] || 0)
    const previous = Number(sortedInsights[1][metric] || 0)
    
    if (previous === 0) return 0
    return ((latest - previous) / previous) * 100
  }
  
  // Toggle metric visibility
  const toggleMetric = (metricId: string) => {
    if (visibleMetrics.includes(metricId)) {
      setVisibleMetrics(visibleMetrics.filter(id => id !== metricId))
    } else {
      setVisibleMetrics([...visibleMetrics, metricId])
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3 border-b border-gray-100/10">
        <div className="flex items-center mb-4">
          <BarChart className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-lg font-medium">Campaign Performance</CardTitle>
          <Badge className="ml-2 bg-gray-800 text-gray-300 hover:bg-gray-700">
            {filteredCampaigns.length} Campaign{filteredCampaigns.length !== 1 ? 's' : ''}
          </Badge>
          <div className="flex items-center gap-2 mx-2">
            {dateRange?.from && dateRange?.to && (
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="flex items-center gap-1.5">
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
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Customize
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Visible Metrics</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {AVAILABLE_METRICS.map(metric => (
                  <DropdownMenuItem key={metric.id} onSelect={e => { e.preventDefault(); toggleMetric(metric.id); }}>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={e => { e.preventDefault(); setShowInactive(!showInactive); }}>
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
            className="max-w-xs h-8 text-sm"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 text-sm flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Sort by: {AVAILABLE_METRICS.find(m => m.id === sortBy)?.name || 'Status'}
                {sortOrder === 'desc' ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => { setSortBy('status'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>
                <CircleIcon className="h-3.5 w-3.5 mr-2" />
                Status
              </DropdownMenuItem>
              {AVAILABLE_METRICS.map(metric => (
                <DropdownMenuItem key={metric.id} onClick={() => { setSortBy(metric.id); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>
                  <div className="mr-2">{metric.icon}</div>
                  {metric.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="px-0 pb-0">
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <BarChart className="h-10 w-10 mb-3 text-gray-400" />
            <h3 className="text-lg font-medium mb-1">No campaigns found</h3>
            <p className="text-sm text-gray-400 max-w-sm mb-4">
              {searchQuery ? 'Try adjusting your search query or filters' : 'Create a campaign in Meta Ads Manager to get started'}
            </p>
            <Button variant="outline" size="sm" onClick={onSync} disabled={isSyncing}>
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Campaigns
            </Button>
          </div>
        ) : (
          <div className="p-4">
            <div className="pb-3 mb-3 border-b border-gray-800 flex items-center">
              <h3 className="text-sm font-medium text-gray-300">Campaign Performance Data</h3>
              <span className="text-xs text-gray-500 ml-2">
                {dateRange?.from && dateRange?.to ? 
                  `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}` : 
                  'All time'}
              </span>
            </div>
            <div className="border border-gray-800 rounded-md overflow-hidden bg-gray-950/80">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 bg-black/50">
                    <th className="text-xs font-medium text-left p-3">Campaign</th>
                    <th className="text-xs font-medium text-left p-3">Status</th>
                    <th className="text-xs font-medium text-right p-3">Budget</th>
                    {visibleMetrics.map(metricId => {
                      const metric = AVAILABLE_METRICS.find(m => m.id === metricId)
                      if (!metric) return null
                      
                      return (
                        <th 
                          key={metricId} 
                          className="text-xs font-medium text-right p-3 cursor-pointer hover:text-gray-300 transition-colors"
                          onClick={() => {
                            if (sortBy === metricId) {
                              setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                            } else {
                              setSortBy(metricId)
                              setSortOrder('desc')
                            }
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {metric.name}
                            {sortBy === metricId && (
                              sortOrder === 'desc' ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />
                            )}
                          </div>
                        </th>
                      )
                    })}
                    <th className="text-xs font-medium text-center p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map(campaign => (
                    <React.Fragment key={campaign.id}>
                      <tr 
                        className="border-b border-gray-800 hover:bg-gray-900/50 transition-colors border-l-4 border-l-gray-800"
                        onClick={() => toggleCampaignExpand(campaign.campaign_id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-xs" title={campaign.campaign_name}>
                              {campaign.campaign_name}
                            </span>
                            <span className="text-xs text-gray-400 truncate max-w-xs" title={campaign.account_name}>
                              {campaign.account_name}
                            </span>
                            {currentBudgets[campaign.id]?.budget_source === 'api' && (
                              <Badge variant="outline" className="mt-1 text-xs">Live Budget</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={`text-xs px-1.5 py-0 h-5 ${campaign.status === 'ACTIVE' ? 'bg-gray-800/80 text-gray-300' : 'bg-gray-900/50 text-gray-400'}`}>
                            {campaign.status}
                          </Badge>
                          {!campaign.has_data_in_range && (
                            <Badge className="text-xs px-1.5 py-0 h-5 bg-gray-800/50 text-gray-400 ml-1">
                              No data in range
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="font-medium">
                            {(() => {
                              // Get budget info
                              const budgetInfo = getCampaignBudget(campaign, 
                                expandedCampaign === campaign.campaign_id ? adSets : null);
                              
                              return (
                                <div className="text-gray-300">
                                  {budgetInfo.formattedBudget}
                                  {(budgetInfo.budgetType === 'daily' || campaign.budget_type === 'daily') && 
                                    <span className="text-xs text-gray-400 ml-1">/day</span>
                                  }
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                        {visibleMetrics.map(metricId => {
                          const metric = AVAILABLE_METRICS.find(m => m.id === metricId)
                          if (!metric) return null
                          
                          const value = campaign[metricId as keyof Campaign] as number
                          
                          return (
                            <td 
                              key={metricId} 
                              className="p-3 text-right"
                            >
                              <div className="font-medium">
                                {formatValue(value, metric.format)}
                              </div>
                            </td>
                          )
                        })}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full"
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
                              className="h-7 w-7 rounded-full"
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
                        <tr className="bg-black/60 border-b border-gray-800">
                          <td colSpan={visibleMetrics.length + 3} className="p-0">
                            <div className="p-4 ml-6 border-l-4 border-gray-700 bg-black/30 rounded-md m-2">
                              {isLoadingAdSets ? (
                                <div className="flex justify-center items-center py-4">
                                  <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                                </div>
                              ) : adSets.length > 0 ? (
                                <div className="space-y-4">
                                  <div className="flex flex-col mb-4">
                                    <div className="flex justify-between items-center mb-3">
                                      <div className="flex items-center gap-2">
                                        <div className="border-l-4 border-gray-600 pl-2">
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
                                        className="h-7 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
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
                                    
                                    <div className="flex items-center gap-3 mb-2">
                                      <Badge variant="outline" className="bg-gray-900/60 text-gray-300 border-gray-700">
                                        {adSets.length} Ad Sets
                                      </Badge>
                                      <Badge variant="outline" className="bg-gray-900/60 text-gray-300 border-gray-700">
                                        Total Budget: {formatCurrency(adSets.reduce((sum, adSet) => sum + adSet.budget, 0))}
                                      </Badge>
                                      <Badge variant="outline" className="bg-gray-900/60 text-gray-300 border-gray-700">
                                        Total Spent: {formatCurrency(adSets.reduce((sum, adSet) => sum + adSet.spent, 0))}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-gray-950/90 rounded-md overflow-hidden border border-gray-800">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="bg-gray-900/80 border-b border-gray-800">
                                          <th className="text-xs font-medium text-left p-2 pl-3">Ad Set</th>
                                          <th className="text-xs font-medium text-left p-2">Status</th>
                                          <th className="text-xs font-medium text-right p-2">Budget</th>
                                          {visibleMetrics.map(metricId => {
                                            // Filter out budget since we show it separately
                                            if (metricId === 'budget') return null;
                                            
                                            const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                                            if (!metric) return null;
                                            
                                            return (
                                              <th 
                                                key={metricId} 
                                                className="text-xs font-medium text-right p-2"
                                              >
                                                {metric.name}
                                              </th>
                                            );
                                          })}
                                          <th className="text-xs font-medium text-center p-2 w-16">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {adSets.map((adSet, index) => (
                                          <React.Fragment key={adSet.id}>
                                            <tr 
                                              key={adSet.id} 
                                              className={`${index % 2 === 0 ? "bg-black/60" : "bg-black/40"} border-b border-gray-800 hover:bg-gray-900/50 cursor-pointer relative`}
                                              onClick={() => toggleAdSetExpand(adSet.adset_id)}
                                              style={{ cursor: 'pointer' }}
                                            >
                                              <td className="p-2 pl-3 border-l-2 border-gray-700 flex items-center gap-2">
                                                <div className="flex flex-col">
                                                  <span className="font-medium text-sm text-gray-200">{adSet.adset_name}</span>
                                                  <span className="text-xs text-gray-500">{adSet.adset_id}</span>
                                                </div>
                                              </td>
                                              <td className="p-2">
                                                <Badge 
                                                  variant="outline" 
                                                  className={`px-2 py-0.5 text-xs ${
                                                    adSet.status === 'ACTIVE' 
                                                      ? 'border-gray-700 bg-gray-800 text-gray-300' 
                                                      : 'border-gray-700 bg-gray-800 text-gray-400'
                                                  }`}
                                                >
                                                  {adSet.status}
                                                </Badge>
                                              </td>
                                              <td className="p-2 text-right">
                                                <div className="flex flex-col items-end">
                                                  <Badge 
                                                    className="px-2 py-0.5 border-gray-700 bg-gray-900/60 text-gray-300"
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
                                                // Skip budget since we show it separately now
                                                if (metricId === 'budget') return null;
                                                
                                                const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                                                if (!metric) return null;
                                                
                                                // Handle mappings from campaign metrics to ad set metrics
                                                let value: number;
                                                switch (metricId) {
                                                  case 'spent':
                                                    value = adSet.spent;
                                                    break;
                                                  case 'impressions':
                                                    value = adSet.impressions;
                                                    break;
                                                  case 'clicks':
                                                    value = adSet.clicks;
                                                    break;
                                                  case 'ctr':
                                                    value = adSet.ctr;
                                                    break;
                                                  case 'cpc':
                                                    value = adSet.cpc;
                                                    break;
                                                  case 'conversions':
                                                    value = adSet.conversions;
                                                    break;
                                                  case 'cost_per_conversion':
                                                    value = adSet.cost_per_conversion;
                                                    break;
                                                  case 'reach':
                                                    value = adSet.reach || 0;
                                                    break;
                                                  case 'roas':
                                                    // Calculate ROAS for ad sets if conversions and spend exist
                                                    if (adSet.conversions > 0 && adSet.spent > 0) {
                                                      const estimatedRevenue = adSet.conversions * 25; // Assuming $25 avg order value
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
                                                    <div className="font-medium">
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
                                                    className="h-7 w-7 rounded-full"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      toggleAdSetExpand(adSet.adset_id, e);
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
                                                    className="h-7 w-7 rounded-full"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      // Open Facebook Ads Manager with this ad set
                                                      window.open(`https://www.facebook.com/ads/manager/account/campaigns?act=${campaign.account_id.replace('act_', '')}&selected_adset_ids=${adSet.adset_id}`, '_blank');
                                                    }}
                                                    title="View in Meta Ads Manager"
                                                  >
                                                    <Eye className="h-3.5 w-3.5" />
                                                  </Button>
                                                </div>
                                              </td>
                                            </tr>
                                            
                                            {/* Render ads when ad set is expanded */}
                                            {expandedAdSet === adSet.adset_id && (
                                              <tr key={`${adSet.id}-ads`} className="border-t border-gray-800">
                                                <td colSpan={visibleMetrics.length + 3} className="p-0">
                                                  <div className="p-4 bg-black/80 border-l-4 border-gray-800">
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
                                <div className="text-center py-3 text-sm text-gray-400">
                                  No ad sets found for this campaign
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
} 