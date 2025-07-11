"use client"

import { useEffect, useState } from "react"
import { BlendedStatCard } from "./BlendedStatCard"
import { 
  DollarSign, 
  TrendingUp, 
  MousePointerClick, 
  Target, 
  ShoppingCart, 
  Eye, 
  Users, 
  Zap,
  BarChart3,
  Percent
} from "lucide-react"

interface BlendedStatsGridProps {
  brandId: string
}

interface BlendedMetrics {
  totalSpend: number
  totalSpendGrowth: number
  roas: number
  roasGrowth: number
  cpc: number
  cpcGrowth: number
  cpl: number
  cplGrowth: number
  conversions: number
  conversionsGrowth: number
  ctr: number
  ctrGrowth: number
  impressions: number
  impressionsGrowth: number
  clicks: number
  clicksGrowth: number
  reach: number
  reachGrowth: number
  frequency: number
  frequencyGrowth: number
}

export function BlendedStatsGrid({ brandId }: BlendedStatsGridProps) {
  const [metrics, setMetrics] = useState<BlendedMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (brandId) {
      fetchBlendedMetrics()
    }
  }, [brandId])

  const fetchBlendedMetrics = async () => {
    setLoading(true)
    try {
      // For now, we'll fetch Meta data and prepare for future platform integration
      const metaResponse = await fetch(`/api/metrics/meta?brandId=${brandId}`)
      const metaData = await metaResponse.json()

      // TODO: Add Google Ads and TikTok data when available
      // const googleResponse = await fetch(`/api/metrics/google?brandId=${brandId}`)
      // const tiktokResponse = await fetch(`/api/metrics/tiktok?brandId=${brandId}`)

      // Blend the metrics from all platforms
      const blendedMetrics: BlendedMetrics = {
        totalSpend: metaData.adSpend || 0,
        totalSpendGrowth: metaData.adSpendGrowth || 0,
        roas: metaData.roas || 0,
        roasGrowth: metaData.roasGrowth || 0,
        cpc: metaData.cpc || 0,
        cpcGrowth: metaData.cpcGrowth || 0,
        cpl: metaData.costPerResult || 0, // Using cost per result as CPL for now
        cplGrowth: metaData.cprGrowth || 0,
        conversions: metaData.conversions || 0,
        conversionsGrowth: metaData.conversionGrowth || 0,
        ctr: metaData.ctr || 0,
        ctrGrowth: metaData.ctrGrowth || 0,
        impressions: metaData.impressions || 0,
        impressionsGrowth: metaData.impressionGrowth || 0,
        clicks: metaData.clicks || 0,
        clicksGrowth: metaData.clickGrowth || 0,
        reach: metaData.reach || 0,
        reachGrowth: 0, // Meta service doesn't currently provide reach growth
        frequency: metaData.frequency || 0,
        frequencyGrowth: 0, // Meta service doesn't currently provide frequency growth
      }

      setMetrics(blendedMetrics)
    } catch (error) {
      console.error('Error fetching blended metrics:', error)
      // Set default values on error
      setMetrics({
        totalSpend: 0,
        totalSpendGrowth: 0,
        roas: 0,
        roasGrowth: 0,
        cpc: 0,
        cpcGrowth: 0,
        cpl: 0,
        cplGrowth: 0,
        conversions: 0,
        conversionsGrowth: 0,
        ctr: 0,
        ctrGrowth: 0,
        impressions: 0,
        impressionsGrowth: 0,
        clicks: 0,
        clicksGrowth: 0,
        reach: 0,
        reachGrowth: 0,
        frequency: 0,
        frequencyGrowth: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Total Spend",
      value: metrics?.totalSpend || 0,
      change: metrics?.totalSpendGrowth || 0,
      icon: DollarSign,
      format: "currency" as const,
      description: "Combined ad spend across all platforms"
    },
    {
      title: "ROAS",
      value: metrics?.roas || 0,
      change: metrics?.roasGrowth || 0,
      icon: TrendingUp,
      format: "number" as const,
      decimals: 2,
      suffix: "x",
      description: "Return on ad spend across all platforms"
    },
    {
      title: "CPC",
      value: metrics?.cpc || 0,
      change: metrics?.cpcGrowth || 0,
      icon: MousePointerClick,
      format: "currency" as const,
      description: "Average cost per click"
    },
    {
      title: "CPL",
      value: metrics?.cpl || 0,
      change: metrics?.cplGrowth || 0,
      icon: Target,
      format: "currency" as const,
      description: "Cost per lead/conversion"
    },
    {
      title: "Conversions",
      value: metrics?.conversions || 0,
      change: metrics?.conversionsGrowth || 0,
      icon: ShoppingCart,
      format: "number" as const,
      description: "Total conversions across all platforms"
    },
    {
      title: "CTR",
      value: metrics?.ctr || 0,
      change: metrics?.ctrGrowth || 0,
      icon: Percent,
      format: "percentage" as const,
      decimals: 2,
      description: "Click-through rate"
    },
    {
      title: "Impressions",
      value: metrics?.impressions || 0,
      change: metrics?.impressionsGrowth || 0,
      icon: Eye,
      format: "number" as const,
      description: "Total impressions across all platforms"
    },
    {
      title: "Clicks",
      value: metrics?.clicks || 0,
      change: metrics?.clicksGrowth || 0,
      icon: MousePointerClick,
      format: "number" as const,
      description: "Total clicks across all platforms"
    },
    {
      title: "Reach",
      value: metrics?.reach || 0,
      change: metrics?.reachGrowth || 0,
      icon: Users,
      format: "number" as const,
      description: "Unique users reached"
    },
    {
      title: "Frequency",
      value: metrics?.frequency || 0,
      change: metrics?.frequencyGrowth || 0,
      icon: BarChart3,
      format: "number" as const,
      decimals: 2,
      description: "Average times users saw your ads"
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Blended Performance Metrics</h2>
          <p className="text-gray-400 text-sm mt-1">
            Unified metrics from Meta Ads {/* • Google Ads • TikTok Ads - Coming Soon */}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>Meta Ads</span>
          <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
          <span>Google Ads (Coming Soon)</span>
          <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
          <span>TikTok Ads (Coming Soon)</span>
        </div>
      </div>

      {/* Grid of stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <BlendedStatCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            format={stat.format}
            decimals={stat.decimals}
            suffix={stat.suffix}
            description={stat.description}
            loading={loading}
          />
        ))}
      </div>
    </div>
  )
} 