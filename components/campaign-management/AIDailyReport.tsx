"use client"

import { useState, useEffect } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  CheckCircle,
  Brain,
  RefreshCw,
  Target,
  Zap
} from "lucide-react"
import { toast } from "sonner"

interface DailyReport {
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor'
  summary: string
  totalSpend: number
  totalROAS: number
  topPriorities: string[]
  successHighlights: string[]
  generatedAt: string
  todayStats: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    revenue: number
  }
  yesterdayStats: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    revenue: number
  }
}

interface AIDailyReportProps {
  preloadedReport?: DailyReport | null
}

export default function AIDailyReport({ preloadedReport }: AIDailyReportProps = {}) {
  const { selectedBrandId } = useBrandContext()
  const [report, setReport] = useState<DailyReport | null>(preloadedReport || null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  // Use preloaded report when it changes
  useEffect(() => {
    if (preloadedReport) {
      setReport(preloadedReport)
      setLastRefresh(new Date())
    }
  }, [preloadedReport])

  // Auto-load report when component mounts or brand changes - only if no preloaded data
  useEffect(() => {
    if (selectedBrandId && !isFetching && !preloadedReport && !report) {
      fetchDailyReport(true)
    }
  }, [selectedBrandId, preloadedReport])

  // Listen for refresh events
  useEffect(() => {
    if (!selectedBrandId) return

    const handleRefreshEvent = (event: CustomEvent) => {
      const { brandId, source } = event.detail

      if (brandId === selectedBrandId && source !== 'AIDailyReport' && !isFetching) {
        setTimeout(() => {
          if (!isFetching) {
            fetchDailyReport(true)
          }
        }, 300)
      }
    }

    window.addEventListener('metaDataRefreshed', handleRefreshEvent as EventListener)
    window.addEventListener('global-refresh-all', handleRefreshEvent as EventListener)
    window.addEventListener('newDayDetected', handleRefreshEvent as EventListener)

    return () => {
      window.removeEventListener('metaDataRefreshed', handleRefreshEvent as EventListener)
      window.removeEventListener('global-refresh-all', handleRefreshEvent as EventListener)
      window.removeEventListener('newDayDetected', handleRefreshEvent as EventListener)
    }
  }, [selectedBrandId, preloadedReport])

  const fetchDailyReport = async (forceRegenerate = false) => {
    if (!selectedBrandId || isFetching) return

    setIsFetching(true)

    try {
      const response = await fetch('/api/ai/daily-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: selectedBrandId,
          forceRegenerate,
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const data = await response.json()

      if (data.success && data.report) {
        setReport(data.report)
        setLastRefresh(new Date())

        window.dispatchEvent(new CustomEvent('daily-report-refreshed', {
          detail: { brandId: selectedBrandId, timestamp: Date.now() }
        }))
      } else {
        toast.error('Failed to generate advertising report')
      }
    } catch (error) {
      toast.error('Error generating advertising report')
    } finally {
      setIsFetching(false)
    }
  }

  const getHealthBadge = (health: string) => {
    const healthConfig = {
      'excellent': {
        text: 'Excellent',
        className: 'bg-[#222] text-emerald-400 border-[#333]',
        dotColor: 'bg-emerald-400'
      },
      'good': {
        text: 'Good',
        className: 'bg-[#222] text-blue-400 border-[#333]',
        dotColor: 'bg-blue-400'
      },
      'fair': {
        text: 'Fair',
        className: 'bg-[#222] text-amber-400 border-[#333]',
        dotColor: 'bg-amber-400'
      },
      'poor': {
        text: 'Poor',
        className: 'bg-[#222] text-red-400 border-[#333]',
        dotColor: 'bg-red-400'
      }
    }

    const config = healthConfig[health as keyof typeof healthConfig]

    return (
      <Badge variant="outline" className={`${config.className} font-medium px-3 py-1`}>
        <div className={`w-2 h-2 rounded-full ${config.dotColor} mr-2`}></div>
        {config.text}
      </Badge>
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

  if (!report) {
    return (
      <div className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-lg h-full flex flex-col">
        <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] p-4 border-b border-[#333]">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Marketing Assistant</h2>
              <p className="text-xs text-gray-400">No data available</p>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Connect your ad platforms to see AI insights</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-lg h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] p-3 border-b border-[#333]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Marketing Assistant</h2>
              <p className="text-xs text-gray-400">Quick campaign insights</p>
            </div>
          </div>
          {getHealthBadge(report.overallHealth)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 overflow-auto">
        <div className="space-y-3">

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Daily Spend</p>
              <p className="text-xl font-bold text-white">{formatCurrency(report.totalSpend)}</p>
            </div>
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">ROAS</p>
              <p className="text-xl font-bold text-white">{report.totalROAS.toFixed(2)}x</p>
            </div>
          </div>

          {/* Quick Status */}
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-3">
            <h3 className="text-sm font-semibold text-white mb-2">What's Happening</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              {report.summary.length > 150 ? report.summary.substring(0, 150) + '...' : report.summary}
            </p>
          </div>

          {/* Action Items */}
          {report?.topPriorities && report.topPriorities.length > 0 && (
            <div className="bg-[#0f0f0f] border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-400">Needs Attention</h3>
              </div>
              <p className="text-xs text-gray-300">
                Campaign "{report.topPriorities[0].length > 80
                  ? report.topPriorities[0].substring(0, 80) + '...'
                  : report.topPriorities[0]}"
              </p>
            </div>
          )}

          {/* Success Highlight */}
          {report?.successHighlights && report.successHighlights.length > 0 && (
            <div className="bg-[#0f0f0f] border border-emerald-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-400">AI Recommendation Ready</h3>
              </div>
              <p className="text-xs text-gray-300">
                {report.successHighlights[0].length > 80
                  ? report.successHighlights[0].substring(0, 80) + '...'
                  : report.successHighlights[0]}
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-3">
            <h3 className="text-sm font-semibold text-white mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs justify-start"
                onClick={() => fetchDailyReport(true)}
                disabled={isFetching}
              >
                <RefreshCw className={`w-3 h-3 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh AI Insights
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}