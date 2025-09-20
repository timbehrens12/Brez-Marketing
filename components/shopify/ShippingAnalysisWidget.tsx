"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Package, MapPin, TrendingDown } from 'lucide-react'

interface ShippingAnalysisWidgetProps {
  brandId: string
  dateRange?: { from: Date; to: Date }
  isLoading?: boolean
  isRefreshingData?: boolean
}

interface ShippingData {
  overview: {
    totalOrders: number
    totalShippingCost: number
    averageShippingCost: number
    shippingCostPercentage: number
  }
  byZone: Array<{
    zone: string
    orders: number
    shippingCost: number
    avgShippingCost: number
    shippingPercentage: number
  }>
  byLocation: Array<{
    location: string
    orders: number
    shippingCost: number
    avgDeliveryTime: number
    onTimeRate: number
  }>
}

export function ShippingAnalysisWidget({ 
  brandId, 
  dateRange,
  isLoading = false, 
  isRefreshingData = false 
}: ShippingAnalysisWidgetProps) {
  const [data, setData] = useState<ShippingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!brandId) return

    const fetchShippingData = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({ brandId })
        
        if (dateRange?.from) {
          params.append('from', dateRange.from.toISOString().split('T')[0])
        }
        if (dateRange?.to) {
          params.append('to', dateRange.to.toISOString().split('T')[0])
        }

        const response = await fetch(`/api/shopify/analytics/shipping-analysis?${params}`)
        const result = await response.json()

        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        // Error fetching shipping analysis
      } finally {
        setLoading(false)
      }
    }

    fetchShippingData()
  }, [brandId, dateRange])

  const isDataLoading = loading || isLoading || isRefreshingData

  if (isDataLoading) {
    return (
      <Card className="bg-[#1A1A1A] border-[#333]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Truck className="h-5 w-5 text-orange-400" />
            Shipping Cost Analysis
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

  if (!data || data.overview.totalOrders === 0) {
    return (
      <Card className="bg-[#1A1A1A] border-[#333]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Truck className="h-5 w-5 text-orange-400" />
            Shipping Cost Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No shipping data available</p>
            <p className="text-sm mt-2">Data will appear once orders are fulfilled</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <Card className="bg-[#1A1A1A] border-[#333]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Truck className="h-5 w-5 text-orange-400" />
          Shipping Cost Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-gray-400">Total Orders</span>
            </div>
            <div className="text-xl font-bold text-white">
              {data.overview.totalOrders.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-sm text-gray-400">Total Shipping</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(data.overview.totalShippingCost)}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">Avg per Order</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(data.overview.averageShippingCost)}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-gray-400">% of Revenue</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatPercentage(data.overview.shippingCostPercentage)}
            </div>
          </div>
        </div>

        {/* Shipping by Zone */}
        {data.byZone.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Shipping Cost by Zone</h3>
            <div className="space-y-3">
              {data.byZone.slice(0, 5).map((zone, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#222] rounded-lg border border-[#333]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/30 border border-orange-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-orange-400">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{zone.zone}</div>
                      <div className="text-xs text-gray-400">{zone.orders} orders</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">
                      {formatCurrency(zone.shippingCost)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatCurrency(zone.avgShippingCost)} avg • {formatPercentage(zone.shippingPercentage)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance by Location */}
        {data.byLocation.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Delivery Performance by Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.byLocation.slice(0, 6).map((location, index) => (
                <div key={index} className="p-3 bg-[#222] rounded-lg border border-[#333]">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-blue-400" />
                    <div className="text-sm font-medium text-white">{location.location}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Orders:</span>
                      <span className="text-white ml-1">{location.orders}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Avg Delivery:</span>
                      <span className="text-white ml-1">{location.avgDeliveryTime ? location.avgDeliveryTime.toFixed(1) : 'N/A'} days</span>
                    </div>
                  </div>
                  {location.onTimeRate > 0 && (
                    <div className="mt-2 text-xs">
                      <span className="text-gray-400">On-time rate:</span>
                      <span className="text-green-400 ml-1">{formatPercentage(location.onTimeRate)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
