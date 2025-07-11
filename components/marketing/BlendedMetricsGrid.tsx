"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Eye, MousePointer, Target, BarChart3, Users, Zap, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlendedMetrics } from '@/app/api/marketing/blended-metrics/route'

interface BlendedMetricsGridProps {
  brandId: string
  className?: string
}

export function BlendedMetricsGrid({ brandId, className }: BlendedMetricsGridProps) {
  const [metrics, setMetrics] = useState<BlendedMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/marketing/blended-metrics?brandId=${brandId}&preset=last30days`)
        if (!response.ok) {
          throw new Error('Failed to fetch blended metrics')
        }
        const data = await response.json()
        setMetrics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (brandId) {
      fetchMetrics()
    }
  }, [brandId])

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(2)}`
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toLocaleString()
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const formatGrowth = (value: number) => {
    const prefix = value > 0 ? '+' : ''
    return `${prefix}${value.toFixed(1)}%`
  }

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-green-400'
    if (value < 0) return 'text-red-400'
    return 'text-gray-400'
  }

  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-4", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="bg-[#111] border-[#333] animate-pulse">
            <CardHeader className="p-4 pb-2">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="h-6 bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className={cn("bg-[#111] border border-[#333] rounded-lg p-8 text-center", className)}>
        <p className="text-red-400">Failed to load blended metrics</p>
        <p className="text-gray-500 text-sm mt-2">{error}</p>
      </div>
    )
  }

  const widgets = [
    {
      title: 'Total Spend',
      value: formatCurrency(metrics.totalSpend),
      growth: metrics.totalSpendGrowth,
      icon: DollarSign,
      color: 'text-blue-400'
    },
    {
      title: 'ROAS',
      value: `${metrics.blendedRoas.toFixed(2)}x`,
      growth: metrics.blendedRoasGrowth,
      icon: TrendingUp,
      color: 'text-green-400'
    },
    {
      title: 'Impressions',
      value: formatNumber(metrics.totalImpressions),
      growth: metrics.totalImpressionsGrowth,
      icon: Eye,
      color: 'text-purple-400'
    },
    {
      title: 'Clicks',
      value: formatNumber(metrics.totalClicks),
      growth: metrics.totalClicksGrowth,
      icon: MousePointer,
      color: 'text-orange-400'
    },
    {
      title: 'Conversions',
      value: formatNumber(metrics.totalConversions),
      growth: metrics.totalConversionsGrowth,
      icon: Target,
      color: 'text-emerald-400'
    },
    {
      title: 'CTR',
      value: formatPercentage(metrics.blendedCtr),
      growth: metrics.blendedCtrGrowth,
      icon: BarChart3,
      color: 'text-cyan-400'
    },
    {
      title: 'CPC',
      value: formatCurrency(metrics.blendedCpc),
      growth: metrics.blendedCpcGrowth,
      icon: Zap,
      color: 'text-yellow-400'
    },
    {
      title: 'CPR',
      value: formatCurrency(metrics.blendedCostPerResult),
      growth: metrics.blendedCostPerResultGrowth,
      icon: Users,
      color: 'text-pink-400'
    }
  ]

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-4", className)}>
      {widgets.map((widget, index) => {
        const Icon = widget.icon
        const growthColor = getGrowthColor(widget.growth)
        const GrowthIcon = widget.growth > 0 ? TrendingUp : widget.growth < 0 ? TrendingDown : Layers
        
        return (
          <Card 
            key={index} 
            className="bg-[#111] border-[#333] hover:border-[#444] transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-medium text-gray-300 flex items-center gap-2">
                <Icon className={cn("h-3.5 w-3.5", widget.color)} />
                {widget.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-1">
                <div className="text-lg font-bold text-white">
                  {widget.value}
                </div>
                <div className={cn("flex items-center gap-1 text-xs", growthColor)}>
                  <GrowthIcon className="h-3 w-3" />
                  <span>{formatGrowth(widget.growth)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
} 