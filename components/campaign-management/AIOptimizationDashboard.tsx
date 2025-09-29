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
     <div className="bg-gradient-to-br from-[#FF2A2A]/5 to-[#FF4A4A]/5 overflow-hidden border border-[#FF2A2A]/20 rounded-2xl">
       <div className="bg-gradient-to-r from-[#FF2A2A]/10 to-[#FF4A4A]/5 p-4 border-b border-[#FF2A2A]/20">
         <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-gradient-to-br from-[#FF2A2A]/20 to-[#FF2A2A]/10 rounded-xl 
                         flex items-center justify-center border border-[#FF2A2A]/30">
             <Brain className="w-4 h-4 text-[#FF2A2A]" />
           </div>
           <div>
             <h3 className="text-lg font-bold text-white">Profit Optimizer</h3>
             <p className="text-xs text-gray-400">AI-powered profitability insights</p>
           </div>
         </div>
       </div>
        
      <div className="p-4">
        {/* Profit Focus Metrics */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-lg 
                              flex items-center justify-center border border-green-500/30">
                  <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-white">Total Profit Today</span>
              </div>
              <div className="text-lg font-bold text-green-400">{formatCurrency(summary.total_profit)}</div>
            </div>
            <div className="text-xs text-gray-400">
              Average ROAS: {summary.average_roas.toFixed(2)}x • {summary.optimizations_available} AI recommendations
            </div>
          </div>
        </div>
        
        {/* AI-Powered Profit Opportunities */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#FF2A2A]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Top Profit Opportunities
          </h4>
          
          {adsets.slice(0, 3).map((adset) => {
            const profitPotential = adset.recommendations.reduce((sum, rec) => sum + rec.estimated_profit_change, 0)
            return (
              <div 
                key={adset.adset_id}
                className={`bg-gradient-to-r border rounded-xl p-3 hover:border-opacity-50 transition-all duration-300 ${
                  adset.roas >= 3 ? 'from-green-500/10 to-emerald-500/5 border-green-500/20' :
                  adset.roas >= 2 ? 'from-yellow-500/10 to-amber-500/5 border-yellow-500/20' :
                  'from-red-500/10 to-rose-500/5 border-red-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h5 className="text-sm font-semibold text-white truncate">{adset.adset_name}</h5>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={
                        adset.roas >= 3 ? 'text-green-400' : 
                        adset.roas >= 2 ? 'text-yellow-400' : 
                        'text-red-400'
                      }>
                        {adset.roas.toFixed(1)}x ROAS
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-white">{formatCurrency(adset.profit)} profit</span>
                    </div>
                  </div>
                  
                  {profitPotential > 0 && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-green-400">+{formatCurrency(profitPotential)}</div>
                      <div className="text-xs text-gray-500">potential</div>
                    </div>
                  )}
                </div>
                
                {adset.recommendations.length > 0 && (
                  <div className="space-y-1">
                    {adset.recommendations.slice(0, 2).map((rec, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-black/20 rounded-lg p-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className={`w-3 h-3 rounded-full flex items-center justify-center text-xs font-bold ${
                            rec.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                            rec.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {rec.impact === 'high' ? '!' : rec.impact === 'medium' ? '•' : '·'}
                          </div>
                          <span className="text-xs text-white font-medium truncate">{rec.title}</span>
                        </div>
                        <div className="text-xs text-green-400 font-medium">
                          +{formatCurrency(rec.estimated_profit_change)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}