"use client"

/**
 * Dashboard Page
 * 
 * Loading behavior:
 * 1. When a brand is first selected, initialDataLoad is set to true
 * 2. When initialDataLoad is true, a full-screen loading spinner is shown
 * 3. After data is loaded, initialDataLoad is set to false
 * 4. For subsequent refreshes, only the corner loading indicator is shown
 * 5. Manual refreshes using the refresh button always use the corner loading indicator
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth, SignIn } from "@clerk/nextjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlatformTabs } from "@/components/dashboard/platforms/PlatformTabs"
import { DateRange } from "react-day-picker"
import { MetaContent } from "@/components/dashboard/platforms/MetaContent"
import { supabase } from "@/lib/supabase"
import BrandSelector from "@/components/BrandSelector"
import { useBrandContext } from '@/lib/context/BrandContext'
import { defaultMetrics, type Metrics, type CustomerSegments } from '@/types/metrics'
import { PlatformConnection } from '@/types/platformConnection'
import { calculateMetrics } from "@/lib/metrics"
import { MetricCard } from "@/components/metrics/MetricCard"
import { ShopifyTab } from "@/components/dashboard/platforms/tabs/ShopifyTab"
import { MetaTab } from "@/components/dashboard/platforms/tabs/MetaTab"
import { transformToMetaMetrics } from '@/lib/transforms'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/DateRangePicker"
import { WidgetManager } from "@/components/dashboard/WidgetManager"
import { useMetrics } from "@/lib/contexts/MetricsContext"
import { addDays, startOfDay, endOfDay, format, isAfter, isBefore, parseISO, subDays } from "date-fns"
import { useBrandStore } from "@/stores/brandStore"
import { useConnectionStore } from "@/stores/connectionStore"
import { useSupabase } from '@/lib/hooks/useSupabase'
import { RefreshCw, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { GreetingWidget } from "@/components/dashboard/GreetingWidget"
import { AINotification } from "@/components/dashboard/AINotification"
import { NotificationBell } from "@/components/NotificationBell"
import { useNotifications } from "@/contexts/NotificationContext"
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { BrandSelectionTrigger } from '@/components/dashboard/BrandSelectionTrigger'
import { LongTextFormatter } from '@/lib/utils/longText'
import useBrandIdParam from '@/lib/hooks/useBrandIdParam'
import {
  getFilteredConnections,
  getPlatformStatusFromConnections
} from '@/lib/utils/platformUtils'
import { useDataRefresh } from '@/lib/hooks/useDataRefresh'
import { Button } from "@/components/ui/button"
import { fetchHelper } from "@/lib/utils/fetchHelper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatters"
import { MetricsContext } from "@/contexts/metricsContext"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Brand } from "@/types/brand"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import useSWR from 'swr'

interface WidgetData {
  shopify?: any;
  meta?: any;
}

const initialMetrics: Metrics = {
  totalSales: 0,
  ordersPlaced: 0,
  averageOrderValue: 0,
  unitsSold: 0,
  revenueByDay: [],
  topProducts: [],
  salesGrowth: 0,
  ordersGrowth: 0,
  unitsGrowth: 0,
  aovGrowth: 0,
  conversionRate: 0,
  conversionRateGrowth: 0,
  customerSegments: {
    newCustomers: 0,
    returningCustomers: 0
  },
  customerRetentionRate: 0,
  retentionGrowth: 0,
  returnRate: 0,
  returnGrowth: 0,
  dailyData: [],
  adSpend: 0,
  adSpendGrowth: 0,
  roas: 0,
  roasGrowth: 0,
  impressions: 0,
  impressionGrowth: 0,
  ctr: 0,
  ctrGrowth: 0,
  clicks: 0,
  clickGrowth: 0,
  conversions: 0,
  conversionGrowth: 0,
  costPerResult: 0,
  cprGrowth: 0
}

// Add global variable to completely disable automatic Meta API calls
// This will be part of the window object
const DISABLE_AUTO_META_FETCH = false;

// Add global type for window._blockMetaApiCalls
declare global {
  interface Window {
    _blockMetaApiCalls?: boolean;
    _disableAutoMetaFetch?: boolean;
  }
}

// Add this function at the top of your file, outside the component
function formatDate(date: Date | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Add a constant for maximum loading time
const MAX_LOADING_TIME = 30000; // 30 seconds maximum loading time

export default function DashboardPage() {
  const { userId, isLoaded } = useAuth()
  const { brands, selectedBrandId, setSelectedBrandId } = useBrandContext()
  const { addNotification } = useNotifications()
  const [dateRange, setDateRange] = useState({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  })
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null)
  const [metrics, setMetrics] = useState<Metrics>(defaultMetrics)
  const [isLoading, setIsLoading] = useState(true)
  const [initialDataLoad, setInitialDataLoad] = useState(true)
  const [activePlatforms, setPlatformStatus] = useState({
    shopify: false,
    meta: false
  })
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("shopify")
  const { metrics: contextMetrics, isLoading: contextIsLoading, fetchMetrics } = useMetrics()

  const { selectedBrandId: brandStoreSelectedBrandId } = useBrandStore()
  const { connections: connectionStoreConnections } = useConnectionStore()
  const supabase = useSupabase()

  // Add a new state for data refresh that's separate from initial loading
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  // Add missing state for lastRefreshed
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState('');
  const COOLDOWN_SECONDS = 30; // 30 seconds cooldown between manual refreshes

  // Add a ref to track if we're still mounted
  const isMounted = useRef(true);

  // Track the number of auto-refresh cycles so we can do a full resync periodically
  const autoRefreshCountRef = useRef(0);

  // Set the global flag on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window._disableAutoMetaFetch = DISABLE_AUTO_META_FETCH;
    }
    
    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined') {
        window._disableAutoMetaFetch = false;
      }
    };
  }, []);

  // Load initial connections when component mounts
  useEffect(() => {
    async function loadConnections() {
      if (!selectedBrandId) return

      try {
        const { data: connections, error } = await supabase
          .from('platform_connections')
          .select('*')
          .eq('brand_id', selectedBrandId)
          .eq('status', 'active')

        if (error) throw error

        setConnections(connections as unknown as PlatformConnection[] || [])
        
        // Update active platforms
        setPlatformStatus({
          shopify: connections?.some((c: any) => c.platform_type === 'shopify') || false,
          meta: connections?.some((c: any) => c.platform_type === 'meta') || false
        })

      } catch (error) {
        console.error('Error loading connections:', error)
      }
    }

    loadConnections()
  }, [selectedBrandId, supabase])

  useEffect(() => {
    const handleBrandSelected = async (event: CustomEvent) => {
      const brandId = event.detail.brandId
      console.log('Selected brand:', brandId)
      
      // Set initialDataLoad to true when a brand is selected
      setInitialDataLoad(true)

      // Fetch platform connections from Supabase
      const { data: connections, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', brandId)

      if (error) {
        console.error('Error fetching connections:', error)
        return
      }

      console.log('Platform connections:', connections)

      // Update platforms state based on connections from database
      const hasShopify = connections.some((c: any) => 
        c.platform_type === 'shopify' && c.status === 'active'
      )
      const hasMeta = connections.some((c: any) => 
        c.platform_type === 'meta' && c.status === 'active'
      )

      setPlatformStatus({
        shopify: hasShopify,
        meta: hasMeta
      })

      // If Shopify is connected, set the store
      const shopifyConnection = connections.find((c: any) => 
        c.platform_type === 'shopify' && c.status === 'active'
      ) as PlatformConnection | undefined

      if (hasShopify && shopifyConnection?.shop) {
        setSelectedStore(shopifyConnection.shop)
      }
    }

    window.addEventListener('brandSelected', handleBrandSelected as unknown as EventListener)
    return () => {
      window.removeEventListener('brandSelected', handleBrandSelected as unknown as EventListener)
    }
  }, [supabase, setSelectedStore])

  // Load widget data when connections change
  useEffect(() => {
    async function loadWidgetData() {
      if (!selectedBrandId || !connections.length) return

      const shopifyConnection = connections.find(c => 
        c.platform_type === 'shopify' && c.status === 'active'
      )
      
      if (shopifyConnection) {
        try {
          console.log('Fetching Shopify data for connection:', shopifyConnection.id)
          const { data: orders, error: ordersError } = await supabase
            .from('shopify_orders')
            .select('*')
            .eq('connection_id', shopifyConnection.id)
            .order('created_at', { ascending: false })

          if (ordersError) {
            console.error('Error loading Shopify orders:', ordersError)
            return null
          }

          // Process orders data
          const processedData = orders?.map(order => ({
            id: order.id,
            created_at: order.created_at,
            total_price: typeof order.total_price === 'string' ? parseFloat(order.total_price) : (order.total_price || 0),
            customer_id: order.customer_id,
            line_items: order.line_items
          })) || []

          setWidgetData(current => ({
            ...current,
            shopify: processedData
          }))
        } catch (error) {
          console.error('Error loading Shopify data:', error)
        }
      }

      const metaConnection = connections.find((c: any) => 
        c.platform_type === 'meta' && c.status === 'active'
      ) as PlatformConnection | undefined

      if (metaConnection) {
        try {
          // Load Meta data from the new meta_ad_insights table
          const { data: metaData, error } = await supabase
            .from('meta_ad_insights')
            .select('*')
            .eq('connection_id', metaConnection.id)
            .limit(10) // Get a few recent entries
            .order('date', { ascending: false })
          
          if (error) {
            console.error('Error querying meta_ad_insights:', error)
            // Fallback to empty data
            setWidgetData(current => ({
              ...current,
              meta: { available: false }
            }))
          } else {
            // Update widget data
            setWidgetData(current => ({
              ...current,
              meta: metaData && metaData.length > 0 ? 
                { available: true, insights: metaData } : 
                { available: false }
            }))
          }
        } catch (error) {
          console.error('Error loading Meta data:', error)
          // Fallback to empty data
          setWidgetData(current => ({
            ...current,
            meta: { available: false }
          }))
        }
      }
    }

    loadWidgetData()
  }, [selectedBrandId, connections, supabase])

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Modify the loadMetrics function to include timeout
  useEffect(() => {
    if (!selectedBrandId || !dateRange) {
      setMetrics(defaultMetrics)
      return
    }

    const loadMetrics = async () => {
      if (!selectedBrandId) return;
      
      setIsLoading(true);
      
      // Set up a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        if (isMounted.current) {
          console.error('Loading timeout reached');
          setIsLoading(false);
          setInitialDataLoad(false);
          toast({
            title: "Loading timeout",
            description: "The dashboard is taking longer than expected to load. Please try refreshing.",
            variant: "destructive"
          });
        }
      }, MAX_LOADING_TIME);
      
      try {
        const params = new URLSearchParams({
          brandId: selectedBrandId
        });
        
        if (dateRange?.from) {
          params.append('from', dateRange.from.toISOString());
        }
        
        if (dateRange?.to) {
          params.append('to', dateRange.to.toISOString());
        }
        
        const response = await fetch(`/api/metrics?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Create a fully initialized and type-safe metrics object
        const safeMetrics = {
          // Basic revenue metrics
          totalSales: typeof data.totalSales === 'number' ? data.totalSales : 0,
          salesGrowth: typeof data.salesGrowth === 'number' ? data.salesGrowth : 0,
          averageOrderValue: typeof data.averageOrderValue === 'number' ? data.averageOrderValue : 0,
          aovGrowth: typeof data.aovGrowth === 'number' ? data.aovGrowth : 0,
          
          // Order metrics
          ordersPlaced: typeof data.ordersPlaced === 'number' ? data.ordersPlaced : 0,
          ordersGrowth: typeof data.ordersGrowth === 'number' ? data.ordersGrowth : 0,
          unitsSold: typeof data.unitsSold === 'number' ? data.unitsSold : 0,
          unitsGrowth: typeof data.unitsGrowth === 'number' ? data.unitsGrowth : 0,
          
          // Conversion metrics
          conversionRate: typeof data.conversionRate === 'number' ? data.conversionRate : 0,
          conversionGrowth: typeof data.conversionGrowth === 'number' ? data.conversionGrowth : 0,
          
          // Ad metrics
          adSpend: typeof data.adSpend === 'number' ? data.adSpend : 0,
          adSpendGrowth: typeof data.adSpendGrowth === 'number' ? data.adSpendGrowth : 0,
          roas: typeof data.roas === 'number' ? data.roas : 0,
          roasGrowth: typeof data.roasGrowth === 'number' ? data.roasGrowth : 0,
          impressions: typeof data.impressions === 'number' ? data.impressions : 0,
          impressionGrowth: typeof data.impressionGrowth === 'number' ? data.impressionGrowth : 0,
          clicks: typeof data.clicks === 'number' ? data.clicks : 0,
          clickGrowth: typeof data.clickGrowth === 'number' ? data.clickGrowth : 0,
          
          // Customer metrics
          customerRetentionRate: typeof data.customerRetentionRate === 'number' ? data.customerRetentionRate : 0,
          retentionGrowth: typeof data.retentionGrowth === 'number' ? data.retentionGrowth : 0,
          
          // Arrays and objects (with type checking)
          topProducts: Array.isArray(data.topProducts) ? data.topProducts : [],
          dailyData: Array.isArray(data.dailyData) ? data.dailyData : [],
          salesData: Array.isArray(data.salesData) ? data.salesData : [],
          revenueByDay: Array.isArray(data.revenueByDay) ? data.revenueByDay : [],
          customerSegments: data.customerSegments && typeof data.customerSegments === 'object' ? data.customerSegments : {}
        };
        
        if (isMounted.current) {
          setMetrics(prevMetrics => ({
            ...prevMetrics,
            totalSales: data.totalSales ?? prevMetrics.totalSales,
            salesGrowth: data.salesGrowth ?? prevMetrics.salesGrowth,
            ordersPlaced: data.ordersPlaced ?? prevMetrics.ordersPlaced,
            ordersGrowth: data.ordersGrowth ?? prevMetrics.ordersGrowth,
            unitsSold: data.unitsSold ?? prevMetrics.unitsSold,
            unitsGrowth: data.unitsGrowth ?? prevMetrics.unitsGrowth,
            averageOrderValue: data.averageOrderValue ?? prevMetrics.averageOrderValue,
            aovGrowth: data.aovGrowth ?? prevMetrics.aovGrowth,
            customerRetentionRate: data.customerRetentionRate ?? prevMetrics.customerRetentionRate,
            retentionGrowth: data.retentionGrowth ?? prevMetrics.retentionGrowth,
            conversionRate: data.conversionRate ?? prevMetrics.conversionRate,
            conversionGrowth: data.conversionGrowth ?? prevMetrics.conversionGrowth,
            returnRate: data.returnRate ?? prevMetrics.returnRate,
            returnGrowth: data.returnGrowth ?? prevMetrics.returnGrowth,
            conversionRateGrowth: data.conversionRateGrowth ?? prevMetrics.conversionRateGrowth,
            ctr: data.ctr ?? prevMetrics.ctr,
            ctrGrowth: data.ctrGrowth ?? prevMetrics.ctrGrowth,
            clicks: data.clicks ?? prevMetrics.clicks,
            clickGrowth: data.clickGrowth ?? prevMetrics.clickGrowth,
            impressions: data.impressions ?? prevMetrics.impressions,
            impressionGrowth: data.impressionGrowth ?? prevMetrics.impressionGrowth,
            adSpend: data.adSpend ?? prevMetrics.adSpend,
            adSpendGrowth: data.adSpendGrowth ?? prevMetrics.adSpendGrowth,
            roas: data.roas ?? prevMetrics.roas,
            roasGrowth: data.roasGrowth ?? prevMetrics.roasGrowth,
            conversions: data.conversions ?? prevMetrics.conversions,
            costPerResult: data.costPerResult ?? prevMetrics.costPerResult,
            cprGrowth: data.cprGrowth ?? prevMetrics.cprGrowth,
            topProducts: data.topProducts ?? prevMetrics.topProducts,
            revenueByDay: data.revenueByDay ?? prevMetrics.revenueByDay,
            dailyData: data.dailyData ?? prevMetrics.dailyData,
            customerSegments: data.customerSegments ?? prevMetrics.customerSegments,
            salesData: data.salesData ?? prevMetrics.salesData,
            ordersData: data.ordersData ?? prevMetrics.ordersData,
            aovData: data.aovData ?? prevMetrics.aovData,
            unitsSoldData: data.unitsSoldData ?? prevMetrics.unitsSoldData
          }));
        }
        
      } catch (error) {
        console.error('Error loading metrics:', error);
        if (isMounted.current) {
          // Initialize with empty metrics to prevent undefined errors
          setMetrics(defaultMetrics);
          toast({
            title: "Error loading data",
            description: "There was an error loading the dashboard data. Please try refreshing.",
            variant: "destructive"
          });
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          setInitialDataLoad(false);
        }
        clearTimeout(timeoutId);
      }
    };

    loadMetrics();
  }, [selectedBrandId, dateRange]);

  // Modify the fetchMetaMetrics function to ensure it includes all parameters
  const fetchMetaMetrics = async (initialLoad: boolean = false, forceRefresh: boolean = false) => {
    console.log(`fetchMetaMetrics called - initialLoad: ${initialLoad}, forceRefresh: ${forceRefresh}`);
    
    // Don't fetch Meta metrics if the block flag is set and it's not an initial load or forced refresh
    if (typeof window !== 'undefined' && 
        window._blockMetaApiCalls && 
        !forceRefresh && 
        !initialLoad && 
        !isRefreshingData) {
      console.log('Blocking Meta metrics fetch - auto fetch disabled or component inactive');
      return null;
    }
    
    if (!selectedBrandId) return;
    
    try {
      // Use date range from picker if available, otherwise use last 30 days
      let startDate, endDate;
      
      if (dateRange?.from && dateRange?.to) {
        startDate = formatDate(dateRange.from);
        endDate = formatDate(dateRange.to);
      } else {
        // Use current date to ensure we always have data
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Format dates properly
        startDate = formatDate(thirtyDaysAgo);
        endDate = formatDate(now);
      }
        
      console.log(`Fetching Meta metrics with date range: ${startDate} to ${endDate}, forceRefresh: ${forceRefresh}`);
      
      // Add a cache-busting parameter to ensure we get fresh data when forcing refresh
      const cacheBuster = forceRefresh ? `&t=${new Date().getTime()}` : '';
      
      const metaResponse = await fetch(
        `/api/metrics/meta?brandId=${selectedBrandId.toString()}&from=${startDate}&to=${endDate}&initial_load=${initialLoad}&force_refresh=${forceRefresh}${cacheBuster}`
      );
      
      if (!metaResponse.ok) {
        throw new Error(`Failed to fetch Meta metrics: ${metaResponse.status}`);
      }
      
      const metaData = await metaResponse.json();
      
      console.log('Received Meta metrics:', {
        adSpend: metaData.adSpend,
        roas: metaData.roas,
        impressions: metaData.impressions,
        clicks: metaData.clicks
      });
      
      // Only update state if we received valid data
      if (metaData && (metaData.adSpend > 0 || metaData.impressions > 0 || metaData.clicks > 0)) {
        // Instead of setting state here, set it in a safer way
        setMetrics(prev => ({
          ...prev,
          adSpend: metaData.adSpend ?? prev.adSpend ?? 0,
          adSpendGrowth: metaData.adSpendGrowth ?? prev.adSpendGrowth ?? 0,
          roas: metaData.roas ?? prev.roas ?? 0,
          roasGrowth: metaData.roasGrowth ?? prev.roasGrowth ?? 0,
          impressions: metaData.impressions ?? prev.impressions ?? 0,
          impressionGrowth: metaData.impressionGrowth ?? prev.impressionGrowth ?? 0,
          ctr: metaData.ctr ?? prev.ctr ?? 0,
          ctrGrowth: metaData.ctrGrowth ?? prev.ctrGrowth ?? 0,
          clicks: metaData.clicks ?? prev.clicks ?? 0,
          clickGrowth: metaData.clickGrowth ?? prev.clickGrowth ?? 0,
          conversions: metaData.conversions ?? prev.conversions ?? 0,
          conversionGrowth: metaData.conversionGrowth ?? prev.conversionGrowth ?? 0,
          costPerResult: metaData.costPerResult ?? prev.costPerResult ?? 0,
          cprGrowth: metaData.cprGrowth ?? prev.cprGrowth ?? 0,
          dailyData: metaData.dailyData ?? prev.dailyData ?? []
        }));
      }
      
      // Dispatch a custom event to notify MetaTab components about the refresh
      // This will be handled by the MetaTab to run refreshAllMetricsDirectly()
      window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
        detail: { brandId: selectedBrandId, timestamp: new Date().getTime(), forceRefresh }
      }));
      
      return metaData;
    } catch (error) {
      console.error('Error fetching Meta metrics:', error);
      return null;
    }
  }

  // Modify the fetchAllData function to use isRefreshingData instead of isLoading
  const fetchAllData = async (forceFullMetaResync = false) => {
    if (!selectedBrandId) return
    
    // Use isRefreshingData for refreshes, but set isLoading for initial load
    if (initialDataLoad) {
      setIsLoading(true);
      // Make sure we're not also setting isRefreshingData
      setIsRefreshingData(false);
    } else {
      setIsRefreshingData(true);
      // Make sure we're not also setting isLoading
      setIsLoading(false);
    }

    try {
      // Fetch Shopify data
      if (activePlatforms.shopify && shopifyConnection) {
        // First, sync Shopify orders to ensure we have the latest data
        try {
          // Show toast only if not in initial data load
          if (!initialDataLoad) {
            toast({
              title: "Syncing Shopify Data",
              description: "Pulling fresh order data from Shopify...",
              variant: "default"
            });
          }
          
          const syncOrdersResponse = await fetch('/api/shopify/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ connectionId: shopifyConnection.id })
          })
          
          if (!syncOrdersResponse.ok) {
            console.error('Failed to sync orders data:', await syncOrdersResponse.text())
          } else {
            // Wait for the sync to complete
            await new Promise(resolve => setTimeout(resolve, 5000))
          }
        } catch (error) {
          console.error('Error syncing orders data:', error)
        }
        
        // Now fetch the metrics with the updated data
        // Add a cache-busting parameter to ensure we get fresh data
        const cacheBuster = `&t=${new Date().getTime()}`
        const response = await fetch(`/api/metrics?brandId=${selectedBrandId.toString()}&from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}${cacheBuster}`)
        
        if (!response.ok) throw new Error('Failed to fetch Shopify metrics')
        const data = await response.json()
        setMetrics(prevMetrics => ({
          ...prevMetrics,
          totalSales: data.totalSales ?? prevMetrics.totalSales,
          salesGrowth: data.salesGrowth ?? prevMetrics.salesGrowth,
          ordersPlaced: data.ordersPlaced ?? prevMetrics.ordersPlaced,
          ordersGrowth: data.ordersGrowth ?? prevMetrics.ordersGrowth,
          unitsSold: data.unitsSold ?? prevMetrics.unitsSold,
          unitsGrowth: data.unitsGrowth ?? prevMetrics.unitsGrowth,
          averageOrderValue: data.averageOrderValue ?? prevMetrics.averageOrderValue,
          aovGrowth: data.aovGrowth ?? prevMetrics.aovGrowth,
          customerRetentionRate: data.customerRetentionRate ?? prevMetrics.customerRetentionRate,
          retentionGrowth: data.retentionGrowth ?? prevMetrics.retentionGrowth,
          conversionRate: data.conversionRate ?? prevMetrics.conversionRate,
          conversionGrowth: data.conversionGrowth ?? prevMetrics.conversionGrowth,
          returnRate: data.returnRate ?? prevMetrics.returnRate,
          returnGrowth: data.returnGrowth ?? prevMetrics.returnGrowth,
          conversionRateGrowth: data.conversionRateGrowth ?? prevMetrics.conversionRateGrowth,
          ctr: data.ctr ?? prevMetrics.ctr,
          ctrGrowth: data.ctrGrowth ?? prevMetrics.ctrGrowth,
          clicks: data.clicks ?? prevMetrics.clicks,
          clickGrowth: data.clickGrowth ?? prevMetrics.clickGrowth,
          impressions: data.impressions ?? prevMetrics.impressions,
          impressionGrowth: data.impressionGrowth ?? prevMetrics.impressionGrowth,
          adSpend: data.adSpend ?? prevMetrics.adSpend,
          adSpendGrowth: data.adSpendGrowth ?? prevMetrics.adSpendGrowth,
          roas: data.roas ?? prevMetrics.roas,
          roasGrowth: data.roasGrowth ?? prevMetrics.roasGrowth,
          conversions: data.conversions ?? prevMetrics.conversions,
          costPerResult: data.costPerResult ?? prevMetrics.costPerResult,
          cprGrowth: data.cprGrowth ?? prevMetrics.cprGrowth,
          topProducts: data.topProducts ?? prevMetrics.topProducts,
          revenueByDay: data.revenueByDay ?? prevMetrics.revenueByDay,
          dailyData: data.dailyData ?? prevMetrics.dailyData,
          customerSegments: data.customerSegments ?? prevMetrics.customerSegments,
          salesData: data.salesData ?? prevMetrics.salesData,
          ordersData: data.ordersData ?? prevMetrics.ordersData,
          aovData: data.aovData ?? prevMetrics.aovData,
          unitsSoldData: data.unitsSoldData ?? prevMetrics.unitsSoldData
        }))
        
        // Sync inventory data from Shopify
        try {
          const syncResponse = await fetch('/api/shopify/inventory/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ connectionId: shopifyConnection.id })
          })
          
          if (!syncResponse.ok) {
            console.error('Failed to sync inventory data:', await syncResponse.text())
          } else {
            // Wait a moment for the sync to complete
            await new Promise(resolve => setTimeout(resolve, 3000))
            
            // Force a refresh of the inventory data by dispatching a custom event
            window.dispatchEvent(new CustomEvent('refreshInventory', { 
              detail: { brandId: selectedBrandId }
            }))
          }
        } catch (error) {
          console.error('Error syncing inventory data:', error)
        }
      }
      
      // Fetch Meta data - Use the fetchMetaMetrics function we defined
      if (activePlatforms.meta) {
        try {
          // If forceFullMetaResync is true or it's a manual refresh (from refresh button),
          // perform a full Meta resync first
          if (forceFullMetaResync) {
            console.log('Performing full Meta data resync before refresh');
            
            // Show toast to inform user that a full resync is happening
            if (!initialDataLoad) {
              const toastId = toast({
                title: "Syncing Meta Data",
                description: "Performing a full resync from Meta Ads API...",
                variant: "default"
              });
            }
            
            // Default to 30 days of data
            const days = 30;
            
            try {
              const resyncResponse = await fetch('/api/meta/resync', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                  brandId: selectedBrandId, 
                  days,
                  refresh_cache: true,
                  force_refresh: true
                })
              });
              
              if (!resyncResponse.ok) {
                const errorData = await resyncResponse.json();
                console.error('Failed to perform full Meta resync:', errorData);
                
                if (!initialDataLoad) {
                  toast({
                    title: "Meta Sync Issue",
                    description: "There was a problem refreshing Meta data. Trying standard refresh...",
                    variant: "destructive"
                  });
                }
              } else {
                const resyncData = await resyncResponse.json();
                console.log(`Meta resync completed successfully. Found ${resyncData.count || 0} records.`);
                
                if (!initialDataLoad && resyncData.count > 0) {
                  toast({
                    title: "Meta Data Refreshed",
                    description: `Successfully pulled ${resyncData.count} records from Meta Ads API.`,
                    variant: "default"
                  });
                }
                
                // Also fetch the campaigns directly to ensure we have the latest data
                try {
                  const campaignsResponse = await fetch(`/api/meta/campaigns?brandId=${selectedBrandId}&refresh=true&t=${Date.now()}`);
                  if (campaignsResponse.ok) {
                    console.log("Campaigns refreshed successfully");
                  }
                } catch (campaignError) {
                  console.error("Error refreshing campaigns:", campaignError);
                }
                
                // Dispatch a custom event to notify Meta components about the resync
                window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
                  detail: { brandId: selectedBrandId, timestamp: Date.now(), forceRefresh: true }
                }));
              }
            } catch (resyncError) {
              console.error('Error during Meta resync:', resyncError);
            }
            
            // Wait a moment for the resync to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          // Now call the normal fetchMetaMetrics function with force refresh
          await fetchMetaMetrics(false, true);
        } catch (error) {
          console.error('Error fetching Meta metrics during refresh:', error);
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      // Always set initialDataLoad to false after the first load completes, regardless of success or failure
      if (initialDataLoad) {
        setInitialDataLoad(false);
        setIsLoading(false);
      } else {
        setIsRefreshingData(false);
      }
      
      // Set the last refreshed timestamp
      setLastRefreshed(new Date());
    }
  }

  // Modify the refresh function to use isRefreshingData and add cooldown
  const refresh = async () => {
    if (isRefreshing) return
    
    // Check if we're in cooldown period
    if (refreshCooldown) {
      toast({
        title: "Refresh cooldown active",
        description: cooldownMessage,
        variant: "destructive"
      })
      return
    }
    
    setIsRefreshing(true)
    
    // For manual refreshes, we don't want to show the full-screen loader
    setInitialDataLoad(false)
    
    // Show toast to inform user that refresh is happening with more detailed info
    toast({
      title: "Complete Data Refresh",
      description: "Performing a full data sync from all connected platforms including a complete Meta Ads resync. This may take up to 30 seconds...",
      variant: "default"
    })
    
    try {
      // Explicitly trigger a Meta data refresh by dispatching the event first
      if (activePlatforms.meta) {
        console.log(`[Dashboard] Dispatching page-refresh event for brand: ${selectedBrandId}`);
        // Dispatch a global refresh event that our components are listening for
        window.dispatchEvent(new CustomEvent('page-refresh', { 
          detail: { brandId: selectedBrandId, timestamp: Date.now(), forceRefresh: true }
        }));
        
        // Add a new more explicit force-refresh-campaign-status event
        window.dispatchEvent(new CustomEvent('force-refresh-campaign-status', { 
          detail: { 
            brandId: selectedBrandId, 
            timestamp: Date.now(),
            source: 'refresh-button',
            priority: 'high' 
          }
        }));
        
        // Also dispatch on document for cross-iframe compatibility
        document.dispatchEvent(new CustomEvent('force-refresh-campaign-status', { 
          detail: { 
            brandId: selectedBrandId, 
            timestamp: Date.now(),
            source: 'refresh-button',
            priority: 'high' 
          }
        }));
        
        // Give the event a moment to be processed - our new handler is more efficient
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`[Dashboard] Finished waiting after dispatching events`);
      }
      
      // For manual refresh (clicking the button), always do a full Meta resync
      await fetchAllData(true)
      setLastRefreshed(new Date())
      
      // Add a notification about the refresh
      addNotification({
        title: "Dashboard Refreshed",
        message: "Your dashboard data has been updated with the latest metrics from all platforms",
        type: "system"
      })
      
      // Show success toast
      toast({
        title: "Data refresh complete",
        description: "Your dashboard has been updated with fresh data directly from all connected platforms.",
        variant: "default"
      })
    } catch (error) {
      console.error("Error during refresh:", error);
      
      // Show error toast
      toast({
        title: "Refresh failed",
        description: "There was an error refreshing your data. Please try again later.",
        variant: "destructive"
      })
    } finally {
      setIsRefreshing(false)
      
      // Set cooldown
      setRefreshCooldown(true)
      const remainingSeconds = COOLDOWN_SECONDS
      setCooldownMessage(`Please wait ${remainingSeconds} seconds before refreshing again.`)
      
      // Start countdown
      const countdownInterval = setInterval(() => {
        const secondsLeft = Math.max(0, remainingSeconds - Math.floor((Date.now() - (lastRefreshed?.getTime() || Date.now())) / 1000))
        setCooldownMessage(`Please wait ${secondsLeft} seconds before refreshing again.`)
        
        if (secondsLeft <= 0) {
          clearInterval(countdownInterval)
          setRefreshCooldown(false)
        }
      }, 1000)
      
      // Clear cooldown after the specified time
      setTimeout(() => {
        clearInterval(countdownInterval)
        setRefreshCooldown(false)
      }, COOLDOWN_SECONDS * 1000)
    }
  }

  // Set up periodic data refresh
  useEffect(() => {
    // Don't do initial fetch here - we'll do it in the selectedBrandId effect
    
    // Set up interval for periodic refresh
    const interval = setInterval(() => {
      if (selectedBrandId) {
        console.log('Running 5-minute automatic refresh for all data...');
        // For periodic refreshes, we don't want to show the full-screen loader
        setInitialDataLoad(false);
        
        // Increment the auto refresh counter
        autoRefreshCountRef.current += 1;
        
        // Every 2nd cycle (every 10 minutes), do a full Meta resync to ensure data is fresh
        const shouldDoFullResync = autoRefreshCountRef.current % 2 === 0;
        
        if (shouldDoFullResync) {
          console.log('Performing full Meta resync on 10-minute cycle');
        }
        
        // Call fetchAllData with appropriate resync flag
        fetchAllData(shouldDoFullResync);
        
        // Update the last refreshed timestamp
        setLastRefreshed(new Date());
      }
    }, 300000); // 300000 ms = 5 minutes
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [selectedBrandId]);

  // Instead, add explicit call to fetchAllData when brand is selected
  useEffect(() => {
    if (selectedBrandId && !initialDataLoad) {
      // Only do this when there's an actual change (not on initial render)
      // For initial brand load, do a full resync to ensure data is fresh
      fetchAllData(true);
    }
  }, [selectedBrandId]);

  // After removing useEffect for Meta metrics, add back the platform connection references
  const platforms = {
    shopify: connectionStoreConnections.some((c: PlatformConnection) => c.platform_type === 'shopify'),
    meta: connectionStoreConnections.some((c: PlatformConnection) => c.platform_type === 'meta')
  }

  const shopifyConnection = connections.find(c => 
    c.platform_type === 'shopify' && c.status === 'active' && c.brand_id === selectedBrandId
  )

  // If auth is loaded and user is not signed in, show sign-in overlay
  if (isLoaded && !userId) {
    return (
      <div className="relative w-full h-screen bg-[#0A0A0A]">
        {/* Semi-transparent dashboard background */}
        <div className="absolute inset-0 filter blur-sm opacity-20">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
            {/* Placeholder content to show blurred in background */}
            <div className="grid gap-4 grid-cols-4 mb-6">
              <div className="bg-[#1A1A1A] h-32 rounded-lg"></div>
              <div className="bg-[#1A1A1A] h-32 rounded-lg"></div>
              <div className="bg-[#1A1A1A] h-32 rounded-lg"></div>
              <div className="bg-[#1A1A1A] h-32 rounded-lg"></div>
            </div>
            <div className="bg-[#1A1A1A] h-64 rounded-lg mb-6"></div>
            <div className="bg-[#1A1A1A] h-64 rounded-lg"></div>
          </div>
        </div>
        
        {/* Sign-in overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-full max-w-md px-8 py-10 rounded-xl shadow-2xl bg-gradient-to-b from-[#1A1A1A] to-[#222] border border-[#333]">
            <div className="mb-8 text-center">
              <img 
                src="https://i.imgur.com/PZCtbwG.png" 
                alt="Brez Logo" 
                className="h-20 w-auto object-contain mx-auto mb-6" 
              />
              <p className="text-gray-400">Sign in to access your dashboard</p>
            </div>
            <SignIn 
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "bg-transparent shadow-none border-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "bg-[#333] border-[#444] text-white hover:bg-[#444] transition-colors",
                  formButtonPrimary: "bg-blue-600 hover:bg-blue-700 transition-colors",
                  footerActionLink: "text-blue-400 hover:text-blue-300 transition-colors",
                  formFieldLabel: "text-gray-300",
                  formFieldInput: "bg-[#333] border-[#444] text-white focus:border-blue-500 transition-colors",
                  dividerLine: "bg-[#444]",
                  dividerText: "text-gray-400",
                  identityPreviewText: "text-gray-300",
                  identityPreviewEditButton: "text-blue-400 hover:text-blue-300 transition-colors",
                  formFieldAction: "text-blue-400 hover:text-blue-300 transition-colors",
                  alert: "bg-[#333] border-[#444] text-white",
                  logoBox: "hidden",
                  footer: "opacity-30 hover:opacity-100 transition-opacity",
                  footerAction: "opacity-30 hover:opacity-100 transition-opacity",
                  footerActionText: "text-white font-medium",
                  otpCodeFieldInput: "bg-[#333] border-[#444] text-white",
                  formHeaderTitle: "text-white text-xl",
                  formHeaderSubtitle: "text-gray-300",
                  phoneNumberInput: "bg-[#333] border-[#444] text-white",
                  alternativeMethodsBlockButton: "text-blue-400 hover:text-blue-300"
                }
              }}
              routing="hash"
              redirectUrl="/dashboard"
            />
          </div>
        </div>
      </div>
    )
  }

  // Add a listener for the force-shopify-refresh event
  useEffect(() => {
    const handleShopifyRefresh = (event: any) => {
      console.log('[Dashboard] Received force-shopify-refresh event, refreshing Shopify data');
      
      // Only proceed if we have a selected brand
      if (!selectedBrandId) return;
      
      // Set loading state just for Shopify data
      setIsRefreshingData(true);
      
      // Call the API directly to refresh Shopify metrics
      const fetchShopifyMetrics = async () => {
        try {
          const params = new URLSearchParams({
            brandId: selectedBrandId,
            platform: 'shopify' // Explicitly specify Shopify platform
          });
          
          if (event.detail?.dateRange?.from) {
            params.append('from', event.detail.dateRange.from.toISOString());
          } else if (dateRange?.from) {
            params.append('from', dateRange.from.toISOString());
          }
          
          if (event.detail?.dateRange?.to) {
            params.append('to', event.detail.dateRange.to.toISOString());
          } else if (dateRange?.to) {
            params.append('to', dateRange.to.toISOString());
          }
          
          console.log('[Dashboard] Explicitly refreshing Shopify metrics with params:', Object.fromEntries(params));
          
          const response = await fetch(`/api/metrics?${params.toString()}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch Shopify metrics: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('[Dashboard] Refreshed Shopify metrics:', data);
          
          // Update metrics state to show the refreshed data
          setMetrics(prevMetrics => ({
            ...prevMetrics,
            ...data
          }));
          
          // Update last refreshed timestamp
          setLastRefreshed(new Date());
        } catch (error) {
          console.error('[Dashboard] Error refreshing Shopify metrics:', error);
        } finally {
          setIsRefreshingData(false);
        }
      };
      
      fetchShopifyMetrics();
    };
    
    window.addEventListener('force-shopify-refresh', handleShopifyRefresh);
    
    return () => {
      window.removeEventListener('force-shopify-refresh', handleShopifyRefresh);
    };
  }, [selectedBrandId, dateRange, setMetrics, setLastRefreshed]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <BrandSelector 
            onSelect={(brandId) => setSelectedBrandId(brandId || null)}
            selectedBrandId={selectedBrandId}
            className="w-48"
          />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={refresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2A2A2A] hover:bg-[#333] border border-[#444] text-sm text-gray-300 hover:text-white transition-colors ml-2"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-[#222] border border-[#444] text-white text-xs">
                <p>Manually refresh dashboard data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-gray-500 hover:text-gray-300 transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-[#222] border border-[#444] text-white text-xs max-w-[220px]">
                <p>Dashboard data refreshes automatically every 5 minutes. You can also refresh manually. A {COOLDOWN_SECONDS}-second cooldown applies between manual refreshes to prevent excessive API calls.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <span className="text-xs text-gray-500">
            Last updated: {lastRefreshed?.toLocaleTimeString()}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell className="mr-1" />
          <DateRangePicker 
            dateRange={dateRange}
            setDateRange={setDateRange}
          />
        </div>
      </div>

      {selectedBrandId && initialDataLoad ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400 text-lg">Loading dashboard data...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
        </div>
      ) : selectedBrandId ? (
        <>
          <WidgetManager 
            dateRange={dateRange} 
            brandId={selectedBrandId}
            metrics={metrics}
            isLoading={isLoading}
            isRefreshingData={isRefreshingData}
            initialDataLoad={initialDataLoad}
            platformStatus={activePlatforms}
            existingConnections={connections}
            brands={brands}
          >
            <div className="space-y-6 mt-6">
              {/* Removed widgets will be managed by the HomeTab component */}
            </div>
          </WidgetManager>
        </>
      ) : (
        <div className="text-center text-gray-400 py-12">
          Select a brand to view metrics
        </div>
      )}
    </div>
  )
}
