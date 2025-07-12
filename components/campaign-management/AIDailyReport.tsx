"use client"

import { useState, useEffect } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Eye,
  DollarSign,
  Target,
  Calendar,
  Brain,
  Zap
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"

interface PlatformStatus {
  platform: string
  logo: string
  status: 'healthy' | 'attention' | 'critical' | 'inactive'
  summary: string
  keyMetrics: {
    spend: number
    performance: number
    issues: number
  }
  recommendations: string[]
  lastUpdated: string
}

interface DailyReport {
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor'
  summary: string
  totalSpend: number
  totalROAS: number
  platformStatuses: PlatformStatus[]
  topPriorities: string[]
  successHighlights: string[]
  generatedAt: string
}

export default function AIDailyReport() {
  const { selectedBrandId } = useBrandContext()
  const [report, setReport] = useState<DailyReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchDailyReport = async () => {
    if (!selectedBrandId) return

    try {
      setIsLoading(true)
      
      const response = await fetch('/api/ai/daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: selectedBrandId })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch daily report')
      }

      const data = await response.json()
      setReport(data.report)
      setLastRefresh(new Date())

    } catch (error) {
      console.error('Error fetching daily report:', error)
      toast.error('Failed to load daily report')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedBrandId) {
      fetchDailyReport()
    }
  }, [selectedBrandId])

  const getHealthBadge = (health: string) => {
    const healthColors = {
      'excellent': 'bg-green-500/20 text-green-400 border-green-500/30',
      'good': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'fair': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'poor': 'bg-red-500/20 text-red-400 border-red-500/30'
    }

    return (
      <Badge variant="outline" className={healthColors[health as keyof typeof healthColors]}>
        {health.charAt(0).toUpperCase() + health.slice(1)}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'attention': return <Eye className="w-4 h-4 text-yellow-400" />
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />
      case 'inactive': return <div className="w-4 h-4 rounded-full bg-gray-600" />
      default: return <div className="w-4 h-4 rounded-full bg-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'healthy': 'bg-green-500/20 text-green-400 border-green-500/30',
      'attention': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'critical': 'bg-red-500/20 text-red-400 border-red-500/30',
      'inactive': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }

    return (
      <Badge variant="outline" className={`${statusColors[status as keyof typeof statusColors]} text-xs`}>
        {status}
      </Badge>
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32 bg-gray-800" />
          <Skeleton className="h-8 w-8 bg-gray-800" />
        </div>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-[#111] border-[#333]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 bg-gray-800" />
                <Skeleton className="h-4 w-20 bg-gray-800" />
                <Skeleton className="h-5 w-16 bg-gray-800" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full bg-gray-800 mb-2" />
              <Skeleton className="h-4 w-3/4 bg-gray-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-8">
        <Brain className="w-12 h-12 mx-auto mb-4 text-gray-500" />
        <p className="text-gray-400">No report data available</p>
        <Button 
          onClick={fetchDailyReport} 
          variant="outline" 
          className="mt-4 border-[#333] text-gray-400 hover:text-white hover:bg-[#333]"
        >
          Generate Report
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Daily AI Report</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchDailyReport}
          disabled={isLoading}
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Overall Health */}
      <Card className="bg-[#111] border-[#333]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-400">Overall Health</CardTitle>
            {getHealthBadge(report.overallHealth)}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-300 mb-3">{report.summary}</p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500">Total Spend</p>
              <p className="text-white font-semibold">{formatCurrency(report.totalSpend)}</p>
            </div>
            <div>
              <p className="text-gray-500">Avg ROAS</p>
              <p className="text-white font-semibold">{report.totalROAS.toFixed(2)}x</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Statuses */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-400">Platform Overview</h4>
        {report.platformStatuses.map((platform) => (
          <Card key={platform.platform} className="bg-[#111] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Image
                    src={platform.logo}
                    alt={platform.platform}
                    width={16}
                    height={16}
                    className={`object-contain ${platform.status === 'inactive' ? 'grayscale opacity-40' : ''}`}
                  />
                  <span className="text-sm font-medium text-white">{platform.platform}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(platform.status)}
                  {getStatusBadge(platform.status)}
                </div>
              </div>
              
              <p className="text-xs text-gray-300 mb-3">{platform.summary}</p>
              
              {platform.status !== 'inactive' && (
                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div>
                    <p className="text-gray-500">Spend</p>
                    <p className="text-white">{formatCurrency(platform.keyMetrics.spend)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Performance</p>
                    <div className="flex items-center gap-1">
                      <span className="text-white">{platform.keyMetrics.performance.toFixed(1)}</span>
                      {platform.keyMetrics.performance > 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-400" />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500">Issues</p>
                    <p className={`${platform.keyMetrics.issues > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {platform.keyMetrics.issues}
                    </p>
                  </div>
                </div>
              )}
              
              {platform.recommendations.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Recommendations:</p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    {platform.recommendations.slice(0, 2).map((rec, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Priorities */}
      {report.topPriorities.length > 0 && (
        <Card className="bg-[#111] border-[#333]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Top Priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-xs text-gray-300 space-y-2">
              {report.topPriorities.slice(0, 3).map((priority, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-yellow-400 font-bold mt-0.5">{index + 1}.</span>
                  <span>{priority}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Success Highlights */}
      {report.successHighlights.length > 0 && (
        <Card className="bg-[#111] border-[#333]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              What's Working
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-xs text-gray-300 space-y-2">
              {report.successHighlights.slice(0, 2).map((highlight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Generated {lastRefresh ? lastRefresh.toLocaleTimeString() : 'just now'}
        </p>
      </div>
    </div>
  )
} 