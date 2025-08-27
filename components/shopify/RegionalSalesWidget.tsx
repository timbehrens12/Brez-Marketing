"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, MapPin, BarChart3, TrendingUp } from 'lucide-react'

interface RegionalSalesWidgetProps {
  brandId: string
  dateRange?: { from: Date; to: Date }
  isLoading?: boolean
  isRefreshingData?: boolean
}

interface RegionalData {
  overview: {
    totalRevenue: number
    totalOrders: number
    averageOrderValue: number
    uniqueCountries: number
    uniqueProvinces: number
    uniqueCities: number
  }
  byCountry: Array<{
    country: string
    revenue: number
    orders: number
    avgOrderValue: number
    provinceCount: number
  }>
  byProvince: Array<{
    province: string
    country: string
    revenue: number
    orders: number
    avgOrderValue: number
    cityCount: number
  }>
  byCity: Array<{
    city: string
    province: string
    country: string
    revenue: number
    orders: number
    avgOrderValue: number
  }>
}

export function RegionalSalesWidget({ 
  brandId, 
  dateRange,
  isLoading = false, 
  isRefreshingData = false 
}: RegionalSalesWidgetProps) {
  const [data, setData] = useState<RegionalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewLevel, setViewLevel] = useState<'country' | 'province' | 'city'>('country')

  useEffect(() => {
    if (!brandId) return

    const fetchRegionalData = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({ brandId })
        
        if (dateRange?.from) {
          params.append('from', dateRange.from.toISOString().split('T')[0])
        }
        if (dateRange?.to) {
          params.append('to', dateRange.to.toISOString().split('T')[0])
        }

        const response = await fetch(`/api/shopify/analytics/regional-sales?${params}`)
        const result = await response.json()

        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        // Error fetching regional sales
      } finally {
        setLoading(false)
      }
    }

    fetchRegionalData()
  }, [brandId, dateRange])

  const isDataLoading = loading || isLoading || isRefreshingData

  if (isDataLoading) {
    return (
      <Card className="bg-[#1A1A1A] border-[#333]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Globe className="h-5 w-5 text-blue-400" />
            Regional Sales Performance
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

  if (!data || data.overview.totalOrders === 0) {
    return (
      <Card className="bg-[#1A1A1A] border-[#333]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Globe className="h-5 w-5 text-blue-400" />
            Regional Sales Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No regional sales data available</p>
            <p className="text-sm mt-2">Data will appear once orders are placed from different locations</p>
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

  const getCurrentData = () => {
    switch (viewLevel) {
      case 'country': return data.byCountry
      case 'province': return data.byProvince
      case 'city': return data.byCity
      default: return data.byCountry
    }
  }

  const currentData = getCurrentData()

  return (
    <Card className="bg-[#1A1A1A] border-[#333]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Globe className="h-5 w-5 text-blue-400" />
          Regional Sales Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-400">Total Revenue</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(data.overview.totalRevenue)}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">Total Orders</span>
            </div>
            <div className="text-xl font-bold text-white">
              {data.overview.totalOrders.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-gray-400">Countries</span>
            </div>
            <div className="text-xl font-bold text-white">
              {data.overview.uniqueCountries}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-gray-400">Avg Order Value</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(data.overview.averageOrderValue)}
            </div>
          </div>
        </div>

        {/* View Level Selector */}
        <div className="flex gap-2">
          {(['country', 'province', 'city'] as const).map(level => (
            <button
              key={level}
              onClick={() => setViewLevel(level)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                viewLevel === level
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : 'bg-[#222] border-[#333] text-gray-400 hover:text-white hover:border-[#444]'
              }`}
            >
              By {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>

        {/* Regional Breakdown */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Top Performing {viewLevel.charAt(0).toUpperCase() + viewLevel.slice(1)}s
          </h3>
          <div className="space-y-3">
            {currentData.slice(0, 6).map((item: any, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#222] rounded-lg border border-[#333]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-400">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {viewLevel === 'country' && item.country}
                      {viewLevel === 'province' && `${item.province}, ${item.country}`}
                      {viewLevel === 'city' && `${item.city}, ${item.province}, ${item.country}`}
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.orders} orders
                      {viewLevel === 'country' && item.provinceCount && ` • ${item.provinceCount} provinces`}
                      {viewLevel === 'province' && item.cityCount && ` • ${item.cityCount} cities`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">
                    {formatCurrency(item.revenue)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatCurrency(item.avgOrderValue)} AOV
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
