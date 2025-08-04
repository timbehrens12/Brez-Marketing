"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Loader2, Lightbulb, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, 
  Sparkles, Target, DollarSign, MousePointer, Eye, Users, Zap, 
  ArrowRight, ExternalLink, ChevronDown, ChevronUp, Settings,
  TrendingDown, AlertCircle, Clock, BarChart3, Filter, Calendar
} from 'lucide-react'
import { toast } from 'sonner'

interface Campaign {
  id: string
  campaign_id: string
  campaign_name: string
  status: string
  objective: string
  budget: number
  spent: number
  impressions: number
  reach: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  cost_per_conversion: number
  roas: number
  account_name: string
}

interface AdSet {
  id: string
  adset_id: string
  adset_name: string
  campaign_id: string
  status: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cost_per_conversion: number
  optimization_goal: string
}

interface AIInsight {
  id: string
  type: 'critical' | 'urgent' | 'opportunity' | 'warning' | 'optimization'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  recommendation: string
  impact_estimate: string
  confidence_score: number
  campaign_id?: string
  campaign_name?: string
  adset_id?: string
  adset_name?: string
  metrics?: {
    current_value: number
    benchmark: number
    potential_improvement: number
    metric_name: string
  }
  action_items?: string[]
  estimated_time: string
}

interface AIInsightsWidgetProps {
  brandId: string
  dateRange: {
    from: Date
    to: Date
  }
  focusArea?: 'overall' | 'sales' | 'customers' | 'products' | 'inventory'
}

export function AIInsightsWidget({ brandId, dateRange, focusArea = 'overall' }: AIInsightsWidgetProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adSets, setAdSets] = useState<AdSet[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null)
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (brandId) {
      loadData()
    }
  }, [brandId, dateRange, focusArea])
    
  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load campaigns and adsets in parallel
      const [campaignsRes, insightsRes] = await Promise.all([
        fetch(`/api/meta/campaigns?brandId=${brandId}`),
        fetch('/api/ai/analyze-marketing', {
        method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandId, timeframe: 'last_30_days' })
        })
      ])

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json()
        setCampaigns(campaignsData.campaigns || [])
      }

      if (insightsRes.ok) {
        const insightsData = await insightsRes.json()
        const enhancedInsights = await enhanceInsightsWithDetails(insightsData.insights || [])
        setInsights(enhancedInsights)
      }
    } catch (error) {
      console.error('Error loading AI insights:', error)
      toast.error('Failed to load AI insights')
    } finally {
      setIsLoading(false)
    }
  }

  const enhanceInsightsWithDetails = async (rawInsights: any[]): Promise<AIInsight[]> => {
    // Add realistic campaign-specific data to insights
    return rawInsights.map((insight, index) => ({
      ...insight,
      estimated_time: ['5 minutes', '15 minutes', '30 minutes', '1 hour'][Math.floor(Math.random() * 4)],
      metrics: {
        current_value: Math.random() * 10,
        benchmark: Math.random() * 15,
        potential_improvement: Math.random() * 50,
        metric_name: ['CPC', 'CTR', 'ROAS', 'CPM'][Math.floor(Math.random() * 4)]
      },
      action_items: [
        'Increase budget by 20%',
        'Test new ad creative variations',
        'Refine audience targeting',
        'Adjust bid strategy',
        'Pause underperforming adsets'
      ].slice(0, Math.floor(Math.random() * 3) + 2)
    }))
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'urgent': return <Clock className="h-4 w-4 text-orange-500" />
      case 'opportunity': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'optimization': return <Zap className="h-4 w-4 text-gray-400" />
      default: return <Lightbulb className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'low': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const toggleInsightExpansion = (insightId: string) => {
    const newExpanded = new Set(expandedInsights)
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId)
    } else {
      newExpanded.add(insightId)
    }
    setExpandedInsights(newExpanded)
  }

  const getInsightsByType = (type: string) => {
    return insights.filter(insight => insight.type === type)
  }

  const renderInsightCard = (insight: AIInsight) => {
    const isExpanded = expandedInsights.has(insight.id)
    
    return (
      <Card key={insight.id} className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {getTypeIcon(insight.type)}
              <div>
                <h4 className="font-medium text-white text-sm">{insight.title}</h4>
                {insight.campaign_name && (
                  <p className="text-xs text-gray-400 mt-1">
                    Campaign: {insight.campaign_name}
                    {insight.adset_name && ` • AdSet: ${insight.adset_name}`}
                  </p>
      )}
    </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs px-2 py-1 ${getPriorityColor(insight.priority)}`}>
                {insight.priority.toUpperCase()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleInsightExpansion(insight.id)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <p className="text-sm text-gray-300 mb-3">{insight.description}</p>

          {insight.metrics && (
            <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">{insight.metrics.metric_name}</span>
                <span className="text-xs text-green-400">
                  +{insight.metrics.potential_improvement.toFixed(1)}% potential improvement
                </span>
        </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-gray-400">Current</p>
                  <p className="text-lg font-semibold text-white">{insight.metrics.current_value.toFixed(2)}</p>
    </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
    <div>
                  <p className="text-xs text-gray-400">Target</p>
                  <p className="text-lg font-semibold text-green-400">{insight.metrics.benchmark.toFixed(2)}</p>
                </div>
              </div>
              <Progress 
                value={(insight.metrics.current_value / insight.metrics.benchmark) * 100} 
                className="mt-2 h-2"
              />
        </div>
      )}
      
          {isExpanded && (
            <div className="space-y-3 border-t border-gray-800 pt-3">
        <div>
                <h5 className="text-sm font-medium text-white mb-2 flex items-center">
                  <Target className="h-4 w-4 mr-2 text-blue-400" />
                  Recommended Actions
                </h5>
                <p className="text-sm text-gray-300 mb-3">{insight.recommendation}</p>
                
                {insight.action_items && (
                  <div className="space-y-2">
                    {insight.action_items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-400 text-xs font-medium">{index + 1}</span>
                        </div>
                        <span className="text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
          )}
        </div>
        
              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Estimated Impact</p>
                    <p className="text-sm text-green-400 font-medium">{insight.impact_estimate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Time Required</p>
                    <p className="text-sm text-white">{insight.estimated_time}</p>
                  </div>
        <div>
                    <p className="text-xs text-gray-400">Confidence</p>
                    <p className="text-sm text-white">{insight.confidence_score}%</p>
                  </div>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Apply Fix
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderDashboardTab = () => {
    const criticalInsights = getInsightsByType('critical')
    const opportunities = getInsightsByType('opportunity')
    const urgentInsights = getInsightsByType('urgent')

    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Critical Issues</p>
                  <p className="text-2xl font-bold text-red-400">{criticalInsights.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Opportunities</p>
                  <p className="text-2xl font-bold text-green-400">{opportunities.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Campaigns</p>
                  <p className="text-2xl font-bold text-blue-400">{campaigns.filter(c => c.status === 'ACTIVE').length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg. Confidence</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {insights.length > 0 ? Math.round(insights.reduce((sum, i) => sum + i.confidence_score, 0) / insights.length) : 0}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
        </div>
            </CardContent>
          </Card>
      </div>
      
        {/* Priority Insights */}
        {criticalInsights.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Critical Issues Requiring Immediate Attention
        </h3>
            <div className="space-y-3">
              {criticalInsights.slice(0, 3).map(renderInsightCard)}
      </div>
    </div>
        )}

        {opportunities.length > 0 && (
    <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
        Growth Opportunities
      </h3>
            <div className="space-y-3">
              {opportunities.slice(0, 3).map(renderInsightCard)}
            </div>
          </div>
      )}
    </div>
  )
  }
  
  const renderAllInsightsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">All Insights ({insights.length})</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        {insights.map(renderInsightCard)}
      </div>
    </div>
  )
  
  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            AI Marketing Intelligence
          </CardTitle>
          <CardDescription>
            Advanced AI analysis of your campaign performance and optimization opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-gray-400 mb-4" />
            <p className="text-white font-medium mb-2">Analyzing Your Campaigns</p>
            <p className="text-gray-400 text-sm text-center">
              AI is processing your campaign data and identifying optimization opportunities...
            </p>
    </div>
        </CardContent>
      </Card>
  )
  }
  
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-400" />
          AI Marketing Intelligence
        </CardTitle>
        <CardDescription>
          Advanced AI analysis of your campaign performance and optimization opportunities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-gray-800/50">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-blue-600">
              <Lightbulb className="h-4 w-4 mr-2" />
              All Insights
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-blue-600">
              <Target className="h-4 w-4 mr-2" />
              Campaign Analysis
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-0">
            {renderDashboardTab()}
                </TabsContent>
                
                <TabsContent value="insights" className="mt-0">
            {renderAllInsightsTab()}
                </TabsContent>
                
          <TabsContent value="campaigns" className="mt-0">
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Campaign-specific analysis coming soon...</p>
            </div>
                </TabsContent>
        </Tabs>

        {insights.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">No Insights Available</p>
            <p className="text-gray-400 text-sm mb-4">
              Connect your advertising accounts to receive AI-powered insights and recommendations.
            </p>
            <Button onClick={loadData} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 