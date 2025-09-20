"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Users, AlertTriangle } from 'lucide-react'

interface CLVAnalysisWidgetProps {
  brandId: string
  isLoading?: boolean
  isRefreshingData?: boolean
}

interface CLVData {
  overview: {
    totalCustomers: number
    totalClv: number
    averageClv: number
    totalPredictedClv: number
    growthPotential: number
  }
  clvTiers: {
    high: { count: number; totalClv: number }
    medium: { count: number; totalClv: number }
    low: { count: number; totalClv: number }
  }
  engagementLevels: Record<string, { count: number; totalClv: number; avgClv: number }>
  churnRisk: Record<string, { count: number; totalClv: number }>
  topCustomers: Array<{
    id: number
    email: string
    name: string
    clv: number
    predictedClv: number
    totalOrders: number
    totalSpent: number
    churnRisk: number
    location: string
  }>
}

export function CLVAnalysisWidget({ 
  brandId, 
  isLoading = false, 
  isRefreshingData = false 
}: CLVAnalysisWidgetProps) {
  const [data, setData] = useState<CLVData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!brandId) return

    const fetchCLVData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/shopify/analytics/clv-analysis?brandId=${brandId}`)
        const result = await response.json()

        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        // Error fetching CLV analysis
      } finally {
        setLoading(false)
      }
    }

    fetchCLVData()
  }, [brandId])

  const isDataLoading = loading || isLoading || isRefreshingData

  if (isDataLoading) {
    return (
      <Card className="bg-[#1A1A1A] border-[#333]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <DollarSign className="h-5 w-5 text-green-400" />
            Customer Lifetime Value Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
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
      <Card className="bg-[#1A1A1A] border-[#333]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <DollarSign className="h-5 w-5 text-green-400" />
            Customer Lifetime Value Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No customer lifetime value data available</p>
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

  const getChurnRiskColor = (risk: number) => {
    if (risk >= 70) return 'text-red-400'
    if (risk >= 40) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <Card className="bg-[#1A1A1A] border-[#333]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <DollarSign className="h-5 w-5 text-green-400" />
          Customer Lifetime Value Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
              <DollarSign className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-400">Total CLV</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(data.overview.totalClv)}
            </div>
          </div>

          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-gray-400">Avg CLV</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(data.overview.averageClv)}
            </div>
          </div>
        </div>

        {/* CLV Tiers */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Customer Value Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-sm font-medium text-white">High Value ($500+)</span>
              </div>
              <div className="text-lg font-bold text-white">{data.clvTiers.high.count}</div>
              <div className="text-xs text-gray-400">{formatCurrency(data.clvTiers.high.totalClv)} total</div>
            </div>

            <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-sm font-medium text-white">Medium Value ($100-$499)</span>
              </div>
              <div className="text-lg font-bold text-white">{data.clvTiers.medium.count}</div>
              <div className="text-xs text-gray-400">{formatCurrency(data.clvTiers.medium.totalClv)} total</div>
            </div>

            <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <span className="text-sm font-medium text-white">Low Value (&lt;$100)</span>
              </div>
              <div className="text-lg font-bold text-white">{data.clvTiers.low.count}</div>
              <div className="text-xs text-gray-400">{formatCurrency(data.clvTiers.low.totalClv)} total</div>
            </div>
          </div>
        </div>

        {/* Top Customers */}
        {data.topCustomers.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Highest Value Customers</h3>
            <div className="space-y-3">
              {data.topCustomers.slice(0, 5).map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-[#222] rounded-lg border border-[#333]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/30 border border-green-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-green-400">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {customer.name || customer.email || 'Unknown Customer'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {customer.totalOrders} orders • {customer.location}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">
                      {formatCurrency(customer.clv)}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400">Risk:</span>
                      <span className={getChurnRiskColor(customer.churnRisk)}>
                        {(customer.churnRisk || 0).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Churn Risk Summary */}
        {Object.keys(data.churnRisk).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Churn Risk Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.churnRisk).map(([level, stats]) => (
                <div key={level} className="bg-[#222] rounded-lg p-4 border border-[#333]">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      level === 'high' ? 'text-red-400' : 
                      level === 'medium' ? 'text-yellow-400' : 'text-green-400'
                    }`} />
                    <span className="text-sm font-medium text-white capitalize">{level} Risk</span>
                  </div>
                  <div className="text-lg font-bold text-white">{stats.count}</div>
                  <div className="text-xs text-gray-400">{formatCurrency(stats.totalClv)} at risk</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}