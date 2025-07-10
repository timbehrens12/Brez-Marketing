"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { useBrandContext } from '@/lib/context/BrandContext'
import { getSupabaseClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DateRangePicker } from "@/components/DateRangePicker"
import { UnifiedLoading } from "@/components/ui/unified-loading"
import { AlertCircle, Brain, TrendingUp, TrendingDown, Eye, Target, DollarSign, MousePointer, Zap } from "lucide-react"
import { startOfDay, endOfDay, subDays, format } from "date-fns"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatters"
import { cn } from "@/lib/utils"
import { BlendedAdStats } from "./components/BlendedAdStats"
import { CampaignWidget } from "./components/CampaignWidget"
import { CreativeAnalysis } from "./components/CreativeAnalysis"
import { DailyPerformanceReport } from "./components/DailyPerformanceReport"
import { BrandIntelligence } from "./components/BrandIntelligence"

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

export default function AIMarketingDashboard() {
  const { userId, isLoaded } = useAuth()
  const { selectedBrandId, brands } = useBrandContext()
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date())
  })
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blendedStats, setBlendedStats] = useState({
    totalSpend: 0,
    roas: 0,
    cpc: 0,
    cpl: 0,
    purchases: 0,
    impressions: 0,
    clicks: 0,
    reach: 0
  })

  const supabase = getSupabaseClient()

  // Fetch campaign data with AI recommendations
  const fetchCampaignData = async () => {
    if (!selectedBrandId) return
    
    try {
      // Fetch campaigns from meta_campaigns table
      const { data: campaignData, error: campaignError } = await supabase
        .from('meta_campaigns')
        .select('*')
        .eq('brand_id', selectedBrandId)
        .gte('last_refresh_date', dateRange.from.toISOString())
        .lte('last_refresh_date', dateRange.to.toISOString())
        .order('spent', { ascending: false })

      if (campaignError) throw campaignError

      // Format campaign data
      const formattedCampaigns = campaignData?.map(campaign => ({
        id: campaign.id,
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        objective: campaign.objective,
        status: campaign.status,
        budget: campaign.budget || 0,
        spent: campaign.spent || 0,
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        reach: campaign.reach || 0,
        ctr: campaign.ctr || 0,
        cpc: campaign.cpc || 0,
        roas: campaign.roas || 0,
        conversions: campaign.conversions || 0,
        cost_per_conversion: campaign.cost_per_conversion || 0,
        daily_insights: campaign.daily_insights || []
      })) || []

      setCampaigns(formattedCampaigns)

      // Calculate blended stats
      const totalSpend = formattedCampaigns.reduce((sum, c) => sum + c.spent, 0)
      const totalImpressions = formattedCampaigns.reduce((sum, c) => sum + c.impressions, 0)
      const totalClicks = formattedCampaigns.reduce((sum, c) => sum + c.clicks, 0)
      const totalReach = formattedCampaigns.reduce((sum, c) => sum + c.reach, 0)
      const totalConversions = formattedCampaigns.reduce((sum, c) => sum + c.conversions, 0)
      
      // Calculate weighted averages
      const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0
      const avgCPL = totalConversions > 0 ? totalSpend / totalConversions : 0
      const avgROAS = totalSpend > 0 ? (totalConversions * 50) / totalSpend : 0 // Assuming $50 avg conversion value

      setBlendedStats({
        totalSpend,
        roas: avgROAS,
        cpc: avgCPC,
        cpl: avgCPL,
        purchases: totalConversions,
        impressions: totalImpressions,
        clicks: totalClicks,
        reach: totalReach
      })

    } catch (err) {
      console.error('Error fetching campaign data:', err)
      setError('Failed to load campaign data')
    }
  }

  // Fetch creative data
  const fetchCreativeData = async () => {
    if (!selectedBrandId) return
    
    try {
      const { data: creativeData, error: creativeError } = await supabase
        .from('meta_ads')
        .select(`
          *,
          meta_campaigns!inner(campaign_name)
        `)
        .eq('brand_id', selectedBrandId)
        .order('spent', { ascending: false })

      if (creativeError) throw creativeError

      // Format creative data and rank by performance
      const formattedCreatives = creativeData?.map((ad, index) => ({
        id: ad.id,
        ad_id: ad.ad_id,
        ad_name: ad.ad_name,
        campaign_id: ad.campaign_id,
        campaign_name: ad.meta_campaigns?.campaign_name || 'Unknown Campaign',
        headline: ad.headline || '',
        body: ad.body || '',
        cta_type: ad.cta_type || '',
        image_url: ad.image_url || '',
        spent: ad.spent || 0,
        impressions: ad.impressions || 0,
        clicks: ad.clicks || 0,
        ctr: ad.ctr || 0,
        cpc: ad.cpc || 0,
        roas: ad.spent > 0 ? (ad.conversions * 50) / ad.spent : 0,
        conversions: ad.conversions || 0,
        performance_rank: index + 1
      })) || []

      setCreatives(formattedCreatives)

    } catch (err) {
      console.error('Error fetching creative data:', err)
      setError('Failed to load creative data')
    }
  }

  // Initial data load
  useEffect(() => {
    if (isLoaded && selectedBrandId) {
      setIsLoading(true)
      setError(null)
      
      Promise.all([
        fetchCampaignData(),
        fetchCreativeData()
      ]).finally(() => {
        setIsLoading(false)
      })
    }
  }, [isLoaded, selectedBrandId, dateRange])

  // Show loading state
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <UnifiedLoading 
          size="lg" 
          variant="page" 
          message="Loading AI Marketing Dashboard"
          subMessage="Analyzing your campaigns and creatives..."
        />
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Card className="bg-[#1A1A1A] border-[#333] p-6">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </Card>
      </div>
    )
  }

  // Show brand selection if no brand selected
  if (!selectedBrandId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Card className="bg-[#1A1A1A] border-[#333] p-6">
          <div className="text-center">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Select a Brand</h2>
            <p className="text-gray-400">Choose a brand to view AI marketing insights</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-[#333] bg-[#1A1A1A] px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-400" />
              <h1 className="text-2xl font-bold">AI Marketing Dashboard</h1>
            </div>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              Beta
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <DateRangePicker
              dateRange={dateRange}
              setDateRange={setDateRange}
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setIsLoading(true)
                Promise.all([fetchCampaignData(), fetchCreativeData()]).finally(() => setIsLoading(false))
              }}
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Section 1: Blended Ad Stats */}
        <BlendedAdStats stats={blendedStats} />

        {/* Section 2: Platform-Specific Campaign Widgets */}
        <CampaignWidget 
          campaigns={campaigns} 
          brandId={selectedBrandId}
          dateRange={dateRange}
        />

        {/* Section 3: Creative Analysis */}
        <CreativeAnalysis 
          creatives={creatives} 
          brandId={selectedBrandId}
        />

        {/* Section 4: AI Daily Performance Report */}
        <DailyPerformanceReport 
          campaigns={campaigns} 
          creatives={creatives}
          stats={blendedStats}
          brandId={selectedBrandId}
        />

        {/* Section 5: Brand Context-Aware Intelligence */}
        <BrandIntelligence 
          campaigns={campaigns}
          creatives={creatives}
          stats={blendedStats}
          brandId={selectedBrandId}
        />
      </div>
    </div>
  )
}
