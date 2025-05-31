"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Metrics } from '@/types/metrics'
import { PlatformConnection } from '@/types/platformConnection'
import { DateRange } from 'react-day-picker'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  PlusCircle, X, Settings, Pencil, GripVertical, ShoppingBag, Facebook, LayoutGrid, 
  MoveUp, MoveDown, ArrowUp, ArrowDown, Plus, Edit, DollarSign, Eye, 
  MousePointer, Users, TrendingUp, Target, Percent, Activity, Zap 
} from "lucide-react"
import Image from "next/image"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { MetricCard } from "@/components/metrics/MetricCard"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format, isSameDay, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { SalesByProduct } from '@/components/dashboard/SalesByProduct'
import { InventorySummary } from '@/components/dashboard/InventorySummary'
import { TotalBudgetMetricCard } from '@/components/metrics/TotalBudgetMetricCard'
import { TotalAdSetReachCard } from '@/components/dashboard/platforms/metrics/TotalAdSetReachCard'
import { CampaignWidget } from '@/components/dashboard/platforms/tabs/CampaignWidget'

// Define the MetaTab DailyDataItem type for proper type checking
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

// Extend Metrics type to add our custom properties
interface ExtendedMetrics extends Metrics {
  dailyMetaData?: DailyDataItem[];
}

// Define the widget types we can add to the home page
interface Widget {
  id: string;
  type: 'shopify' | 'meta';
  name: string;
  component: string;
  description?: string;
  icon?: string;
  fullWidth?: boolean;
}

// Available widgets users can add
const AVAILABLE_WIDGETS: Widget[] = [
  // Shopify widgets
  { 
    id: 'shopify-sales', 
    type: 'shopify', 
    name: 'Total Sales', 
    component: 'MetricCard',
    description: 'Total revenue from Shopify orders',
    icon: 'https://i.imgur.com/cnCcupx.png'
  },
  { 
    id: 'shopify-orders', 
    type: 'shopify', 
    name: 'Orders', 
    component: 'MetricCard',
    description: 'Number of orders from Shopify',
    icon: 'https://i.imgur.com/cnCcupx.png'
  },
  { 
    id: 'shopify-aov', 
    type: 'shopify', 
    name: 'Average Order Value', 
    component: 'MetricCard',
    description: 'Shopify Average Order Value (AOV)',
    icon: 'https://i.imgur.com/cnCcupx.png'
  },
  { 
    id: 'shopify-units', 
    type: 'shopify', 
    name: 'Units Sold', 
    component: 'MetricCard',
    description: 'Total units sold on Shopify',
    icon: 'https://i.imgur.com/cnCcupx.png'
  },
  // Add full-width Shopify widgets
  {
    id: 'shopify-sales-by-product',
    type: 'shopify',
    name: 'Sales by Product',
    component: 'SalesByProduct',
    description: 'Product-specific sales performance',
    icon: 'https://i.imgur.com/cnCcupx.png',
    fullWidth: true
  },
  {
    id: 'shopify-inventory',
    type: 'shopify',
    name: 'Inventory Summary',
    component: 'InventorySummary',
    description: 'Current inventory status and metrics',
    icon: 'https://i.imgur.com/cnCcupx.png',
    fullWidth: true
  },
  
  // Meta widgets
  { 
    id: 'meta-adspend', 
    type: 'meta', 
    name: 'Meta Ad Spend', 
    component: 'MetricCard',
    description: 'Total ad spend on Meta platforms',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-impressions', 
    type: 'meta', 
    name: 'Meta Impressions', 
    component: 'MetricCard',
    description: 'Total impressions from Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-clicks', 
    type: 'meta', 
    name: 'Meta Clicks', 
    component: 'MetricCard',
    description: 'Total clicks on Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-conversions', 
    type: 'meta', 
    name: 'Meta Conversions', 
    component: 'MetricCard',
    description: 'Total conversions from Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-roas', 
    type: 'meta', 
    name: 'Meta ROAS', 
    component: 'MetricCard',
    description: 'Meta Return On Ad Spend (ROAS)',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  // Additional Meta widgets
  { 
    id: 'meta-reach', 
    type: 'meta', 
    name: 'Reach', 
    component: 'TotalAdSetReachCard',
    description: 'Estimated number of unique people who saw your ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-budget', 
    type: 'meta', 
    name: 'Total Budget', 
    component: 'TotalBudgetMetricCard',
    description: 'Total budget for all active Meta ad sets',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-ctr', 
    type: 'meta', 
    name: 'CTR', 
    component: 'MetricCard',
    description: 'Click-through rate on your Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-cpc', 
    type: 'meta', 
    name: 'Cost Per Click', 
    component: 'MetricCard',
    description: 'Average cost per click on your Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-cpr', 
    type: 'meta', 
    name: 'Cost Per Result', 
    component: 'MetricCard',
    description: 'Average cost per result on your Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-results', 
    type: 'meta', 
    name: 'Results', 
    component: 'MetricCard',
    description: 'Total number of results from your Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-purchase-value', 
    type: 'meta', 
    name: 'Purchase Value', 
    component: 'MetricCard',
    description: 'Total purchase value from Meta ads',
    icon: 'https://i.imgur.com/6hyyRrs.png'
  },
  { 
    id: 'meta-campaigns', 
    type: 'meta', 
    name: 'Campaign Performance', 
    component: 'CampaignWidget',
    description: 'Performance metrics for Meta ad campaigns',
    icon: 'https://i.imgur.com/6hyyRrs.png',
    fullWidth: true
  }
];

interface HomeTabProps {
  brandId: string
  brandName: string
  dateRange: DateRange
  metrics: Metrics
  isLoading: boolean
  isRefreshingData?: boolean
  platformStatus: {
    shopify: boolean
    meta: boolean
  }
  connections: PlatformConnection[]
  brands?: Array<{ id: string, name: string }>
  isEditMode?: boolean
}

const MemoizedCampaignWidget = React.memo(CampaignWidget);

// Define MetaMetricsState interface
interface MetaMetricsState {
  adSpend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  adSpendGrowth: number | null;
  impressionGrowth: number | null;
  clickGrowth: number | null;
  conversionGrowth: number | null;
  roasGrowth: number | null;
  previousAdSpend: number;
  previousImpressions: number;
  previousClicks: number;
  previousConversions: number;
  previousRoas: number;
  ctr: number;
  previousCtr: number;
  ctrGrowth: number | null;
  cpc: number;
  previousCpc: number;
  cpcGrowth: number | null;
  costPerResult: number;
  cprGrowth: number | null;
  results: number;
  previousResults: number;
  purchaseValue: number;
  previousPurchaseValue: number;
}

const initialMetaMetricsState: MetaMetricsState = {
  adSpend: 0,
  impressions: 0,
  clicks: 0,
  conversions: 0,
  roas: 0,
  adSpendGrowth: 0,
  impressionGrowth: 0,
  clickGrowth: 0,
  conversionGrowth: 0,
  roasGrowth: 0,
  previousAdSpend: 0,
  previousImpressions: 0,
  previousClicks: 0,
  previousConversions: 0,
  previousRoas: 0,
  ctr: 0,
  previousCtr: 0,
  ctrGrowth: 0,
  cpc: 0,
  previousCpc: 0,
  cpcGrowth: 0,
  costPerResult: 0,
  cprGrowth: 0,
  results: 0,
  previousResults: 0,
  purchaseValue: 0,
  previousPurchaseValue: 0
};

export function HomeTab({
  brandId,
  brandName,
  dateRange,
  metrics,
  isLoading,
  isRefreshingData = false,
  platformStatus,
  connections,
  brands = [],
  isEditMode = false
}: HomeTabProps) {
  // State for user's selected widgets
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isWidgetSelectorOpen, setIsWidgetSelectorOpen] = useState(false);
  const [activeWidgetTab, setActiveWidgetTab] = useState<'shopify' | 'meta'>('shopify');
  const supabase = createClientComponentClient();
  
  // Core data states - SIMPLIFIED
  const [metaMetrics, setMetaMetrics] = useState<MetaMetricsState>(initialMetaMetricsState);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoadingMetaData, setIsLoadingMetaData] = useState(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  
  // Refs to prevent duplicate calls and track state
  const lastFetchKey = useRef<string>('');
  const isInitialized = useRef(false);

  // Get connections
  const metaConnection = connections.find(conn => conn.platform === 'meta' && conn.isConnected);
  const shopifyConnection = connections.find(conn => conn.platform === 'shopify' && conn.isConnected);

  // Helper function to convert a Date to a consistent ISO date string (YYYY-MM-DD) in local time
  const toLocalISODateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Function to calculate previous period date range
  const getPreviousPeriodDates = (from: Date, to: Date): { prevFrom: string, prevTo: string } => {
    // Normalize dates to avoid timezone issues
    const fromNormalized = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toNormalized = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    
    // Calculate range days
    const rangeDays = Math.round((toNormalized.getTime() - fromNormalized.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Simple previous period: just go back by the same number of days
    const prevFrom = new Date(fromNormalized);
    prevFrom.setDate(prevFrom.getDate() - rangeDays);
    
    const prevTo = new Date(toNormalized);
    prevTo.setDate(prevTo.getDate() - rangeDays);
    
    return {
      prevFrom: toLocalISODateString(prevFrom),
      prevTo: toLocalISODateString(prevTo)
    };
  };

  // Calculate percentage change
  const calculatePercentChange = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / previous) * 100;
  };

  // SIMPLIFIED Meta data fetcher - no complex locking or recursive calls
  const fetchAllData = useCallback(async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to) {
      console.log("[HomeTab] Skipping data fetch: Missing brandId or dateRange");
      return;
    }

    // Create unique key for this fetch to prevent duplicates
    const fetchKey = `${brandId}-${toLocalISODateString(dateRange.from)}-${toLocalISODateString(dateRange.to)}`;
    if (lastFetchKey.current === fetchKey) {
      console.log("[HomeTab] Skipping duplicate fetch for same parameters");
      return;
    }
    lastFetchKey.current = fetchKey;

    console.log("[HomeTab] Starting data fetch for:", fetchKey);
    
    try {
      // Set loading states
      if (metaConnection) setIsLoadingMetaData(true);
      if (widgets.some(w => w.id === 'meta-campaigns') && metaConnection) setIsLoadingCampaigns(true);

      // Fetch Meta data if connected
      if (metaConnection) {
        console.log("[HomeTab] Fetching Meta data...");
        
        // Current period params
        const params = new URLSearchParams({
          brandId: brandId,
          from: toLocalISODateString(dateRange.from),
          to: toLocalISODateString(dateRange.to)
        });
        
        // Previous period params
        const { prevFrom, prevTo } = getPreviousPeriodDates(dateRange.from, dateRange.to);
        const prevParams = new URLSearchParams({
          brandId: brandId,
          from: prevFrom,
          to: prevTo
        });

        // Fetch both periods
        const [currentResponse, prevResponse] = await Promise.all([
          fetch(`/api/metrics/meta?${params.toString()}`),
          fetch(`/api/metrics/meta?${prevParams.toString()}`)
        ]);

        if (currentResponse.ok && prevResponse.ok) {
          const currentData = await currentResponse.json();
          const previousData = await prevResponse.json();

          // Update Meta metrics state
          setMetaMetrics({
            adSpend: currentData.adSpend || 0,
            impressions: currentData.impressions || 0,
            clicks: currentData.clicks || 0,
            conversions: currentData.conversions || 0,
            roas: currentData.roas || 0,
            ctr: currentData.ctr || 0,
            cpc: currentData.cpc || 0,
            costPerResult: currentData.costPerResult || 0,
            results: currentData.results || 0,
            purchaseValue: currentData.purchaseValue || 0,
            
            previousAdSpend: previousData.adSpend || 0,
            previousImpressions: previousData.impressions || 0,
            previousClicks: previousData.clicks || 0,
            previousConversions: previousData.conversions || 0,
            previousRoas: previousData.roas || 0,
            previousCtr: previousData.ctr || 0,
            previousCpc: previousData.cpc || 0,
            previousResults: previousData.results || 0,
            previousPurchaseValue: previousData.purchaseValue || 0,
            
            adSpendGrowth: calculatePercentChange(currentData.adSpend, previousData.adSpend),
            impressionGrowth: calculatePercentChange(currentData.impressions, previousData.impressions),
            clickGrowth: calculatePercentChange(currentData.clicks, previousData.clicks),
            conversionGrowth: calculatePercentChange(currentData.conversions, previousData.conversions),
            roasGrowth: calculatePercentChange(currentData.roas, previousData.roas),
            ctrGrowth: calculatePercentChange(currentData.ctr, previousData.ctr),
            cpcGrowth: calculatePercentChange(currentData.cpc, previousData.cpc),
            cprGrowth: calculatePercentChange(currentData.costPerResult, previousData.costPerResult),
          });

          console.log("[HomeTab] Meta data updated successfully");
        } else {
          console.error("[HomeTab] Failed to fetch Meta data");
        }

        // Fetch campaigns if needed
        if (widgets.some(w => w.id === 'meta-campaigns')) {
          console.log("[HomeTab] Fetching Meta campaigns...");
          
          const campaignResponse = await fetch(`/api/meta/campaigns?brandId=${brandId}&from=${toLocalISODateString(dateRange.from)}&to=${toLocalISODateString(dateRange.to)}`);
          
          if (campaignResponse.ok) {
            const campaignData = await campaignResponse.json();
            setCampaigns(campaignData.campaigns || []);
            console.log("[HomeTab] Campaigns updated successfully");
          } else {
            console.error("[HomeTab] Failed to fetch campaigns");
          }
        }
      } else {
        // Reset Meta data if not connected
        setMetaMetrics(initialMetaMetricsState);
        setCampaigns([]);
      }

    } catch (error) {
      console.error("[HomeTab] Error fetching data:", error);
    } finally {
      setIsLoadingMetaData(false);
      setIsLoadingCampaigns(false);
    }
  }, [brandId, dateRange, metaConnection, widgets]);

  // Load user's saved widget configuration
  const loadUserWidgets = useCallback(async () => {
    if (!brandId) return;
    
    try {
      // Load from localStorage first for speed
      const savedWidgets = localStorage.getItem(`dashboard_widgets_${brandId}`);
      if (savedWidgets) {
        setWidgets(JSON.parse(savedWidgets));
      }

      // Then load from database
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('widgets')
        .eq('brand_id', brandId)
        .single();

      if (data?.widgets) {
        setWidgets(data.widgets);
        localStorage.setItem(`dashboard_widgets_${brandId}`, JSON.stringify(data.widgets));
      }
    } catch (error) {
      console.error('Error loading widgets:', error);
    }
  }, [brandId, supabase]);

  // SINGLE useEffect for all initialization and data loading
  useEffect(() => {
    if (!brandId) return;

    console.log("[HomeTab] Main effect triggered for brandId:", brandId);

    // Load widgets first
    if (!isInitialized.current) {
      loadUserWidgets();
      isInitialized.current = true;
    }

    // Then fetch data
    fetchAllData();

  }, [brandId, dateRange?.from, dateRange?.to, metaConnection?.isConnected, shopifyConnection?.isConnected]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    console.log("[HomeTab] Manual refresh triggered");
    lastFetchKey.current = ''; // Reset to force fetch
    await fetchAllData();
    toast.success("Dashboard refreshed");
  };

  // Save widgets when they change
  const saveWidgets = async (updatedWidgets: Widget[]) => {
    try {
      setWidgets(updatedWidgets);
      localStorage.setItem(`dashboard_widgets_${brandId}`, JSON.stringify(updatedWidgets));
      
      const { error } = await supabase
        .from('dashboard_widgets')
        .upsert({ 
          brand_id: brandId, 
          widgets: updatedWidgets 
        }, { 
          onConflict: 'brand_id' 
        });

      if (error) {
        console.error('Error saving widgets:', error);
        toast.error('Failed to save dashboard layout');
      }
    } catch (error) {
      console.error('Error saving widgets:', error);
      toast.error('Failed to save dashboard layout');
    }
  };

  // Add a widget to the dashboard
  const addWidget = (widget: Widget) => {
    const updatedWidgets = [...widgets, widget];
    saveWidgets(updatedWidgets);
    toast.success(`Added ${widget.name} widget to dashboard`);
  };

  // Remove a widget from the dashboard
  const removeWidget = (widgetId: string) => {
    const updatedWidgets = widgets.filter(w => w.id !== widgetId);
    saveWidgets(updatedWidgets);
    toast.success('Widget removed from dashboard');
  };

  // Move widget up in order within its section
  const moveWidgetUp = (widgetId: string) => {
    const widgetIndex = widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex <= 0) return;

    const widget = widgets[widgetIndex];
    const isFullWidth = widget.fullWidth === true;
    const sameTypeAndLayoutWidgets = widgets.filter(
      w => w.type === widget.type && (w.fullWidth === true) === isFullWidth
    );
    
    const widgetTypeIndex = sameTypeAndLayoutWidgets.findIndex(w => w.id === widgetId);
    if (widgetTypeIndex <= 0) return;

    const newWidgets = [...widgets];
    const targetIndex = widgets.findIndex(w => w.id === sameTypeAndLayoutWidgets[widgetTypeIndex - 1].id);
    
    newWidgets.splice(widgetIndex, 1);
    newWidgets.splice(targetIndex, 0, widget);
    
    saveWidgets(newWidgets);
  };

  // Move widget down in order within its section
  const moveWidgetDown = (widgetId: string) => {
    const widgetIndex = widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex >= widgets.length - 1) return;

    const widget = widgets[widgetIndex];
    const isFullWidth = widget.fullWidth === true;
    const sameTypeAndLayoutWidgets = widgets.filter(
      w => w.type === widget.type && (w.fullWidth === true) === isFullWidth
    );
    
    const widgetTypeIndex = sameTypeAndLayoutWidgets.findIndex(w => w.id === widgetId);
    if (widgetTypeIndex >= sameTypeAndLayoutWidgets.length - 1) return;

    const newWidgets = [...widgets];
    const targetIndex = widgets.findIndex(w => w.id === sameTypeAndLayoutWidgets[widgetTypeIndex + 1].id);
    
    newWidgets.splice(widgetIndex, 1);
    newWidgets.splice(targetIndex + 1, 0, widget);
    
    saveWidgets(newWidgets);
  };

  // Get available widgets that haven't been added yet
  const getAvailableWidgets = () => {
    return AVAILABLE_WIDGETS.filter(widget => !widgets.find(w => w.id === widget.id));
  };

  // Get widgets that have been added
  const getAddedWidgets = () => {
    return widgets.map(widget => AVAILABLE_WIDGETS.find(w => w.id === widget.id)).filter(Boolean) as Widget[];
  };

  // Render individual widget
  const renderWidget = (widget: Widget, index: number) => {
    const getMetricValue = (widgetId: string) => {
      switch (widgetId) {
        case 'shopify-sales':
          return { value: metrics.totalSales || 0, change: metrics.totalSalesGrowth };
        case 'shopify-orders':
          return { value: metrics.totalOrders || 0, change: metrics.totalOrdersGrowth };
        case 'shopify-aov':
          return { value: metrics.averageOrderValue || 0, change: metrics.averageOrderValueGrowth };
        case 'shopify-units':
          return { value: metrics.totalUnitsSold || 0, change: metrics.totalUnitsSoldGrowth };
        case 'meta-adspend':
          return { value: metaMetrics.adSpend, change: metaMetrics.adSpendGrowth };
        case 'meta-impressions':
          return { value: metaMetrics.impressions, change: metaMetrics.impressionGrowth };
        case 'meta-clicks':
          return { value: metaMetrics.clicks, change: metaMetrics.clickGrowth };
        case 'meta-conversions':
          return { value: metaMetrics.conversions, change: metaMetrics.conversionGrowth };
        case 'meta-roas':
          return { value: metaMetrics.roas, change: metaMetrics.roasGrowth };
        case 'meta-ctr':
          return { value: metaMetrics.ctr, change: metaMetrics.ctrGrowth };
        case 'meta-cpc':
          return { value: metaMetrics.cpc, change: metaMetrics.cpcGrowth };
        case 'meta-cpr':
          return { value: metaMetrics.costPerResult, change: metaMetrics.cprGrowth };
        case 'meta-results':
          return { value: metaMetrics.results, change: null };
        case 'meta-purchase-value':
          return { value: metaMetrics.purchaseValue, change: null };
        default:
          return { value: 0, change: null };
      }
    };

    const getValueFormat = (widgetId: string): 'currency' | 'number' | 'percentage' => {
      if (widgetId.includes('sales') || widgetId.includes('adspend') || widgetId.includes('aov') || 
          widgetId.includes('cpc') || widgetId.includes('cpr') || widgetId.includes('purchase-value')) {
        return 'currency';
      }
      if (widgetId.includes('roas') || widgetId.includes('ctr')) {
        return 'percentage';
      }
      return 'number';
    };

    const getMetricIcon = (widgetId: string) => {
      if (widgetId.includes('sales') || widgetId.includes('adspend')) return DollarSign;
      if (widgetId.includes('orders')) return ShoppingBag;
      if (widgetId.includes('impressions')) return Eye;
      if (widgetId.includes('clicks')) return MousePointer;
      if (widgetId.includes('conversions')) return Target;
      if (widgetId.includes('roas')) return TrendingUp;
      if (widgetId.includes('ctr')) return Percent;
      if (widgetId.includes('units')) return Activity;
      return Zap;
    };

    if (widget.component === 'MetricCard') {
      const { value, change } = getMetricValue(widget.id);
      const format = getValueFormat(widget.id);
      const IconComponent = getMetricIcon(widget.id);
      
      return (
        <div key={widget.id} className="relative group">
          <MetricCard
            title={widget.name}
            value={value}
            previousValue={change}
            format={format}
            icon={IconComponent}
            isLoading={widget.type === 'meta' ? isLoadingMetaData : isLoading}
          />
          {isEditMode && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveWidgetUp(widget.id)}
                className="h-6 w-6 p-0"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveWidgetDown(widget.id)}
                className="h-6 w-6 p-0"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeWidget(widget.id)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      );
    }

    // Handle special components
    if (widget.component === 'SalesByProduct') {
      return (
        <div key={widget.id} className="relative group col-span-full">
          <SalesByProduct 
            brandId={brandId} 
            dateRange={dateRange}
            isLoading={isLoading}
          />
          {isEditMode && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeWidget(widget.id)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (widget.component === 'InventorySummary') {
      return (
        <div key={widget.id} className="relative group col-span-full">
          <InventorySummary 
            brandId={brandId}
            isLoading={isLoading}
          />
          {isEditMode && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeWidget(widget.id)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (widget.component === 'TotalBudgetMetricCard') {
      return (
        <div key={widget.id} className="relative group">
          <TotalBudgetMetricCard 
            brandId={brandId}
            dateRange={dateRange}
            isLoading={isLoadingMetaData}
          />
          {isEditMode && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveWidgetUp(widget.id)}
                className="h-6 w-6 p-0"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveWidgetDown(widget.id)}
                className="h-6 w-6 p-0"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeWidget(widget.id)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (widget.component === 'TotalAdSetReachCard') {
      return (
        <div key={widget.id} className="relative group">
          <TotalAdSetReachCard 
            brandId={brandId}
            dateRange={dateRange}
            isLoading={isLoadingMetaData}
          />
          {isEditMode && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveWidgetUp(widget.id)}
                className="h-6 w-6 p-0"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveWidgetDown(widget.id)}
                className="h-6 w-6 p-0"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeWidget(widget.id)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (widget.component === 'CampaignWidget') {
      return (
        <div key={widget.id} className="relative group col-span-full">
          <MemoizedCampaignWidget
            campaigns={campaigns}
            isLoading={isLoadingCampaigns}
            dateRange={dateRange}
          />
          {isEditMode && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeWidget(widget.id)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // Render widget section
  const renderWidgetSection = (sectionWidgets: Widget[], sectionTitle: string, platformType: string, iconUrl: string) => {
    if (sectionWidgets.length === 0) return null;

    // Separate standard and full-width widgets
    const standardWidgets = sectionWidgets.filter(widget => !widget.fullWidth);
    const fullWidthWidgets = sectionWidgets.filter(widget => widget.fullWidth);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Image src={iconUrl} alt={`${sectionTitle} icon`} width={20} height={20} />
          <h3 className="text-lg font-semibold">{sectionTitle}</h3>
        </div>
        
        {/* Standard widgets in grid */}
        {standardWidgets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {standardWidgets.map((widget, index) => renderWidget(widget, index))}
          </div>
        )}
        
        {/* Full-width widgets */}
        {fullWidthWidgets.map((widget, index) => renderWidget(widget, index))}
      </div>
    );
  };

  // Group widgets by type
  const addedWidgets = getAddedWidgets();
  const shopifyWidgets = addedWidgets.filter(widget => widget.type === 'shopify');
  const metaWidgets = addedWidgets.filter(widget => widget.type === 'meta');

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
          <p className="text-gray-600">
            {dateRange?.from && dateRange?.to 
              ? `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
              : 'Select a date range to view metrics'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleManualRefresh}
            variant="outline" 
            size="sm"
            disabled={isLoadingMetaData}
          >
            {isLoadingMetaData ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            onClick={() => setIsWidgetSelectorOpen(true)}
            variant="outline" 
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Widget
          </Button>
        </div>
      </div>

      {/* Widget sections */}
      <div className="space-y-8">
        {renderWidgetSection(shopifyWidgets, "Shopify Metrics", "shopify", "https://i.imgur.com/cnCcupx.png")}
        {renderWidgetSection(metaWidgets, "Meta Metrics", "meta", "https://i.imgur.com/6hyyRrs.png")}
      </div>

      {/* Empty state */}
      {addedWidgets.length === 0 && (
        <Card className="p-8 text-center">
          <CardContent>
            <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No widgets added yet</h3>
            <p className="text-gray-600 mb-4">
              Add widgets to customize your dashboard and track the metrics that matter most to you.
            </p>
            <Button onClick={() => setIsWidgetSelectorOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Widget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Widget selector dialog */}
      <Dialog open={isWidgetSelectorOpen} onOpenChange={setIsWidgetSelectorOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Widgets to Dashboard</DialogTitle>
            <DialogDescription>
              Choose from available widgets to customize your dashboard
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeWidgetTab} onValueChange={(value) => setActiveWidgetTab(value as 'shopify' | 'meta')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="shopify" className="flex items-center gap-2">
                <Image src="https://i.imgur.com/cnCcupx.png" alt="Shopify" width={16} height={16} />
                Shopify
              </TabsTrigger>
              <TabsTrigger value="meta" className="flex items-center gap-2">
                <Image src="https://i.imgur.com/6hyyRrs.png" alt="Meta" width={16} height={16} />
                Meta
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getAvailableWidgets()
                  .filter(widget => widget.type === activeWidgetTab)
                  .map(widget => (
                    <Card key={widget.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {widget.icon && (
                              <Image src={widget.icon} alt={widget.name} width={16} height={16} />
                            )}
                            <h4 className="font-medium">{widget.name}</h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{widget.description}</p>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              addWidget(widget);
                              setIsWidgetSelectorOpen(false);
                            }}
                            className="w-full"
                          >
                            <PlusCircle className="w-3 h-3 mr-2" />
                            Add Widget
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
              
              {getAvailableWidgets().filter(widget => widget.type === activeWidgetTab).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">All {activeWidgetTab} widgets have been added to your dashboard</p>
                </div>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
} 