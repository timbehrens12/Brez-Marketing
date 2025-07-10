"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Brain, Target, Lightbulb, Calendar, TrendingUp, AlertTriangle, Sparkles, Clock, Zap, Users, DollarSign } from "lucide-react"
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

interface BrandIntelligenceProps {
  campaigns: Campaign[]
  creatives: Creative[]
  stats: BlendedStats
  brandId: string
}

interface BrandInsight {
  id: string
  title: string
  description: string
  category: 'opportunity' | 'optimization' | 'warning' | 'trend'
  impact: 'high' | 'medium' | 'low'
  confidence: number
  actionable: boolean
  relatedCampaigns: string[]
  estimatedImpact: string
}

interface BrandIntelligenceData {
  brandContext: {
    industry: string
    targetAudience: string
    brandGoals: string[]
    seasonality: string
    competitorInsights: string[]
  }
  insights: BrandInsight[]
  strategicRecommendations: {
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    timeline: string
    expectedOutcome: string
  }[]
  opportunityScore: number
}

export function BrandIntelligence({ campaigns, creatives, stats, brandId }: BrandIntelligenceProps) {
  const [intelligenceData, setIntelligenceData] = useState<BrandIntelligenceData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)

  const generateBrandIntelligence = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/brand-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaigns,
          creatives,
          stats,
          brandId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate brand intelligence')
      }

      const data = await response.json()
      setIntelligenceData(data)
      setLastGenerated(new Date())
    } catch (err) {
      console.error('Error generating brand intelligence:', err)
      setError('Failed to generate brand intelligence. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-generate intelligence when component mounts if data is available
  useEffect(() => {
    if (campaigns.length > 0 && !intelligenceData && !isLoading) {
      generateBrandIntelligence()
    }
  }, [campaigns, creatives, stats])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'opportunity': return TrendingUp
      case 'optimization': return Target
      case 'warning': return AlertTriangle
      case 'trend': return Zap
      default: return Lightbulb
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'opportunity': return "text-green-400"
      case 'optimization': return "text-blue-400"
      case 'warning': return "text-red-400"
      case 'trend': return "text-purple-400"
      default: return "text-gray-400"
    }
  }

  const getCategoryBg = (category: string) => {
    switch (category) {
      case 'opportunity': return "bg-green-500/10"
      case 'optimization': return "bg-blue-500/10"
      case 'warning': return "bg-red-500/10"
      case 'trend': return "bg-purple-500/10"
      default: return "bg-gray-500/10"
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return "text-red-400"
      case 'medium': return "text-yellow-400"
      case 'low': return "text-green-400"
      default: return "text-gray-400"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return "text-red-400 border-red-400/30"
      case 'medium': return "text-yellow-400 border-yellow-400/30"
      case 'low': return "text-green-400 border-green-400/30"
      default: return "text-gray-400 border-gray-400/30"
    }
  }

  const getOpportunityScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400"
    if (score >= 60) return "text-yellow-400"
    return "text-red-400"
  }

  const getOpportunityScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500/10"
    if (score >= 60) return "bg-yellow-500/10"
    return "bg-red-500/10"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Brand Intelligence</h2>
          <p className="text-gray-400 text-sm">Context-aware AI recommendations tailored to your brand</p>
        </div>
        <div className="flex items-center gap-3">
          {lastGenerated && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Clock className="w-4 h-4" />
              <span>Updated {format(lastGenerated, 'HH:mm')}</span>
            </div>
          )}
          <Button 
            onClick={generateBrandIntelligence} 
            disabled={isLoading}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate Intelligence
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-4">
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
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {intelligenceData && !isLoading && (
        <div className="space-y-6">
          {/* Brand Context Overview */}
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Target className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Brand Context</CardTitle>
                    <p className="text-gray-400 text-sm">AI understanding of your brand profile</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded-lg ${getOpportunityScoreBg(intelligenceData.opportunityScore)}`}>
                  <span className="text-sm font-medium text-gray-400">Opportunity Score:</span>
                  <span className={`text-lg font-bold ${getOpportunityScoreColor(intelligenceData.opportunityScore)}`}>
                    {intelligenceData.opportunityScore}/100
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Industry</h4>
                    <p className="text-white">{intelligenceData.brandContext.industry}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Target Audience</h4>
                    <p className="text-white">{intelligenceData.brandContext.targetAudience}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Seasonality</h4>
                    <p className="text-white">{intelligenceData.brandContext.seasonality}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Brand Goals</h4>
                    <div className="flex flex-wrap gap-2">
                      {intelligenceData.brandContext.brandGoals.map((goal, index) => (
                        <Badge key={index} variant="secondary" className="bg-blue-500/20 text-blue-400">
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Competitor Insights</h4>
                    <div className="space-y-1">
                      {intelligenceData.brandContext.competitorInsights.map((insight, index) => (
                        <p key={index} className="text-sm text-gray-300">• {insight}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Lightbulb className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-white">AI Insights</CardTitle>
                  <p className="text-gray-400 text-sm">Contextual insights based on your brand profile</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {intelligenceData.insights.map((insight) => {
                  const Icon = getCategoryIcon(insight.category)
                  return (
                    <div key={insight.id} className={`p-4 rounded-lg border ${getCategoryBg(insight.category)} border-gray-700`}>
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 ${getCategoryColor(insight.category)} mt-0.5 flex-shrink-0`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-white font-medium">{insight.title}</h4>
                            <Badge variant="outline" className={`text-xs ${getImpactColor(insight.impact)}`}>
                              {insight.impact} impact
                            </Badge>
                            <span className="text-xs text-gray-400">{insight.confidence}% confidence</span>
                          </div>
                          <p className="text-gray-300 mb-3">{insight.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-400">Est. Impact:</span>
                              <span className="text-sm text-white">{insight.estimatedImpact}</span>
                            </div>
                            {insight.actionable && (
                              <Badge variant="outline" className="text-green-400 border-green-400/30">
                                Actionable
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Strategic Recommendations */}
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Sparkles className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Strategic Recommendations</CardTitle>
                  <p className="text-gray-400 text-sm">Long-term strategic actions for your brand</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {intelligenceData.strategicRecommendations.map((recommendation, index) => (
                  <div key={index} className="p-4 bg-[#0A0A0A] rounded-lg border border-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Target className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-white font-medium">{recommendation.title}</h4>
                          <Badge variant="outline" className={getPriorityColor(recommendation.priority)}>
                            {recommendation.priority} priority
                          </Badge>
                        </div>
                        <p className="text-gray-300 mb-3">{recommendation.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-400">Timeline:</span>
                            <p className="text-sm text-white">{recommendation.timeline}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-400">Expected Outcome:</span>
                            <p className="text-sm text-white">{recommendation.expectedOutcome}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 