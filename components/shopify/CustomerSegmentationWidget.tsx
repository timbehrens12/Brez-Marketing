"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Users, TrendingUp, Globe } from 'lucide-react'

interface CustomerSegmentationWidgetProps {
  brandId: string
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
  isLoading = false, 
  isRefreshingData = false 
}: CustomerSegmentationWidgetProps) {
  const [data, setData] = useState<SegmentData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!brandId) return

    const fetchSegmentData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/shopify/analytics/customer-segments?brandId=${brandId}`)
        const result = await response.json()

        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error('Error fetching customer segmentation:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSegmentData()
  }, [brandId])

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
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">Total Customers</span>
            </div>
            <div className="text-xl font-bold text-white">
              {data.overview.totalCustomers.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-400">Total Revenue</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(data.overview.totalClv)}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-gray-400">Avg CLV</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(data.overview.averageClv)}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-gray-400">Locations</span>
            </div>
            <div className="text-xl font-bold text-white">
              {data.topLocations.length}
            </div>
          </div>
        </div>

        {/* Top Locations */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Top Performing Locations</h3>
          <div className="space-y-3">
            {data.topLocations.slice(0, 6).map((location, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#222] rounded-lg border border-[#333]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-400">#{index + 1}</span>
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
            <h3 className="text-lg font-semibold text-white mb-4">Customer Value Tiers</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.segmentTiers).map(([tier, stats]) => (
                <div key={tier} className="bg-[#222] rounded-lg p-4 border border-[#333]">
                  <div className="text-sm font-medium text-white capitalize mb-2">{tier} Value</div>
                  <div className="text-lg font-bold text-white">{stats.count}</div>
                  <div className="text-xs text-gray-400">{formatCurrency(stats.totalClv)} total</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
