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

import { useState, useEffect } from "react"
import { useAuth, SignIn } from "@clerk/nextjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlatformTabs } from "@/components/dashboard/platforms/PlatformTabs"
import { DateRange } from "react-day-picker"
import { MetaContent } from "@/components/dashboard/platforms/MetaContent"
import { supabase } from "@/lib/supabase"
import BrandSelector from "@/components/BrandSelector"
import { useBrandContext } from '@/lib/context/BrandContext'
import { defaultMetrics, type Metrics, type CustomerSegments } from '@/types/metrics'
import type { MetaMetrics } from '@/types/metrics'
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
import { addDays, startOfDay, endOfDay } from "date-fns"
import { useBrandStore } from "@/stores/brandStore"
import { useConnectionStore } from "@/stores/connectionStore"
import { useSupabase } from '@/lib/hooks/useSupabase'
import MetaAdPerformance from '@/app/analytics/components/meta-ad-performance'
import MetaSpendTrends from '@/app/analytics/components/meta-spend-trends'
import MetaCampaignsTable from '@/app/analytics/components/meta-campaigns-table'
import { useDataRefresh } from '@/lib/hooks/useDataRefresh'
import { RefreshCw, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { GreetingWidget } from "@/components/dashboard/GreetingWidget"
import { AINotification } from "@/components/dashboard/AINotification"
import { NotificationBell } from "@/components/NotificationBell"
import { useNotifications } from "@/contexts/NotificationContext"

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

// Add this function at the top of your file, outside the component
function formatDate(date: Date | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

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

  // Debug logging
  useEffect(() => {
    console.log('Current state:', {
      selectedBrandId,
      connections,
      activePlatforms
    })
  }, [selectedBrandId, connections, activePlatforms])

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

  // Add this effect to handle metrics loading
  useEffect(() => {
    if (!selectedBrandId || !dateRange) {
      setMetrics(defaultMetrics)
      return
    }

    const loadMetrics = async () => {
      if (!selectedBrandId) return;
      
      setIsLoading(true);
      
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
        
        setMetrics(safeMetrics);
        
        // After fetching metrics, fetch our platform specific data
        await fetchMetaMetrics();
        
      } catch (error) {
        console.error('Error loading metrics:', error);
        // Initialize with empty metrics to prevent undefined errors
        setMetrics({
          totalSales: 0,
          salesGrowth: 0,
          averageOrderValue: 0,
          aovGrowth: 0,
          ordersPlaced: 0,
          ordersGrowth: 0,
          unitsSold: 0,
          unitsGrowth: 0,
          conversionRate: 0,
          conversionGrowth: 0,
          customerRetentionRate: 0,
          retentionGrowth: 0,
          adSpend: 0,
          adSpendGrowth: 0,
          roas: 0,
          roasGrowth: 0,
          impressions: 0,
          impressionGrowth: 0,
          clicks: 0,
          clickGrowth: 0,
          topProducts: [],
          dailyData: [],
          salesData: [],
          revenueByDay: [],
          customerSegments: {}
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics()
  }, [selectedBrandId, dateRange])

  // Update your Meta metrics fetch useEffect
  useEffect(() => {
    async function fetchMetaMetrics() {
      if (!selectedBrandId) return;
      
      try {
        // Fetch Meta specific metrics
        const response = await fetch(`/api/metrics/meta?brandId=${selectedBrandId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch Meta metrics');
        }
        
        const data = await response.json();
        
        // Create a safe copy of the current metrics state
        const currentMetrics = { ...metrics };
        
        // Update metrics with Meta-specific data, with careful type checking
        setMetrics({
          ...currentMetrics,
          // Meta metrics
          adSpend: typeof data.adSpend === 'number' && !isNaN(data.adSpend) ? data.adSpend : 0,
          adSpendGrowth: typeof data.adSpendGrowth === 'number' && !isNaN(data.adSpendGrowth) ? data.adSpendGrowth : 0,
          impressions: typeof data.impressions === 'number' && !isNaN(data.impressions) ? data.impressions : 0,
          impressionGrowth: typeof data.impressionGrowth === 'number' && !isNaN(data.impressionGrowth) ? data.impressionGrowth : 0,
          clicks: typeof data.clicks === 'number' && !isNaN(data.clicks) ? data.clicks : 0,
          clickGrowth: typeof data.clickGrowth === 'number' && !isNaN(data.clickGrowth) ? data.clickGrowth : 0,
          conversions: typeof data.conversions === 'number' && !isNaN(data.conversions) ? data.conversions : 0,
          conversionGrowth: typeof data.conversionGrowth === 'number' && !isNaN(data.conversionGrowth) ? data.conversionGrowth : 0,
          ctr: typeof data.ctr === 'number' && !isNaN(data.ctr) ? data.ctr : 0,
          ctrGrowth: typeof data.ctrGrowth === 'number' && !isNaN(data.ctrGrowth) ? data.ctrGrowth : 0,
          cpc: typeof data.cpc === 'number' && !isNaN(data.cpc) ? data.cpc : 0,
          cpcLink: typeof data.cpcLink === 'number' && !isNaN(data.cpcLink) ? data.cpcLink : 0,
          costPerResult: typeof data.costPerResult === 'number' && !isNaN(data.costPerResult) ? data.costPerResult : 0,
          cprGrowth: typeof data.cprGrowth === 'number' && !isNaN(data.cprGrowth) ? data.cprGrowth : 0,
          roas: typeof data.roas === 'number' && !isNaN(data.roas) ? data.roas : 0,
          roasGrowth: typeof data.roasGrowth === 'number' && !isNaN(data.roasGrowth) ? data.roasGrowth : 0,
          frequency: typeof data.frequency === 'number' && !isNaN(data.frequency) ? data.frequency : 0,
          reach: typeof data.reach === 'number' && !isNaN(data.reach) ? data.reach : 0,
          dailyData: Array.isArray(data.dailyData) ? data.dailyData : []
        });
      } catch (error) {
        console.error('Error fetching Meta metrics:', error);
        // Don't reset all metrics here - just ensure Meta ones have defaults
        const currentMetrics = { ...metrics };
        setMetrics({
          ...currentMetrics,
          adSpend: 0,
          adSpendGrowth: 0,
          impressions: 0,
          impressionGrowth: 0,
          clicks: 0,
          clickGrowth: 0,
          conversions: 0,
          conversionGrowth: 0,
          ctr: 0,
          ctrGrowth: 0,
          cpc: 0,
          cpcLink: 0,
          costPerResult: 0,
          cprGrowth: 0,
          roas: 0,
          roasGrowth: 0,
          frequency: 0,
          reach: 0,
          dailyData: []
        });
      }
    }
    
    fetchMetaMetrics();
  }, [selectedBrandId, dateRange, activePlatforms.meta]);

  const platforms = {
    shopify: connectionStoreConnections.some((c: PlatformConnection) => c.platform_type === 'shopify'),
    meta: connectionStoreConnections.some((c: PlatformConnection) => c.platform_type === 'meta')
  }

  const shopifyConnection = connections.find(c => 
    c.platform_type === 'shopify' && c.status === 'active' && c.brand_id === selectedBrandId
  )

  // Modify the fetchAllData function to use isRefreshingData instead of isLoading
  const fetchAllData = async () => {
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
          console.log('Syncing Shopify orders data')
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
            console.log('Orders sync initiated successfully')
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
          ...data
        }))
        
        // Sync inventory data from Shopify
        try {
          console.log('Syncing inventory data from Shopify')
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
            console.log('Inventory sync initiated successfully')
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
      
      // Fetch Meta data
      if (activePlatforms.meta) {
        const startDate = formatDate(dateRange.from);
        const endDate = formatDate(dateRange.to);
        
        const metaResponse = await fetch(
          `/api/metrics/meta?brandId=${selectedBrandId.toString()}&startDate=${startDate}&endDate=${endDate}`
        );
        
        if (!metaResponse.ok) {
          throw new Error(`Failed to fetch Meta metrics: ${metaResponse.status}`);
        }
        
        const metaData = await metaResponse.json();
        
        setMetrics(prev => ({
          ...prev,
          adSpend: metaData.metrics.adSpend || 0,
          adSpendGrowth: metaData.metrics.adSpendGrowth || 0,
          roas: metaData.metrics.roas || 0,
          roasGrowth: metaData.metrics.roasGrowth || 0,
          impressions: metaData.metrics.impressions || 0,
          impressionGrowth: metaData.metrics.impressionGrowth || 0,
          ctr: metaData.metrics.ctr || 0,
          ctrGrowth: metaData.metrics.ctrGrowth || 0,
          clicks: metaData.metrics.clicks || 0,
          clickGrowth: metaData.metrics.clickGrowth || 0,
          conversions: metaData.metrics.conversions || 0,
          conversionGrowth: metaData.metrics.conversionGrowth || 0,
          costPerResult: metaData.metrics.costPerResult || 0,
          cprGrowth: metaData.metrics.cprGrowth || 0,
          dailyData: metaData.dailyData || []
        }));
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
    
    // Show toast to inform user that refresh is happening
    toast({
      title: "Refreshing data",
      description: "Syncing latest data from Shopify. This may take a few moments...",
      variant: "default"
    })
    
    await fetchAllData()
    setLastRefreshed(new Date())
    
    // Add a notification about the refresh
    addNotification({
      title: "Dashboard Refreshed",
      message: "Your dashboard data has been updated with the latest metrics",
      type: "system"
    })
    
    // Show success toast
    toast({
      title: "Data refreshed",
      description: "Your dashboard has been updated with the latest data.",
      variant: "default"
    })
    
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

  // Set up periodic data refresh
  useEffect(() => {
    // Don't do initial fetch here - we'll do it in the selectedBrandId effect
    
    // Set up interval for periodic refresh
    const interval = setInterval(() => {
      if (selectedBrandId) {
        console.log('Periodic dashboard data refresh triggered')
        // For periodic refreshes, we don't want to show the full-screen loader
        setInitialDataLoad(false);
        fetchAllData();
        setLastRefreshed(new Date());
      }
    }, 300000); // Refresh every 5 minutes
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [selectedBrandId, dateRange, activePlatforms]);

  // Add a new effect to trigger data load when brand is selected
  useEffect(() => {
    if (selectedBrandId) {
      // Always set initialDataLoad to true when a brand is first selected or changed
      setInitialDataLoad(true);
      
      // Then trigger data load
      console.log('Brand selected, triggering data load')
      fetchAllData();
    }
  }, [selectedBrandId]);

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetaSpendTrends brandId={selectedBrandId} />
                <MetaAdPerformance brandId={selectedBrandId} />
              </div>
              
              <MetaCampaignsTable brandId={selectedBrandId} />
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
