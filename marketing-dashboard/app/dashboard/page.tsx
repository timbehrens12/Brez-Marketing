"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlatformTabs } from "@/components/dashboard/platforms/PlatformTabs"
import { DateRange } from "react-day-picker"
import { MetaContent } from "@/components/dashboard/platforms/MetaContent"
import { supabase } from "@/lib/supabase"
import BrandSelector from '@/components/BrandSelector'
import { useBrandContext } from '@/lib/context/BrandContext'
import { defaultMetrics, type Metrics } from '@/types/metrics'
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
import { addDays } from "date-fns"
import { useBrandStore } from "@/stores/brandStore"
import { useConnectionStore } from "@/stores/connectionStore"
import { useSupabase } from '@/lib/hooks/useSupabase'
import MetaAdPerformance from '@/app/analytics/components/meta-ad-performance'
import MetaSpendTrends from '@/app/analytics/components/meta-spend-trends'
import MetaCampaignsTable from '@/app/analytics/components/meta-campaigns-table'
import { useDataRefresh } from '@/lib/hooks/useDataRefresh'
import { RefreshCw, Download } from "lucide-react"

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
  customerSegments: [],
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
  const { userId } = useAuth()
  const { brands, selectedBrandId, setSelectedBrandId } = useBrandContext()
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null)
  const [metrics, setMetrics] = useState<Metrics>(defaultMetrics)
  const [isLoading, setIsLoading] = useState(true)
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

        setConnections(connections || [])
        
        // Update active platforms
        setPlatformStatus({
          shopify: connections?.some(c => c.platform_type === 'shopify') || false,
          meta: connections?.some(c => c.platform_type === 'meta') || false
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
      const hasShopify = connections.some((c: PlatformConnection) => 
        c.platform_type === 'shopify' && c.status === 'active'
      )
      const hasMeta = connections.some((c: PlatformConnection) => 
        c.platform_type === 'meta' && c.status === 'active'
      )

      setPlatformStatus({
        shopify: hasShopify,
        meta: hasMeta
      })

      // If Shopify is connected, set the store
      const shopifyConnection = connections.find(c => 
        c.platform_type === 'shopify' && c.status === 'active'
      )
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
            total_price: parseFloat(order.total_price),
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

      const metaConnection = connections.find(c => 
        c.platform_type === 'meta' && c.status === 'active'
      )

      if (metaConnection) {
        try {
          // Load Meta data
          const { data: metaData } = await supabase
            .from('meta_data')
            .select('*')
            .eq('connection_id', metaConnection.id)
            .single()

          // Update widget data
          setWidgetData(current => ({
            ...current,
            meta: metaData
          }))
        } catch (error) {
          console.error('Error loading Meta data:', error)
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
      setIsLoading(true)
      try {
        const response = await fetch(`/api/metrics?brandId=${selectedBrandId}&from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`)
        if (!response.ok) throw new Error('Failed to fetch metrics')
        const data = await response.json()
        setMetrics(data)
      } catch (error) {
        console.error('Error loading metrics:', error)
        setMetrics(defaultMetrics)
      } finally {
        setIsLoading(false)
      }
    }

    loadMetrics()
  }, [selectedBrandId, dateRange])

  // Update your Meta metrics fetch useEffect
  useEffect(() => {
    async function fetchMetaMetrics() {
      if (!selectedBrandId || !dateRange.from || !dateRange.to || !activePlatforms.meta) {
        return;
      }
      
      setIsLoading(true);
      
      try {
        console.log('Fetching Meta metrics...');
        const startDate = formatDate(dateRange.from);
        const endDate = formatDate(dateRange.to);
        
        // Try to get real data (no mock parameter)
        const metaResponse = await fetch(
          `/api/metrics/meta?brandId=${selectedBrandId}&startDate=${startDate}&endDate=${endDate}`
        );
        
        if (!metaResponse.ok) {
          throw new Error(`Failed to fetch Meta metrics: ${metaResponse.status}`);
        }
        
        const metaData = await metaResponse.json();
        console.log('Meta metrics data:', metaData);
        
        // Check if we got mock data
        if (metaData.isMockData) {
          console.warn('Using mock Meta data because no real data is available yet');
        }
        
        // Update metrics with Meta data
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
      } catch (error) {
        console.error('Error fetching Meta metrics:', error);
        
        // Only set mock data if we couldn't get real data
        setMetrics(prev => ({
          ...prev,
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
          cprGrowth: 0,
          dailyData: []
        }));
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMetaMetrics();
  }, [selectedBrandId, dateRange, activePlatforms.meta]);

  const platforms = {
    shopify: connectionStoreConnections.some((c: PlatformConnection) => c.platform_type === 'shopify'),
    meta: connectionStoreConnections.some((c: PlatformConnection) => c.platform_type === 'meta')
  }

  const shopifyConnection = connections.find(c => 
    c.platform_type === 'shopify' && c.status === 'active'
  )

  // Create a function to fetch all data
  const fetchAllData = async () => {
    if (!selectedBrandId) return
    
    setIsLoading(true)
    try {
      // Fetch Shopify data
      if (activePlatforms.shopify) {
        await fetchShopifyData()
      }
      
      // Fetch Meta data
      if (activePlatforms.meta) {
        await fetchMetaMetrics()
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Use the refresh hook - refresh every 5 minutes instead of 2
  const { lastRefreshed, isRefreshing, refresh } = useDataRefresh(
    fetchAllData,
    300, // 5 minutes in seconds (changed from 120)
    [selectedBrandId, dateRange, activePlatforms]
  )

  async function fetchShopifyData() {
    if (!selectedBrandId || !dateRange.from || !dateRange.to) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Fetching Shopify data...');
      const startDate = formatDate(dateRange.from);
      const endDate = formatDate(dateRange.to);
      
      // Add a cache-busting parameter to ensure we get fresh data
      const timestamp = new Date().getTime();
      
      const response = await fetch(
        `/api/metrics/shopify?brandId=${selectedBrandId}&startDate=${startDate}&endDate=${endDate}&_=${timestamp}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Shopify metrics: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Shopify data:', data);
      
      // Update metrics with Shopify data
      setMetrics(prev => ({
        ...prev,
        totalSales: data.totalSales || 0,
        ordersPlaced: data.ordersPlaced || 0,
        averageOrderValue: data.averageOrderValue || 0,
        unitsSold: data.unitsSold || 0,
        revenueByDay: data.revenueByDay || [],
        topProducts: data.topProducts || [],
        salesGrowth: data.salesGrowth || 0,
        ordersGrowth: data.ordersGrowth || 0,
        unitsGrowth: data.unitsGrowth || 0,
        aovGrowth: data.aovGrowth || 0,
        customerSegments: data.customerSegments || [],
        customerRetentionRate: data.customerRetentionRate || 0,
        retentionGrowth: data.retentionGrowth || 0,
        returnRate: data.returnRate || 0,
        returnGrowth: data.returnGrowth || 0,
        conversionRate: data.conversionRate || 0,
        conversionRateGrowth: data.conversionRateGrowth || 0
      }));
    } catch (error) {
      console.error('Error fetching Shopify metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const forceSync = async () => {
    if (!selectedBrandId) return
    
    try {
      setIsLoading(true)
      
      // Force Shopify sync
      if (activePlatforms.shopify) {
        const response = await fetch(`/api/shopify/sync?brandId=${selectedBrandId}`, {
          method: 'POST'
        })
        
        if (!response.ok) {
          throw new Error(`Failed to sync Shopify data: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('Shopify sync result:', result)
      }
      
      // Force Meta sync
      if (activePlatforms.meta) {
        const response = await fetch(`/api/meta/sync?brandId=${selectedBrandId}`, {
          method: 'POST'
        })
        
        if (!response.ok) {
          throw new Error(`Failed to sync Meta data: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('Meta sync result:', result)
      }
      
      // Refresh data after sync
      await fetchAllData()
    } catch (error) {
      console.error('Error forcing sync:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <select
            value={selectedBrandId || ''}
            onChange={(e) => setSelectedBrandId(e.target.value || null)}
            className="bg-[#2A2A2A] border-[#333] text-white rounded-md p-2"
          >
            <option value="">Select a brand</option>
            {brands.map(brand => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={refresh}
            disabled={isRefreshing}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
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
          <button 
            onClick={forceSync}
            disabled={isLoading}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            Force Sync
          </button>
          <span className="text-xs text-gray-500">
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <DateRangePicker 
            dateRange={dateRange}
            setDateRange={setDateRange}
          />
        </div>
      </div>

      {selectedBrandId ? (
        <>
          <WidgetManager 
            dateRange={dateRange} 
            brandId={selectedBrandId}
            metrics={metrics}
            isLoading={isLoading}
            platformStatus={activePlatforms}
            existingConnections={connections}
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
