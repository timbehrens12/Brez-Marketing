"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useBrandContext } from '@/lib/context/BrandContext'

// Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BrandSelector from '@/components/BrandSelector'
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

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
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Sparkles,
  Clock,
  X,
  ThumbsUp,
  ThumbsDown,
  Undo2,
  Info,
  TrendingDown,
  Activity
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
}

interface Recommendation {
  id: string
  type: 'budget' | 'audience' | 'creative' | 'bid' | 'frequency' | 'targeting'
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
  status?: string
  generatedAt?: string
  estimatedTimeToStabilize?: string
}

export default function MarketingAssistantPage() {
  const { userId } = useAuth()
  const { selectedBrandId } = useBrandContext()
  
  // State
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [testingRecommendations, setTestingRecommendations] = useState<Recommendation[]>([])
  const [trends, setTrends] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('active')
  
  // Dialog state
  const [showDismissDialog, setShowDismissDialog] = useState(false)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null)
  const [dismissReason, setDismissReason] = useState('')
  const [resultReason, setResultReason] = useState('')
  const [resultType, setResultType] = useState<'success' | 'failure'>('success')

  // Data Loading
  useEffect(() => {
    if (selectedBrandId) {
      loadDashboardData()
    }
  }, [selectedBrandId])

  const loadDashboardData = async () => {
    if (!selectedBrandId) return
    
    setLoading(true)
    try {
      await Promise.all([
        fetchMetrics(),
        fetchRecommendations(),
        fetchTrends()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/marketing-assistant/metrics?brandId=${selectedBrandId}`)
      if (response.ok) {
        const data = await response.json()
        setKpiMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(`/api/marketing-assistant/recommendations?brandId=${selectedBrandId}`)
      if (response.ok) {
        const data = await response.json()
        
        // Separate active (new) vs testing recommendations
        const active = data.recommendations?.filter((r: Recommendation) => 
          !r.status || r.status === 'new'
        ) || []
        const testing = data.recommendations?.filter((r: Recommendation) => 
          r.status === 'applied' || r.status === 'testing'
        ) || []
        
        setRecommendations(active)
        setTestingRecommendations(testing)
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    }
  }

  const fetchTrends = async () => {
    try {
      const response = await fetch(`/api/marketing-assistant/trends?brandId=${selectedBrandId}`)
      if (response.ok) {
        const data = await response.json()
        setTrends(data)
      }
    } catch (error) {
      console.error('Error fetching trends:', error)
    }
  }

  const handleRecommendationAction = async (
    recommendationId: string, 
    action: 'dismiss' | 'apply' | 'mark_successful' | 'mark_failed' | 'rollback',
    reason?: string
  ) => {
    setActionLoading(recommendationId)
    try {
      const response = await fetch('/api/marketing-assistant/recommendation-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          recommendationId,
          reason
        })
      })

      if (response.ok) {
        // Refresh recommendations after action
        await fetchRecommendations()
        
        // Close dialogs
        setShowDismissDialog(false)
        setShowResultDialog(false)
        setSelectedRecommendation(null)
        setDismissReason('')
        setResultReason('')
      } else {
        console.error('Failed to perform action')
      }
    } catch (error) {
      console.error('Error performing action:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const openDismissDialog = (rec: Recommendation) => {
    setSelectedRecommendation(rec)
    setShowDismissDialog(true)
  }

  const openResultDialog = (rec: Recommendation, type: 'success' | 'failure') => {
    setSelectedRecommendation(rec)
    setResultType(type)
    setShowResultDialog(true)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'budget': return <DollarSign className="w-4 h-4" />
      case 'creative': return <Sparkles className="w-4 h-4" />
      case 'audience': return <Target className="w-4 h-4" />
      case 'bid': return <TrendingUp className="w-4 h-4" />
      case 'frequency': return <Activity className="w-4 h-4" />
      case 'targeting': return <Target className="w-4 h-4" />
      default: return <Brain className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E]">
        <div className="container mx-auto px-6 py-8">
          <UnifiedLoading {...getPageLoadingConfig('marketing-assistant')} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Brain className="w-10 h-10 text-blue-400" />
              AI Marketing Assistant
            </h1>
            <p className="text-gray-400 text-lg">
              Intelligent optimization recommendations for your campaigns (Last 7 Days)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <BrandSelector onSelect={() => {}} />
            <Button 
              onClick={loadDashboardData}
              variant="outline"
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Band */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                <span>Spend</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${kpiMetrics?.spend?.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Eye className="w-4 h-4" />
                <span>Impressions</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {kpiMetrics?.impressions?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <MousePointer className="w-4 h-4" />
                <span>Clicks</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {kpiMetrics?.clicks?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <ShoppingCart className="w-4 h-4" />
                <span>Conversions</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {kpiMetrics?.conversions?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Target className="w-4 h-4" />
                <span>CPA</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${kpiMetrics?.cpa?.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <MousePointer className="w-4 h-4" />
                <span>CPC</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${kpiMetrics?.cpc?.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>ROAS</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {kpiMetrics?.roas?.toFixed(2) || '0.00'}x
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                <span>Revenue</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${kpiMetrics?.revenue?.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-gray-800">
            <TabsTrigger value="active" className="data-[state=active]:bg-blue-600">
              <Sparkles className="w-4 h-4 mr-2" />
              Active ({recommendations.length})
            </TabsTrigger>
            <TabsTrigger value="testing" className="data-[state=active]:bg-purple-600">
              <Clock className="w-4 h-4 mr-2" />
              Testing ({testingRecommendations.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Recommendations */}
          <TabsContent value="active" className="space-y-4">
            {recommendations.length === 0 ? (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">All Clear!</h3>
                  <p className="text-gray-400">
                    No new optimization recommendations at this time. Your campaigns are performing well.
                  </p>
                </CardContent>
              </Card>
            ) : (
              recommendations.map((rec) => (
                <Card key={rec.id} className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`${getPriorityColor(rec.priority)} border`}>
                            {rec.priority}
                          </Badge>
                          <Badge variant="outline" className="border-gray-700 text-gray-300">
                            {getTypeIcon(rec.type)}
                            <span className="ml-2 capitalize">{rec.type}</span>
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {rec.campaignName}
                          </span>
                        </div>
                        <CardTitle className="text-xl text-white mb-2">{rec.title}</CardTitle>
                        <CardDescription className="text-gray-400">
                          {rec.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Root Cause */}
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-start gap-2 text-sm">
                        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-gray-300 mb-1">Why this matters:</div>
                          <div className="text-gray-400">{rec.rootCause}</div>
                        </div>
                      </div>
                    </div>

                    {/* Projected Impact */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                        <div className="text-xs text-gray-500 mb-1">Projected Revenue</div>
                        <div className="text-lg font-bold text-green-400">
                          +${rec.projectedImpact.revenue.toFixed(0)}
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                        <div className="text-xs text-gray-500 mb-1">Expected ROAS</div>
                        <div className="text-lg font-bold text-blue-400">
                          {rec.projectedImpact.roas.toFixed(2)}x
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                        <div className="text-xs text-gray-500 mb-1">Confidence</div>
                        <div className="text-lg font-bold text-purple-400">
                          {rec.projectedImpact.confidence}%
                        </div>
                      </div>
                    </div>

                    {/* Current vs Recommended */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex-1 bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                        <div className="text-xs text-gray-500 mb-1">Current</div>
                        <div className="font-mono text-gray-300">{rec.currentValue}</div>
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-green-400" />
                      <div className="flex-1 bg-gray-800/30 rounded-lg p-3 border border-green-900">
                        <div className="text-xs text-gray-500 mb-1">Recommended</div>
                        <div className="font-mono text-green-400">{rec.recommendedValue}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        onClick={() => handleRecommendationAction(rec.id, 'apply')}
                        disabled={actionLoading === rec.id}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Apply & Test
                      </Button>
                      <Button
                        onClick={() => openDismissDialog(rec)}
                        disabled={actionLoading === rec.id}
                        variant="outline"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Testing Recommendations */}
          <TabsContent value="testing" className="space-y-4">
            {testingRecommendations.length === 0 ? (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Active Tests</h3>
                  <p className="text-gray-400">
                    Apply recommendations from the Active tab to start testing optimizations.
                  </p>
                </CardContent>
              </Card>
            ) : (
              testingRecommendations.map((rec) => (
                <Card key={rec.id} className="bg-gray-900/50 border-purple-900/50 hover:border-purple-800 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="bg-purple-900/50 text-purple-300 border-purple-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Testing
                          </Badge>
                          <Badge variant="outline" className="border-gray-700 text-gray-300">
                            {getTypeIcon(rec.type)}
                            <span className="ml-2 capitalize">{rec.type}</span>
                          </Badge>
                        </div>
                        <CardTitle className="text-xl text-white mb-2">{rec.title}</CardTitle>
                        <CardDescription className="text-gray-400">
                          Applied changes are being tested. Wait {rec.estimatedTimeToStabilize || '7 days'} to measure results.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Testing Timeline */}
                    <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-900/50">
                      <div className="flex items-center gap-2 text-sm text-purple-300 mb-2">
                        <Activity className="w-4 h-4" />
                        <span className="font-semibold">Test Period: {rec.estimatedTimeToStabilize || '7 days'}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Monitor performance during this period to determine if the optimization is working as predicted.
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => openResultDialog(rec, 'success')}
                        disabled={actionLoading === rec.id}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Mark Successful
                      </Button>
                      <Button
                        onClick={() => openResultDialog(rec, 'failure')}
                        disabled={actionLoading === rec.id}
                        variant="outline"
                        className="flex-1 border-red-900 text-red-400 hover:bg-red-900/20"
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Mark Failed
                      </Button>
                      <Button
                        onClick={() => handleRecommendationAction(rec.id, 'rollback')}
                        disabled={actionLoading === rec.id}
                        variant="outline"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      >
                        <Undo2 className="w-4 h-4 mr-2" />
                        Rollback
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dismiss Dialog */}
      <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Dismiss Recommendation</DialogTitle>
            <DialogDescription className="text-gray-400">
              Why are you dismissing this recommendation? This helps our AI learn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason" className="text-gray-300">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="e.g., Already implemented manually, not relevant to our strategy..."
                className="bg-gray-800 border-gray-700 text-white mt-2"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDismissDialog(false)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedRecommendation && handleRecommendationAction(
                selectedRecommendation.id,
                'dismiss',
                dismissReason
              )}
              className="bg-red-600 hover:bg-red-700"
            >
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>
              {resultType === 'success' ? 'Mark as Successful' : 'Mark as Failed'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {resultType === 'success' 
                ? 'Great! Tell us what worked well so our AI can learn.'
                : 'Help us understand what didn\'t work so we can improve future recommendations.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="result" className="text-gray-300">
                {resultType === 'success' ? 'What improved?' : 'What went wrong?'}
              </Label>
              <Textarea
                id="result"
                value={resultReason}
                onChange={(e) => setResultReason(e.target.value)}
                placeholder={resultType === 'success' 
                  ? "e.g., ROAS increased by 2.5x, cost per conversion decreased by 30%..."
                  : "e.g., Spend increased but conversions remained flat, audience too broad..."}
                className="bg-gray-800 border-gray-700 text-white mt-2"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResultDialog(false)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedRecommendation && handleRecommendationAction(
                selectedRecommendation.id,
                resultType === 'success' ? 'mark_successful' : 'mark_failed',
                resultReason
              )}
              className={resultType === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {resultType === 'success' ? 'Mark Successful' : 'Mark Failed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}