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
  // Add any other required metrics
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
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics)
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

  // Load initial connections when component mounts
  useEffect(() => {
    async function loadConnections() {
      if (!selectedBrandId) {
        console.log('No brand selected yet')
        return
      }
      
      console.log('Loading connections for brand:', selectedBrandId)
      try {
        const { data, error } = await supabase
          .from('platform_connections')
          .select('*')
          .eq('brand_id', selectedBrandId)

        if (error) throw error

        console.log('Loaded connections:', data)
        if (data) {
          setConnections(data)
          setPlatformStatus({
            shopify: data.some((c: PlatformConnection) => c.platform_type === 'shopify' && c.status === 'active'),
            meta: data.some((c: PlatformConnection) => c.platform_type === 'meta' && c.status === 'active')
          })
        }
      } catch (error) {
        console.error('Error loading connections:', error)
      }
    }

    loadConnections()
  }, [selectedBrandId])

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
          const { data: shopifyData } = await supabase
            .from('shopify_data')
            .select('*')
            .eq('connection_id', shopifyConnection.id)
            .single()

          console.log('Loaded Shopify data:', shopifyData)
          setWidgetData(current => ({
            ...current,
            shopify: shopifyData
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

  // Fetch metrics when date range or brand changes
  useEffect(() => {
    async function fetchMetrics() {
      if (!selectedBrandId || !dateRange.from || !dateRange.to) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/metrics?` + new URLSearchParams({
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
          brandId: selectedBrandId
        }))

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('Fetched metrics:', data)
        setMetrics(data)
      } catch (error) {
        console.error('Error fetching metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [selectedBrandId, dateRange])

  const platforms = {
    shopify: connectionStoreConnections.some((c: PlatformConnection) => c.platform_type === 'shopify'),
    meta: connectionStoreConnections.some((c: PlatformConnection) => c.platform_type === 'meta')
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
        <DateRangePicker 
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
      </div>

      {selectedBrandId ? (
        <WidgetManager 
          dateRange={dateRange} 
          brandId={selectedBrandId}
          metrics={metrics}
          isLoading={isLoading}
          platformStatus={activePlatforms}
          existingConnections={connections}
        />
      ) : (
        <div className="text-center text-gray-400 py-12">
          Select a brand to view metrics
        </div>
      )}
    </div>
  )
}
