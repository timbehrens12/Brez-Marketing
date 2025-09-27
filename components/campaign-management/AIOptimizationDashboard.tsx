"use client"

import { useState, useEffect } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Brain
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

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
      <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                <Brain className="w-6 h-6 text-purple-400 animate-pulse" />
              </div>
              <div>
                <div className="h-6 bg-slate-700/50 rounded-lg w-48 mb-2 animate-pulse"></div>
                <div className="h-4 bg-slate-700/30 rounded w-32 animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1,2,3].map(i => (
              <div key={i} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="h-4 bg-slate-700/50 rounded w-16 mb-2 animate-pulse"></div>
                <div className="h-8 bg-slate-700/30 rounded w-20 mb-2 animate-pulse"></div>
                <div className="h-3 bg-slate-700/20 rounded w-12 animate-pulse"></div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-slate-700/50 rounded-lg animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-700/50 rounded w-32 mb-1 animate-pulse"></div>
                    <div className="h-3 bg-slate-700/30 rounded w-24 animate-pulse"></div>
                  </div>
                </div>
                <div className="h-3 bg-slate-700/20 rounded w-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { summary, adsets, profitData, performanceData } = dashboardData

  if (!summary || adsets.length === 0) {
    return (
      <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-slate-600/20 to-slate-700/30 rounded-2xl flex items-center justify-center border border-slate-600/50">
            <Brain className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">No Optimization Data Available</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Connect your campaigns to start receiving AI-powered optimization recommendations and performance insights.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            <span className="text-indigo-300 text-sm font-medium">Waiting for campaign data...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Animated Header */}
      <div className="relative bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-indigo-600/20 p-6 border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-indigo-500/10 animate-pulse"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl
                          flex items-center justify-center border border-purple-500/30 shadow-lg backdrop-blur-sm">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">AI Optimization Center</h2>
              <p className="text-purple-200 text-sm">Smart recommendations for maximum performance</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-300 text-sm font-medium">AI Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {/* Modern KPI Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Total Profit */}
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-5 hover:border-emerald-400/30 transition-all duration-300 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{formatCurrency(summary.total_profit)}</div>
              <div className="text-sm text-slate-400">Total Profit</div>
            </div>
          </div>

          {/* Average ROAS */}
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-5 hover:border-blue-400/30 transition-all duration-300 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{summary.average_roas.toFixed(2)}x</div>
              <div className="text-sm text-slate-400">Average ROAS</div>
            </div>
          </div>

          {/* Optimizations Available */}
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5 hover:border-purple-400/30 transition-all duration-300 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{summary.optimizations_available}</div>
              <div className="text-sm text-slate-400">AI Actions Available</div>
            </div>
          </div>
        </div>

        {/* Performance Summary Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">AdSet Performance Analysis</h3>
            <div className="text-sm text-slate-400">{adsets.length} adsets analyzed</div>
          </div>

          {adsets.map((adset) => {
            const statusFormatted = formatAdSetStatus(adset.status)
            const roasColor = adset.roas >= 3 ? 'text-emerald-400' : adset.roas >= 2 ? 'text-yellow-400' : 'text-red-400'

            return (
              <div
                key={adset.adset_id}
                className="group relative backdrop-blur-xl bg-gradient-to-r from-slate-800/30 to-slate-900/30 border border-slate-700/50 rounded-xl p-5 hover:border-indigo-400/30 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-lg font-semibold text-white mb-1 truncate group-hover:text-indigo-200 transition-colors">
                          {adset.adset_name}
                        </h4>
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${statusFormatted.bgColor} ${statusFormatted.textColor} ${statusFormatted.borderColor}`}>
                            {statusFormatted.displayText}
                          </div>
                          <div className="text-xs text-slate-400">{adset.campaign_name}</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-2xl font-bold mb-1 ${adset.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(adset.profit)}
                      </div>
                      <div className="text-xs text-slate-400">Net Profit</div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                      <div className={`text-lg font-bold mb-1 ${roasColor}`}>{adset.roas.toFixed(2)}x</div>
                      <div className="text-xs text-slate-400">ROAS</div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-white mb-1">{formatCurrency(adset.spent)}</div>
                      <div className="text-xs text-slate-400">Spent</div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-white mb-1">{adset.ctr.toFixed(2)}%</div>
                      <div className="text-xs text-slate-400">CTR</div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-white mb-1">{adset.performance_score}</div>
                      <div className="text-xs text-slate-400">Score</div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-white mb-1">{formatCurrency(adset.potential_profit_increase)}</div>
                      <div className="text-xs text-slate-400">Potential</div>
                    </div>
                  </div>

                  {/* AI Recommendations */}
                  {adset.recommendations.length > 0 && (
                    <div className="border-t border-slate-700/50 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                          <Brain className="w-3 h-3 text-purple-400" />
                        </div>
                        <span className="text-sm font-medium text-white">AI Recommendations</span>
                        <div className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full">
                          <span className="text-xs text-purple-300">{adset.recommendations.length} actions</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {adset.recommendations.slice(0, 2).map((rec, idx) => {
                          const impactColor = rec.impact === 'high' ? 'border-emerald-500/30 bg-emerald-500/10' :
                                             rec.impact === 'medium' ? 'border-yellow-500/30 bg-yellow-500/10' :
                                             'border-slate-500/30 bg-slate-500/10'
                          const impactText = rec.impact === 'high' ? 'text-emerald-400' :
                                            rec.impact === 'medium' ? 'text-yellow-400' : 'text-slate-400'

                          return (
                            <div key={idx} className={`p-3 rounded-lg border ${impactColor}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-white">{rec.title}</span>
                                <span className={`text-xs px-2 py-1 rounded-full border ${impactColor} ${impactText}`}>
                                  {rec.impact} impact
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mb-2">{rec.description}</div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">{Math.round(rec.confidence)}% confidence</span>
                                <span className={`font-medium ${rec.estimated_profit_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {rec.estimated_profit_change >= 0 ? '+' : ''}{formatCurrency(rec.estimated_profit_change)}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}