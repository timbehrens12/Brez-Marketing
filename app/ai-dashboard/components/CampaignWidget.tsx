"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Target, 
  DollarSign, 
  Eye, 
  MousePointer, 
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  Activity
} from "lucide-react"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatters"

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

interface CampaignWidgetProps {
  campaigns: Campaign[]
  brandId: string
  dateRange: {
    from: Date
    to: Date
  }
}

export function CampaignWidget({ campaigns, brandId, dateRange }: CampaignWidgetProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [loadingRecommendations, setLoadingRecommendations] = useState<Set<string>>(new Set())
  const [campaignRecommendations, setCampaignRecommendations] = useState<Map<string, any>>(new Map())

  // Generate AI recommendation for a campaign
  const generateAIRecommendation = async (campaign: Campaign) => {
    if (loadingRecommendations.has(campaign.campaign_id)) return
    
    setLoadingRecommendations(prev => new Set(prev).add(campaign.campaign_id))
    
    try {
      const response = await fetch('/api/ai/campaign-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          campaignId: campaign.campaign_id,
          campaign: {
            name: campaign.campaign_name,
            objective: campaign.objective,
            status: campaign.status,
            budget: campaign.budget,
            spent: campaign.spent,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            reach: campaign.reach,
            ctr: campaign.ctr,
            cpc: campaign.cpc,
            roas: campaign.roas,
            conversions: campaign.conversions,
            cost_per_conversion: campaign.cost_per_conversion
          },
          includeCreatives: true
        })
      })

      if (!response.ok) throw new Error('Failed to generate recommendation')

      const data = await response.json()
      
      // Process the AI response
      const recommendation = {
        action: getRecommendationAction(data.analysis),
        reasoning: data.analysis.insights?.join(' ') || 'Analysis complete',
        forecast: data.analysis.predicted_outcomes?.join(' ') || 'Optimization in progress',
        priority: getPriorityFromGrade(data.analysis.grade),
        grade: data.analysis.grade,
        fullAnalysis: data.analysis
      }

      setCampaignRecommendations(prev => new Map(prev).set(campaign.campaign_id, recommendation))
      
    } catch (error) {
      console.error('Error generating AI recommendation:', error)
      // Set a fallback recommendation
      setCampaignRecommendations(prev => new Map(prev).set(campaign.campaign_id, {
        action: 'Monitor Performance',
        reasoning: 'Analysis in progress. Check back soon for detailed insights.',
        forecast: 'Monitoring for optimization opportunities.',
        priority: 'medium' as const,
        grade: 'B'
      }))
    } finally {
      setLoadingRecommendations(prev => {
        const newSet = new Set(prev)
        newSet.delete(campaign.campaign_id)
        return newSet
      })
    }
  }

  const getRecommendationAction = (analysis: any): string => {
    if (analysis.grade === 'A') return 'Scale Budget'
    if (analysis.grade === 'B') return 'Optimize Targeting'
    if (analysis.grade === 'C') return 'Adjust Creatives'
    if (analysis.grade === 'D') return 'Reduce Budget'
    return 'Pause Campaign'
  }

  const getPriorityFromGrade = (grade: string): 'high' | 'medium' | 'low' => {
    if (grade === 'A') return 'low'
    if (grade === 'B') return 'medium'
    return 'high'
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400'
      case 'archived': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-blue-500/20 text-blue-400'
    }
  }

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-green-400'
    }
  }

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return AlertTriangle
      case 'medium': return Clock
      case 'low': return CheckCircle
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Campaign Performance</h2>
          <p className="text-gray-400 text-sm">All active campaigns with AI recommendations</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-gray-400 border-gray-600">
            {campaigns.length} Campaigns
          </Badge>
          <Badge variant="outline" className="text-blue-400 border-blue-600">
            <Brain className="w-3 h-3 mr-1" />
            AI Analysis
          </Badge>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#333] hover:bg-[#222]">
                  <TableHead className="text-gray-400">Campaign</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Budget</TableHead>
                  <TableHead className="text-gray-400">Spent</TableHead>
                  <TableHead className="text-gray-400">ROAS</TableHead>
                  <TableHead className="text-gray-400">CTR</TableHead>
                  <TableHead className="text-gray-400">CPC</TableHead>
                  <TableHead className="text-gray-400">Conversions</TableHead>
                  <TableHead className="text-gray-400">AI Recommendation</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const recommendation = campaignRecommendations.get(campaign.campaign_id)
                  const isLoading = loadingRecommendations.has(campaign.campaign_id)
                  
                  return (
                    <TableRow key={campaign.campaign_id} className="border-[#333] hover:bg-[#222]">
                      <TableCell>
                        <div>
                          <p className="font-medium text-white truncate max-w-[200px]">
                            {campaign.campaign_name}
                          </p>
                          <p className="text-xs text-gray-400">{campaign.objective}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(campaign.status)} variant="outline">
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white">
                        {formatCurrency(campaign.budget)}
                      </TableCell>
                      <TableCell className="text-white">
                        {formatCurrency(campaign.spent)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className={`font-medium ${campaign.roas >= 3 ? 'text-green-400' : campaign.roas >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {campaign.roas.toFixed(2)}x
                          </span>
                          {campaign.roas >= 3 ? <TrendingUp className="w-3 h-3 text-green-400" /> : 
                           campaign.roas < 2 ? <TrendingDown className="w-3 h-3 text-red-400" /> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        {formatPercentage(campaign.ctr)}
                      </TableCell>
                      <TableCell className="text-white">
                        {formatCurrency(campaign.cpc)}
                      </TableCell>
                      <TableCell className="text-white">
                        {formatNumber(campaign.conversions)}
                      </TableCell>
                      <TableCell>
                        {recommendation ? (
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1 ${getPriorityColor(recommendation.priority)}`}>
                              {(() => {
                                const Icon = getPriorityIcon(recommendation.priority)
                                return <Icon className="w-3 h-3" />
                              })()}
                              <span className="text-xs font-medium">{recommendation.action}</span>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateAIRecommendation(campaign)}
                            disabled={isLoading}
                            className="text-blue-400 border-blue-600 hover:bg-blue-500/10"
                          >
                            {isLoading ? (
                              <>
                                <Activity className="w-3 h-3 mr-1 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Brain className="w-3 h-3 mr-1" />
                                Get AI Insight
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCampaign(campaign)}
                              className="text-gray-400 hover:text-white"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-[#1A1A1A] border-[#333] text-white max-w-4xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-400" />
                                Campaign Analysis: {campaign.campaign_name}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Campaign Overview */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-[#222] rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-4 h-4 text-green-400" />
                                    <span className="text-sm text-gray-400">Spent</span>
                                  </div>
                                  <p className="text-xl font-bold text-white">{formatCurrency(campaign.spent)}</p>
                                </div>
                                <div className="p-4 bg-[#222] rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Target className="w-4 h-4 text-purple-400" />
                                    <span className="text-sm text-gray-400">ROAS</span>
                                  </div>
                                  <p className="text-xl font-bold text-white">{campaign.roas.toFixed(2)}x</p>
                                </div>
                                <div className="p-4 bg-[#222] rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MousePointer className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm text-gray-400">CTR</span>
                                  </div>
                                  <p className="text-xl font-bold text-white">{formatPercentage(campaign.ctr)}</p>
                                </div>
                                <div className="p-4 bg-[#222] rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <ShoppingBag className="w-4 h-4 text-green-400" />
                                    <span className="text-sm text-gray-400">Conversions</span>
                                  </div>
                                  <p className="text-xl font-bold text-white">{formatNumber(campaign.conversions)}</p>
                                </div>
                              </div>

                              {/* AI Analysis */}
                              {recommendation && (
                                <div className="p-4 bg-[#222] rounded-lg">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Brain className="w-5 h-5 text-blue-400" />
                                    <h3 className="font-semibold text-white">AI Analysis</h3>
                                    <Badge variant="outline" className={`${getPriorityColor(recommendation.priority)} border-current`}>
                                      {recommendation.priority.toUpperCase()} PRIORITY
                                    </Badge>
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-sm text-gray-400 mb-1">Recommended Action</p>
                                      <p className="text-white font-medium">{recommendation.action}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-400 mb-1">Analysis</p>
                                      <p className="text-gray-300">{recommendation.reasoning}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-400 mb-1">Forecast</p>
                                      <p className="text-gray-300">{recommendation.forecast}</p>
                                    </div>
                                    {recommendation.grade && (
                                      <div>
                                        <p className="text-sm text-gray-400 mb-1">Performance Grade</p>
                                        <Badge variant="outline" className={`${
                                          recommendation.grade === 'A' ? 'text-green-400 border-green-400' :
                                          recommendation.grade === 'B' ? 'text-blue-400 border-blue-400' :
                                          recommendation.grade === 'C' ? 'text-yellow-400 border-yellow-400' :
                                          'text-red-400 border-red-400'
                                        }`}>
                                          Grade {recommendation.grade}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                                  <Zap className="w-4 h-4 mr-2" />
                                  Apply Recommendations
                                </Button>
                                <Button variant="outline" size="sm" className="border-gray-600">
                                  Export Analysis
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 