"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DateRange } from "react-day-picker"
import { ShopifyTab } from "./tabs/ShopifyTab"
import { MetaTab } from "./tabs/MetaTab"
import type { Metrics } from "@/types/metrics"
import { transformToMetaMetrics } from "@/lib/transforms"
import { PlatformConnection } from "@/types/platformConnection"
import { useEffect, useState } from "react"
import { useSupabase } from '@/lib/hooks/useSupabase'

interface PlatformTabsProps {
  platforms: {
    shopify: boolean
    meta: boolean
  }
  dateRange: DateRange | undefined
  metrics: Metrics
  isLoading: boolean
  brandId: string
  connections: PlatformConnection[]
}

// Add type for Supabase order
interface ShopifyOrder {
  id: string;
  created_at: string;
  total_price: string;
  customer_id: string;
  line_items: Array<{
    quantity: number;
  }>;
}

export function PlatformTabs({ platforms, dateRange, metrics: initialMetrics, isLoading, brandId, connections }: PlatformTabsProps) {
  const supabase = useSupabase()
  const [selectedConnection, setSelectedConnection] = useState<PlatformConnection | undefined>(
    connections.find(c => c.platform_type === 'shopify')
  )
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics)

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedConnection || selectedConnection.platform_type !== 'shopify' || !dateRange?.from || !dateRange?.to || !brandId) {
        console.log('Missing required data:', { connection: selectedConnection, dateRange, brandId })
        return
      }

      try {
        console.log('Fetching Shopify data with:', {
          shop: selectedConnection.shop,
          from: dateRange.from,
          to: dateRange.to,
          brandId
        })

        const { data: orders, error } = await supabase
          .from('shopify_orders')
          .select('*')
          .eq('connection_id', selectedConnection.id)
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())

        if (error) {
          throw new Error(`Supabase error: ${error.message}`)
        }

        if (!orders || orders.length === 0) {
          console.log('No orders found for the given date range')
          setMetrics(initialMetrics)
          return
        }

        // Safe type assertion with runtime check
        const typedOrders = (orders || []).map(order => {
          if (!order.id || !order.created_at || !order.total_price || !order.customer_id || !Array.isArray(order.line_items)) {
            throw new Error('Invalid order data structure')
          }
          return order as ShopifyOrder
        })

        // Transform orders into metrics format
        const totalSales = typedOrders.reduce((sum, order) => sum + parseFloat(order.total_price), 0)
        const uniqueCustomers = new Set(typedOrders.map(order => order.customer_id)).size

        const transformedMetrics: Metrics = {
          totalSales,
          ordersPlaced: typedOrders.length,
          averageOrderValue: typedOrders.length > 0 ? totalSales / typedOrders.length : 0,
          unitsSold: typedOrders.reduce((sum, order) => 
            sum + order.line_items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
          ),
          revenueByDay: Object.entries(typedOrders.reduce((acc: Record<string, number>, order) => {
            const date = new Date(order.created_at).toISOString().split('T')[0]
            acc[date] = (acc[date] || 0) + parseFloat(order.total_price)
            return acc
          }, {})).map(([date, revenue]) => ({
            date,
            revenue: revenue as number
          })).sort((a, b) => a.date.localeCompare(b.date)),
          salesGrowth: 0, // TODO: Calculate growth rates
          ordersGrowth: 0,
          unitsGrowth: 0,
          aovGrowth: 0,
          customerSegments: [
            { name: 'new', value: uniqueCustomers },
            { name: 'returning', value: typedOrders.length - uniqueCustomers }
          ],
          customerRetentionRate: 0,
          retentionGrowth: 0,
          returnRate: 0,
          returnGrowth: 0,
          conversionRate: 0,
          conversionRateGrowth: 0,
          dailyData: []
        }

        console.log('Transformed metrics:', transformedMetrics)
        setMetrics(transformedMetrics)
      } catch (err) {
        console.error('Fetch error:', err)
      }
    }

    fetchData()
  }, [selectedConnection, dateRange, brandId, initialMetrics])

  return (
    <Tabs defaultValue="shopify" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#111111] border-[#222222]">
        {platforms.shopify && (
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
        )}
        {platforms.meta && (
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
        )}
      </TabsList>

      <div className="mt-6">
        {platforms.shopify && (
          <TabsContent value="shopify">
            <ShopifyTab 
              metrics={metrics} 
              dateRange={dateRange}
              isLoading={isLoading}
              brandId={brandId}
              connection={selectedConnection}
            />
          </TabsContent>
        )}
        {platforms.meta && (
          <TabsContent value="meta">
            <MetaTab 
              metrics={transformToMetaMetrics(metrics)}
              dateRange={dateRange}
              isLoading={isLoading}
            />
          </TabsContent>
        )}
      </div>
    </Tabs>
  )
}