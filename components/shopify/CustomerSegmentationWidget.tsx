"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Users, TrendingUp, Globe, Info } from 'lucide-react'
import { format } from 'date-fns'
import { createDebouncedRefresh } from '@/lib/utils/debounce'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CustomerSegmentationWidgetProps {
  brandId: string
  dateRange?: { from: Date; to: Date }
  isLoading?: boolean
  isRefreshingData?: boolean
}

interface LocationData {
  country: string
  province: string
  city: string
  customerCount: number
  totalRevenue: number
  averageOrderValue: number
  totalOrders: number
}

interface SegmentData {
  overview: {
    totalCustomers: number
    totalClv: number
    averageClv: number
    totalPredictedClv: number
    growthPotential: number
  }
  topLocations: LocationData[]
  segmentTiers: Record<string, { count: number; totalClv: number }>
}

export function CustomerSegmentationWidget({ 
  brandId, 
  dateRange,
  isLoading = false, 
  isRefreshingData = false 
}: CustomerSegmentationWidgetProps) {
  const [data, setData] = useState<SegmentData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSegmentData = useCallback(async () => {
    if (!brandId) return

    try {
      setLoading(true)
      const startTime = Date.now()
      
      // Build URL with date range if provided
      let url = `/api/shopify/analytics/customer-segments?brandId=${brandId}`
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
        const fromStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 'all-time'
        const toStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 'all-time'
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

  // Create debounced refresh handler
  const debouncedRefresh = useMemo(
    () => createDebouncedRefresh(fetchSegmentData, 300),
    [fetchSegmentData]
  )

  useEffect(() => {
    fetchSegmentData()
  }, [fetchSegmentData])

  // Listen for refresh events with debouncing
  useEffect(() => {
    const handleRefresh = (event?: any) => {
      const eventSource = event?.detail?.source || event?.type || 'unknown'
      
      // Show loading immediately when refresh is triggered
      setLoading(true)
      
      // Use debounced refresh to prevent spam
      debouncedRefresh(eventSource)
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
  }, [debouncedRefresh])

  const isDataLoading = loading || isLoading || isRefreshingData

  if (isDataLoading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-white">
            Customer Segmentation by Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-gray-800 rounded"></div>
              ))}
            </div>
            <div className="h-48 bg-gray-800 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.topLocations.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-white">
            Customer Segmentation by Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No customer segmentation data available</p>
            <p className="text-sm mt-2">Data will appear once customers make purchases</p>
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

  return (
    <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200">
      <CardHeader>
        <CardTitle className="text-white">
          Customer Segmentation by Location
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
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Total Revenue</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total revenue from all orders in the selected date range</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(data.overview.totalRevenue)}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Avg CLV</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Customer Lifetime Value - Average total spending per customer across all time</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(data.overview.averageClv)}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Locations</span>
            </div>
            <div className="text-xl font-bold text-white">
              {data.topLocations.length}
            </div>
          </div>
        </div>

        {/* Top Locations */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-white">Top Performing Locations</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <p>Only shows orders with shipping addresses.</p>
                    <p>Location revenue may be less than total revenue if some orders lack address data.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="space-y-3">
            {data.topLocations.slice(0, 6).map((location, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#222] rounded-lg border border-[#333]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500/20 to-gray-600/30 border border-gray-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {location.city !== 'Unknown' ? `${location.city}, ` : ''}
                      {location.province !== 'Unknown' ? `${location.province}, ` : ''}
                      {location.country}
                    </div>
                    <div className="text-xs text-gray-400">
                      {location.customerCount} customers • {location.totalOrders} orders
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">
                    {formatCurrency(location.totalRevenue)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatCurrency(location.averageOrderValue)} AOV
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Segment Tiers */}
        {Object.keys(data.segmentTiers).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-white">Customer Value Tiers</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p><strong>High Value:</strong> CLV ≥ $1,000</p>
                      <p><strong>Medium Value:</strong> CLV $300-$999</p>
                      <p><strong>Low Value:</strong> CLV &lt; $300</p>
                      <p className="mt-2 text-xs text-gray-300">CLV = Customer Lifetime Value (total spent across all time)</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.segmentTiers).map(([tier, stats]) => (
                <div key={tier} className="bg-[#222] rounded-lg p-4 border border-[#333]">
                  <div className="text-sm font-medium text-white capitalize mb-2">{tier} Value</div>
                  <div className="text-lg font-bold text-white">{stats.count}</div>
                  <div className="text-xs text-gray-400">{formatCurrency(stats.revenue)} total</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
