"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlatformTabs } from "@/components/dashboard/platforms/PlatformTabs"
import { DateRange } from "react-day-picker"
import { ShopifyContent } from "@/components/dashboard/platforms/ShopifyContent"
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

interface WidgetData {
  shopify?: any;
  meta?: any;
}

export default function DashboardPage() {
  const { userId } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const { selectedBrandId, setSelectedBrandId, brands } = useBrandContext()
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null)
  const [metrics, setMetrics] = useState<Metrics>(defaultMetrics)
  const [platforms, setPlatforms] = useState({ shopify: false, meta: false })
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("shopify")
  const [isLoading, setIsLoading] = useState(false)

  // Load initial connections when component mounts with selectedBrandId
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
        if (data && data.length > 0) {
          setConnections(data)
          setPlatforms({
            shopify: data.some(c => c.platform_type === 'shopify' && c.status === 'active'),
            meta: data.some(c => c.platform_type === 'meta' && c.status === 'active')
          })
        }
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
      platforms
    })
  }, [selectedBrandId, connections, platforms])

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

      setPlatforms({
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

  useEffect(() => {
    if (!selectedBrandId) {
      setMetrics(defaultMetrics)
      return
    }

    async function fetchData() {
      setIsLoading(true)
      try {
        const [shopifyResponse, metaResponse] = await Promise.all([
          fetch(`/api/shopify/sales?brandId=${selectedBrandId}`),
          fetch(`/api/meta/analytics?brandId=${selectedBrandId}`)
        ])

        const shopifyData = await shopifyResponse.json()
        const metaData = await metaResponse.json()

        const calculatedMetrics = calculateMetrics(
          shopifyData.orders || [],
          shopifyData.products || [],
          shopifyData.refunds || [],
          dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined,
          metaData // Pass Meta data to metrics calculation
        )

        setMetrics(calculatedMetrics)
      } catch (error) {
        console.error('Error:', error)
        setMetrics(defaultMetrics)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedBrandId, dateRange])

  const hasShopify = connections.some(c => c.platform_type === 'shopify')
  const hasMeta = connections.some(c => c.platform_type === 'meta')

  // Before mapping over data, ensure it's safe
  const safeMetrics = metrics || {
    totalSales: 0,
    salesGrowth: 0,
    // ... all default values
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-[#111111]">
        <Select
          value={selectedBrandId || ""}
          onValueChange={(value) => setSelectedBrandId(value)}
        >
          <SelectTrigger className="w-[200px] bg-[#222222] border-[#333333]">
            <SelectValue placeholder="Select a brand" />
          </SelectTrigger>
          <SelectContent className="bg-[#222222] border-[#333333]">
            {brands.map((brand) => (
              <SelectItem 
                key={brand.id} 
                value={brand.id}
                className="text-white hover:bg-[#333333]"
              >
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker 
          date={dateRange}
          onDateChange={setDateRange}
        />
      </div>

      {!selectedBrandId ? (
        <div className="flex items-center justify-center h-[500px] text-gray-500">
          Please select a brand to view metrics
        </div>
      ) : (
        <div className="p-4">
          <Tabs defaultValue="shopify" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#111111] border-[#222222]">
              <TabsTrigger 
                value="shopify" 
                className="flex items-center gap-2 text-white data-[state=active]:bg-[#222222]"
              >
                <img 
                  src="/shopify-icon.png" 
                  alt="Shopify" 
                  className="h-4 w-4" 
                />
                Shopify
              </TabsTrigger>
              <TabsTrigger 
                value="meta" 
                className="flex items-center gap-2 text-white data-[state=active]:bg-[#222222]"
              >
                <img 
                  src="/meta-icon.png" 
                  alt="Meta" 
                  className="h-4 w-4" 
                />
                Meta Ads
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shopify" className="mt-6">
              <div className="grid gap-4">
                <ShopifyTab 
                  metrics={metrics}
                  dateRange={dateRange}
                  isLoading={isLoading}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="meta" className="mt-6">
              <div className="grid gap-4">
                <MetaTab 
                  metrics={transformToMetaMetrics(metrics)}
                  dateRange={dateRange}
                  isLoading={isLoading}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="p-8">
            <MetricCard
              title="Total Sales"
              value={safeMetrics.totalSales}
              change={safeMetrics.salesGrowth}
              data={Array.isArray(safeMetrics.salesData) ? safeMetrics.salesData : []}
              valueFormat="currency"
            />
          </div>
        </div>
      )}
    </div>
  )
}
