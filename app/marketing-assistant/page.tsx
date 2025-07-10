"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/DateRangePicker"
import BrandSelector from "@/components/BrandSelector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Eye, 
  MousePointer, 
  DollarSign, 
  Users, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Lightbulb,
  Calendar,
  Loader2,
  RefreshCw,
  Sparkles,
  Brain,
  ChevronRight,
  Play,
  Pause,
  ExternalLink
} from 'lucide-react'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'
import { startOfDay, endOfDay } from 'date-fns'

interface BlendedMetrics {
  totalSpend: number
  totalSpendGrowth: number
  totalRoas: number
  totalRoasGrowth: number
  totalImpressions: number
  totalImpressionsGrowth: number
  totalClicks: number
  totalClicksGrowth: number
  totalConversions: number
  totalConversionsGrowth: number
  avgCtr: number
  avgCtrGrowth: number
  avgCpc: number
  avgCpcGrowth: number
  avgCpl: number
  avgCplGrowth: number
  platforms: {
    meta: { spend: number, roas: number, active: boolean }
    google: { spend: number, roas: number, active: boolean }
    tiktok: { spend: number, roas: number, active: boolean }
  }
}

interface CampaignRecommendation {
  id: string
  campaignId: string
  campaignName: string
  type: 'increase_budget' | 'decrease_budget' | 'pause' | 'optimize_targeting' | 'refresh_creatives' | 'adjust_bidding'
  priority: 'high' | 'medium' | 'low'
  recommendation: string
  reasoning: string
  expectedImpact: string
  currentMetrics: {
    spend: number
    roas: number
    ctr: number
    cpc: number
    conversions: number
  }
  forecastedMetrics: {
    spend: number
    roas: number
    ctr: number
    cpc: number
    conversions: number
  }
}

interface CreativeAnalysis {
  id: string
  adId: string
  adName: string
  campaignName: string
  creativeType: 'image' | 'video' | 'carousel'
  thumbnailUrl?: string
  headline?: string
  bodyText?: string
  ctaType?: string
  performance: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
    roas: number
  }
  aiInsights: string
  status: 'active' | 'paused' | 'pending'
  recommendation: 'scale' | 'optimize' | 'pause' | 'test_new_angle'
}

interface DailyReport {
  date: string
  platformOverview: {
    meta: { status: string, alerts: string[], opportunities: string[] }
    google: { status: string, alerts: string[], opportunities: string[] }
    tiktok: { status: string, alerts: string[], opportunities: string[] }
  }
  keyInsights: string[]
  urgentActions: string[]
  opportunityScore: number
  threatScore: number
  overallRecommendation: string
}

interface Anomaly {
  id: string
  type: 'performance_drop' | 'spend_spike' | 'ctr_decline' | 'conversion_drop' | 'cpc_increase'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  affectedCampaigns: string[]
  detectedAt: string
  potentialCause: string
  recommendedActions: string[]
  impact: string
}

interface Forecast {
  period: string
  metrics: {
    spend: { predicted: number, confidence: number }
    roas: { predicted: number, confidence: number }
    conversions: { predicted: number, confidence: number }
    revenue: { predicted: number, confidence: number }
  }
  scenarios: {
    conservative: { spend: number, revenue: number }
    optimistic: { spend: number, revenue: number }
    recommended: { spend: number, revenue: number }
  }
}

export default function MarketingAssistantPage() {
  const { userId } = useAuth()
  const { selectedBrandId, brands, setSelectedBrandId } = useBrandContext()
  
  const [dateRange, setDateRange] = useState({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [blendedMetrics, setBlendedMetrics] = useState<BlendedMetrics | null>(null)
  const [campaignRecommendations, setCampaignRecommendations] = useState<CampaignRecommendation[]>([])
  const [creativeAnalysis, setCreativeAnalysis] = useState<CreativeAnalysis[]>([])
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [selectedRecommendation, setSelectedRecommendation] = useState<CampaignRecommendation | null>(null)
  
  // Fetch all data on component mount and when brand/date changes
  useEffect(() => {
    if (selectedBrandId) {
      fetchAllData()
    }
  }, [selectedBrandId, dateRange])
  
  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchBlendedMetrics(),
        fetchCampaignRecommendations(),
        fetchCreativeAnalysis(),
        fetchDailyReport(),
        fetchAnomalies(),
        fetchForecasts()
      ])
    } catch (error) {
      console.error('Error fetching marketing data:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const fetchBlendedMetrics = async () => {
    try {
      const response = await fetch(`/api/marketing/blended-metrics?brandId=${selectedBrandId}&from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`)
      if (response.ok) {
        const data = await response.json()
        setBlendedMetrics(data)
      }
    } catch (error) {
      console.error('Error fetching blended metrics:', error)
    }
  }
  
  const fetchCampaignRecommendations = async () => {
    try {
      const response = await fetch(`/api/marketing/campaign-recommendations?brandId=${selectedBrandId}&from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`)
      if (response.ok) {
        const data = await response.json()
        setCampaignRecommendations(data.recommendations || [])
      }
    } catch (error) {
      console.error('Error fetching campaign recommendations:', error)
    }
  }
  
  const fetchCreativeAnalysis = async () => {
    try {
      const response = await fetch(`/api/marketing/creative-analysis?brandId=${selectedBrandId}&from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`)
      if (response.ok) {
        const data = await response.json()
        setCreativeAnalysis(data.creatives || [])
      }
    } catch (error) {
      console.error('Error fetching creative analysis:', error)
    }
  }
  
  const fetchDailyReport = async () => {
    try {
      const response = await fetch(`/api/marketing/daily-report?brandId=${selectedBrandId}&date=${dateRange.to.toISOString()}`)
      if (response.ok) {
        const data = await response.json()
        setDailyReport(data)
      }
    } catch (error) {
      console.error('Error fetching daily report:', error)
    }
  }
  
  const fetchAnomalies = async () => {
    try {
      const response = await fetch(`/api/marketing/anomalies?brandId=${selectedBrandId}&from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`)
      if (response.ok) {
        const data = await response.json()
        setAnomalies(data.anomalies || [])
      }
    } catch (error) {
      console.error('Error fetching anomalies:', error)
    }
  }
  
  const fetchForecasts = async () => {
    try {
      const response = await fetch(`/api/marketing/forecasts?brandId=${selectedBrandId}`)
      if (response.ok) {
        const data = await response.json()
        setForecasts(data.forecasts || [])
      }
    } catch (error) {
      console.error('Error fetching forecasts:', error)
    }
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }
  
  const formatPercentage = (num: number) => {
    return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`
  }
  
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'increase_budget': return <TrendingUp className="h-4 w-4" />
      case 'decrease_budget': return <TrendingDown className="h-4 w-4" />
      case 'pause': return <Pause className="h-4 w-4" />
      case 'optimize_targeting': return <Target className="h-4 w-4" />
      case 'refresh_creatives': return <Sparkles className="h-4 w-4" />
      case 'adjust_bidding': return <DollarSign className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-gray-400">Loading AI Marketing Dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-8 w-8 text-blue-400" />
              <h1 className="text-3xl font-bold">AI Marketing Assistant</h1>
            </div>
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              Ultimate AI Media Buyer
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={fetchAllData}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
            <DateRangePicker
              dateRange={dateRange}
              setDateRange={setDateRange}
            />
          </div>
        </div>

        {/* Brand Selector */}
        <BrandSelector 
          onSelect={(brandId) => setSelectedBrandId(brandId)} 
          selectedBrandId={selectedBrandId} 
        />

        {/* Blended Metrics Overview */}
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Blended Ad Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-400">Total Spend</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(blendedMetrics?.totalSpend || 0)}
                </div>
                <div className={`text-sm ${(blendedMetrics?.totalSpendGrowth ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercentage(blendedMetrics?.totalSpendGrowth ?? 0)}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-gray-400">Blended ROAS</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {(blendedMetrics?.totalRoas || 0).toFixed(2)}x
                </div>
                <div className={`text-sm ${(blendedMetrics?.totalRoasGrowth ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercentage(blendedMetrics?.totalRoasGrowth ?? 0)}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-gray-400">Total Clicks</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(blendedMetrics?.totalClicks || 0)}
                </div>
                <div className={`text-sm ${(blendedMetrics?.totalClicksGrowth ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercentage(blendedMetrics?.totalClicksGrowth ?? 0)}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-400" />
                  <span className="text-sm text-gray-400">Total Conversions</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(blendedMetrics?.totalConversions || 0)}
                </div>
                <div className={`text-sm ${(blendedMetrics?.totalConversionsGrowth ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercentage(blendedMetrics?.totalConversionsGrowth ?? 0)}
                </div>
              </div>
            </div>
            
            {/* Platform Breakdown */}
            <div className="mt-6 pt-6 border-t border-[#333]">
              <h3 className="text-lg font-semibold text-white mb-4">Platform Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                {blendedMetrics?.platforms && Object.entries(blendedMetrics.platforms).map(([platform, data]) => (
                  <div key={platform} className="bg-[#222] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white capitalize">{platform}</span>
                      <Badge variant={data.active ? "default" : "secondary"} className="text-xs">
                        {data.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold text-white">{formatCurrency(data.spend)}</div>
                    <div className="text-sm text-gray-400">{data.roas.toFixed(2)}x ROAS</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="campaigns" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-[#1A1A1A] border-[#333]">
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Campaign AI
            </TabsTrigger>
            <TabsTrigger value="creatives" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Creative Analysis
            </TabsTrigger>
            <TabsTrigger value="daily-report" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Daily Report
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Anomalies
            </TabsTrigger>
            <TabsTrigger value="forecasts" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Forecasts
            </TabsTrigger>
          </TabsList>

          {/* Campaign Recommendations Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  AI Campaign Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaignRecommendations.map((rec) => (
                    <div key={rec.id} className="bg-[#222] p-4 rounded-lg border border-[#333]">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getRecommendationIcon(rec.type)}
                            <span className="font-medium text-white">{rec.campaignName}</span>
                            <Badge className={`${getPriorityColor(rec.priority)} text-white text-xs`}>
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-300 mb-2">{rec.recommendation}</p>
                          <p className="text-xs text-gray-400 mb-3">{rec.reasoning}</p>
                          
                          {/* Current vs Forecasted Metrics */}
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="text-gray-400 mb-1">Current</div>
                              <div className="text-white">
                                {formatCurrency(rec.currentMetrics.spend)} • {rec.currentMetrics.roas.toFixed(2)}x ROAS
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-400 mb-1">Forecasted</div>
                              <div className="text-green-400">
                                {formatCurrency(rec.forecastedMetrics.spend)} • {rec.forecastedMetrics.roas.toFixed(2)}x ROAS
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setSelectedRecommendation(rec)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          View Details
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Creative Analysis Tab */}
          <TabsContent value="creatives" className="space-y-4">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-400" />
                  Creative Performance Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {creativeAnalysis.map((creative) => (
                    <div key={creative.id} className="bg-[#222] p-4 rounded-lg border border-[#333]">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={creative.status === 'active' ? "default" : "secondary"} className="text-xs">
                          {creative.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {creative.creativeType}
                        </Badge>
                      </div>
                      
                      {creative.thumbnailUrl && (
                        <img 
                          src={creative.thumbnailUrl} 
                          alt={creative.adName}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}
                      
                      <h3 className="font-medium text-white mb-1">{creative.adName}</h3>
                      <p className="text-xs text-gray-400 mb-2">{creative.campaignName}</p>
                      
                      {creative.headline && (
                        <p className="text-sm text-gray-300 mb-2 line-clamp-2">{creative.headline}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <div className="text-gray-400">CTR</div>
                          <div className="text-white">{creative.performance.ctr.toFixed(2)}%</div>
                        </div>
                        <div>
                          <div className="text-gray-400">CPC</div>
                          <div className="text-white">{formatCurrency(creative.performance.cpc)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">ROAS</div>
                          <div className="text-white">{creative.performance.roas.toFixed(2)}x</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Conversions</div>
                          <div className="text-white">{creative.performance.conversions}</div>
                        </div>
                      </div>
                      
                      <div className="bg-[#333] p-2 rounded text-xs text-gray-300 mb-3">
                        {creative.aiInsights}
                      </div>
                      
                      <Badge 
                        className={`w-full justify-center text-xs ${
                          creative.recommendation === 'scale' ? 'bg-green-600' :
                          creative.recommendation === 'optimize' ? 'bg-yellow-600' :
                          creative.recommendation === 'pause' ? 'bg-red-600' :
                          'bg-blue-600'
                        }`}
                      >
                        {creative.recommendation.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily Report Tab */}
          <TabsContent value="daily-report" className="space-y-4">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-400" />
                  Daily AI Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyReport && (
                  <div className="space-y-6">
                    {/* Overall Scores */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-[#222] p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-400">{dailyReport.opportunityScore}/100</div>
                        <div className="text-sm text-gray-400">Opportunity Score</div>
                      </div>
                      <div className="bg-[#222] p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-400">{dailyReport.threatScore}/100</div>
                        <div className="text-sm text-gray-400">Threat Score</div>
                      </div>
                      <div className="bg-[#222] p-4 rounded-lg text-center">
                        <div className="text-sm text-gray-400 mb-2">Overall Status</div>
                        <Badge className={`${dailyReport.threatScore > 70 ? 'bg-red-600' : dailyReport.opportunityScore > 70 ? 'bg-green-600' : 'bg-yellow-600'}`}>
                          {dailyReport.threatScore > 70 ? 'Needs Attention' : dailyReport.opportunityScore > 70 ? 'Performing Well' : 'Stable'}
                        </Badge>
                      </div>
                    </div>

                    {/* Platform Overview */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Platform Status</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(dailyReport.platformOverview).map(([platform, status]) => (
                          <div key={platform} className="bg-[#222] p-4 rounded-lg">
                            <h4 className="font-medium text-white mb-2 capitalize">{platform}</h4>
                            <div className="space-y-2">
                              <div className="text-sm text-gray-300">{status.status}</div>
                              {status.alerts.length > 0 && (
                                <div>
                                  <div className="text-xs text-red-400 mb-1">Alerts:</div>
                                  {status.alerts.map((alert, i) => (
                                    <div key={i} className="text-xs text-gray-400">• {alert}</div>
                                  ))}
                                </div>
                              )}
                              {status.opportunities.length > 0 && (
                                <div>
                                  <div className="text-xs text-green-400 mb-1">Opportunities:</div>
                                  {status.opportunities.map((opp, i) => (
                                    <div key={i} className="text-xs text-gray-400">• {opp}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key Insights */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Key Insights</h3>
                      <div className="space-y-2">
                        {dailyReport.keyInsights.map((insight, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            {insight}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Urgent Actions */}
                    {dailyReport.urgentActions.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Urgent Actions Required</h3>
                        <div className="space-y-2">
                          {dailyReport.urgentActions.map((action, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                              {action}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Overall Recommendation */}
                    <div className="bg-blue-600/20 border border-blue-600/50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-white mb-2">Today's Recommendation</h3>
                      <p className="text-gray-300">{dailyReport.overallRecommendation}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anomalies Tab */}
          <TabsContent value="anomalies" className="space-y-4">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  Anomaly Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {anomalies.map((anomaly) => (
                    <div key={anomaly.id} className="bg-[#222] p-4 rounded-lg border border-[#333]">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getSeverityColor(anomaly.severity)} text-white text-xs`}>
                            {anomaly.severity}
                          </Badge>
                          <span className="font-medium text-white">{anomaly.title}</span>
                        </div>
                        <span className="text-xs text-gray-400">{anomaly.detectedAt}</span>
                      </div>
                      
                      <p className="text-sm text-gray-300 mb-2">{anomaly.description}</p>
                      
                      <div className="text-xs text-gray-400 mb-2">
                        Impact: {anomaly.impact}
                      </div>
                      
                      <div className="text-xs text-gray-400 mb-3">
                        Potential Cause: {anomaly.potentialCause}
                      </div>
                      
                      <div className="text-xs text-gray-400 mb-3">
                        Affected Campaigns: {anomaly.affectedCampaigns.join(', ')}
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Recommended Actions:</div>
                        <ul className="text-xs text-gray-300 space-y-1">
                          {anomaly.recommendedActions.map((action, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-blue-400">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forecasts Tab */}
          <TabsContent value="forecasts" className="space-y-4">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  Performance Forecasts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {forecasts.map((forecast, i) => (
                    <div key={i} className="bg-[#222] p-4 rounded-lg border border-[#333]">
                      <h3 className="text-lg font-semibold text-white mb-4">{forecast.period}</h3>
                      
                      {/* Predicted Metrics */}
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-400">Predicted Spend</div>
                          <div className="text-lg font-bold text-white">{formatCurrency(forecast.metrics.spend.predicted)}</div>
                          <div className="text-xs text-gray-400">{forecast.metrics.spend.confidence}% confidence</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-400">Predicted ROAS</div>
                          <div className="text-lg font-bold text-white">{forecast.metrics.roas.predicted.toFixed(2)}x</div>
                          <div className="text-xs text-gray-400">{forecast.metrics.roas.confidence}% confidence</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-400">Predicted Conversions</div>
                          <div className="text-lg font-bold text-white">{formatNumber(forecast.metrics.conversions.predicted)}</div>
                          <div className="text-xs text-gray-400">{forecast.metrics.conversions.confidence}% confidence</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-400">Predicted Revenue</div>
                          <div className="text-lg font-bold text-white">{formatCurrency(forecast.metrics.revenue.predicted)}</div>
                          <div className="text-xs text-gray-400">{forecast.metrics.revenue.confidence}% confidence</div>
                        </div>
                      </div>
                      
                      {/* Scenarios */}
                      <div>
                        <h4 className="text-sm font-medium text-white mb-2">Scenarios</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-[#333] p-3 rounded">
                            <div className="text-xs text-gray-400 mb-1">Conservative</div>
                            <div className="text-sm text-white">{formatCurrency(forecast.scenarios.conservative.spend)}</div>
                            <div className="text-xs text-gray-400">→ {formatCurrency(forecast.scenarios.conservative.revenue)}</div>
                          </div>
                          <div className="bg-blue-600/20 p-3 rounded border border-blue-600/50">
                            <div className="text-xs text-blue-400 mb-1">Recommended</div>
                            <div className="text-sm text-white">{formatCurrency(forecast.scenarios.recommended.spend)}</div>
                            <div className="text-xs text-blue-400">→ {formatCurrency(forecast.scenarios.recommended.revenue)}</div>
                          </div>
                          <div className="bg-[#333] p-3 rounded">
                            <div className="text-xs text-gray-400 mb-1">Optimistic</div>
                            <div className="text-sm text-white">{formatCurrency(forecast.scenarios.optimistic.spend)}</div>
                            <div className="text-xs text-gray-400">→ {formatCurrency(forecast.scenarios.optimistic.revenue)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 