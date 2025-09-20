"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, DollarSign, MapPin, RefreshCcw, Package } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"

interface AbandonedCartData {
  overview: {
    totalAbandoned: number
    totalRecovered: number
    recoveryRate: number
    totalValue: number
    recoveredValue: number
    lostValue: number
    averageValue: number
    conversionOpportunity: number
  }
  byLocation: Array<{
    country: string
    province: string
    city: string
    count: number
    totalValue: number
    averageValue: number
  }>
  byProduct: Array<{
    product_id: string
    title: string
    abandonment_count: number
    total_quantity: number
    total_value: number
    average_price: number
  }>
  byCustomerSegment: Array<{
    segment: string
    count: number
    totalValue: number
    averageValue: number
  }>
  recentAbandoned: Array<{
    id: number
    email: string
    customer_name: string
    total_price: string
    currency: string
    items_count: number
    created_at: string
    recovered: boolean
    abandoned_checkout_url: string
    customer_segment: string
    customer_total_spent: number
    customer_orders_count: number
  }>
}

interface AbandonedCartWidgetProps {
  brandId: string
  dateRange?: { from: Date; to: Date }
  isLoading?: boolean
  isRefreshingData?: boolean
}

export function AbandonedCartWidget({ 
  brandId, 
  dateRange,
  isLoading = false, 
  isRefreshingData = false 
}: AbandonedCartWidgetProps) {
  const [data, setData] = useState<AbandonedCartData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWidgetLoading, setIsWidgetLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!brandId) return
    
    try {
      setError(null)
      setIsWidgetLoading(true)
      
      // Build URL with date range if provided
      let url = `/api/shopify/analytics/abandoned-carts?brandId=${brandId}`
      if (dateRange?.from && dateRange?.to) {
        const fromDate = format(dateRange.from, 'yyyy-MM-dd')
        const toDate = format(dateRange.to, 'yyyy-MM-dd')
        url += `&from=${fromDate}&to=${toDate}`
      }
      
      // Add cache busting to ensure fresh data
      url += `&t=${Date.now()}&cache_bust=${Math.random()}`
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch abandoned cart data')
      }
      
      if (result.success && result.data) {
        setData(result.data)
        console.log(`[AbandonedCart] Loaded data: ${result.data?.totalCarts || 0} carts, $${result.data?.totalValue || 0} value`)
      } else {
        console.warn('[AbandonedCart] No data available')
        setError('No abandoned cart data available')
      }
    } catch (err) {
      console.error('[AbandonedCart] Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsWidgetLoading(false)
    }
  }, [brandId, dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = (event?: any) => {
      console.log('[AbandonedCart] Refresh event received:', event?.detail?.source || 'unknown')
      
      // Show loading immediately when refresh is triggered
      setIsWidgetLoading(true)
      
      // Force refresh regardless of cache state
      fetchData()
    }

    window.addEventListener('refresh-all-widgets', handleRefresh)
    window.addEventListener('force-shopify-refresh', handleRefresh)
    window.addEventListener('shopifyDataRefreshed', handleRefresh)
    window.addEventListener('global-refresh-all', handleRefresh)
    window.addEventListener('shopify-sync-completed', handleRefresh)
    window.addEventListener('force-widget-refresh', handleRefresh)

    return () => {
      window.removeEventListener('refresh-all-widgets', handleRefresh)
      window.removeEventListener('force-shopify-refresh', handleRefresh)
      window.removeEventListener('shopifyDataRefreshed', handleRefresh)
      window.removeEventListener('global-refresh-all', handleRefresh)
      window.removeEventListener('shopify-sync-completed', handleRefresh)
      window.removeEventListener('force-widget-refresh', handleRefresh)
    }
  }, [fetchData])

  const showLoading = isLoading || isWidgetLoading || isRefreshingData

  if (showLoading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-white">
            Abandoned Cart Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-[#2A2A2A] rounded"></div>
              ))}
            </div>
            <div className="h-32 bg-[#2A2A2A] rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-white">
            Abandoned Cart Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{error}</p>
            <p className="text-sm mt-2">Please try refreshing the data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-white">
            Abandoned Cart Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No abandoned cart data available</p>
            <p className="text-sm mt-2">Data will appear when customers abandon checkouts</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
      <CardHeader>
        <CardTitle className="text-white">
          Abandoned Cart Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-gray-400">Total Carts</span>
            </div>
            <div className="text-xl font-bold text-white">
              {data.overview?.totalAbandoned || 0}
            </div>
          </div>
          
          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-400">Total Value</span>
            </div>
            <div className="text-xl font-bold text-white">
              ${(data.overview?.totalValue || 0).toLocaleString()}
            </div>
          </div>
          
          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCcw className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">Recovery Rate</span>
            </div>
            <div className="text-xl font-bold text-white">
              {(data.overview?.recoveryRate || 0).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Top Products Abandoned */}
        {data.byProduct && data.byProduct.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 text-gray-300 flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-400" />
              Most Abandoned Products
            </h4>
            <div className="space-y-3">
              {data.byProduct.slice(0, 3).map((product, index) => (
                <div key={index} className="bg-[#222] rounded-lg p-3 border border-[#333]">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {product.title || 'Unknown Product'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {product.abandonment_count} abandonments • {product.total_quantity} items
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-bold text-white">
                        ${(product.total_value || 0).toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Abandoned Checkouts */}
        {data.recentAbandoned && data.recentAbandoned.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 text-gray-300">Recent Abandonments</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.recentAbandoned.slice(0, 4).map((checkout) => (
                <div key={checkout.id} className="bg-[#222] rounded-lg p-3 border border-[#333]">
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {checkout.customer_name || checkout.email || 'Guest'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {checkout.items_count} items • {new Date(checkout.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-bold text-white">
                        ${parseFloat(checkout.total_price || '0').toFixed(2)}
                      </p>
                      {checkout.recovered && (
                        <p className="text-xs text-green-400">Recovered</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
