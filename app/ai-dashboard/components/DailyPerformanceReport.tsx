"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Brain, Calendar, TrendingUp, TrendingDown, AlertCircle, Sparkles, Clock } from "lucide-react"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatters"
import { format } from "date-fns"

interface Campaign {
  id: string
  campaign_id: string
  campaign_name: string
  objective: string
  status: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  reach: number
  ctr: number
  cpc: number
  roas: number
  conversions: number
  cost_per_conversion: number
  daily_insights?: any[]
  ai_recommendation?: {
    action: string
    reasoning: string
    forecast: string
    priority: 'high' | 'medium' | 'low'
  }
}

interface Creative {
  id: string
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  headline: string
  body: string
  cta_type: string
  image_url: string
  spent: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  roas: number
  conversions: number
  performance_rank: number
}

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

interface DailyPerformanceReportProps {
  campaigns: Campaign[]
  creatives: Creative[]
  stats: BlendedStats
  brandId: string
}

interface DailyReport {
  date: string
  summary: string
  keyInsights: string[]
  recommendations: string[]
  performanceScore: number
  topPerformers: string[]
  concernAreas: string[]
}

export function DailyPerformanceReport({ campaigns, creatives, stats, brandId }: DailyPerformanceReportProps) {
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)

  const generateDailyReport = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/daily-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaigns,
          creatives,
          stats,
          brandId,
          date: format(new Date(), 'yyyy-MM-dd')
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate daily report')
      }

      const report = await response.json()
      setDailyReport(report)
      setLastGenerated(new Date())
    } catch (err) {
      console.error('Error generating daily report:', err)
      setError('Failed to generate daily report. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-generate report when component mounts if data is available
  useEffect(() => {
    if (campaigns.length > 0 && !dailyReport && !isLoading) {
      generateDailyReport()
    }
  }, [campaigns, creatives, stats])

  const getPerformanceScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400"
    if (score >= 60) return "text-yellow-400"
    return "text-red-400"
  }

  const getPerformanceScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500/10"
    if (score >= 60) return "bg-yellow-500/10"
    return "bg-red-500/10"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">AI Daily Performance Report</h2>
          <p className="text-gray-400 text-sm">AI-generated insights and recommendations for today</p>
        </div>
        <div className="flex items-center gap-3">
          {lastGenerated && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Clock className="w-4 h-4" />
              <span>Updated {format(lastGenerated, 'HH:mm')}</span>
            </div>
          )}
          <Button 
            onClick={generateDailyReport} 
            disabled={isLoading}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full bg-gray-700" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48 bg-gray-700" />
                  <Skeleton className="h-3 w-32 bg-gray-700" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-gray-700" />
                <Skeleton className="h-4 w-3/4 bg-gray-700" />
                <Skeleton className="h-4 w-1/2 bg-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {dailyReport && !isLoading && (
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Daily Performance Summary</CardTitle>
                  <p className="text-gray-400 text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-lg ${getPerformanceScoreBg(dailyReport.performanceScore)}`}>
                <span className="text-sm font-medium text-gray-400">Score:</span>
                <span className={`text-lg font-bold ${getPerformanceScoreColor(dailyReport.performanceScore)}`}>
                  {dailyReport.performanceScore}/100
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Executive Summary */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Executive Summary</h3>
              <p className="text-gray-300 leading-relaxed">{dailyReport.summary}</p>
            </div>

            {/* Key Insights */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Key Insights</h3>
              <div className="space-y-2">
                {dailyReport.keyInsights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-[#0A0A0A] rounded-lg">
                    <TrendingUp className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performers & Concerns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Top Performers</h3>
                <div className="space-y-2">
                  {dailyReport.topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">{performer}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Areas of Concern</h3>
                <div className="space-y-2">
                  {dailyReport.concernAreas.map((concern, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg">
                      <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="text-gray-300">{concern}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">AI Recommendations</h3>
              <div className="space-y-3">
                {dailyReport.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <Badge variant="outline" className="text-purple-400 border-purple-400/30 mb-2">
                        Action Item {index + 1}
                      </Badge>
                      <p className="text-gray-300">{recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 