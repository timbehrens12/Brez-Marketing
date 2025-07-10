"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatters"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useBrandContext } from '@/lib/context/BrandContext'
import BrandSelector from "@/components/BrandSelector"
import { 
  TrendingUp, TrendingDown, Minus, AlertCircle, Target, DollarSign, 
  Eye, MousePointer, ShoppingCart, BarChart3, Sparkles, RefreshCw,
  Calendar, Filter, ChevronDown, Info, Zap, Brain, Image,
  FileText, Settings2, AlertTriangle, CheckCircle2, XCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell
} from "recharts"

// Types
interface BlendedStats {
  totalSpend: number
  totalRevenue: number
  roas: number
  totalImpressions: number
  totalClicks: number
  ctr: number
  cpc: number
  cpl: number
  conversions: number
  conversionRate: number
  avgFrequency: number
  reach: number
}

interface CampaignData {
  id: string
  name: string
  platform: string
  status: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  conversions: number
  roas: number
  ctr: number
  cpc: number
  recommendation?: string
  recommendationSeverity?: 'success' | 'warning' | 'error'
  adsets?: AdSetData[]
}

interface AdSetData {
  id: string
  name: string
  campaignId: string
  status: string
  budget: number
  spent: number
  targetingInfo?: any
}

interface CreativeData {
  id: string
  name: string
  campaignId: string
  campaignName: string
  platform: string
  type: 'image' | 'video' | 'carousel'
  status: string
  thumbnailUrl?: string
  spent: number
  impressions: number
  clicks: number
  conversions: number
  roas: number
  ctr: number
  cpc: number
  headline?: string
  body?: string
  ctaType?: string
}

interface DailyInsight {
  date: string
  summary: string
  metrics: {
    spend: number
    revenue: number
    roas: number
    conversions: number
  }
  alerts: Array<{
    type: 'success' | 'warning' | 'error'
    message: string
    action?: string
  }>
  recommendations: string[]
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function MarketingAssistantPage() {
  const { userId, isLoaded } = useAuth()
  const { selectedBrandId, brands } = useBrandContext()
  
  // States
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [blendedStats, setBlendedStats] = useState<BlendedStats | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignData[]>([])
  const [creatives, setCreatives] = useState<CreativeData[]>([])
  const [dailyInsight, setDailyInsight] = useState<DailyInsight | null>(null)
  const [dateRange, setDateRange] = useState({ from: new Date(), to: new Date() })
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [aiRecommendationDetails, setAiRecommendationDetails] = useState<any>(null)
  const [showRecommendationModal, setShowRecommendationModal] = useState(false)
  const [brandSettings, setBrandSettings] = useState<any>(null)

  // Fetch all marketing data
  const fetchMarketingData = useCallback(async () => {
    if (!selectedBrandId) return

    try {
      setIsLoading(true)
      const supabase = getSupabaseClient()

      // Fetch brand settings
      const { data: brand } = await supabase
        .from('brands')
        .select('settings')
        .eq('id', selectedBrandId)
        .single()

      if (brand) {
        setBrandSettings(brand.settings || {})
      }

      // Fetch Meta campaigns
      const { data: metaCampaigns } = await supabase
        .from('meta_campaigns')
        .select(`
          *,
          meta_adsets!meta_adsets_campaign_id_fkey (*)
        `)
        .eq('brand_id', selectedBrandId)
        .eq('status', 'ACTIVE')

      // Fetch Meta ads for creatives
      const { data: metaAds } = await supabase
        .from('meta_ads')
        .select('*')
        .eq('brand_id', selectedBrandId)
        .eq('status', 'ACTIVE')

      // Process campaigns data
      const processedCampaigns: CampaignData[] = metaCampaigns?.map(campaign => ({
        id: campaign.campaign_id,
        name: campaign.campaign_name,
        platform: 'Meta',
        status: campaign.status,
        budget: parseFloat(campaign.budget) || 0,
        spent: parseFloat(campaign.spent) || 0,
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        conversions: campaign.conversions || 0,
        roas: parseFloat(campaign.roas) || 0,
        ctr: parseFloat(campaign.ctr) || 0,
        cpc: parseFloat(campaign.cpc) || 0,
        adsets: campaign.meta_adsets
      })) || []

      // Process creatives data
      const processedCreatives: CreativeData[] = metaAds?.map(ad => ({
        id: ad.ad_id,
        name: ad.ad_name,
        campaignId: ad.campaign_id,
        campaignName: campaigns.find(c => c.id === ad.campaign_id)?.name || 'Unknown',
        platform: 'Meta',
        type: ad.video_id ? 'video' : 'image',
        status: ad.status,
        thumbnailUrl: ad.thumbnail_url || ad.image_url,
        spent: parseFloat(ad.spent) || 0,
        impressions: ad.impressions || 0,
        clicks: ad.clicks || 0,
        conversions: ad.conversions || 0,
        roas: ad.spent > 0 ? (ad.conversions * 50) / ad.spent : 0, // Assuming $50 AOV
        ctr: parseFloat(ad.ctr) || 0,
        cpc: parseFloat(ad.cpc) || 0,
        headline: ad.headline,
        body: ad.body,
        ctaType: ad.cta_type
      })) || []

      // Calculate blended stats
      const stats: BlendedStats = {
        totalSpend: processedCampaigns.reduce((sum, c) => sum + c.spent, 0),
        totalRevenue: processedCampaigns.reduce((sum, c) => sum + (c.conversions * 50), 0), // Assuming $50 AOV
        roas: 0,
        totalImpressions: processedCampaigns.reduce((sum, c) => sum + c.impressions, 0),
        totalClicks: processedCampaigns.reduce((sum, c) => sum + c.clicks, 0),
        ctr: 0,
        cpc: 0,
        cpl: 0,
        conversions: processedCampaigns.reduce((sum, c) => sum + c.conversions, 0),
        conversionRate: 0,
        avgFrequency: 1.5, // Placeholder
        reach: Math.floor(processedCampaigns.reduce((sum, c) => sum + c.impressions, 0) / 1.5)
      }

      // Calculate derived metrics
      stats.roas = stats.totalSpend > 0 ? stats.totalRevenue / stats.totalSpend : 0
      stats.ctr = stats.totalImpressions > 0 ? (stats.totalClicks / stats.totalImpressions) * 100 : 0
      stats.cpc = stats.totalClicks > 0 ? stats.totalSpend / stats.totalClicks : 0
      stats.cpl = stats.conversions > 0 ? stats.totalSpend / stats.conversions : 0
      stats.conversionRate = stats.totalClicks > 0 ? (stats.conversions / stats.totalClicks) * 100 : 0

      // Get AI recommendations for campaigns
      await analyzeAndSetRecommendations(processedCampaigns, stats)

      // Generate daily AI insight
      await generateDailyInsight(stats, processedCampaigns)

      setBlendedStats(stats)
      setCampaigns(processedCampaigns)
      setCreatives(processedCreatives)
    } catch (error) {
      console.error('Error fetching marketing data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedBrandId])

  // Analyze campaigns and set AI recommendations
  const analyzeAndSetRecommendations = async (campaigns: CampaignData[], stats: BlendedStats) => {
    for (const campaign of campaigns) {
      try {
        const response = await fetch('/api/ai/campaign-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign,
            brandStats: stats,
            brandSettings
          })
        })

        if (response.ok) {
          const { recommendation, severity } = await response.json()
          campaign.recommendation = recommendation
          campaign.recommendationSeverity = severity
        }
      } catch (error) {
        console.error('Error getting AI recommendation:', error)
      }
    }
  }

  // Generate daily AI insight
  const generateDailyInsight = async (stats: BlendedStats, campaigns: CampaignData[]) => {
    try {
      const response = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats,
          campaigns,
          brandSettings,
          date: new Date().toISOString()
        })
      })

      if (response.ok) {
        const insight = await response.json()
        setDailyInsight(insight)
      }
    } catch (error) {
      console.error('Error generating daily insight:', error)
    }
  }

  // Get detailed AI recommendation
  const getDetailedRecommendation = async (campaign: CampaignData) => {
    try {
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign,
          brandSettings,
          requestType: 'detailed'
        })
      })

      if (response.ok) {
        const details = await response.json()
        setAiRecommendationDetails(details)
        setShowRecommendationModal(true)
      }
    } catch (error) {
      console.error('Error getting detailed recommendation:', error)
    }
  }

  useEffect(() => {
    if (selectedBrandId) {
      fetchMarketingData()
    }
  }, [selectedBrandId, fetchMarketingData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchMarketingData()
    setIsRefreshing(false)
  }

  if (!isLoaded || !userId) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-blue-500" />
              AI Marketing Assistant
            </h1>
            <p className="text-muted-foreground mt-1">
              Automated campaign analysis, anomaly detection & optimization
            </p>
          </div>
          <div className="flex items-center gap-4">
            <BrandSelector onSelect={() => {}} />
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="border-zinc-800"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Daily AI Insight */}
            {dailyInsight && (
              <div className="mb-6">
                <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-400" />
                      Daily AI Insight - {new Date().toLocaleDateString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-300">{dailyInsight.summary}</p>
                    
                    {dailyInsight.alerts.length > 0 && (
                      <div className="space-y-2">
                        {dailyInsight.alerts.map((alert, index) => (
                          <Alert key={index} className={cn(
                            "border",
                            alert.type === 'success' && "border-green-800 bg-green-900/20",
                            alert.type === 'warning' && "border-yellow-800 bg-yellow-900/20",
                            alert.type === 'error' && "border-red-800 bg-red-900/20"
                          )}>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{alert.message}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}

                    {dailyInsight.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Today's Recommendations
                        </h4>
                        <ul className="space-y-1">
                          {dailyInsight.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                              <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Blended Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Spend"
                value={formatCurrency(blendedStats?.totalSpend || 0)}
                icon={DollarSign}
                trend={12.5}
                color="blue"
              />
              <StatsCard
                title="ROAS"
                value={(blendedStats?.roas || 0).toFixed(2)}
                icon={TrendingUp}
                trend={blendedStats && blendedStats.roas > 3 ? 8.2 : -5.3}
                color="green"
              />
              <StatsCard
                title="Conversions"
                value={formatNumber(blendedStats?.conversions || 0)}
                icon={ShoppingCart}
                trend={15.8}
                color="purple"
              />
              <StatsCard
                title="CTR"
                value={formatPercentage(blendedStats?.ctr || 0)}
                icon={MousePointer}
                trend={blendedStats && blendedStats.ctr > 2 ? 3.4 : -2.1}
                color="orange"
              />
              <StatsCard
                title="CPC"
                value={formatCurrency(blendedStats?.cpc || 0)}
                icon={MousePointer}
                trend={-8.3}
                color="red"
              />
              <StatsCard
                title="CPL"
                value={formatCurrency(blendedStats?.cpl || 0)}
                icon={Target}
                trend={-12.1}
                color="indigo"
              />
              <StatsCard
                title="Impressions"
                value={formatNumber(blendedStats?.totalImpressions || 0)}
                icon={Eye}
                trend={22.4}
                color="cyan"
              />
              <StatsCard
                title="Reach"
                value={formatNumber(blendedStats?.reach || 0)}
                icon={BarChart3}
                trend={18.7}
                color="pink"
              />
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="campaigns" className="mt-6">
              <TabsList className="bg-zinc-900 border-zinc-800">
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                <TabsTrigger value="creatives">Creative Analysis</TabsTrigger>
                <TabsTrigger value="insights">AI Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="campaigns" className="space-y-4 mt-4">
                <CampaignsSection 
                  campaigns={campaigns}
                  onRecommendationClick={getDetailedRecommendation}
                />
              </TabsContent>

              <TabsContent value="creatives" className="space-y-4 mt-4">
                <CreativesSection creatives={creatives} />
              </TabsContent>

              <TabsContent value="insights" className="space-y-4 mt-4">
                <InsightsSection 
                  stats={blendedStats}
                  campaigns={campaigns}
                  brandSettings={brandSettings}
                />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* AI Recommendation Modal */}
        {showRecommendationModal && aiRecommendationDetails && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowRecommendationModal(false)}
          >
            <div
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Brain className="h-6 w-6 text-blue-500" />
                AI Campaign Analysis
              </h3>
              <div className="space-y-4 text-gray-300">
                <div>
                  <h4 className="font-semibold mb-2">Current Status</h4>
                  <p>{aiRecommendationDetails.currentStatus}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Recommendation</h4>
                  <p>{aiRecommendationDetails.recommendation}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Implementation Steps</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    {aiRecommendationDetails.steps?.map((step: string, index: number) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Expected Impact</h4>
                  <p>{aiRecommendationDetails.expectedImpact}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Forecast</h4>
                  <p>{aiRecommendationDetails.forecast}</p>
                </div>
              </div>
              <Button
                className="mt-6 w-full"
                onClick={() => setShowRecommendationModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Stats Card Component
function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color 
}: { 
  title: string
  value: string
  icon: any
  trend?: number
  color: string
}) {
  const colorClasses = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    red: 'text-red-500 bg-red-500/10',
    indigo: 'text-indigo-500 bg-indigo-500/10',
    cyan: 'text-cyan-500 bg-cyan-500/10',
    pink: 'text-pink-500 bg-pink-500/10'
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900/70 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-lg", colorClasses[color as keyof typeof colorClasses])}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-sm",
              trend > 0 ? "text-green-500" : "text-red-500"
            )}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  )
}

// Campaigns Section Component
function CampaignsSection({ 
  campaigns, 
  onRecommendationClick 
}: { 
  campaigns: CampaignData[]
  onRecommendationClick: (campaign: CampaignData) => void
}) {
  const platformIcons = {
    Meta: '/meta-icon.png',
    Google: '/google-icon.png',
    TikTok: '/tiktok-icon.png'
  }

  return (
    <div className="space-y-4">
      {/* Platform Sections */}
      {['Meta', 'Google', 'TikTok'].map(platform => {
        const platformCampaigns = campaigns.filter(c => c.platform === platform)
        
        if (platform !== 'Meta' || platformCampaigns.length === 0) {
          return platform !== 'Meta' ? (
            <Card key={platform} className="bg-zinc-900/50 border-zinc-800 opacity-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {platform} Ads
                  <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                </CardTitle>
              </CardHeader>
            </Card>
          ) : null
        }

        return (
          <Card key={platform} className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <img 
                  src={platformIcons[platform as keyof typeof platformIcons]} 
                  alt={platform} 
                  className="h-5 w-5"
                />
                {platform} Campaigns ({platformCampaigns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-2 px-4">Campaign</th>
                      <th className="text-left py-2 px-4">Status</th>
                      <th className="text-right py-2 px-4">Budget</th>
                      <th className="text-right py-2 px-4">Spent</th>
                      <th className="text-right py-2 px-4">ROAS</th>
                      <th className="text-right py-2 px-4">CTR</th>
                      <th className="text-right py-2 px-4">CPC</th>
                      <th className="text-center py-2 px-4">AI Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformCampaigns.map(campaign => (
                      <tr key={campaign.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {campaign.adsets?.length || 0} ad sets
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className="bg-green-500/20 text-green-500 border-green-500/50"
                          >
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">{formatCurrency(campaign.budget)}</td>
                        <td className="py-3 px-4 text-right">
                          <div>
                            <p>{formatCurrency(campaign.spent)}</p>
                            <p className="text-sm text-muted-foreground">
                              {campaign.budget > 0 ? `${((campaign.spent / campaign.budget) * 100).toFixed(0)}%` : '-'}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            campaign.roas >= 3 ? "text-green-500" : 
                            campaign.roas >= 2 ? "text-yellow-500" : "text-red-500"
                          )}>
                            {campaign.roas.toFixed(2)}x
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">{formatPercentage(campaign.ctr)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(campaign.cpc)}</td>
                        <td className="py-3 px-4 text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "text-xs",
                                    campaign.recommendationSeverity === 'success' && "text-green-500 hover:text-green-400",
                                    campaign.recommendationSeverity === 'warning' && "text-yellow-500 hover:text-yellow-400",
                                    campaign.recommendationSeverity === 'error' && "text-red-500 hover:text-red-400"
                                  )}
                                  onClick={() => onRecommendationClick(campaign)}
                                >
                                  {campaign.recommendation || 'Analyzing...'}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Click for detailed analysis</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// Creatives Section Component
function CreativesSection({ creatives }: { creatives: CreativeData[] }) {
  const [sortBy, setSortBy] = useState<'roas' | 'ctr' | 'spent'>('roas')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filteredAndSorted = creatives
    .filter(c => filterStatus === 'all' || c.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'roas': return b.roas - a.roas
        case 'ctr': return b.ctr - a.ctr
        case 'spent': return b.spent - a.spent
        default: return 0
      }
    })

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Creative Performance Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-sm"
              >
                <option value="roas">Sort by ROAS</option>
                <option value="ctr">Sort by CTR</option>
                <option value="spent">Sort by Spend</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSorted.map(creative => (
              <Card key={creative.id} className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-4">
                  <div className="aspect-video bg-zinc-700 rounded mb-4 overflow-hidden">
                    {creative.thumbnailUrl ? (
                      <img 
                        src={creative.thumbnailUrl} 
                        alt={creative.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-12 w-12 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{creative.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {creative.campaignName}
                        </p>
                      </div>
                      <Badge 
                        variant={creative.type === 'video' ? 'default' : 'secondary'}
                        className="ml-2 text-xs"
                      >
                        {creative.type}
                      </Badge>
                    </div>
                    
                    {creative.headline && (
                      <p className="text-xs text-gray-400 line-clamp-2">
                        "{creative.headline}"
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">ROAS</p>
                        <p className={cn(
                          "font-semibold",
                          creative.roas >= 3 ? "text-green-500" : 
                          creative.roas >= 2 ? "text-yellow-500" : "text-red-500"
                        )}>
                          {creative.roas.toFixed(2)}x
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CTR</p>
                        <p className="font-semibold">{formatPercentage(creative.ctr)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Spent</p>
                        <p className="font-semibold">{formatCurrency(creative.spent)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CPC</p>
                        <p className="font-semibold">{formatCurrency(creative.cpc)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-700">
                      <span className="text-xs text-muted-foreground">
                        {formatNumber(creative.impressions)} impressions
                      </span>
                      <Button size="sm" variant="ghost" className="text-xs">
                        Analyze
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Insights Section Component
function InsightsSection({ 
  stats, 
  campaigns,
  brandSettings 
}: { 
  stats: BlendedStats | null
  campaigns: CampaignData[]
  brandSettings: any
}) {
  const [insightType, setInsightType] = useState<'performance' | 'forecast' | 'anomalies'>('performance')
  const [isGenerating, setIsGenerating] = useState(false)
  const [insights, setInsights] = useState<any>(null)

  const generateInsights = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: insightType,
          stats,
          campaigns,
          brandSettings
        })
      })

      if (response.ok) {
        const data = await response.json()
        setInsights(data)
      }
    } catch (error) {
      console.error('Error generating insights:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Mock chart data
  const performanceData = [
    { date: 'Mon', spend: 1200, revenue: 3600, roas: 3.0 },
    { date: 'Tue', spend: 1400, revenue: 4900, roas: 3.5 },
    { date: 'Wed', spend: 1100, revenue: 3850, roas: 3.5 },
    { date: 'Thu', spend: 1600, revenue: 4800, roas: 3.0 },
    { date: 'Fri', spend: 1800, revenue: 7200, roas: 4.0 },
    { date: 'Sat', spend: 2000, revenue: 8000, roas: 4.0 },
    { date: 'Sun', spend: 1900, revenue: 6650, roas: 3.5 }
  ]

  const platformDistribution = [
    { name: 'Meta', value: 78, color: '#3b82f6' },
    { name: 'Google', value: 15, color: '#10b981' },
    { name: 'TikTok', value: 7, color: '#f59e0b' }
  ]

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Marketing Insights
            </CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={insightType}
                onChange={(e) => setInsightType(e.target.value as any)}
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-sm"
              >
                <option value="performance">Performance Analysis</option>
                <option value="forecast">7-Day Forecast</option>
                <option value="anomalies">Anomaly Detection</option>
              </select>
              <Button
                onClick={generateInsights}
                disabled={isGenerating}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Insights
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-medium mb-4">Weekly Performance Trend</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-4">Platform Distribution</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={platformDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {platformDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {platformDistribution.map((platform) => (
                  <div key={platform.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: platform.color }}
                    />
                    <span className="text-sm text-gray-400">
                      {platform.name} ({platform.value}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Generated Insights */}
          {insights && (
            <div className="space-y-4">
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Key Findings
                </h4>
                <ul className="space-y-2">
                  {insights.findings?.map((finding: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>

              {insights.opportunities && (
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    Opportunities
                  </h4>
                  <div className="space-y-2">
                    {insights.opportunities.map((opp: any, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5",
                          opp.priority === 'high' ? 'bg-red-500' :
                          opp.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        )} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{opp.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{opp.description}</p>
                          <p className="text-xs text-blue-400 mt-1">
                            Potential impact: {opp.impact}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.forecast && (
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    7-Day Forecast
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Expected Spend</p>
                      <p className="font-semibold">{formatCurrency(insights.forecast.spend)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Expected Revenue</p>
                      <p className="font-semibold">{formatCurrency(insights.forecast.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Expected ROAS</p>
                      <p className="font-semibold">{insights.forecast.roas}x</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Confidence</p>
                      <p className="font-semibold">{insights.forecast.confidence}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 