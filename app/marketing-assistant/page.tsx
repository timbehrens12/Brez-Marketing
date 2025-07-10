"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Eye, 
  MousePointer, 
  DollarSign, 
  Users, 
  Zap,
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Settings,
  Lightbulb,
  Image as ImageIcon,
  Video,
  ExternalLink
} from 'lucide-react'
import BrandSelector from '@/components/BrandSelector'

interface BlendedMetrics {
  spend: number
  revenue: number
  roas: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cpl: number
}

interface Campaign {
  id: string
  name: string
  platform: 'meta' | 'google' | 'tiktok'
  status: 'ACTIVE' | 'PAUSED' | 'DRAFT'
  objective: string
  spend: number
  revenue: number
  roas: number
  conversions: number
  ctr: number
  cpc: number
  aiRecommendation: {
    action: 'increase_budget' | 'decrease_budget' | 'pause' | 'optimize_creative' | 'expand_audience' | 'leave_as_is'
    confidence: number
    reason: string
    impact: string
  }
}

interface Creative {
  id: string
  name: string
  campaign: string
  platform: 'meta' | 'google' | 'tiktok'
  type: 'image' | 'video' | 'carousel' | 'text'
  thumbnail?: string
  headline?: string
  spend: number
  roas: number
  ctr: number
  conversions: number
  status: 'ACTIVE' | 'PAUSED'
}

interface DailyReport {
  date: string
  summary: string
  platforms: {
    meta: { status: 'good' | 'warning' | 'critical', message: string }
    google?: { status: 'good' | 'warning' | 'critical', message: string }
    tiktok?: { status: 'good' | 'warning' | 'critical', message: string }
  }
  actionItems: Array<{
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    platform?: string
  }>
}

// Mock data - replace with real API calls
const mockBlendedMetrics: BlendedMetrics = {
  spend: 12547.89,
  revenue: 47832.15,
  roas: 3.81,
  impressions: 2847392,
  clicks: 18472,
  conversions: 342,
  ctr: 0.65,
  cpc: 0.68,
  cpl: 36.67
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Black Friday Sale - Prospecting',
    platform: 'meta',
    status: 'ACTIVE',
    objective: 'CONVERSIONS',
    spend: 2847.32,
    revenue: 12483.90,
    roas: 4.38,
    conversions: 89,
    ctr: 1.2,
    cpc: 0.85,
    aiRecommendation: {
      action: 'increase_budget',
      confidence: 92,
      reason: 'Strong ROAS of 4.38x with stable CTR indicates profitable scaling opportunity',
      impact: 'Estimated +35% revenue increase with 50% budget increase'
    }
  },
  {
    id: '2', 
    name: 'Holiday Retargeting Campaign',
    platform: 'meta',
    status: 'ACTIVE',
    objective: 'CONVERSIONS',
    spend: 1892.47,
    revenue: 3784.22,
    roas: 2.0,
    conversions: 23,
    ctr: 0.8,
    cpc: 1.24,
    aiRecommendation: {
      action: 'optimize_creative',
      confidence: 78,
      reason: 'Declining CTR and high CPC suggest creative fatigue',
      impact: 'New creative variants could improve CTR by 40-60%'
    }
  }
]

const mockCreatives: Creative[] = [
  {
    id: '1',
    name: 'Black Friday Video Ad - 15s',
    campaign: 'Black Friday Sale - Prospecting',
    platform: 'meta',
    type: 'video',
    headline: 'Save 50% on Everything - Limited Time!',
    spend: 1247.83,
    roas: 4.8,
    ctr: 1.5,
    conversions: 47,
    status: 'ACTIVE'
  },
  {
    id: '2',
    name: 'Product Carousel - Holiday Collection',
    campaign: 'Holiday Retargeting Campaign', 
    platform: 'meta',
    type: 'carousel',
    headline: 'Perfect Holiday Gifts Await',
    spend: 892.14,
    roas: 1.8,
    ctr: 0.7,
    conversions: 12,
    status: 'ACTIVE'
  }
]

const mockDailyReport: DailyReport = {
  date: new Date().toISOString().split('T')[0],
  summary: "Overall performance is strong with ROAS above target. Meta campaigns show scaling opportunities while some creatives need refreshing.",
  platforms: {
    meta: {
      status: 'good',
      message: 'Performing 15% above monthly target. Black Friday campaigns driving strong results.'
    }
  },
  actionItems: [
    {
      priority: 'high',
      title: 'Scale Black Friday Prospecting Budget',
      description: 'Increase daily budget by $500 based on strong 4.38x ROAS performance',
      platform: 'meta'
    },
    {
      priority: 'medium', 
      title: 'Test New Creative Variants',
      description: 'Holiday retargeting showing creative fatigue - test 3 new video variants',
      platform: 'meta'
    }
  ]
}

export default function AIMarketingPage() {
  const { isLoaded, userId } = useAuth()
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [blendedMetrics, setBlendedMetrics] = useState<BlendedMetrics>(mockBlendedMetrics)
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns)
  const [creatives, setCreatives] = useState<Creative[]>(mockCreatives)
  const [dailyReport, setDailyReport] = useState<DailyReport>(mockDailyReport)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [detailedAnalysis, setDetailedAnalysis] = useState<any>(null)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)

  // Load data when brand is selected
  useEffect(() => {
    if (selectedBrandId) {
      loadMarketingData()
    }
  }, [selectedBrandId])

  const loadMarketingData = async () => {
    setIsLoading(true)
    try {
      // Load blended metrics
      const metricsResponse = await fetch(`/api/marketing/blended-metrics?brandId=${selectedBrandId}`)
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        if (metricsData.success) {
          setBlendedMetrics(metricsData.data)
        }
      }

      // Load campaigns with AI recommendations
      const campaignsResponse = await fetch(`/api/marketing/campaigns?brandId=${selectedBrandId}`)
      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json()
        if (campaignsData.success) {
          setCampaigns(campaignsData.data)
        }
      }

      // Load creatives
      const creativesResponse = await fetch(`/api/marketing/creatives?brandId=${selectedBrandId}`)
      if (creativesResponse.ok) {
        const creativesData = await creativesResponse.json()
        if (creativesData.success) {
          setCreatives(creativesData.data)
        }
      }

      // Load daily report
      const reportResponse = await fetch(`/api/marketing/daily-report?brandId=${selectedBrandId}`)
      if (reportResponse.ok) {
        const reportData = await reportResponse.json()
        if (reportData.success) {
          setDailyReport(reportData.data)
        }
      }
      
    } catch (error) {
      console.error('Error loading marketing data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecommendationClick = async (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setShowAnalysisModal(true)
    setIsAnalysisLoading(true)
    
    try {
      // Get detailed AI analysis for this campaign
      const response = await fetch('/api/ai/campaign-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: selectedBrandId,
          campaignId: campaign.id,
          campaign: campaign,
          includeCreatives: true
        })
      })

      if (response.ok) {
        const analysisData = await response.json()
        if (analysisData.success) {
          setDetailedAnalysis(analysisData.analysis)
        }
      }
    } catch (error) {
      console.error('Error loading detailed analysis:', error)
    } finally {
      setIsAnalysisLoading(false)
    }
  }

  const getRecommendationIcon = (action: string) => {
    switch (action) {
      case 'increase_budget': return <TrendingUp className="h-4 w-4" />
      case 'decrease_budget': return <TrendingDown className="h-4 w-4" />
      case 'optimize_creative': return <ImageIcon className="h-4 w-4" />
      case 'expand_audience': return <Users className="h-4 w-4" />
      case 'pause': return <AlertTriangle className="h-4 w-4" />
      default: return <CheckCircle className="h-4 w-4" />
    }
  }

  const getRecommendationColor = (action: string) => {
    switch (action) {
      case 'increase_budget': return 'bg-green-900/30 text-green-400 border-green-700'
      case 'decrease_budget': return 'bg-red-900/30 text-red-400 border-red-700'
      case 'optimize_creative': return 'bg-yellow-900/30 text-yellow-400 border-yellow-700'
      case 'expand_audience': return 'bg-blue-900/30 text-blue-400 border-blue-700'
      case 'pause': return 'bg-red-900/30 text-red-400 border-red-700'
      default: return 'bg-gray-900/30 text-gray-400 border-gray-700'
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'meta': return '📘'
      case 'google': return '🔍'
      case 'tiktok': return '🎵'
      default: return '📊'
    }
  }

  const getCreativeTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />
      case 'image': return <ImageIcon className="h-4 w-4" />
      case 'carousel': return <PieChart className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="w-full h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white">Please sign in to access the AI Marketing Dashboard</div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="h-8 w-8 text-blue-400" />
              AI Marketing Command Center
            </h1>
            <p className="text-gray-400 mt-1">
              Intelligent automation for superior media buying results
            </p>
          </div>
          <div className="flex items-center gap-4">
                         <BrandSelector onSelect={setSelectedBrandId} />
            <Button variant="outline" size="sm" className="bg-[#1A1A1A] border-[#333]">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {!selectedBrandId ? (
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="py-12 text-center">
              <Brain className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Select a Brand to Begin</h3>
              <p className="text-gray-400">
                Choose a brand from the dropdown above to access AI-powered marketing insights
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Blended Metrics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <Card className="bg-[#1A1A1A] border-[#333] col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Spend</p>
                      <p className="text-2xl font-bold">{formatCurrency(blendedMetrics.spend)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-[#1A1A1A] border-[#333] col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Revenue</p>
                      <p className="text-2xl font-bold text-green-400">{formatCurrency(blendedMetrics.revenue)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border-[#333] col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">ROAS</p>
                      <p className="text-2xl font-bold text-blue-400">{blendedMetrics.roas.toFixed(2)}x</p>
                    </div>
                    <Target className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border-[#333] col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Conversions</p>
                      <p className="text-2xl font-bold">{formatNumber(blendedMetrics.conversions)}</p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Impressions</p>
                    <p className="text-lg font-bold">{formatNumber(blendedMetrics.impressions)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">CTR</p>
                    <p className="text-lg font-bold">{formatPercentage(blendedMetrics.ctr)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">CPC</p>
                    <p className="text-lg font-bold">{formatCurrency(blendedMetrics.cpc)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">CPL</p>
                    <p className="text-lg font-bold">{formatCurrency(blendedMetrics.cpl)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Campaign Analysis */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Campaign Intelligence
                      <Badge variant="secondary" className="bg-blue-900/30 text-blue-400">
                        AI-Powered
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {campaigns.map((campaign) => (
                        <div
                          key={campaign.id}
                          className="p-4 rounded-lg bg-[#0A0A0A] border border-[#333]"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{getPlatformIcon(campaign.platform)}</span>
                                <h4 className="font-semibold">{campaign.name}</h4>
                                <Badge 
                                  variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}
                                  className={campaign.status === 'ACTIVE' ? 'bg-green-900/30 text-green-400' : ''}
                                >
                                  {campaign.status}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-400">Spend</p>
                                  <p className="font-semibold">{formatCurrency(campaign.spend)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400">ROAS</p>
                                  <p className="font-semibold text-blue-400">{campaign.roas.toFixed(2)}x</p>
                                </div>
                                <div>
                                  <p className="text-gray-400">Conv.</p>
                                  <p className="font-semibold">{campaign.conversions}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400">CTR</p>
                                  <p className="font-semibold">{formatPercentage(campaign.ctr)}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              <Button
                                onClick={() => handleRecommendationClick(campaign)}
                                variant="outline"
                                size="sm"
                                className={`${getRecommendationColor(campaign.aiRecommendation.action)} border`}
                              >
                                {getRecommendationIcon(campaign.aiRecommendation.action)}
                                <span className="ml-2 capitalize">
                                  {campaign.aiRecommendation.action.replace('_', ' ')}
                                </span>
                                <Badge className="ml-2 bg-white/10">
                                  {campaign.aiRecommendation.confidence}%
                                </Badge>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Creative Performance */}
                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Creative Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {creatives.map((creative) => (
                        <div
                          key={creative.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-[#0A0A0A] border border-[#333]"
                        >
                          <div className="flex items-center gap-3">
                            {getCreativeTypeIcon(creative.type)}
                            <div>
                              <h5 className="font-semibold text-sm">{creative.name}</h5>
                              <p className="text-gray-400 text-xs">{creative.campaign}</p>
                              {creative.headline && (
                                <p className="text-gray-300 text-xs mt-1">"{creative.headline}"</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <p className="text-gray-400 text-xs">ROAS</p>
                              <p className="font-semibold text-blue-400">{creative.roas.toFixed(1)}x</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-400 text-xs">CTR</p>
                              <p className="font-semibold">{formatPercentage(creative.ctr)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-400 text-xs">Conv.</p>
                              <p className="font-semibold">{creative.conversions}</p>
                            </div>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Daily AI Report & Action Items */}
              <div className="space-y-6">
                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Daily AI Report
                      <Badge variant="secondary" className="bg-green-900/30 text-green-400">
                        Today
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Executive Summary</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {dailyReport.summary}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Platform Status</h4>
                      <div className="space-y-2">
                        {Object.entries(dailyReport.platforms).map(([platform, data]) => (
                          <div key={platform} className="flex items-center gap-3">
                            <span className="text-lg">{getPlatformIcon(platform)}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="capitalize font-medium">{platform}</span>
                                <Badge 
                                  variant="secondary"
                                  className={
                                    data.status === 'good' ? 'bg-green-900/30 text-green-400' :
                                    data.status === 'warning' ? 'bg-yellow-900/30 text-yellow-400' :
                                    'bg-red-900/30 text-red-400'
                                  }
                                >
                                  {data.status}
                                </Badge>
                              </div>
                              <p className="text-gray-400 text-xs">{data.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Priority Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dailyReport.actionItems.map((item, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-[#0A0A0A] border border-[#333]"
                        >
                          <div className="flex items-start gap-3">
                            <Badge 
                              variant="secondary"
                              className={
                                item.priority === 'high' ? 'bg-red-900/30 text-red-400' :
                                item.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                                'bg-gray-900/30 text-gray-400'
                              }
                            >
                              {item.priority}
                            </Badge>
                            <div className="flex-1">
                              <h5 className="font-semibold text-sm">{item.title}</h5>
                              <p className="text-gray-400 text-xs mt-1">{item.description}</p>
                              {item.platform && (
                                <div className="flex items-center gap-1 mt-2">
                                  <span className="text-sm">{getPlatformIcon(item.platform)}</span>
                                  <span className="text-gray-400 text-xs capitalize">{item.platform}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* Detailed AI Analysis Modal */}
        <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[#1A1A1A] border-[#333] text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Brain className="h-5 w-5 text-blue-400" />
                AI Campaign Analysis
                {selectedCampaign && (
                  <Badge variant="secondary" className="bg-blue-900/30 text-blue-400">
                    {selectedCampaign.platform.toUpperCase()}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedCampaign?.name}
              </DialogDescription>
            </DialogHeader>
            
            {isAnalysisLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                  <span className="text-gray-400">Analyzing campaign performance...</span>
                </div>
              </div>
            ) : detailedAnalysis ? (
              <div className="space-y-6">
                {/* Performance Grade */}
                <Card className="bg-[#0A0A0A] border-[#333]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white">Performance Grade</h3>
                        <p className="text-gray-400 text-sm">Overall campaign assessment</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400">{detailedAnalysis.grade}</div>
                        <p className="text-xs text-gray-400">Grade</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Insights */}
                {detailedAnalysis.insights && (
                  <Card className="bg-[#0A0A0A] border-[#333]">
                    <CardHeader>
                      <CardTitle className="text-white">Key Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {detailedAnalysis.insights.map((insight: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-gray-300">
                            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Issues */}
                {detailedAnalysis.issues && detailedAnalysis.issues.length > 0 && (
                  <Card className="bg-[#0A0A0A] border-[#333]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        Critical Issues
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {detailedAnalysis.issues.map((issue: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-gray-300">
                            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Optimization Opportunities */}
                {detailedAnalysis.optimizations && (
                  <Card className="bg-[#0A0A0A] border-[#333]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-400" />
                        Optimization Opportunities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {detailedAnalysis.optimizations.map((optimization: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-gray-300">
                            <Lightbulb className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{optimization}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Budget Recommendations */}
                {detailedAnalysis.budget_recommendations && (
                  <Card className="bg-[#0A0A0A] border-[#333]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-400" />
                        Budget Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {detailedAnalysis.budget_recommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-gray-300">
                            <DollarSign className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Predicted Outcomes */}
                {detailedAnalysis.predicted_outcomes && (
                  <Card className="bg-[#0A0A0A] border-[#333]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-400" />
                        Predicted Outcomes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {detailedAnalysis.predicted_outcomes.map((outcome: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-gray-300">
                            <TrendingUp className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">Failed to load analysis. Please try again.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 