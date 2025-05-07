"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Metrics } from '@/types/metrics'
import { PlatformConnection } from '@/types/platformConnection'
import { DateRange } from 'react-day-picker'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, X, Settings, Pencil, GripVertical, ShoppingBag, Facebook, LayoutGrid } from "lucide-react"
import Image from "next/image"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { MetricCard } from "@/components/metrics/MetricCard"
import { DragDropContext, Droppable, Draggable, DroppableProvided } from 'react-beautiful-dnd'
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format } from 'date-fns'

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
}

export function HomeTab({
  brandId,
  brandName,
  dateRange,
  metrics,
  isLoading,
  isRefreshingData = false,
  platformStatus,
  connections,
  brands = []
}: HomeTabProps) {
  // State for user's selected widgets
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isWidgetSelectorOpen, setIsWidgetSelectorOpen] = useState(false);
  const [activeWidgetTab, setActiveWidgetTab] = useState<'shopify' | 'meta'>('shopify');
  const supabase = createClientComponentClient();
  
  // State to store Meta daily data
  const [metaDaily, setMetaDaily] = useState<DailyDataItem[]>([]);
  const [isLoadingMetaData, setIsLoadingMetaData] = useState(false);
  const hasFetchedMetaData = useRef(false);
  
  // State for direct Meta metrics
  const [metaMetrics, setMetaMetrics] = useState({
    adSpend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    roas: 0,
    adSpendGrowth: 0,
    impressionGrowth: 0,
    clickGrowth: 0,
    conversionGrowth: 0,
    roasGrowth: 0
  });

  // Treat metrics as ExtendedMetrics to ensure TypeScript compatibility
  const extendedMetrics = metrics as ExtendedMetrics;
  const metaData = metaDaily.length > 0 ? metaDaily : extendedMetrics.dailyMetaData || [];

  // Get connection info
  const shopifyConnection = connections.find(c => c.platform_type === 'shopify' && c.status === 'active');
  const metaConnection = connections.find(c => c.platform_type === 'meta' && c.status === 'active');
  
  // Filter widgets that require connections that don't exist
  const validWidgets = widgets.filter(widget => 
    (widget.type === 'shopify' && shopifyConnection) || 
    (widget.type === 'meta' && metaConnection)
  );

  // Group widgets by platform
  const shopifyWidgets = validWidgets.filter(widget => widget.type === 'shopify');
  const metaWidgets = validWidgets.filter(widget => widget.type === 'meta');

  // Fetch Meta data directly from API
  const fetchMetaData = async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to || !metaConnection) {
      return;
    }

    try {
      setIsLoadingMetaData(true);

      const params = new URLSearchParams({
        brandId: brandId
      });
      
      // Add date range
      params.append('from', dateRange.from.toISOString().split('T')[0]);
      params.append('to', dateRange.to.toISOString().split('T')[0]);
      
      // Force metrics fetch
      params.append('bypass_cache', 'true');
      params.append('force_load', 'true');
      
      console.log(`[HomeTab] Fetching Meta data with params: ${params.toString()}`);
      
      const response = await fetch(`/api/metrics/meta?${params.toString()}`, { 
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Meta data: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log("[HomeTab] Fetched Meta data:", {
        adSpend: data.adSpend,
        impressions: data.impressions,
        clicks: data.clicks,
        roas: data.roas,
        dailyData: Array.isArray(data.dailyData) ? data.dailyData.length : 0
      });
      
      // Update state with fetched data
      if (Array.isArray(data.dailyData) && data.dailyData.length > 0) {
        setMetaDaily(data.dailyData);
      }
      
      // Store the actual Meta metrics in our local state
      setMetaMetrics({
        adSpend: data.adSpend || 0,
        impressions: data.impressions || 0,
        clicks: data.clicks || 0,
        conversions: data.conversions || 0,
        roas: data.roas || 0,
        adSpendGrowth: data.adSpendGrowth || 0,
        impressionGrowth: data.impressionGrowth || 0,
        clickGrowth: data.clickGrowth || 0,
        conversionGrowth: data.conversionGrowth || 0,
        roasGrowth: data.roasGrowth || 0
      });
      
      hasFetchedMetaData.current = true;
    } catch (error) {
      console.error("[HomeTab] Error fetching Meta data:", error);
    } finally {
      setIsLoadingMetaData(false);
    }
  };

  // Fetch Shopify data
  const fetchShopifyData = async () => {
    if (!brandId || !dateRange?.from || !dateRange?.to || !shopifyConnection) {
      return;
    }

    try {
      // Add a cache-busting parameter to ensure we get fresh data
      const cacheBuster = `&t=${new Date().getTime()}`
      const fromDateStr = format(dateRange.from, 'yyyy-MM-dd');
      const toDateStr = format(dateRange.to, 'yyyy-MM-dd');
      
      console.log(`[HomeTab] Fetching Shopify data for connection: ${shopifyConnection.id}`);
      const response = await fetch(`/api/metrics?brandId=${brandId}&from=${fromDateStr}&to=${toDateStr}${cacheBuster}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch Shopify metrics');
      }
      
      // We don't need to do anything with the response as the parent component will handle updating metrics
    } catch (error) {
      console.error("[HomeTab] Error fetching Shopify data:", error);
    }
  };

  // Add an effect specifically for refreshing data when the component mounts
  useEffect(() => {
    // This will run whenever the HomeTab is mounted/navigated to
    const refreshAllData = async () => {
      console.log("[HomeTab] Component mounted - refreshing all data");
      
      if (metaConnection) {
        await fetchMetaData();
      }
      
      if (shopifyConnection) {
        await fetchShopifyData();
      }
    };
    
    // Clear any Meta API blocking flags that might be set
    if (window._blockMetaApiCalls !== undefined) {
      window._blockMetaApiCalls = false;
    }
    
    // Refresh data on mount
    refreshAllData();
    
    // No dependency on dateRange to avoid duplicate fetches,
    // this is specifically for mount/navigation
  }, [brandId, metaConnection, shopifyConnection]);

  // Load Meta data when component mounts or date range changes
  useEffect(() => {
    if (validWidgets.some(widget => widget.type === 'meta') && metaConnection) {
      fetchMetaData();
    }
  }, [dateRange, brandId, metaConnection, validWidgets.length]);

  // Listen for meta data refresh events from parent components
  useEffect(() => {
    const handleMetaDataRefresh = (event: Event) => {
      if (validWidgets.some(widget => widget.type === 'meta') && metaConnection) {
        console.log("[HomeTab] Detected meta data refresh event, refreshing Meta data");
        fetchMetaData();
      }
    };

    // Listen for both event naming styles to ensure we catch all events
    window.addEventListener('metaDataRefreshed', handleMetaDataRefresh);
    window.addEventListener('meta-data-refreshed', handleMetaDataRefresh);
    
    return () => {
      window.removeEventListener('metaDataRefreshed', handleMetaDataRefresh);
      window.removeEventListener('meta-data-refreshed', handleMetaDataRefresh);
    };
  }, [metaConnection, validWidgets]);

  // Load user's saved widget configuration
  useEffect(() => {
    async function loadUserWidgets() {
      try {
        // Check localStorage first for faster loading
        const savedWidgets = localStorage.getItem(`dashboard_widgets_${brandId}`);
        if (savedWidgets) {
          setWidgets(JSON.parse(savedWidgets));
        }

        // Then load from database for persistence across devices
        const { data, error } = await supabase
          .from('dashboard_widgets')
          .select('widgets')
          .eq('brand_id', brandId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
          console.error('Error loading widgets:', error);
          return;
        }

        if (data?.widgets) {
          const parsedWidgets = data.widgets;
          setWidgets(parsedWidgets);
          // Update localStorage with the latest from the database
          localStorage.setItem(`dashboard_widgets_${brandId}`, JSON.stringify(parsedWidgets));
      }
    } catch (error) {
        console.error('Error loading widgets:', error);
      }
    }

    if (brandId) {
      loadUserWidgets();
    }
  }, [brandId]);

  // Save widgets when they change
  const saveWidgets = async (updatedWidgets: Widget[]) => {
    try {
      // Update local state
      setWidgets(updatedWidgets);
      
      // Save to localStorage for immediate persistence
      localStorage.setItem(`dashboard_widgets_${brandId}`, JSON.stringify(updatedWidgets));
      
      // Save to database for cross-device persistence
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
        toast.error('Failed to save your dashboard layout');
      }
    } catch (error) {
      console.error('Error saving widgets:', error);
      toast.error('Failed to save your dashboard layout');
    }
  };

  // Add a widget to the dashboard
  const addWidget = (widget: Widget) => {
    const updatedWidgets = [...widgets, widget];
    saveWidgets(updatedWidgets);
    toast.success(`Added ${widget.name} widget to dashboard`);
    
    // If adding Meta widget and we haven't fetched Meta data yet, fetch it
    if (widget.type === 'meta' && !hasFetchedMetaData.current && metaConnection) {
      fetchMetaData();
    }
  };

  // Remove a widget from the dashboard
  const removeWidget = (widgetId: string) => {
    const updatedWidgets = widgets.filter(w => w.id !== widgetId);
    saveWidgets(updatedWidgets);
    toast.success('Widget removed from dashboard');
  };

  // Modify the handleDragEnd function to work with our new sectioned layout
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    // Get droppable ID to determine which section is being dragged within
    const sourceDroppableId = result.source.droppableId;
    const destinationDroppableId = result.destination.droppableId;
    
    // Copy the current widgets array
    const newWidgets = [...widgets];
    
    // Find widget indices that match the platform type of the droppable area
    const platformType = sourceDroppableId.split('-')[1]; // 'widgets-shopify' -> 'shopify'
    const platformWidgets = newWidgets.filter(w => w.type === platformType);
    
    // If dragging between sections, handle that special case
    if (sourceDroppableId !== destinationDroppableId) {
      // This shouldn't happen with our current setup, but we handle it anyway
      toast("Can't move between sections. Widgets must stay in their platform section.");
      return;
    }
    
    // Get the correct widgets for this section
    const sectionWidgets = newWidgets.filter(w => w.type === platformType);
    
    // Get the widget that was dragged
    const [removed] = sectionWidgets.splice(result.source.index, 1);
    
    // Insert the widget at the new position
    sectionWidgets.splice(result.destination.index, 0, removed);
    
    // Map the dragged widgets back to their original indices in the full widgets array
    const updatedWidgets = [...newWidgets];
    let sectionIndex = 0;
    
    for (let i = 0; i < updatedWidgets.length; i++) {
      if (updatedWidgets[i].type === platformType) {
        updatedWidgets[i] = sectionWidgets[sectionIndex];
        sectionIndex++;
      }
    }
    
    // Update the state and save to database
    setWidgets(updatedWidgets);
    saveWidgets(updatedWidgets);
  };

  // Filter available widgets by platform and remove already added ones
  const getAvailableWidgets = () => {
    const addedWidgetIds = widgets.map(w => w.id);
    return AVAILABLE_WIDGETS.filter(widget => 
      widget.type === activeWidgetTab && !addedWidgetIds.includes(widget.id)
    );
  };

  // Get widgets already added for current platform
  const getAddedWidgets = () => {
    return widgets.filter(widget => widget.type === activeWidgetTab);
  };

  // Render a single widget based on its type
  const renderWidget = (widget: Widget, index: number) => {
    // Create empty datasets for metrics that don't exist in the Metrics type
    const emptyDataset = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 6 + i);
      return {
        date: date.toISOString(),
        value: 0
      };
    });

    // For demo, we'll use MetricCard for all widgets with different properties
    // In a real implementation, you'd render different components based on widget.component
    
    let widgetProps: any = {
      title: (
        <div className="flex items-center gap-2">
          <div className="relative w-4 h-4">
            <Image 
              src={widget.icon || ''}
              alt={`${widget.type} logo`} 
              width={16} 
              height={16} 
              className="object-contain"
            />
          </div>
          <span>{widget.name}</span>
        </div>
      ),
      loading: (widget.type === 'meta' ? isLoadingMetaData : isLoading) || isRefreshingData,
      brandId: brandId,
      className: "mb-0",
      platform: widget.type,
      dateRange: dateRange
    };

    // Widget-specific props based on ID
    switch (widget.id) {
      case 'shopify-sales':
        widgetProps = {
          ...widgetProps,
          value: metrics.totalSales || 0,
          change: metrics.salesGrowth || 0,
          prefix: "$",
          valueFormat: "currency",
          data: metrics.salesData || [],
          infoTooltip: "Total revenue from all orders in the selected period"
        };
        break;
      case 'shopify-orders':
        widgetProps = {
          ...widgetProps,
          value: metrics.ordersPlaced || 0,
          change: metrics.ordersGrowth || 0,
          data: metrics.ordersData || [],
          infoTooltip: "Total number of orders placed in the selected period"
        };
        break;
      case 'shopify-aov':
        widgetProps = {
          ...widgetProps,
          value: metrics.averageOrderValue || 0,
          change: metrics.aovGrowth || 0,
          prefix: "$",
          valueFormat: "currency",
          data: metrics.aovData || [],
          infoTooltip: "Average value of orders in the selected period"
        };
        break;
      case 'shopify-units':
        widgetProps = {
          ...widgetProps,
          value: metrics.unitsSold || 0,
          change: metrics.unitsGrowth || 0,
          data: metrics.unitsSoldData || [],
          infoTooltip: "Total number of units sold in the selected period"
        };
        break;
      case 'meta-adspend':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.adSpend,
          change: metaMetrics.adSpendGrowth,
          prefix: "$",
          valueFormat: "currency",
          hideGraph: true,
          infoTooltip: "Total ad spend on Meta platforms"
        };
        break;
      case 'meta-impressions':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.impressions,
          change: metaMetrics.impressionGrowth,
          hideGraph: true,
          infoTooltip: "Total number of times your ads were viewed"
        };
        break;
      case 'meta-clicks':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.clicks,
          change: metaMetrics.clickGrowth,
          hideGraph: true,
          infoTooltip: "Total number of clicks on your ads"
        };
        break;
      case 'meta-conversions':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.conversions,
          change: metaMetrics.conversionGrowth,
          hideGraph: true,
          infoTooltip: "Total number of conversions from your ads"
        };
        break;
      case 'meta-roas':
        widgetProps = {
          ...widgetProps,
          value: metaMetrics.roas,
          change: metaMetrics.roasGrowth,
          suffix: "x",
          valueFormat: "number",
          decimals: 2,
          hideGraph: true,
          infoTooltip: "Return on ad spend (revenue / ad spend)"
        };
        break;
      default:
        break;
    }

    if (isEditMode) {
      return (
        <Draggable key={widget.id} draggableId={widget.id} index={index}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              className="relative group"
            >
              <div className="absolute -top-3 -right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={() => removeWidget(widget.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="absolute top-2 left-2 z-10 opacity-50 cursor-move" {...provided.dragHandleProps}>
                <GripVertical className="h-4 w-4 text-gray-500" />
              </div>
              <MetricCard {...widgetProps} />
            </div>
          )}
        </Draggable>
      );
    }

    return (
      <div key={widget.id} className="w-full">
        <MetricCard {...widgetProps} />
      </div>
    );
  };

  const renderWidgetSection = (sectionWidgets: Widget[], sectionTitle: string, platformType: string, iconUrl: string) => {
    if (sectionWidgets.length === 0) return null;
    
    return (
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Image 
            src={iconUrl}
            alt={sectionTitle}
            width={20}
            height={20}
            className="mr-2"
          />
          <h2 className="text-lg font-medium text-white">{sectionTitle}</h2>
        </div>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId={`widgets-${platformType}`} direction="horizontal">
            {(provided: DroppableProvided) => (
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" 
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {sectionWidgets.map((widget, index) => renderWidget(widget, index))}
                {provided.placeholder}
                
                {isEditMode && (
                  <Card 
                    className={cn(
                      "bg-[#111] border-[#333] border-dashed flex flex-col items-center justify-center cursor-pointer",
                      "hover:bg-[#191919] transition-colors duration-200"
                    )}
                    onClick={() => {
                      setActiveWidgetTab(platformType as 'shopify' | 'meta');
                      setIsWidgetSelectorOpen(true);
                    }}
                  >
                    <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                      <PlusCircle className="h-8 w-8 text-gray-500 mb-2" />
                      <p className="text-gray-400 text-sm">Add {sectionTitle} Widget</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">
          {/* Remove "Dashboard" text completely */}
        </h2>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "text-white hover:bg-white/10",
                    isEditMode && "bg-white/10 text-white"
                  )}
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  <LayoutGrid className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-black border border-gray-800 text-white text-xs">
                <p>{isEditMode ? "Done Customizing" : "Customize Dashboard"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {validWidgets.length === 0 ? (
        <Card className="bg-[#111] border-[#333] text-center py-10">
          <CardContent className="flex flex-col items-center">
            <LayoutGrid className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Your Dashboard Awaits</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Click the grid icon above to add widgets from Shopify, Meta, and other platforms to build your personalized view.
            </p>
            <Button
              size="lg"
              onClick={() => setIsWidgetSelectorOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Your First Widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Shopify Section */}
          {renderWidgetSection(
            shopifyWidgets, 
            "Shopify", 
            "shopify", 
            "https://i.imgur.com/cnCcupx.png"
          )}
          
          {/* Meta Section */}
          {renderWidgetSection(
            metaWidgets, 
            "Meta Ads", 
            "meta", 
            "https://i.imgur.com/6hyyRrs.png"
          )}
          
          {/* Remove the "Add New Widget" button */}
        </>
      )}

      {/* Widget Selector Dialog */}
      <Dialog open={isWidgetSelectorOpen} onOpenChange={setIsWidgetSelectorOpen}>
        <DialogContent className="sm:max-w-lg bg-[#111] border-[#333]">
          <DialogHeader>
            <DialogTitle className="text-white">Add Widgets</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose widgets to add to your dashboard. They will be placed in the appropriate section based on platform.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs 
            defaultValue={activeWidgetTab} 
            value={activeWidgetTab} 
            onValueChange={(value) => setActiveWidgetTab(value as 'shopify' | 'meta')}
            className="mt-4"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-[#222] border-[#444]">
              <TabsTrigger 
                value="shopify" 
                className={cn(
                  "flex items-center text-gray-300 data-[state=active]:bg-[#333] data-[state=active]:text-white",
                  "focus-visible:ring-offset-0 focus-visible:ring-primary"
                )}
              >
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify" 
                  width={16} 
                  height={16} 
                  className="mr-2"
                />
                Shopify
              </TabsTrigger>
              <TabsTrigger 
                value="meta" 
                className={cn(
                  "flex items-center text-gray-300 data-[state=active]:bg-[#333] data-[state=active]:text-white",
                  "focus-visible:ring-offset-0 focus-visible:ring-primary"
                )}
              >
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta" 
                  width={16} 
                  height={16} 
                  className="mr-2"
                />
                Meta
              </TabsTrigger>
            </TabsList>
           
           <div className="px-1 py-2">
              {/* Selected widgets section */}
              {getAddedWidgets().length > 0 && (
                <>
                  <h3 className="text-white text-sm font-medium mb-2">Selected Widgets</h3>
                  <div className="grid grid-cols-1 gap-3 mb-4">
                    {getAddedWidgets().map(widget => (
                      <Card 
                        key={widget.id} 
                        className="flex justify-between items-center p-3 bg-[#1A1A1A] border-[#333]"
                      >
                        <div className="flex items-center">
                          <div className="mr-3 bg-[#333] p-2 rounded-lg">
                            <Image 
                              src={widget.icon || ''} 
                              alt={widget.type} 
                              width={24} 
                              height={24} 
                              className="object-contain"
                            />
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{widget.name}</h4>
                            <p className="text-sm text-gray-400">{widget.description}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-white hover:bg-[#333]"
                          onClick={() => removeWidget(widget.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Available widgets section */}
              {getAvailableWidgets().length > 0 && (
                <>
                  <h3 className="text-white text-sm font-medium mb-2">Available Widgets</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {getAvailableWidgets().map(widget => (
                      <Card 
                        key={widget.id} 
                        className="flex justify-between items-center p-3 cursor-pointer bg-[#1A1A1A] border-[#333] hover:bg-[#2A2A2A] transition-colors duration-150"
                        onClick={() => {
                          addWidget(widget);
                        }}
                      >
                        <div className="flex items-center">
                          <div className="mr-3 bg-[#333] p-2 rounded-lg">
                            <Image 
                              src={widget.icon || ''} 
                              alt={widget.type} 
                              width={24} 
                              height={24} 
                              className="object-contain"
                            />
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{widget.name}</h4>
                            <p className="text-sm text-gray-400">{widget.description}</p>
                          </div>
                        </div>
                        <PlusCircle className="h-5 w-5 text-gray-400 hover:text-white" />
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {getAvailableWidgets().length === 0 && getAddedWidgets().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No {activeWidgetTab} widgets available.</p>
                </div>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
} 