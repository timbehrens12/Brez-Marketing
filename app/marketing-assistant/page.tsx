"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAuth } from '@clerk/nextjs'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAgency } from '@/contexts/AgencyContext'

// Components
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import BrandSelector from '@/components/BrandSelector'
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"

// Icons
import { 
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Settings,
  RefreshCw,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Users,
  Sparkles,
  Globe,
  Brain,
  Info,
  X,
  Clock,
  TrendingDown,
  Wand2,
  Activity,
  Award,
  Gauge
} from 'lucide-react'

interface KPIMetrics {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  cpa: number
  cpc: number
  roas: number
  revenue: number
  ctr: number
  costPerConversion: number
}

interface ActionKPIs {
  activeCampaigns: number
  totalCampaigns: number
  budgetUtilization: number
  topPerformer: {
    name: string
  roas: number
    spend: number
  } | null
  needsAttention: number
}

interface OptimizationCard {
  id: string
  type: 'budget' | 'audience' | 'creative' | 'bid' | 'frequency'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  rootCause: string
  actions: Array<{
    id: string
    type: string
    label: string
    impact: {
  revenue: number
  roas: number
      confidence: number
    }
    estimatedTimeToStabilize: string
  }>
  currentValue: string
  recommendedValue: string
  projectedImpact: {
  revenue: number
  roas: number
    confidence: number
  }
  campaignId: string
  campaignName: string
  platform: string
}

interface PerformanceTrend {
  date: string
  spend: number
  revenue: number
  roas: number
  clicks: number
  impressions: number
  conversions: number
}

interface QuickInsight {
  type: string
  label: string
  value: string
  metric: string
  icon: string
}

interface WeeklyProgress {
  totalRecommendations: number
  completedCount: number
  completionPercentage: number
  estimatedROASGain: number
  nextActions: Array<{
  title: string
    priority: string
  }>
}

export default function MarketingAssistantPage() {
  const { userId } = useAuth()
  const { selectedBrand } = useBrandContext()
  const { agencySettings } = useAgency()
  
  // State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Data state
  const [kpiMetrics, setKPIMetrics] = useState<KPIMetrics | null>(null)
  const [optimizationCards, setOptimizationCards] = useState<OptimizationCard[]>([])
  const [performanceTrends, setPerformanceTrends] = useState<PerformanceTrend[]>([])
  const [quickInsights, setQuickInsights] = useState<QuickInsight[]>([])
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null)
  
  // Filter state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['meta', 'google', 'tiktok'])
  const [dateRange, setDateRange] = useState('7d')
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set())
  
  // Usage tracking
  const [canRefresh, setCanRefresh] = useState(false)
  const [nextResetDate, setNextResetDate] = useState<string | null>(null)
  const [hasRunInitialAnalysis, setHasRunInitialAnalysis] = useState(false)

  // Load data on mount
  useEffect(() => {
    if (selectedBrand?.id) {
      loadInitialData()
      checkRefreshAvailability()
    }
  }, [selectedBrand?.id])

  const loadInitialData = async () => {
      setLoading(true)
    setError(null)

    try {
      // Load recommendations first (will be empty if never run)
      await loadOptimizationRecommendations(false)
      
      // Check if we have recommendations - if yes, load other widgets
      const recs = await fetch(
        `/api/marketing-assistant/recommendations?brandId=${selectedBrand?.id}&platforms=${selectedPlatforms.join(',')}&forceGenerate=false`,
        { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' } }
      ).then(r => r.json())

      if (recs.recommendations && recs.recommendations.length > 0) {
        setHasRunInitialAnalysis(true)
            await loadDashboardData()
          } else {
        setHasRunInitialAnalysis(false)
      }
    } catch (err) {
      console.error('[Marketing Assistant] Error loading initial data:', err)
      setError('Failed to load data')
    } finally {
          setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    if (!selectedBrand?.id) return

    try {
      await Promise.all([
        loadMetrics(),
        loadPerformanceTrends(),
        loadQuickInsights(),
        loadWeeklyProgress()
      ])
    } catch (err) {
      console.error('[Marketing Assistant] Error loading dashboard data:', err)
    }
  }

  const checkRefreshAvailability = async () => {
    if (!selectedBrand?.id || !userId) return

    try {
      const response = await fetch(
        `/api/marketing-assistant/check-usage?brandId=${selectedBrand.id}&userId=${userId}`
      )
              const data = await response.json()
      
      setCanRefresh(data.canUse)
      setNextResetDate(data.nextReset)
    } catch (err) {
      console.error('[Marketing Assistant] Error checking refresh availability:', err)
    }
  }

  const loadOptimizationRecommendations = async (forceRefresh: boolean = false) => {
    if (!selectedBrand?.id) return

    try {
      const forceParam = forceRefresh ? 'true' : 'false'
      const response = await fetch(
        `/api/marketing-assistant/recommendations?brandId=${selectedBrand.id}&platforms=${selectedPlatforms.join(',')}&forceGenerate=${forceParam}`,
        {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
        }
      )

      if (!response.ok) {
        console.error('[Marketing Assistant] Failed to load recommendations')
        setOptimizationCards([])
      return
    }
    
        const data = await response.json()
      setOptimizationCards(data.recommendations || [])
    } catch (err) {
      console.error('[Marketing Assistant] Error loading recommendations:', err)
      setOptimizationCards([])
    }
  }

  const loadMetrics = async () => {
    if (!selectedBrand?.id) return

    try {
      const response = await fetch(
        `/api/marketing-assistant/metrics?brandId=${selectedBrand.id}&platforms=${selectedPlatforms.join(',')}`
      )
      const data = await response.json()
      setKPIMetrics(data.metrics)
    } catch (err) {
      console.error('[Marketing Assistant] Error loading metrics:', err)
    }
  }

  const loadPerformanceTrends = async () => {
    if (!selectedBrand?.id) return

    try {
      const response = await fetch(
        `/api/marketing-assistant/trends?brandId=${selectedBrand.id}&platforms=${selectedPlatforms.join(',')}`
      )
      const data = await response.json()
      setPerformanceTrends(data.trends || [])
    } catch (err) {
      console.error('[Marketing Assistant] Error loading trends:', err)
    }
  }

  const loadQuickInsights = async () => {
    if (!selectedBrand?.id) return

    try {
      const response = await fetch(
        `/api/marketing-assistant/quick-insights?brandId=${selectedBrand.id}&platforms=${selectedPlatforms.join(',')}&_t=${Date.now()}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      )
      const data = await response.json()
      setQuickInsights(data.insights || [])
    } catch (err) {
      console.error('[Marketing Assistant] Error loading quick insights:', err)
    }
  }

  const loadWeeklyProgress = async () => {
    if (!selectedBrand?.id) return

    try {
      const response = await fetch(
        `/api/marketing-assistant/weekly-progress?brandId=${selectedBrand.id}`
      )
      const data = await response.json()
      setWeeklyProgress(data.progress)
      } catch (err) {
      console.error('[Marketing Assistant] Error loading weekly progress:', err)
    }
  }

  const handleUpdateRecommendations = async () => {
    if (!canRefresh || refreshing) return

    setRefreshing(true)
    setError(null)

    try {
      // Load fresh recommendations with AI generation
      await loadOptimizationRecommendations(true)
      
      // Load all dashboard data
      await loadDashboardData()
      
      // Mark as having run initial analysis
      setHasRunInitialAnalysis(true)
      
      // Refresh availability
      await checkRefreshAvailability()
    } catch (err) {
      console.error('[Marketing Assistant] Error updating recommendations:', err)
      setError('Failed to update recommendations')
    } finally {
      setRefreshing(false)
    }
  }

  const handleMarkAsDone = async (campaignId: string, actionId: string) => {
    if (!selectedBrand?.id || !userId) return

    const itemKey = `${campaignId}-${actionId}`
    if (completedItems.has(itemKey)) return

    try {
      const response = await fetch(
        `/api/marketing-assistant/recommendations?brandId=${selectedBrand.id}`,
        {
        method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'mark_as_done',
            campaignId,
          actionId,
            userId
          })
        }
      )
      
      if (response.ok) {
        setCompletedItems(prev => new Set([...prev, itemKey]))
        // Reload weekly progress to reflect the new completion
        await loadWeeklyProgress()
        console.log('[Marketing Assistant] ✅ Marked as done and reloaded progress')
      }
    } catch (err) {
      console.error('[Marketing Assistant] Error marking action as done:', err)
    }
  }

  const getNextResetText = () => {
    if (!nextResetDate) return ''
    const date = new Date(nextResetDate)
    const now = new Date()
    const diffHours = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 24) return `Resets in ${diffHours}h`
    const diffDays = Math.ceil(diffHours / 24)
    return `Resets in ${diffDays}d`
  }

  if (loading) {
    return <UnifiedLoading {...getPageLoadingConfig('marketing-assistant')} />
  }

    return (
    <div className="min-h-screen bg-[#0A0A0A] relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF2A2A]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00E5CC]/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

      {/* Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]" 
         style={{
             backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
             backgroundSize: '32px 32px'
           }} 
      />

      <div className="relative z-10 p-6 max-w-[1920px] mx-auto">
        {/* Premium Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF2A2A] to-[#FF5A5A] rounded-2xl blur-xl opacity-40 animate-pulse" />
                <div className="relative bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] p-4 rounded-2xl border border-white/5">
                  <Brain className="w-7 h-7 text-[#FF5A5A]" />
            </div>
          </div>
                <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent tracking-tight">
                  AI Marketing Intelligence
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">Real-time optimization powered by machine learning</p>
                </div>
                </div>

            <div className="flex items-center gap-3">
              <BrandSelector />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                          <Button 
                      onClick={handleUpdateRecommendations}
                      disabled={!canRefresh || refreshing}
                      className="relative group overflow-hidden bg-gradient-to-r from-[#FF2A2A] to-[#FF5A5A] hover:from-[#FF5A5A] hover:to-[#FF7A7A] text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-[#FF2A2A]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <div className="relative flex items-center gap-2">
                        {refreshing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            {hasRunInitialAnalysis ? 'Refresh Analysis' : 'Generate Analysis'}
                          </>
                          )}
                          </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#1A1A1A] border-white/10 text-white">
                    {canRefresh ? 'Run AI analysis on current performance' : `Weekly limit reached. ${getNextResetText()}`}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
                        </div>
                    </div>

          {/* Quick Stats Bar */}
          {hasRunInitialAnalysis && kpiMetrics && (
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'Total Spend', value: `$${kpiMetrics.spend.toFixed(2)}`, icon: DollarSign, color: 'from-blue-500 to-blue-600', change: null },
                { label: 'Revenue', value: `$${kpiMetrics.revenue.toFixed(2)}`, icon: TrendingUp, color: 'from-green-500 to-emerald-600', change: '+12%' },
                { label: 'ROAS', value: `${kpiMetrics.roas.toFixed(2)}x`, icon: Target, color: 'from-purple-500 to-purple-600', change: '+8%' },
                { label: 'Conversions', value: kpiMetrics.conversions.toString(), icon: ShoppingCart, color: 'from-orange-500 to-orange-600', change: '+5%' },
                { label: 'CTR', value: `${kpiMetrics.ctr.toFixed(2)}%`, icon: MousePointer, color: 'from-cyan-500 to-teal-600', change: '-2%' }
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="group relative bg-gradient-to-br from-[#1A1A1A]/80 to-[#0F0F0F]/80 backdrop-blur-xl p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300 overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">{stat.label}</p>
                      <p className="text-2xl font-black text-white">{stat.value}</p>
                      {stat.change && (
                        <p className={`text-xs font-semibold mt-1 ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                          {stat.change} vs last week
                        </p>
                      )}
                            </div>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-10`}>
                      <stat.icon className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
        </header>

        {/* Main Content */}
        {!hasRunInitialAnalysis ? (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center max-w-md">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF2A2A] to-[#00E5CC] rounded-full blur-2xl opacity-20 animate-pulse" />
                <div className="relative bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] p-8 rounded-3xl border border-white/10">
                  <Sparkles className="w-16 h-16 text-[#FF5A5A]" />
                          </div>
                    </div>
              <h2 className="text-2xl font-bold text-white mb-3">Ready to Optimize</h2>
              <p className="text-gray-400 mb-6">
                Click "Generate Analysis" above to let AI analyze your campaigns and discover optimization opportunities.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Zap className="w-4 h-4 text-[#00E5CC]" />
                Powered by GPT-4o
                  </div>
                        </div>
                          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar - Filters & Progress */}
            <div className="col-span-3 space-y-6">
              {/* Scope & Filters */}
              <Card className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#0F0F0F]/80 backdrop-blur-xl border-white/5">
                <CardHeader className="pb-4">
                        <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#00E5CC]" />
                    <h3 className="font-semibold text-white">Scope & Filters</h3>
                        </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-2 block">Date Range</label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white rounded-lg hover:border-[#00E5CC]/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-white/10">
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="14d">Last 14 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                </div>

                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-2 block">Platforms</label>
                    <div className="space-y-2">
                      {[
                        { id: 'meta', name: 'Meta', color: 'from-blue-500 to-blue-600' },
                        { id: 'google', name: 'Google', color: 'from-red-500 to-orange-600' },
                        { id: 'tiktok', name: 'TikTok', color: 'from-pink-500 to-purple-600' }
                      ].map(platform => (
                        <label
                          key={platform.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-white/5 hover:border-white/10 cursor-pointer transition-all group"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPlatforms.includes(platform.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPlatforms([...selectedPlatforms, platform.id])
                              } else {
                                setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id))
                              }
                            }}
                            className="w-4 h-4 rounded bg-black/60 border-white/20 text-[#00E5CC] focus:ring-[#00E5CC]/50"
                          />
                          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{platform.name}</span>
                          <div className={`ml-auto w-2 h-2 rounded-full bg-gradient-to-br ${platform.color}`} />
                        </label>
                      ))}
                    </div>
                </div>
              </CardContent>
            </Card>

              {/* Optimization Progress */}
              {weeklyProgress && (
                <Card className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#0F0F0F]/80 backdrop-blur-xl border-white/5 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF2A2A]/5 to-transparent pointer-events-none" />
                  <CardHeader className="pb-4 relative">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#FF2A2A]/10 border border-[#FF2A2A]/20">
                        <Activity className="w-4 h-4 text-[#FF5A5A]" />
                </div>
                      <h3 className="font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        Optimization Progress
                      </h3>
                </div>
              </CardHeader>
                  <CardContent className="relative space-y-4">
                    {/* Main Progress */}
                    <div className="text-center py-4">
                      <div className="flex items-baseline justify-center gap-1 mb-2">
                        <span className="text-4xl font-black bg-gradient-to-r from-[#FF5A5A] via-white to-[#FF2A2A] bg-clip-text text-transparent">
                          {weeklyProgress.completedCount}
                        </span>
                        <span className="text-2xl text-gray-500 font-bold">/</span>
                        <span className="text-2xl text-gray-400 font-bold">{weeklyProgress.totalRecommendations}</span>
                               </div>
                      <p className="text-xs text-gray-500 font-medium">Optimizations Applied</p>
        </div>

                    {/* ROAS Gain */}
                    <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-green-400 font-medium">Est. ROAS Gain</span>
                        <span className="text-sm font-bold text-green-300">+{weeklyProgress.estimatedROASGain.toFixed(2)}x</span>
          </div>
        </div>

                    {/* Progress Bar */}
                    <div className="relative w-full bg-black/40 rounded-full h-2 border border-[#FF2A2A]/20 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#FF2A2A] via-[#FF5A5A] to-[#FF7A7A] h-full rounded-full transition-all duration-700 ease-out shadow-lg shadow-[#FF2A2A]/50"
                        style={{ width: `${weeklyProgress.completionPercentage}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>

                    {/* Next Up */}
                    {weeklyProgress.nextActions.length > 0 && (
                      <div className="bg-gradient-to-r from-[#FF2A2A]/10 to-[#FF5A5A]/10 border border-[#FF2A2A]/20 rounded-lg p-2.5">
                        <p className="text-xs text-[#FF5A5A] font-semibold mb-1.5">Next Up:</p>
                        <p className="text-xs text-gray-300 line-clamp-2">{weeklyProgress.nextActions[0].title}</p>
                    </div>
                  )}
              </CardContent>
            </Card>
                              )}
                            </div>

            {/* Center - AI Optimization Feed */}
            <div className="col-span-6 space-y-6">
              <div className="flex items-center justify-between mb-4">
                        <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-[#00E5CC]" />
                    AI Optimization Feed
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Prioritized recommendations based on performance analysis</p>
                          </div>
                <Badge className="bg-[#00E5CC]/10 text-[#00E5CC] border-[#00E5CC]/20 px-3 py-1">
                  {optimizationCards.length} Active
                </Badge>
                        </div>

              <div className="space-y-4">
                {optimizationCards.map((card) => {
                  const priorityConfig = {
                    high: { bg: 'from-red-500/10 to-red-600/5', border: 'border-red-500/30', text: 'text-red-400', glow: 'shadow-red-500/20' },
                    medium: { bg: 'from-orange-500/10 to-orange-600/5', border: 'border-orange-500/30', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
                    low: { bg: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'shadow-blue-500/20' }
                  }
                  const config = priorityConfig[card.priority]

                  return (
                    <div
                      key={card.id}
                      className={`group relative bg-gradient-to-br from-[#1A1A1A]/90 to-[#0F0F0F]/90 backdrop-blur-xl rounded-2xl border ${config.border} hover:border-opacity-60 transition-all duration-300 overflow-hidden ${config.glow} hover:shadow-xl`}
                    >
                      {/* Hover Glow */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${config.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

                      <div className="relative p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className={`${config.bg} ${config.text} border ${config.border} px-2.5 py-0.5 text-xs font-bold uppercase`}>
                                {card.priority}
                              </Badge>
                              <Badge className="bg-white/5 text-gray-400 border-white/10 px-2.5 py-0.5 text-xs">
                                {card.type}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Target className="w-3 h-3" />
                                {card.campaignName}
                        </div>
                </div>
                            <h3 className="text-lg font-bold text-white mb-1">{card.title}</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{card.description}</p>
                      </div>

                          {/* Confidence Indicator */}
                          <div className="ml-4 text-right">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-600/10 border border-green-500/20">
                              <Gauge className="w-3.5 h-3.5 text-green-400" />
                              <span className="text-xs font-bold text-green-300">{card.projectedImpact.confidence}%</span>
                        </div>
                            <p className="text-[10px] text-gray-600 mt-1">Confidence</p>
                      </div>
                    </div>

                        {/* Root Cause */}
                        <div className="mb-4 p-3 rounded-lg bg-black/40 border border-white/5">
                          <p className="text-xs text-gray-500 font-medium mb-1">Root Cause:</p>
                          <p className="text-sm text-gray-300">{card.rootCause}</p>
                          </div>

                        {/* Projected Impact */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-600/5 border border-green-500/20">
                            <p className="text-xs text-green-400 font-medium mb-1">Revenue Impact</p>
                            <p className="text-lg font-bold text-green-300">+${card.projectedImpact.revenue.toFixed(0)}</p>
                            </div>
                          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
                            <p className="text-xs text-purple-400 font-medium mb-1">ROAS Lift</p>
                            <p className="text-lg font-bold text-purple-300">+{card.projectedImpact.roas.toFixed(2)}x</p>
                    </div>
                          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                            <p className="text-xs text-blue-400 font-medium mb-1">Time to Stable</p>
                            <p className="text-sm font-bold text-blue-300">{card.actions[0]?.estimatedTimeToStabilize || '3-5 days'}</p>
            </div>
               </div>

                        {/* Actions */}
                 <div className="space-y-2">
                          {card.actions.map((action) => {
                            const itemKey = `${card.campaignId}-${action.id}`
                            const isDone = completedItems.has(itemKey)

                            return (
                              <div
                                key={action.id}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                                  isDone 
                                    ? 'bg-green-500/5 border-green-500/30' 
                                    : 'bg-black/40 border-white/5 hover:border-[#00E5CC]/30'
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <button
                                    onClick={() => handleMarkAsDone(card.campaignId, action.id)}
                                    disabled={isDone}
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                      isDone
                                        ? 'bg-green-500 border-green-500'
                                        : 'border-gray-600 hover:border-[#00E5CC]'
                                    }`}
                                  >
                                    {isDone && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                  </button>
                                  <div className="flex-1">
                                    <p className={`text-sm font-medium ${isDone ? 'text-gray-500 line-through' : 'text-white'}`}>
                                      {action.label}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-xs text-gray-500">
                                        Current: <span className="text-gray-400 font-medium">{card.currentValue}</span>
                                      </span>
                                      <ArrowUpRight className="w-3 h-3 text-[#00E5CC]" />
                                      <span className="text-xs text-gray-500">
                                        Target: <span className="text-[#00E5CC] font-medium">{card.recommendedValue}</span>
                                      </span>
            </div>
          </div>
        </div>
                    </div>
                            )
                          })}
                </div>
                  </div>
                  </div>
                  )
                })}
                  </div>
                </div>

            {/* Right Sidebar - Stats & Insights */}
            <div className="col-span-3 space-y-6">
              {/* Performance Trends */}
              <Card className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#0F0F0F]/80 backdrop-blur-xl border-white/5" style={{ minHeight: '437.5px', maxHeight: '437.5px' }}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#00E5CC]" />
                    <h3 className="font-semibold text-white">7-Day Performance</h3>
          </div>
                </CardHeader>
                <CardContent>
                  {performanceTrends.length > 0 ? (
                    <div className="space-y-4">
                      {/* Mini Line Chart Visualization */}
                      <div className="relative h-24 flex items-end justify-between gap-1">
                        {performanceTrends.slice(-7).map((trend, idx) => {
                          const maxRoas = Math.max(...performanceTrends.slice(-7).map(t => t.roas))
                          const height = (trend.roas / maxRoas) * 100
                          return (
                            <TooltipProvider key={idx}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex-1 flex flex-col justify-end cursor-pointer group">
                                    <div 
                                      className="w-full bg-gradient-to-t from-[#00E5CC] to-[#00E5CC]/40 rounded-t-sm transition-all duration-300 group-hover:from-[#00FFE0] group-hover:to-[#00E5CC]/60"
                                      style={{ height: `${height}%` }}
                                    />
        </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#1A1A1A] border-white/10 text-white">
                                  <p className="text-xs font-semibold">{new Date(trend.date).toLocaleDateString()}</p>
                                  <p className="text-xs">ROAS: {trend.roas.toFixed(2)}x</p>
                                  <p className="text-xs">Spend: ${trend.spend.toFixed(0)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })}
              </div>

                      {/* Key Metrics */}
                      <div className="space-y-2">
                        {[
                          { label: 'Avg ROAS', value: `${(performanceTrends.reduce((sum, t) => sum + t.roas, 0) / performanceTrends.length).toFixed(2)}x`, icon: Target, color: 'text-purple-400' },
                          { label: 'Total Spend', value: `$${performanceTrends.reduce((sum, t) => sum + t.spend, 0).toFixed(0)}`, icon: DollarSign, color: 'text-blue-400' },
                          { label: 'Conversions', value: performanceTrends.reduce((sum, t) => sum + t.conversions, 0).toString(), icon: ShoppingCart, color: 'text-green-400' }
                        ].map((metric, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5">
                            <div className="flex items-center gap-2">
                              <metric.icon className={`w-3.5 h-3.5 ${metric.color}`} />
                              <span className="text-xs text-gray-400">{metric.label}</span>
                      </div>
                            <span className="text-sm font-bold text-white">{metric.value}</span>
                    </div>
                        ))}
                </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-center py-12">
                    <div>
                        <BarChart3 className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No performance data yet</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Insights */}
              <Card className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#0F0F0F]/80 backdrop-blur-xl border-white/5 overflow-hidden" style={{ minHeight: '437.5px', maxHeight: '437.5px' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/5 to-transparent pointer-events-none" />
                <CardHeader className="pb-4 relative">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#34d399]/10 border border-[#10b981]/20">
                      <Sparkles className="w-4 h-4 text-[#34d399]" />
                    </div>
                    <h3 className="font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Quick Insights
                    </h3>
                        </div>
                  <p className="text-xs text-gray-500 mt-1">AI-powered performance highlights</p>
                </CardHeader>
                <CardContent className="relative">
                  {quickInsights.length > 0 ? (
                    <div className="space-y-3">
                      {quickInsights.map((insight, idx) => (
                        <div
                          key={idx}
                          className="relative p-4 bg-gradient-to-r from-[#1A1A1A] via-[#1a1a1a] to-[#0f0f0f] border border-[#10b981]/20 rounded-lg hover:border-[#10b981]/40 transition-all duration-300 group overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-[#10b981]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#10b981]/10 to-[#34d399]/5 rounded-lg flex items-center justify-center border border-[#10b981]/20 flex-shrink-0">
                              <span className="text-xl">{insight.icon}</span>
                      </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 font-medium mb-0.5">{insight.label}</p>
                              <p className="text-sm font-bold text-white mb-1 truncate">{insight.value}</p>
                              <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-br from-[#10b981]/20 to-[#34d399]/10 border border-[#10b981]/30">
                                <span className="text-xs font-bold text-[#34d399]">{insight.metric}</span>
                    </div>
          </div>
        </div>
      </div>
                      ))}
                  </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-center py-12">
                      <div>
                        <Sparkles className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No AI insights yet</p>
                        <p className="text-xs text-gray-700 mt-1">Run analysis to generate insights</p>
                </div>
              </div>
                  )}
                </CardContent>
              </Card>
                  </div>
                  </div>
        )}
            </div>

      {/* Floating Action Hint */}
      {!hasRunInitialAnalysis && canRefresh && (
        <div className="fixed bottom-8 right-8 animate-bounce">
          <div className="relative">
            <div className="absolute inset-0 bg-[#FF2A2A] rounded-full blur-xl opacity-40 animate-pulse" />
            <div className="relative bg-gradient-to-r from-[#FF2A2A] to-[#FF5A5A] px-6 py-3 rounded-full text-white font-semibold shadow-2xl flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Click "Generate Analysis" to start
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}
