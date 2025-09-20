"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Repeat, Users, TrendingUp, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { createDebouncedRefresh } from '@/lib/utils/debounce'

interface RepeatCustomersWidgetProps {
  brandId: string
  dateRange?: { from: Date; to: Date }
  isLoading?: boolean
  isRefreshingData?: boolean
}

interface RepeatCustomerData {
  overview: {
    totalCustomers: number
    repeatCustomers: number
    repeatRate: number
    repeatRevenue: number
    repeatRevenuePercentage: number
    avgDaysBetweenOrders: number
  }
  frequencySegments: {
    frequent: { count: number; revenue: number }
    regular: { count: number; revenue: number }
    occasional: { count: number; revenue: number }
  }
  topRepeaters: Array<{
    id: number
    email: string
    name: string
    totalOrders: number
    repeatOrders: number
    repeatRate: number
    totalSpent: number
    avgOrderValue: number
    avgDaysBetween: number
    location: string
    nextPurchasePrediction: string
  }>
  locationBreakdown: Array<{
    location: string
    totalCustomers: number
    repeatCustomers: number
    repeatRate: number
    avgRepeatOrders: number
  }>
}

export function RepeatCustomersWidget({ 
  brandId, 
  dateRange,
  isLoading = false, 
  isRefreshingData = false 
}: RepeatCustomersWidgetProps) {
  const [data, setData] = useState<RepeatCustomerData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchRepeatData = useCallback(async () => {
    if (!brandId) return

    try {
      setLoading(true)
      const startTime = Date.now()
      
      // Build URL with date range if provided
      let url = `/api/shopify/analytics/repeat-customers?brandId=${brandId}`
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

      if (result.success) {
        setData(result.data)
      } else {
      }

      // Ensure minimum loading duration of 500ms for visual feedback
      const elapsed = Date.now() - startTime
      const minLoadingTime = 500
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed))
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }, [brandId, dateRange])

  useEffect(() => {
    fetchRepeatData()
  }, [fetchRepeatData])

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = (event?: any) => {
      
      // Show loading immediately when refresh is triggered
      setLoading(true)
      
      // Force refresh regardless of cache state
      fetchRepeatData()
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
  }, [fetchRepeatData])

  const isDataLoading = loading || isLoading || isRefreshingData

  if (isDataLoading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-white">
            Repeat Customer Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-[#2A2A2A] rounded"></div>
              ))}
            </div>
            <div className="h-48 bg-[#2A2A2A] rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.overview.totalCustomers === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-white">
            Repeat Customer Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No repeat customer data available</p>
            <p className="text-sm mt-2">Data will appear once customers make multiple purchases</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Repeat className="h-5 w-5 text-gray-400" />
          Repeat Customer Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Total Customers</span>
            </div>
            <div className="text-xl font-bold text-white">
              {data.overview.totalCustomers.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <Repeat className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Repeat Customers</span>
            </div>
            <div className="text-xl font-bold text-white">
              {data.overview.repeatCustomers.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Repeat Rate</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatPercentage(data.overview.repeatRate)}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Avg Days Between</span>
            </div>
            <div className="text-xl font-bold text-white">
              {Math.round(data.overview.avgDaysBetweenOrders)}
            </div>
          </div>
        </div>

        {/* Frequency Segments */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Purchase Frequency Segments</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-sm font-medium text-white">Frequent (≤30 days)</span>
              </div>
              <div className="text-lg font-bold text-white">{data.frequencySegments.frequent.count}</div>
              <div className="text-xs text-gray-400">{formatCurrency(data.frequencySegments.frequent.revenue)} revenue</div>
            </div>

            <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="text-sm font-medium text-white">Regular (31-90 days)</span>
              </div>
              <div className="text-lg font-bold text-white">{data.frequencySegments.regular.count}</div>
              <div className="text-xs text-gray-400">{formatCurrency(data.frequencySegments.regular.revenue)} revenue</div>
            </div>

            <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                <span className="text-sm font-medium text-white">Occasional (&gt;90 days)</span>
              </div>
              <div className="text-lg font-bold text-white">{data.frequencySegments.occasional.count}</div>
              <div className="text-xs text-gray-400">{formatCurrency(data.frequencySegments.occasional.revenue)} revenue</div>
            </div>
          </div>
        </div>

        {/* Top Repeat Customers */}
        {data.topRepeaters.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Top Repeat Customers</h3>
            <div className="space-y-3">
              {data.topRepeaters.slice(0, 5).map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-[#222] rounded-lg border border-[#333]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500/20 to-gray-600/30 border border-gray-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {customer.name || customer.email || 'Unknown Customer'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {customer.repeatOrders} repeat orders • {customer.avgDaysBetween} days avg
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">
                      {formatCurrency(customer.totalSpent)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatPercentage(customer.repeatRate)} repeat rate
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue Impact */}
        <div className="bg-gradient-to-r from-gray-500/10 to-gray-600/10 rounded-lg p-4 border border-gray-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <span className="text-lg font-semibold text-white">Repeat Customer Impact</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-sm text-gray-400">Revenue from Repeat Customers</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(data.overview.repeatRevenue)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">% of Total Revenue</div>
              <div className="text-2xl font-bold text-gray-400">{formatPercentage(data.overview.repeatRevenuePercentage)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
