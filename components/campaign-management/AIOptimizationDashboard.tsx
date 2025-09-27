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

  // Calculate profitability metrics
  const totalProfit = summary?.total_profit || 0
  const totalSpend = summary?.total_spend || 0
  const avgRoas = summary?.average_roas || 0
  const profitMargin = totalSpend > 0 ? (totalProfit / (totalProfit + totalSpend)) * 100 : 0
  const profitColor = totalProfit > 0 ? 'text-green-400' : 'text-red-400'

  if (isLoading) {
    return (
      <Card className="h-full bg-gradient-to-br from-[#1a1a1a] to-[#222] border border-[#333]">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="w-12 h-12 text-[#FF2A2A] animate-pulse mx-auto mb-4" />
            <p className="text-gray-400">Analyzing ad performance...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

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
    <Card className="h-full bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#333]/50 shadow-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#FF2A2A]/10 to-transparent border-b border-[#333]/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FF2A2A] rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            Profitability Engine
          </CardTitle>
          <div className="text-right">
            <div className={`text-2xl font-black ${profitColor}`}>
              {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
            </div>
            <div className="text-xs text-gray-400">Net Profit</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">

        {/* Key Profitability Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">ROAS</span>
            </div>
            <div className="text-xl font-black text-white">{avgRoas.toFixed(1)}x</div>
            <div className="text-xs text-gray-500">Return on Ad Spend</div>
          </div>

          <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Margin</span>
            </div>
            <div className="text-xl font-black text-white">{profitMargin.toFixed(0)}%</div>
            <div className="text-xs text-gray-500">Profit Margin</div>
          </div>
        </div>

        {/* Optimization Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FF2A2A]" />
            AI Recommendations
          </h4>

          {/* High Priority Actions */}
          {adsets
            .filter(adset => adset.alert_level === 'critical' || adset.alert_level === 'warning')
            .slice(0, 3)
            .map((adset) => (
              <div
                key={adset.adset_id}
                className="bg-gradient-to-r from-[#FF2A2A]/5 to-transparent border border-[#FF2A2A]/20 rounded-lg p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-white truncate">{adset.adset_name}</h5>
                    <p className="text-xs text-gray-400">{adset.campaign_name}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    adset.alert_level === 'critical'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {adset.alert_level === 'critical' ? 'Critical' : 'Needs Attention'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div>
                    <span className="text-gray-400">ROAS:</span>
                    <span className="text-white ml-1 font-medium">{adset.roas.toFixed(1)}x</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Profit:</span>
                    <span className={`ml-1 font-medium ${adset.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {adset.profit >= 0 ? '+' : ''}{formatCurrency(adset.profit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Score:</span>
                    <span className="text-white ml-1 font-medium">{adset.performance_score}</span>
                  </div>
                </div>

                {adset.recommendations.length > 0 && (
                  <div className="space-y-2">
                    {adset.recommendations.slice(0, 1).map((rec, idx) => (
                      <div key={idx} className="bg-[#0f0f0f]/50 rounded p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-white">{rec.title}</span>
                          <span className="text-xs text-green-400">
                            +{formatCurrency(rec.estimated_profit_change)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

          {/* Success Stories */}
          {adsets.filter(adset => adset.alert_level === 'success').length > 0 && (
            <div className="bg-gradient-to-r from-green-500/5 to-transparent border border-green-500/20 rounded-lg p-3">
              <h5 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Top Performer
              </h5>
              {(() => {
                const topPerformer = adsets
                  .filter(adset => adset.alert_level === 'success')
                  .sort((a, b) => b.roas - a.roas)[0]

                return topPerformer ? (
                  <div>
                    <p className="text-sm text-white font-medium">{topPerformer.adset_name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{topPerformer.roas.toFixed(1)}x ROAS</span>
                      <span className="text-xs text-green-400">+{formatCurrency(topPerformer.profit)} profit</span>
                    </div>
                  </div>
                ) : null
              })()}
            </div>
          )}
        </div>

        {/* Quick Stats Footer */}
        <div className="border-t border-[#333]/30 pt-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-white">{summary.active_adsets}</div>
              <div className="text-xs text-gray-400">Active Adsets</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{formatCurrency(totalSpend)}</div>
              <div className="text-xs text-gray-400">Total Spent</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{summary.total_conversions}</div>
              <div className="text-xs text-gray-400">Conversions</div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}