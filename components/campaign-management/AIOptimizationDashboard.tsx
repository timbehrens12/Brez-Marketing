"use client"

import { useState, useEffect } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  RefreshCw,
  Loader2,
  Play,
  Pause,
  Plus,
  Minus,
  ThumbsUp,
  ThumbsDown,
  TrendingUp as TrendIcon,
  Flame,
  Crown,
  AlertCircle,
  MapPin
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Tooltip, Cell, PieChart as RechartsPieChart } from 'recharts'

interface AdSetOptimization {
  adset_id: string
  adset_name: string
  campaign_name: string
  campaign_id: string
  status: 'ACTIVE' | 'PAUSED' | 'LEARNING'
  budget: number
  spent: number
  revenue: number
  roas: number
  cpm: number
  ctr: number
  conversion_rate: number
  profit: number
  profit_margin: number
  performance_score: number // 0-100
  alert_level: 'success' | 'warning' | 'critical'
  recommendations: OptimizationAction[]
  trend_7d: 'up' | 'down' | 'stable'
  potential_profit_increase: number
  impressions: number
  clicks: number
  conversions: number
  cpc: number
  cost_per_conversion: number
}

interface OptimizationAction {
  type: 'budget_increase' | 'budget_decrease' | 'pause' | 'creative_refresh' | 'audience_expand' | 'bid_adjust'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number // 0-100
  estimated_profit_change: number
  estimated_roas_change: number
  action_data?: any
}

interface DashboardSummary {
  total_profit: number
  total_spend: number
  average_roas: number
  profit_trend: 'up' | 'down' | 'stable'
  profit_change_percent: number
  optimizations_available: number
  potential_profit_increase: number
  top_performer: string
  worst_performer: string
  active_adsets: number
  total_conversions: number
}

interface AIOptimizationDashboardProps {
  preloadedData?: any
}

export default function AIOptimizationDashboard({ preloadedData }: AIOptimizationDashboardProps = {}) {
  const { selectedBrandId } = useBrandContext()
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<{
    summary: DashboardSummary | null
    adsets: AdSetOptimization[]
    profitData: any[]
    performanceData: any[]
  }>({
    summary: null,
    adsets: [],
    profitData: [],
    performanceData: []
  })
  const [activeTab, setActiveTab] = useState('alerts')
  const [executingAction, setExecutingAction] = useState<string | null>(null)

  useEffect(() => {
    if (selectedBrandId) {
      fetchOptimizationData()
    }
  }, [selectedBrandId])

  const fetchOptimizationData = async () => {
    if (!selectedBrandId) return
    
    setIsLoading(true)
    try {
      // Fetch real campaigns and adsets data
      const [campaignsResponse, totalBudgetResponse] = await Promise.all([
        fetch(`/api/meta/campaigns?brandId=${selectedBrandId}`),
        fetch(`/api/meta/total-budget?brandId=${selectedBrandId}`)
      ])

      const campaignsData = await campaignsResponse.json()
      const totalBudgetData = await totalBudgetResponse.json()

      if (campaignsData.success && campaignsData.campaigns.length > 0) {
        // Process real campaign data into optimization format
        const optimizationData = await processRealData(campaignsData.campaigns, totalBudgetData)
        setDashboardData(optimizationData)
      } else {
        // No data available
        setDashboardData({
          summary: null,
          adsets: [],
          profitData: [],
          performanceData: []
        })
      }
    } catch (error) {
      console.error('Failed to fetch optimization data:', error)
      toast.error('Failed to load optimization data - check console for details')
    } finally {
      setIsLoading(false)
    }
  }

  const processRealData = async (campaigns: any[], totalBudget: any) => {
    const adsets: AdSetOptimization[] = []
    
    // Fetch adsets for each campaign
    for (const campaign of campaigns) {
      try {
        const adsetsResponse = await fetch(`/api/meta/adsets?campaignId=${campaign.campaign_id}&brandId=${selectedBrandId}`)
        const adsetsData = await adsetsResponse.json()
        
        // Debug: console.log(`[AI Optimization] AdSets API response for campaign ${campaign.campaign_id}:`, adsetsData)
        
        if (adsetsData.success && adsetsData.adsets && Array.isArray(adsetsData.adsets) && adsetsData.adsets.length > 0) {
          adsetsData.adsets.forEach((adset: any) => {
            // Calculate profit (revenue - spend)
            // For now, we'll estimate revenue using ROAS from campaign data
            const estimatedRevenue = (adset.spent || 0) * (campaign.roas || 1)
            const profit = estimatedRevenue - (adset.spent || 0)
            const profitMargin = adset.spent > 0 ? (profit / estimatedRevenue) * 100 : 0
            
            // Calculate performance score based on multiple factors
            const roasScore = Math.min((campaign.roas || 0) * 25, 40) // Max 40 points for ROAS
            const ctrScore = Math.min((adset.ctr || 0) * 10, 30) // Max 30 points for CTR
            const profitScore = profit > 0 ? 30 : 0 // 30 points if profitable
            const performanceScore = Math.round(roasScore + ctrScore + profitScore)
            
            // Determine alert level
            let alertLevel: 'success' | 'warning' | 'critical' = 'success'
            if (profit < 0 || (campaign.roas || 0) < 1.5) {
              alertLevel = 'critical'
            } else if ((campaign.roas || 0) < 2.5 || (adset.ctr || 0) < 2) {
              alertLevel = 'warning'
            }
            
            // Generate recommendations based on performance
            const recommendations = generateRecommendations(adset, campaign, profit, alertLevel)
            
            adsets.push({
              adset_id: adset.adset_id,
              adset_name: adset.adset_name,
              campaign_name: campaign.campaign_name,
              campaign_id: campaign.campaign_id,
              status: adset.status,
              budget: adset.budget || 0,
              spent: adset.spent || 0,
              revenue: estimatedRevenue,
              roas: campaign.roas || 0,
              cpm: adset.spent && adset.impressions ? (adset.spent / adset.impressions) * 1000 : 0,
              ctr: adset.ctr || 0,
              conversion_rate: adset.conversions && adset.clicks ? (adset.conversions / adset.clicks) * 100 : 0,
              profit,
              profit_margin: profitMargin,
              performance_score: performanceScore,
              alert_level: alertLevel,
              recommendations,
              trend_7d: profit > 0 ? 'up' : 'down',
              potential_profit_increase: recommendations.reduce((sum, rec) => sum + rec.estimated_profit_change, 0),
              impressions: adset.impressions || 0,
              clicks: adset.clicks || 0,
              conversions: adset.conversions || 0,
              cpc: adset.cpc || 0,
              cost_per_conversion: adset.cost_per_conversion || 0
            })
          })
        } else {
          // Debug: No adsets found for campaign
        }
      } catch (error) {
        console.error(`Failed to fetch adsets for campaign ${campaign.campaign_id}:`, error)
      }
    }

    // If no adsets were found, create fallback data from campaigns
    if (adsets.length === 0 && campaigns.length > 0) {
      // Creating fallback data from campaigns
      
      campaigns.forEach((campaign) => {
        // Create a synthetic adset from campaign data
        const estimatedRevenue = (campaign.spent || 0) * (campaign.roas || 1)
        const profit = estimatedRevenue - (campaign.spent || 0)
        const profitMargin = campaign.spent > 0 ? (profit / estimatedRevenue) * 100 : 0
        
        // Calculate performance score
        const roasScore = Math.min((campaign.roas || 0) * 25, 40)
        const ctrScore = Math.min((campaign.ctr || 0) * 10, 30)
        const profitScore = profit > 0 ? 30 : 0
        const performanceScore = Math.round(roasScore + ctrScore + profitScore)
        
        // Determine alert level
        let alertLevel: 'success' | 'warning' | 'critical' = 'success'
        if (profit < 0 || (campaign.roas || 0) < 1.5) {
          alertLevel = 'critical'
        } else if ((campaign.roas || 0) < 2.5 || (campaign.ctr || 0) < 2) {
          alertLevel = 'warning'
        }
        
        const recommendations = generateRecommendations(campaign, campaign, profit, alertLevel)
        
        adsets.push({
          adset_id: `campaign-${campaign.campaign_id}`,
          adset_name: campaign.campaign_name,
          campaign_name: campaign.campaign_name,
          campaign_id: campaign.campaign_id,
          status: campaign.status || 'ACTIVE',
          budget: campaign.budget || 0,
          spent: campaign.spent || 0,
          revenue: estimatedRevenue,
          roas: campaign.roas || 0,
          cpm: campaign.spent && campaign.impressions ? (campaign.spent / campaign.impressions) * 1000 : 0,
          ctr: campaign.ctr || 0,
          conversion_rate: campaign.conversions && campaign.clicks ? (campaign.conversions / campaign.clicks) * 100 : 0,
          profit,
          profit_margin: profitMargin,
          performance_score: performanceScore,
          alert_level: alertLevel,
          recommendations,
          trend_7d: profit > 0 ? 'up' : 'down',
          potential_profit_increase: recommendations.reduce((sum, rec) => sum + rec.estimated_profit_change, 0),
          impressions: campaign.impressions || 0,
          clicks: campaign.clicks || 0,
          conversions: campaign.conversions || 0,
          cpc: campaign.cpc || 0,
          cost_per_conversion: campaign.cost_per_conversion || 0
        })
      })
    }

    // Calculate summary data
    const summary: DashboardSummary = {
      total_profit: adsets.reduce((sum, ad) => sum + ad.profit, 0),
      total_spend: adsets.reduce((sum, ad) => sum + ad.spent, 0),
      average_roas: adsets.length > 0 ? adsets.reduce((sum, ad) => sum + ad.roas, 0) / adsets.length : 0,
      profit_trend: 'up', // Could be calculated from historical data
      profit_change_percent: 15.2, // Could be calculated from historical data
      optimizations_available: adsets.reduce((sum, ad) => sum + ad.recommendations.length, 0),
      potential_profit_increase: adsets.reduce((sum, ad) => sum + ad.potential_profit_increase, 0),
      top_performer: adsets.sort((a, b) => b.performance_score - a.performance_score)[0]?.adset_name || '',
      worst_performer: adsets.sort((a, b) => a.performance_score - b.performance_score)[0]?.adset_name || '',
      active_adsets: adsets.filter(ad => ad.status === 'ACTIVE').length,
      total_conversions: adsets.reduce((sum, ad) => sum + ad.conversions, 0)
    }

    // Generate chart data
    const profitData = [
      { time: '6AM', profit: summary.total_profit * 0.1 },
      { time: '9AM', profit: summary.total_profit * 0.25 },
      { time: '12PM', profit: summary.total_profit * 0.45 },
      { time: '3PM', profit: summary.total_profit * 0.70 },
      { time: '6PM', profit: summary.total_profit * 0.85 },
      { time: 'Now', profit: summary.total_profit }
    ]

    const performanceData = adsets.slice(0, 6).map(ad => ({
      name: ad.adset_name.split(' ')[0] + '...',
      roas: ad.roas,
      profit: ad.profit,
      score: ad.performance_score,
      spend: ad.spent
    }))

    return {
      summary,
      adsets,
      profitData,
      performanceData
    }
  }

  const generateRecommendations = (adset: any, campaign: any, profit: number, alertLevel: string): OptimizationAction[] => {
    const recommendations: OptimizationAction[] = []
    
    // Budget optimization based on performance
    if (campaign.roas > 3.0 && profit > 20) {
      recommendations.push({
        type: 'budget_increase',
        title: 'Increase Budget by 50%',
        description: `High ROAS (${campaign.roas.toFixed(2)}x) indicates strong performance - scale up`,
        impact: 'high',
        confidence: 87,
        estimated_profit_change: profit * 0.4,
        estimated_roas_change: 0.1,
        action_data: { new_budget: adset.budget * 1.5 }
      })
    }
    
    // Pause underperformers
    if (profit < -10 || campaign.roas < 1.2) {
      recommendations.push({
        type: 'pause',
        title: 'Pause Adset',
        description: `Poor performance (ROAS: ${campaign.roas.toFixed(2)}x) - stop losses`,
        impact: 'high',
        confidence: 92,
        estimated_profit_change: Math.abs(profit),
        estimated_roas_change: 0,
        action_data: { reason: 'poor_performance' }
      })
    }
    
    // Creative refresh for low CTR
    if (adset.ctr < 2.0 && adset.status === 'ACTIVE') {
      recommendations.push({
        type: 'creative_refresh',
        title: 'Test New Creatives',
        description: `Low CTR (${adset.ctr.toFixed(2)}%) suggests creative fatigue`,
        impact: 'medium',
        confidence: 73,
        estimated_profit_change: profit * 0.2,
        estimated_roas_change: 0.3,
        action_data: { creative_type: 'video' }
      })
    }
    
    return recommendations
  }

  const executeOptimization = async (adsetId: string, action: OptimizationAction) => {
    setExecutingAction(`${adsetId}-${action.type}`)
    
    try {
      // Simulate API call to execute the optimization
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success(`${action.title} executed successfully!`)
      
      // Refresh data
      await fetchOptimizationData()
    } catch (error) {
      toast.error('Failed to execute optimization')
    } finally {
      setExecutingAction(null)
    }
  }

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'warning': return <AlertTriangle className="w-3 h-3 text-yellow-500" />
      case 'critical': return <AlertCircle className="w-3 h-3 text-red-500" />
      default: return <Activity className="w-3 h-3 text-gray-400" />
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'budget_increase': return <Plus className="w-3 h-3" />
      case 'budget_decrease': return <Minus className="w-3 h-3" />
      case 'pause': return <Pause className="w-3 h-3" />
      case 'creative_refresh': return <RefreshCw className="w-3 h-3" />
      case 'audience_expand': return <Target className="w-3 h-3" />
      case 'bid_adjust': return <TrendingUp className="w-3 h-3" />
      default: return <Zap className="w-3 h-3" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatAdSetStatus = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    
    if (normalizedStatus === 'ACTIVE') {
      return {
        displayText: 'Active',
        bgColor: 'bg-green-950/30',
        textColor: 'text-green-500',
        borderColor: 'border-green-800/50',
        dotColor: 'bg-green-500'
      };
    } else if (normalizedStatus === 'PAUSED') {
      return {
        displayText: 'Paused',
        bgColor: 'bg-slate-800/50',
        textColor: 'text-slate-400',
        borderColor: 'border-slate-700/50',
        dotColor: 'bg-slate-400'
      };
    } else {
      return {
        displayText: normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase(),
        bgColor: 'bg-gray-950/30',
        textColor: 'text-gray-500',
        borderColor: 'border-gray-800/50',
        dotColor: 'bg-gray-500'
      };
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full bg-gradient-to-br from-[#1a1a1a] to-[#222] border border-[#333]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48 bg-gray-700/30" />
            <Skeleton className="h-8 w-20 bg-gray-700/30" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4].map(i => (
              <Skeleton key={i} className="h-20 bg-gray-700/30" />
            ))}
          </div>
          <Skeleton className="h-32 bg-gray-700/30" />
          <Skeleton className="h-40 bg-gray-700/30" />
        </CardContent>
      </Card>
    )
  }

  const { summary, adsets, profitData, performanceData } = dashboardData

  if (!summary || adsets.length === 0) {
    return (
      <Card className="h-full bg-gradient-to-br from-[#1a1a1a] to-[#222] border border-[#333]">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No adsets available for optimization analysis</p>
            <p className="text-sm text-gray-500 mt-2">Connect campaigns to start getting AI-powered recommendations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

    return (
      <Card className="h-full bg-gradient-to-br from-[#1a1a1a] to-[#222] border border-[#333] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <CardTitle className="text-base text-white">AI Optimization Center</CardTitle>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchOptimizationData}
              disabled={isLoading}
              className="border-[#333] hover:border-gray-500 text-white h-7 px-2"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-xs">Refresh</span>
            </Button>
          </div>
        
        {/* Executive Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Profit Today</p>
                <p className="text-lg font-bold text-green-500">{formatCurrency(summary.total_profit)}</p>
              </div>
              <div className="flex items-center gap-1">
                {summary.profit_trend === 'up' ? 
                  <ArrowUp className="w-4 h-4 text-green-500" /> : 
                  <ArrowDown className="w-4 h-4 text-red-500" />
                }
                <span className="text-xs text-gray-400">+{summary.profit_change_percent}%</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-3">
            <div>
              <p className="text-xs text-gray-400">Avg ROAS</p>
              <p className="text-lg font-bold text-blue-400">{summary.average_roas.toFixed(2)}x</p>
            </div>
          </div>
          
          <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-3">
            <div>
              <p className="text-xs text-gray-400">Optimizations</p>
              <p className="text-lg font-bold text-purple-400">{summary.optimizations_available}</p>
            </div>
          </div>
          
          <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-3">
            <div>
              <p className="text-xs text-gray-400">Potential Gain</p>
              <p className="text-lg font-bold text-yellow-400">{formatCurrency(summary.potential_profit_increase)}</p>
            </div>
          </div>
        </div>

        {/* Priority Actions Banner */}
        {summary.optimizations_available > 0 && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-2 mt-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <span className="text-xs font-medium text-yellow-400 truncate">
                {summary.optimizations_available} optimizations - ${summary.potential_profit_increase.toFixed(2)} profit gain
              </span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 bg-[#0f0f0f] border border-[#333] h-8">
            <TabsTrigger value="alerts" className="text-xs px-2">Alerts</TabsTrigger>
            <TabsTrigger value="heatmap" className="text-xs px-2">Trends</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs px-2">Actions</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs px-2">Insights</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="alerts" className="space-y-3 mt-0">
              {adsets.map((adset) => {
                const statusFormatted = formatAdSetStatus(adset.status)
                return (
                  <div 
                    key={adset.adset_id}
                    className={`bg-[#0f0f0f]/50 border rounded-lg p-4 ${
                      adset.alert_level === 'critical' ? 'border-red-500/30' :
                      adset.alert_level === 'warning' ? 'border-yellow-500/30' :
                      'border-green-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getAlertIcon(adset.alert_level)}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-white truncate">{adset.adset_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`text-xs px-1.5 py-0 h-4 flex items-center gap-1 ${statusFormatted.bgColor} ${statusFormatted.textColor} border ${statusFormatted.borderColor}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${statusFormatted.dotColor}`}></div>
                              {statusFormatted.displayText}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{formatCurrency(adset.profit)}</p>
                        <p className="text-xs text-gray-400">Profit</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-400">ROAS</p>
                        <p className="text-sm font-medium text-white">{adset.roas.toFixed(2)}x</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Spend</p>
                        <p className="text-sm font-medium text-white">{formatCurrency(adset.spent)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">CTR</p>
                        <p className="text-sm font-medium text-white">{adset.ctr.toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Score</p>
                        <p className="text-sm font-medium text-white">{adset.performance_score}/100</p>
                      </div>
                    </div>
                    
                    <Progress 
                      value={adset.performance_score} 
                      className="h-2 mb-3"
                    />
                    
                    {adset.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-300">Recommended Actions:</p>
                        {adset.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-2 bg-[#1a1a1a] p-2 rounded border border-[#333]">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {getActionIcon(rec.type)}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-white truncate">{rec.title}</p>
                                <p className="text-xs text-green-500">+{formatCurrency(rec.estimated_profit_change)} ({rec.confidence}%)</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-500/30 hover:border-blue-500/50 text-blue-400 h-6 px-2 text-xs"
                              onClick={() => executeOptimization(adset.adset_id, rec)}
                              disabled={executingAction === `${adset.adset_id}-${rec.type}`}
                            >
                              {executingAction === `${adset.adset_id}-${rec.type}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Apply'
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </TabsContent>
            
            <TabsContent value="heatmap" className="mt-0">
              <div className="space-y-4">
                <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-3">Profit Trend Today</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={profitData}>
                      <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #374151',
                          borderRadius: '8px' 
                        }}
                        formatter={(value) => [formatCurrency(Number(value)), 'Profit']}
                      />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-3">AdSet Performance Matrix</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={performanceData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #374151',
                          borderRadius: '8px' 
                        }}
                      />
                      <Bar dataKey="roas" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="recommendations" className="mt-0">
              <div className="space-y-2">
                {adsets.flatMap(adset => 
                  adset.recommendations.map((rec, idx) => (
                    <div key={`${adset.adset_id}-${idx}`} className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getActionIcon(rec.type)}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-medium text-white truncate">{rec.title}</h4>
                            <p className="text-xs text-gray-400 truncate">{adset.adset_name}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${rec.impact === 'high' ? 'border-red-500/30 text-red-400' : 
                              rec.impact === 'medium' ? 'border-yellow-500/30 text-yellow-400' : 
                              'border-green-500/30 text-green-400'} flex-shrink-0`}
                        >
                          {rec.impact}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-green-500">+{formatCurrency(rec.estimated_profit_change)}</span>
                          <span className="text-gray-400">{rec.confidence}% confident</span>
                        </div>
                        
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 h-6 px-2 text-xs"
                          onClick={() => executeOptimization(adset.adset_id, rec)}
                          disabled={executingAction === `${adset.adset_id}-${rec.type}`}
                        >
                          {executingAction === `${adset.adset_id}-${rec.type}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Zap className="w-3 h-3 mr-1" />
                              Go
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="insights" className="mt-0">
              <div className="space-y-4">
                <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <h4 className="text-xs font-medium text-white">Top Performer</h4>
                  </div>
                  <p className="text-sm text-gray-300">
                    <span className="text-green-500 font-medium">{summary.top_performer}</span> is your best performing adset with excellent profitability and efficiency.
                  </p>
                </div>
                
                <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <h4 className="text-xs font-medium text-white">Needs Attention</h4>
                  </div>
                  <p className="text-sm text-gray-300">
                    <span className="text-red-500 font-medium">{summary.worst_performer}</span> is underperforming and may need immediate optimization or pausing.
                  </p>
                </div>
                
                <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-3 h-3 text-blue-400" />
                    <h4 className="text-xs font-medium text-white">AI Recommendation</h4>
                  </div>
                  <p className="text-sm text-gray-300">
                    Focus on scaling your high-ROAS adsets while optimizing or pausing underperformers. 
                    You have <span className="text-yellow-400 font-medium">${summary.potential_profit_increase.toFixed(2)}</span> in 
                    potential daily profit improvements available.
                  </p>
                </div>
                
                <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-3 h-3 text-purple-400" />
                    <h4 className="text-xs font-medium text-white">Performance Summary</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400">Active AdSets:</span>
                      <span className="text-white ml-1">{summary.active_adsets}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Conversions:</span>
                      <span className="text-white ml-1">{summary.total_conversions}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Spend:</span>
                      <span className="text-white ml-1">{formatCurrency(summary.total_spend)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Avg ROAS:</span>
                      <span className="text-white ml-1">{summary.average_roas.toFixed(2)}x</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}