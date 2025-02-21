"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PlatformTabs } from "@/components/dashboard/PlatformTabs"
import { DateRangePicker } from "@/components/DateRangePicker"
import { DateRange } from "react-day-picker"
import { ShopifyContent } from "@/components/dashboard/platforms/ShopifyContent"
import { MetaContent } from "@/components/dashboard/platforms/MetaContent"
import { supabase } from "@/lib/supabaseClient"
import BrandSelector from '@/components/BrandSelector'
import { useBrandContext } from '@/lib/context/BrandContext'
import toast from 'react-hot-toast'

interface Metrics {
  [key: string]: any;  // or define more specific platform metric types
}

export default function DashboardPage() {
  const { userId } = useAuth()
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [connections, setConnections] = useState<any[]>([])
  const [error, setError] = useState("")
  const { selectedBrandId: brandContextSelectedBrandId } = useBrandContext()

  useEffect(() => {
    const handleBrandSelected = async (event: CustomEvent) => {
      const { brandId, connections } = event.detail
      setSelectedBrandId(brandId)
      setConnections(connections || [])
      setLoading(true)

      try {
        // First, get cached metrics from database
        const { data: cachedMetrics } = await supabase
          .from('metrics')
          .select('*')
          .eq('brand_id', brandId)
        
        if (cachedMetrics) {
          setMetrics(cachedMetrics)
        }

        // Then trigger background refresh of metrics
        if (connections.some((c: any) => c.platform_type === 'shopify')) {
          fetch(`/api/shopify/refresh-metrics?brandId=${brandId}`)
        }
        if (connections.some((c: any) => c.platform_type === 'meta')) {
          fetch(`/api/meta/refresh-metrics?brandId=${brandId}`)
        }

      } catch (error) {
        console.error('Error loading metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    // Listen for real-time metrics updates
    const metricsSubscription = supabase
      .channel('metrics_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'metrics',
        filter: `brand_id=eq.${selectedBrandId}`
      }, payload => {
        setMetrics((current: Metrics | null) => ({
          ...current,
          [payload.new.platform_type]: payload.new
        }))
      })
      .subscribe()

    window.addEventListener('brandSelected', handleBrandSelected as unknown as EventListener)
    
    return () => {
      window.removeEventListener('brandSelected', handleBrandSelected as unknown as EventListener)
      metricsSubscription.unsubscribe()
    }
  }, [selectedBrandId])

  useEffect(() => {
    async function loadConnections() {
      if (!selectedBrandId) {
        console.log('No brand selected')
        return
      }
      
      console.log('Loading connections for brand:', selectedBrandId)
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', selectedBrandId)

      if (error) {
        console.error('Supabase error:', error)
        return
      }
      
      console.log('Found connections:', data)
      setConnections(data || [])
    }

    loadConnections()
  }, [selectedBrandId])

  // Force re-render when connections change
  useEffect(() => {
    console.log('Connections updated:', connections)
  }, [connections])

  const hasShopify = connections.some(c => c.platform_type === 'shopify')
  const hasMeta = connections.some(c => c.platform_type === 'meta')

  return (
    <main className="flex flex-col w-full">
      <div className="flex items-center justify-between p-4 border-b">
        <BrandSelector onSelect={(brandId) => {
          // This will be called when a brand is selected
          console.log('Brand selected:', brandId)
        }} />
        <button className="px-4 py-2 bg-gray-100 rounded">
          Pick a date range
        </button>
      </div>

      <div className="p-8">
        {connections && connections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map(conn => (
              <div key={conn.id} className="p-6 bg-white rounded-lg shadow">
                <h3 className="text-lg font-semibold capitalize">{conn.platform_type}</h3>
                <p className="text-gray-600">{conn.store_url}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            No platforms connected to this brand. Go to Settings to connect platforms.
          </div>
        )}
      </div>
    </main>
  )
}

const defaultMetrics = {
  totalSales: 0,
  salesGrowth: 0,
  averageOrderValue: 0,
  aovGrowth: 0,
  salesData: [],
  ordersPlaced: 0,
  previousOrdersPlaced: 0,
  unitsSold: 0,
  previousUnitsSold: 0,
  orderCount: 0,
  previousOrderCount: 0,
  topProducts: [],
  customerRetentionRate: 0,
  revenueByDay: [],
  sessionCount: 0,
  sessionGrowth: 0,
  sessionData: [],
  conversionRate: 0,
  conversionRateGrowth: 0,
  conversionData: [],
  retentionRateGrowth: 0,
  retentionData: [],
  currentWeekRevenue: [],
  inventoryLevels: 0,
  returnRate: 0,
  inventoryData: [],
  returnData: [],
  customerLifetimeValue: 0,
  clvData: [],
  averageTimeToFirstPurchase: 0,
  timeToFirstPurchaseData: [],
  categoryPerformance: [],
  categoryData: [],
  shippingZones: [],
  shippingData: [],
  paymentMethods: [],
  paymentData: [],
  discountPerformance: [],
  discountData: [],
  customerSegments: { newCustomers: 0, returningCustomers: 0 },
  firstTimeVsReturning: {
    firstTime: { orders: 0, revenue: 0 },
    returning: { orders: 0, revenue: 0 }
  },
  customerSegmentData: [],
  ordersGrowth: 0,
  unitsGrowth: 0,
  conversionGrowth: 0,
  retentionGrowth: 0,
  returnGrowth: 0,
  inventoryGrowth: 0
}
