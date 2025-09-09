"use client"

import { useState, useEffect } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Eye,
  DollarSign,
  Target,
  Calendar,
  Brain,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  ArrowUp,
  ArrowDown,
  CircleDollarSign,
  Wallet,
  TrendingUp as TrendIcon,
  RefreshCw,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Tooltip, Pie, Area, AreaChart } from 'recharts'

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
  // Enhanced data fields
  dailyBudget: number
  weeklyPerformance: any[]
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
  // Remove loading states
  // const [isLoading, setIsLoading] = useState(true) // Start with true to show loading on initial load
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [isFetching, setIsFetching] = useState(false) // Guard against multiple simultaneous calls

  // Use preloaded report when it changes
  useEffect(() => {
    if (preloadedReport) {
      // console.log('[AIDailyReport] Using preloaded report data')
      setReport(preloadedReport)
      setLastRefresh(new Date())
    }
  }, [preloadedReport])

  // Auto-load report when component mounts or brand changes - only if no preloaded data
  useEffect(() => {
    if (selectedBrandId && !isFetching && !preloadedReport && !report) {
      // console.log('[AIDailyReport] No preloaded data available, fetching report...')
      // Force refresh on mount to ensure latest data
      fetchDailyReport(true)
    }
  }, [selectedBrandId, preloadedReport])

  // Listen for refresh events with simplified handling
  useEffect(() => {
    if (!selectedBrandId) return

    let refreshTimeout: NodeJS.Timeout

    const handleRefreshEvent = (event: CustomEvent) => {
      const { brandId, source } = event.detail
      
      // Only refresh if it's for the current brand, not from this widget, and not already fetching
      if (brandId === selectedBrandId && source !== 'AIDailyReport' && !isFetching) {
        // console.log('[AIDailyReport] Refresh event triggered, updating report...', { source })
        
        // Shorter debounce for better responsiveness
        clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
          if (!isFetching) { // Double-check before fetching
            fetchDailyReport(true)
          }
        }, 300) // Reduced from 1000ms to 300ms
      }
    }

    // Simplified event handling - only listen to essential events
    window.addEventListener('metaDataRefreshed', handleRefreshEvent as EventListener)
    window.addEventListener('global-refresh-all', handleRefreshEvent as EventListener)
    window.addEventListener('newDayDetected', handleRefreshEvent as EventListener)

    return () => {
      clearTimeout(refreshTimeout)
      window.removeEventListener('metaDataRefreshed', handleRefreshEvent as EventListener)
      window.removeEventListener('global-refresh-all', handleRefreshEvent as EventListener)
      window.removeEventListener('newDayDetected', handleRefreshEvent as EventListener)
    }
  }, [selectedBrandId, preloadedReport]) // Removed isFetching dependency to prevent re-triggers

  const fetchDailyReport = async (forceRegenerate = false) => {
    if (!selectedBrandId || isFetching) {
      // console.log('[AIDailyReport] Skipping fetch - no brand selected or already fetching')
      return
    }

    setIsFetching(true)
    // Remove loading state
    // setIsLoading(true)
    // Clear the report to prevent showing old data while loading
    if (forceRegenerate) {
      setReport(null)
    }
    // console.log(`[AIDailyReport] Fetching daily report for brand: ${selectedBrandId}`)

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.report) {
        // console.log('[AIDailyReport] Report fetched successfully')
        setReport(data.report)
        setLastRefresh(new Date())
        
        // Dispatch refresh event for other components
        window.dispatchEvent(new CustomEvent('daily-report-refreshed', {
          detail: { brandId: selectedBrandId, timestamp: Date.now() }
        }))
      } else {
        console.error('[AIDailyReport] Failed to fetch report:', data.error)
        toast.error('Failed to generate advertising report')
      }
    } catch (error) {
      console.error('[AIDailyReport] Error fetching daily report:', error)
      toast.error('Error generating advertising report')
    } finally {
      // Remove loading state
      // setIsLoading(false)
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

  // Real data from API - use yesterday's data if today is empty (unless forcing today)
  const generateBudgetData = () => {
    const dailyBudget = report?.dailyBudget || 0
    
    // Force today's data at midnight transition (like blended widgets) - use local time
    const now = new Date()
    const localHour = now.getHours() // This is already in local time
    const shouldForceToday = (localHour === 0 && now.getMinutes() < 30) // First 30 minutes of new day in local time
    
    // Check if today has meaningful data
    const todayHasData = report?.todayStats && (
      (report.todayStats.spend || 0) > 0 ||
      (report.todayStats.impressions || 0) > 0 ||
      (report.todayStats.clicks || 0) > 0
    )
    
    // Use today's data if it has meaningful data OR if we should force today (midnight)
    const useToday = todayHasData || shouldForceToday
    const relevantStats = useToday ? report?.todayStats : report?.yesterdayStats
    const spentAmount = relevantStats?.spend || 0
    const remainingBudget = Math.max(0, dailyBudget - spentAmount)
    const spentPercentage = dailyBudget > 0 ? (spentAmount / dailyBudget) * 100 : 0

    return {
      dailyBudget,
      spentAmount,
      remainingBudget,
      spentPercentage: Math.min(100, spentPercentage),
      usingYesterday: !useToday
    }
  }

  const generatePerformanceData = () => {
    // Use real weekly performance data from API
    if (report?.weeklyPerformance && report.weeklyPerformance.length > 0) {
      return report.weeklyPerformance.map((data: any) => ({
        day: data.day,
        date: data.date,
        spend: data.spend,
        roas: data.roas,
        impressions: data.impressions || 0,
        clicks: data.clicks || 0,
        conversions: data.conversions || 0
      }))
    }
    
    // Fallback to empty array if no data
    return []
  }

  const generatePlatformDistribution = () => {
    if (!report?.platformStatuses) return []
    
    return report.platformStatuses
      .filter(p => p.status !== 'inactive')
      .map((platform) => ({
        name: platform.platform,
        value: platform.keyMetrics.spend,
        percentage: 0 // Will calculate after
      }))
  }

  // Calculate percentage change from yesterday
  const calculatePercentageChange = (today: number, yesterday: number) => {
    if (yesterday === 0) return 0
    return ((today - yesterday) / yesterday) * 100
  }

  // Get the most relevant stats to display
  const getRelevantStats = () => {
    // Force today's data at midnight transition (like blended widgets) - use local time
    const now = new Date()
    const localHour = now.getHours() // This is already in local time
    const shouldForceToday = (localHour === 0 && now.getMinutes() < 30) // First 30 minutes of new day in local time
    
    // Check if today has meaningful data
    const todayHasData = report?.todayStats && (
      (report.todayStats.spend || 0) > 0 ||
      (report.todayStats.impressions || 0) > 0 ||
      (report.todayStats.clicks || 0) > 0
    )
    
    // Use today's data if it has meaningful data OR if we should force today (midnight)
    const useToday = todayHasData || shouldForceToday
    const relevantStats = useToday ? report?.todayStats : report?.yesterdayStats
    
    return {
      stats: relevantStats,
      isToday: useToday,
      label: useToday ? 'Today' : 'Yesterday'
    }
  }

  // Get percentage changes for key metrics
  const getPercentageChanges = () => {
    if (!report?.todayStats || !report?.yesterdayStats) {
      // console.log('[AIDailyReport] Missing stats data:', {
        // todayStats: report?.todayStats,
        // yesterdayStats: report?.yesterdayStats
      // })
      return {
        spendChange: 0,
        conversionsChange: 0,
        roasChange: 0,
        impressionsChange: 0,
        clicksChange: 0,
        revenueChange: 0
      }
    }

    // console.log('[AIDailyReport] Calculating percentage changes:', {
      // todayStats: report.todayStats,
      // yesterdayStats: report.yesterdayStats
    // })

    return {
      spendChange: calculatePercentageChange(report.todayStats.spend, report.yesterdayStats.spend),
      conversionsChange: calculatePercentageChange(report.todayStats.conversions, report.yesterdayStats.conversions),
      roasChange: calculatePercentageChange(
        report.todayStats.revenue > 0 && report.todayStats.spend > 0 ? report.todayStats.revenue / report.todayStats.spend : 0,
        report.yesterdayStats.revenue > 0 && report.yesterdayStats.spend > 0 ? report.yesterdayStats.revenue / report.yesterdayStats.spend : 0
      ),
      impressionsChange: calculatePercentageChange(report.todayStats.impressions, report.yesterdayStats.impressions),
      clicksChange: calculatePercentageChange(report.todayStats.clicks, report.yesterdayStats.clicks),
      revenueChange: calculatePercentageChange(report.todayStats.revenue, report.yesterdayStats.revenue)
    }
  }

  // Remove loading state check - always show content
  // if (isLoading) {
  //   return (
  //     <div className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-lg h-full flex flex-col">
  //       <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] p-6 border-b border-[#333]">
  //         <div className="flex items-center justify-between">
  //           <div className="flex items-center gap-4">
  //             <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
  //                           flex items-center justify-center border border-white/10 shadow-lg">
  //               <Brain className="w-6 h-6 text-white" />
  //             </div>
  //             <div>
  //               <CardTitle className="text-3xl text-white font-bold tracking-tight">Advertising Report</CardTitle>
  //               <p className="text-gray-400 font-medium text-base">Loading fresh insights...</p>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
        
  //       <div className="flex-1 p-6 flex items-center justify-center">
  //         <div className="text-center">
  //           <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 animate-pulse">
  //             <Brain className="w-8 h-8 text-gray-400" />
  //           </div>
  //           <p className="text-gray-400 text-lg font-medium">Analyzing performance data...</p>
  //           <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  if (!report) {
    return (
      <div className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-lg h-full flex flex-col">
        <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] p-6 border-b border-[#333]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
                            flex items-center justify-center border border-white/10 shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl text-white font-bold tracking-tight">Detailed Advertising Report</CardTitle>
                <p className="text-gray-400 font-medium text-base">AI-powered campaign insights</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                <Brain className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">No Report Available</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                No advertising data available for this brand. Connect your advertising platforms to see comprehensive insights and AI-powered recommendations.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                <div className="p-3 bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg">
                  <div className="w-8 h-8 mx-auto mb-2 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-blue-400 font-bold">M</span>
                  </div>
                  <p className="text-xs text-gray-400">Meta Ads</p>
                </div>
                <div className="p-3 bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg">
                  <div className="w-8 h-8 mx-auto mb-2 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-red-400 font-bold">G</span>
                  </div>
                  <p className="text-xs text-gray-400">Google Ads</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const budgetData = generateBudgetData()
  const performanceData = generatePerformanceData()
  const platformDistribution = generatePlatformDistribution()
  const percentageChanges = getPercentageChanges()
  const relevantStats = getRelevantStats()
  
  // Calculate percentages for platform distribution
  const totalPlatformSpend = platformDistribution.reduce((sum, p) => sum + p.value, 0)
  platformDistribution.forEach(p => {
    p.percentage = totalPlatformSpend > 0 ? (p.value / totalPlatformSpend) * 100 : 0
  })

  return (
    <div className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#333] rounded-lg h-full flex flex-col">
      <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] px-4 py-5 border-b border-[#333] rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
                          flex items-center justify-center border border-white/10 shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">AI Daily Report</h2>
              <div className="flex items-center gap-2">
                <p className="text-gray-400 font-medium text-base">Campaign insights</p>
                {report?.generatedAt && (
                  <div className="text-xs text-gray-500 bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#2a2a2a]">
                    {new Date(report.generatedAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Show health badge in header */}
          {report && getHealthBadge(report.overallHealth)}
        </div>
      </div>
      
        <div className="flex-1 p-3 overflow-auto">
          <div className="space-y-3">
            {/* AI Summary - No Truncation */}
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-4 flex-1">
                <p className="text-lg text-gray-300 leading-relaxed">
                  {report.summary || 'No summary available.'}
                </p>
              </div>






          {/* Marketing Assistant Actions - Condensed & Actionable */}
          <div className="space-y-2">
            {/* Priority Action with Marketing Assistant Context */}
            {report?.topPriorities && report.topPriorities.length > 0 && (
              <div className="bg-[#0f0f0f] border border-amber-500/20 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-3 h-3 text-amber-400" />
                  <h3 className="text-xs font-semibold text-amber-400">Action Needed</h3>
                </div>
                <p className="text-xs text-gray-300">
                  {report.topPriorities[0].length > 60 
                    ? report.topPriorities[0].substring(0, 60) + '...' 
                    : report.topPriorities[0]}
                </p>
              </div>
            )}

            {/* AI Recommendations - Dynamic & Live */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Brain className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-blue-400">AI Recommendations</h3>
              </div>
              <div className="space-y-2">
                {report?.topPriorities && report.topPriorities.length > 0 ? (
                  report.topPriorities.slice(0, 3).map((priority, index) => (
                    <p key={index} className="text-lg text-gray-300 leading-relaxed">
                      • {priority}
                    </p>
                  ))
                ) : report?.detectedIssues && report.detectedIssues.length > 0 ? (
                  report.detectedIssues.slice(0, 3).map((issue, index) => (
                    <p key={index} className="text-lg text-gray-300 leading-relaxed">
                      • {issue}
                    </p>
                  ))
                ) : report?.factualHighlights && report.factualHighlights.length > 0 ? (
                  report.factualHighlights.slice(0, 3).map((highlight, index) => (
                    <p key={index} className="text-lg text-gray-300 leading-relaxed">
                      • {highlight}
                    </p>
                  ))
                ) : (
                  <>
                    <p className="text-lg text-gray-300 leading-relaxed">• Analyze campaign performance in Campaign Management above</p>
                    <p className="text-lg text-gray-300 leading-relaxed">• Review ad creative metrics and optimize underperformers</p>
                    <p className="text-lg text-gray-300 leading-relaxed">• Monitor performance trends to identify optimization opportunities</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}