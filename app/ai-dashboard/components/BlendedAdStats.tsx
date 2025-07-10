"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, MousePointer, Target, ShoppingBag, Eye, Users, Zap } from "lucide-react"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatters"

interface BlendedStats {
  totalSpend: number
  roas: number
  cpc: number
  cpl: number
  purchases: number
  impressions: number
  clicks: number
  reach: number
}

interface BlendedAdStatsProps {
  stats: BlendedStats
}

export function BlendedAdStats({ stats }: BlendedAdStatsProps) {
  const metrics = [
    {
      title: "Total Ad Spend",
      value: formatCurrency(stats.totalSpend),
      icon: DollarSign,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      description: "Across all platforms"
    },
    {
      title: "ROAS",
      value: `${stats.roas.toFixed(2)}x`,
      icon: TrendingUp,
      color: stats.roas >= 3 ? "text-green-400" : stats.roas >= 2 ? "text-yellow-400" : "text-red-400",
      bgColor: stats.roas >= 3 ? "bg-green-500/10" : stats.roas >= 2 ? "bg-yellow-500/10" : "bg-red-500/10",
      description: "Return on ad spend"
    },
    {
      title: "CPC",
      value: formatCurrency(stats.cpc),
      icon: MousePointer,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      description: "Cost per click"
    },
    {
      title: "CPL",
      value: formatCurrency(stats.cpl),
      icon: Target,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      description: "Cost per lead"
    },
    {
      title: "Purchases",
      value: formatNumber(stats.purchases),
      icon: ShoppingBag,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      description: "Total conversions"
    },
    {
      title: "Impressions",
      value: formatNumber(stats.impressions),
      icon: Eye,
      color: "text-gray-400",
      bgColor: "bg-gray-500/10",
      description: "Total views"
    },
    {
      title: "Clicks",
      value: formatNumber(stats.clicks),
      icon: Users,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      description: "Total clicks"
    },
    {
      title: "Reach",
      value: formatNumber(stats.reach),
      icon: Zap,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      description: "Unique users reached"
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Blended Ad Performance</h2>
          <p className="text-gray-400 text-sm">Key metrics across all advertising platforms</p>
        </div>
        <Badge variant="outline" className="text-gray-400 border-gray-600">
          Meta Ads Active
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.title} className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`w-4 h-4 ${metric.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 truncate">{metric.title}</p>
                    <p className="text-lg font-semibold text-white truncate">{metric.value}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{metric.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {/* CTR and other calculated metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Target className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">CTR</p>
                <p className="text-lg font-semibold text-white">
                  {stats.impressions > 0 ? formatPercentage(stats.clicks / stats.impressions) : '0%'}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Click-through rate</p>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <TrendingUp className="w-4 h-4 text-pink-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">Conversion Rate</p>
                <p className="text-lg font-semibold text-white">
                  {stats.clicks > 0 ? formatPercentage(stats.purchases / stats.clicks) : '0%'}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Purchase conversion</p>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">CPM</p>
                <p className="text-lg font-semibold text-white">
                  {stats.impressions > 0 ? formatCurrency((stats.totalSpend / stats.impressions) * 1000) : '$0.00'}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Cost per 1K impressions</p>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Eye className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">Frequency</p>
                <p className="text-lg font-semibold text-white">
                  {stats.reach > 0 ? (stats.impressions / stats.reach).toFixed(1) : '0.0'}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Avg impressions per user</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 