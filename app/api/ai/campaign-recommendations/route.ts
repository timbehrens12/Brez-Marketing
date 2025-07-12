import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { brandId, campaignId, campaignData } = await request.json()
    
    if (!brandId || !campaignId || !campaignData) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient()

    // Fetch additional campaign data from database
    const { data: campaign, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('brand_id', brandId)
      .single()

    if (campaignError || !campaign) {
      console.error('Error fetching campaign:', campaignError)
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Fetch ad sets for this campaign
    const { data: adSets, error: adSetsError } = await supabase
      .from('meta_adsets')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('brand_id', brandId)

    if (adSetsError) {
      console.error('Error fetching ad sets:', adSetsError)
    }

    // Fetch ads for this campaign
    const { data: ads, error: adsError } = await supabase
      .from('meta_ads')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('brand_id', brandId)

    if (adsError) {
      console.error('Error fetching ads:', adsError)
    }

    // Fetch 7-day historical data for campaign, adsets, and ads
    const historicalData = await fetchCampaignHistoricalData(supabase, campaignId, brandId)
    const adSetHistoricalData = await fetchAdSetHistoricalData(supabase, campaignId, brandId)
    const adHistoricalData = await fetchAdHistoricalData(supabase, campaignId, brandId)
    
    // Calculate key metrics and benchmarks with historical context
    const metrics = calculateCampaignMetrics(campaignData, adSets || [], ads || [], historicalData)
    
    // Generate AI recommendation with comprehensive analysis
    const recommendation = await generateAIRecommendation(
      campaign, 
      metrics, 
      adSets || [], 
      ads || [], 
      historicalData,
      adSetHistoricalData,
      adHistoricalData
    )

    return NextResponse.json({
      success: true,
      recommendation,
      metrics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating campaign recommendation:', error)
    return NextResponse.json({ 
      error: 'Failed to generate recommendation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

interface CampaignMetrics {
  performanceGrade: string
  budgetUtilization: number
  costEfficiency: string
  audienceReach: string
  conversionRate: number
  benchmarkComparison: {
    ctr: string
    cpc: string
    roas: string
  }
  keyIssues: string[]
  strengths: string[]
  trends: {
    spendTrend: string
    ctrTrend: string
    roasTrend: string
    weekOverWeekChange: number
  }
  consistency: {
    isStable: boolean
    volatilityScore: number
  }
}

interface DailyPerformance {
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  roas: number
}

interface HistoricalData {
  last7Days: DailyPerformance[]
  previous7Days: DailyPerformance[]
  averages: {
    spend: number
    ctr: number
    cpc: number
    roas: number
    impressions: number
    clicks: number
    conversions: number
  }
  trends: {
    spendTrend: number // percentage change over 7 days
    performanceTrend: number // overall performance trend
  }
}

interface AdSetPerformance {
  adset_id: string
  adset_name: string
  status: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  roas: number
  historical: {
    trend: string
    averageCtr: number
    averageCpc: number
    averageRoas: number
    weekOverWeekChange: number
  }
}

interface AdPerformance {
  ad_id: string
  ad_name: string
  adset_id: string
  status: string
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  roas: number
  historical: {
    trend: string
    averageCtr: number
    averageCpc: number
    averageRoas: number
    weekOverWeekChange: number
  }
}

async function fetchCampaignHistoricalData(supabase: any, campaignId: string, brandId: string): Promise<HistoricalData> {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Fetch last 7 days
  const { data: last7Days } = await supabase
    .from('meta_campaign_daily_stats')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .lt('date', today.toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Fetch previous 7 days (for comparison)
  const { data: previous7Days } = await supabase
    .from('meta_campaign_daily_stats')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)
    .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
    .lt('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  const processedLast7Days: DailyPerformance[] = (last7Days || []).map((day: any) => ({
    date: day.date,
    spend: Number(day.spend) || 0,
    impressions: Number(day.impressions) || 0,
    clicks: Number(day.clicks) || 0,
    conversions: Number(day.conversions) || 0,
    ctr: Number(day.ctr) || 0,
    cpc: Number(day.cpc) || 0,
    roas: Number(day.roas) || 0
  }))

  const processedPrevious7Days: DailyPerformance[] = (previous7Days || []).map((day: any) => ({
    date: day.date,
    spend: Number(day.spend) || 0,
    impressions: Number(day.impressions) || 0,
    clicks: Number(day.clicks) || 0,
    conversions: Number(day.conversions) || 0,
    ctr: Number(day.ctr) || 0,
    cpc: Number(day.cpc) || 0,
    roas: Number(day.roas) || 0
  }))

  // Calculate averages for last 7 days
  const averages = processedLast7Days.length > 0 ? {
    spend: processedLast7Days.reduce((sum, day) => sum + day.spend, 0) / processedLast7Days.length,
    ctr: processedLast7Days.reduce((sum, day) => sum + day.ctr, 0) / processedLast7Days.length,
    cpc: processedLast7Days.reduce((sum, day) => sum + day.cpc, 0) / processedLast7Days.length,
    roas: processedLast7Days.reduce((sum, day) => sum + day.roas, 0) / processedLast7Days.length,
    impressions: processedLast7Days.reduce((sum, day) => sum + day.impressions, 0) / processedLast7Days.length,
    clicks: processedLast7Days.reduce((sum, day) => sum + day.clicks, 0) / processedLast7Days.length,
    conversions: processedLast7Days.reduce((sum, day) => sum + day.conversions, 0) / processedLast7Days.length
  } : {
    spend: 0, ctr: 0, cpc: 0, roas: 0, impressions: 0, clicks: 0, conversions: 0
  }

  // Calculate trends
  const lastWeekSpend = processedLast7Days.reduce((sum, day) => sum + day.spend, 0)
  const prevWeekSpend = processedPrevious7Days.reduce((sum, day) => sum + day.spend, 0)
  const spendTrend = prevWeekSpend > 0 ? ((lastWeekSpend - prevWeekSpend) / prevWeekSpend) * 100 : 0

  const lastWeekPerf = processedLast7Days.reduce((sum, day) => sum + day.roas, 0) / Math.max(processedLast7Days.length, 1)
  const prevWeekPerf = processedPrevious7Days.reduce((sum, day) => sum + day.roas, 0) / Math.max(processedPrevious7Days.length, 1)
  const performanceTrend = prevWeekPerf > 0 ? ((lastWeekPerf - prevWeekPerf) / prevWeekPerf) * 100 : 0

  return {
    last7Days: processedLast7Days,
    previous7Days: processedPrevious7Days,
    averages,
    trends: {
      spendTrend,
      performanceTrend
    }
  }
}

async function fetchAdSetHistoricalData(supabase: any, campaignId: string, brandId: string): Promise<AdSetPerformance[]> {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Get current adset data
  const { data: adSets } = await supabase
    .from('meta_adsets')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)

  if (!adSets || adSets.length === 0) {
    return []
  }

  const adSetPerformances: AdSetPerformance[] = []

  for (const adSet of adSets) {
    // Fetch 7-day historical data for this adset
    const { data: last7Days } = await supabase
      .from('meta_adset_daily_stats')
      .select('*')
      .eq('adset_id', adSet.adset_id)
      .eq('brand_id', brandId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .lt('date', today.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Fetch previous 7 days for comparison
    const { data: previous7Days } = await supabase
      .from('meta_adset_daily_stats')
      .select('*')
      .eq('adset_id', adSet.adset_id)
      .eq('brand_id', brandId)
      .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
      .lt('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Calculate averages and trends
    const recentData = last7Days || []
    const previousData = previous7Days || []

    const averageCtr = recentData.length > 0 ? 
      recentData.reduce((sum: number, day: any) => sum + (Number(day.ctr) || 0), 0) / recentData.length : 0
    const averageCpc = recentData.length > 0 ?
      recentData.reduce((sum: number, day: any) => sum + (Number(day.cpc) || 0), 0) / recentData.length : 0
    const averageRoas = recentData.length > 0 ?
      recentData.reduce((sum: number, day: any) => sum + (Number(day.roas) || 0), 0) / recentData.length : 0

    const previousAverageRoas = previousData.length > 0 ?
      previousData.reduce((sum: number, day: any) => sum + (Number(day.roas) || 0), 0) / previousData.length : 0

    const weekOverWeekChange = previousAverageRoas > 0 ? 
      ((averageRoas - previousAverageRoas) / previousAverageRoas) * 100 : 0

    let trend = 'stable'
    if (weekOverWeekChange > 10) trend = 'improving'
    else if (weekOverWeekChange < -10) trend = 'declining'

    adSetPerformances.push({
      adset_id: adSet.adset_id,
      adset_name: adSet.adset_name,
      status: adSet.status,
      budget: Number(adSet.budget) || 0,
      spent: Number(adSet.spent) || 0,
      impressions: Number(adSet.impressions) || 0,
      clicks: Number(adSet.clicks) || 0,
      ctr: Number(adSet.ctr) || 0,
      cpc: Number(adSet.cpc) || 0,
      conversions: Number(adSet.conversions) || 0,
      roas: Number(adSet.roas) || 0,
      historical: {
        trend,
        averageCtr,
        averageCpc,
        averageRoas,
        weekOverWeekChange
      }
    })
  }

  return adSetPerformances
}

async function fetchAdHistoricalData(supabase: any, campaignId: string, brandId: string): Promise<AdPerformance[]> {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Get current ad data
  const { data: ads } = await supabase
    .from('meta_ads')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)

  if (!ads || ads.length === 0) {
    return []
  }

  const adPerformances: AdPerformance[] = []

  for (const ad of ads) {
    // Fetch 7-day historical data for this ad
    const { data: last7Days } = await supabase
      .from('meta_ad_daily_stats')
      .select('*')
      .eq('ad_id', ad.ad_id)
      .eq('brand_id', brandId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .lt('date', today.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Fetch previous 7 days for comparison
    const { data: previous7Days } = await supabase
      .from('meta_ad_daily_stats')
      .select('*')
      .eq('ad_id', ad.ad_id)
      .eq('brand_id', brandId)
      .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
      .lt('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Calculate averages and trends
    const recentData = last7Days || []
    const previousData = previous7Days || []

    const averageCtr = recentData.length > 0 ? 
      recentData.reduce((sum: number, day: any) => sum + (Number(day.ctr) || 0), 0) / recentData.length : 0
    const averageCpc = recentData.length > 0 ?
      recentData.reduce((sum: number, day: any) => sum + (Number(day.cpc) || 0), 0) / recentData.length : 0
    const averageRoas = recentData.length > 0 ?
      recentData.reduce((sum: number, day: any) => sum + (Number(day.roas) || 0), 0) / recentData.length : 0

    const previousAverageRoas = previousData.length > 0 ?
      previousData.reduce((sum: number, day: any) => sum + (Number(day.roas) || 0), 0) / previousData.length : 0

    const weekOverWeekChange = previousAverageRoas > 0 ? 
      ((averageRoas - previousAverageRoas) / previousAverageRoas) * 100 : 0

    let trend = 'stable'
    if (weekOverWeekChange > 15) trend = 'improving'
    else if (weekOverWeekChange < -15) trend = 'declining'

    adPerformances.push({
      ad_id: ad.ad_id,
      ad_name: ad.ad_name,
      adset_id: ad.adset_id,
      status: ad.status,
      impressions: Number(ad.impressions) || 0,
      clicks: Number(ad.clicks) || 0,
      ctr: Number(ad.ctr) || 0,
      cpc: Number(ad.cpc) || 0,
      conversions: Number(ad.conversions) || 0,
      roas: Number(ad.roas) || 0,
      historical: {
        trend,
        averageCtr,
        averageCpc,
        averageRoas,
        weekOverWeekChange
      }
    })
  }

  return adPerformances
}

function calculateCampaignMetrics(campaign: any, adSets: any[], ads: any[], historicalData: HistoricalData): CampaignMetrics {
  const { spent, budget, impressions, clicks, conversions, ctr, cpc, roas } = campaign
  
  // Calculate budget utilization
  const budgetUtilization = budget > 0 ? (spent / budget) * 100 : 0
  
  // Calculate conversion rate
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0
  
  // Benchmark thresholds (industry standards)
  const benchmarks = {
    ctr: { good: 2.0, average: 1.0, poor: 0.5 },
    cpc: { good: 1.0, average: 2.0, poor: 4.0 },
    roas: { good: 4.0, average: 2.0, poor: 1.0 }
  }

  // Performance grading
  let performanceScore = 0
  if (ctr >= benchmarks.ctr.good) performanceScore += 3
  else if (ctr >= benchmarks.ctr.average) performanceScore += 2
  else performanceScore += 1

  if (cpc <= benchmarks.cpc.good) performanceScore += 3
  else if (cpc <= benchmarks.cpc.average) performanceScore += 2
  else performanceScore += 1

  if (roas >= benchmarks.roas.good) performanceScore += 3
  else if (roas >= benchmarks.roas.average) performanceScore += 2
  else performanceScore += 1

  const performanceGrade = performanceScore >= 8 ? 'Excellent' : 
                          performanceScore >= 6 ? 'Good' : 
                          performanceScore >= 4 ? 'Average' : 'Poor'

  // Cost efficiency assessment
  const costEfficiency = cpc <= benchmarks.cpc.good ? 'Efficient' :
                        cpc <= benchmarks.cpc.average ? 'Moderate' : 'Inefficient'

  // Audience reach assessment
  const audienceReach = impressions > 100000 ? 'Excellent' :
                       impressions > 50000 ? 'Good' :
                       impressions > 10000 ? 'Average' : 'Limited'

  // Identify key issues
  const keyIssues = []
  if (ctr < benchmarks.ctr.average) keyIssues.push('Low click-through rate')
  if (cpc > benchmarks.cpc.average) keyIssues.push('High cost per click')
  if (roas < benchmarks.roas.average) keyIssues.push('Low return on ad spend')
  if (budgetUtilization < 50) keyIssues.push('Under-utilizing budget')
  if (budgetUtilization > 90) keyIssues.push('Budget nearly exhausted')
  if (conversions < 10) keyIssues.push('Low conversion volume')

  // Identify strengths
  const strengths = []
  if (ctr >= benchmarks.ctr.good) strengths.push('Strong engagement rate')
  if (cpc <= benchmarks.cpc.good) strengths.push('Cost-effective clicks')
  if (roas >= benchmarks.roas.good) strengths.push('High return on investment')
  if (impressions > 100000) strengths.push('Excellent reach')
  if (conversionRate > 5) strengths.push('High conversion rate')

  // Calculate trends based on historical data
  const calculateTrend = (current: number, historical: number) => {
    if (historical === 0) return 'stable'
    const change = ((current - historical) / historical) * 100
    if (change > 10) return 'improving'
    if (change < -10) return 'declining'
    return 'stable'
  }

  const spendTrend = calculateTrend(spent, historicalData.averages.spend * 7)
  const ctrTrend = calculateTrend(ctr, historicalData.averages.ctr)
  const roasTrend = calculateTrend(roas, historicalData.averages.roas)

  // Calculate performance consistency (volatility)
  const roasValues = historicalData.last7Days.map(day => day.roas).filter(val => val > 0)
  const avgRoas = roasValues.reduce((sum, val) => sum + val, 0) / Math.max(roasValues.length, 1)
  const variance = roasValues.reduce((sum, val) => sum + Math.pow(val - avgRoas, 2), 0) / Math.max(roasValues.length, 1)
  const volatilityScore = Math.sqrt(variance) / Math.max(avgRoas, 1) * 100
  const isStable = volatilityScore < 25 // Less than 25% coefficient of variation is considered stable

  return {
    performanceGrade,
    budgetUtilization,
    costEfficiency,
    audienceReach,
    conversionRate,
    benchmarkComparison: {
      ctr: ctr >= benchmarks.ctr.good ? 'Above Average' : 
           ctr >= benchmarks.ctr.average ? 'Average' : 'Below Average',
      cpc: cpc <= benchmarks.cpc.good ? 'Excellent' : 
           cpc <= benchmarks.cpc.average ? 'Average' : 'Poor',
      roas: roas >= benchmarks.roas.good ? 'Excellent' : 
            roas >= benchmarks.roas.average ? 'Average' : 'Poor'
    },
    keyIssues,
    strengths,
    trends: {
      spendTrend,
      ctrTrend,
      roasTrend,
      weekOverWeekChange: historicalData.trends.performanceTrend
    },
    consistency: {
      isStable,
      volatilityScore
    }
  }
}

async function generateAIRecommendation(campaign: any, metrics: CampaignMetrics, adSets: any[], ads: any[], historicalData: HistoricalData, adSetHistoricalData: AdSetPerformance[], adHistoricalData: AdPerformance[]) {
  // Format adset analysis
  const adSetAnalysis = adSetHistoricalData.map(adSet => 
    `AdSet: ${adSet.adset_name} (${adSet.status})
    - Budget: $${adSet.budget}, Spent: $${adSet.spent} (${adSet.budget > 0 ? ((adSet.spent / adSet.budget) * 100).toFixed(1) : 0}% utilization)
    - CTR: ${adSet.ctr?.toFixed(2) || 0}% (7-day avg: ${adSet.historical.averageCtr.toFixed(2)}%)
    - CPC: $${adSet.cpc?.toFixed(2) || 0} (7-day avg: $${adSet.historical.averageCpc.toFixed(2)})
    - ROAS: ${adSet.roas?.toFixed(2) || 0}x (7-day avg: ${adSet.historical.averageRoas.toFixed(2)}x)
    - Trend: ${adSet.historical.trend} (${adSet.historical.weekOverWeekChange > 0 ? '+' : ''}${adSet.historical.weekOverWeekChange.toFixed(1)}% WoW)
    - Impressions: ${adSet.impressions?.toLocaleString() || 0}, Clicks: ${adSet.clicks?.toLocaleString() || 0}, Conversions: ${adSet.conversions || 0}`
  ).join('\n\n')

  // Format ad analysis
  const adAnalysis = adHistoricalData.map(ad => 
    `Ad: ${ad.ad_name} (${ad.status}) - AdSet: ${ad.adset_id}
    - CTR: ${ad.ctr?.toFixed(2) || 0}% (7-day avg: ${ad.historical.averageCtr.toFixed(2)}%)
    - CPC: $${ad.cpc?.toFixed(2) || 0} (7-day avg: $${ad.historical.averageCpc.toFixed(2)})
    - ROAS: ${ad.roas?.toFixed(2) || 0}x (7-day avg: ${ad.historical.averageRoas.toFixed(2)}x)
    - Trend: ${ad.historical.trend} (${ad.historical.weekOverWeekChange > 0 ? '+' : ''}${ad.historical.weekOverWeekChange.toFixed(1)}% WoW)
    - Impressions: ${ad.impressions?.toLocaleString() || 0}, Clicks: ${ad.clicks?.toLocaleString() || 0}, Conversions: ${ad.conversions || 0}`
  ).join('\n\n')

  // Identify top performing and underperforming assets
  const topAdSets = adSetHistoricalData.filter(as => as.historical.trend === 'improving' && as.roas > 2.0)
  const underperformingAdSets = adSetHistoricalData.filter(as => as.historical.trend === 'declining' || as.roas < 1.0)
  const topAds = adHistoricalData.filter(ad => ad.historical.trend === 'improving' && ad.roas > 2.0)
  const underperformingAds = adHistoricalData.filter(ad => ad.historical.trend === 'declining' || ad.roas < 1.0)

  const prompt = `
You are an expert Meta advertising strategist. Analyze the following campaign data including detailed adset and ad performance with 7-day historical trends. Provide a specific, actionable recommendation that considers granular performance at the adset and ad level.

CAMPAIGN OVERVIEW:
Campaign: ${campaign.campaign_name}
Objective: ${campaign.objective}
Status: ${campaign.status}
Budget: $${campaign.budget} (${campaign.budget_type})
Spent: $${campaign.spent}
Budget Utilization: ${metrics.budgetUtilization.toFixed(1)}%

CAMPAIGN PERFORMANCE METRICS (Current):
- Impressions: ${campaign.impressions?.toLocaleString() || 0}
- Clicks: ${campaign.clicks?.toLocaleString() || 0}
- CTR: ${campaign.ctr?.toFixed(2) || 0}%
- CPC: $${campaign.cpc?.toFixed(2) || 0}
- Conversions: ${campaign.conversions || 0}
- Conversion Rate: ${metrics.conversionRate.toFixed(2)}%
- ROAS: ${campaign.roas?.toFixed(2) || 0}x

7-DAY CAMPAIGN TRENDS:
- Spend Trend: ${metrics.trends.spendTrend} (${historicalData.trends.spendTrend > 0 ? '+' : ''}${historicalData.trends.spendTrend.toFixed(1)}% vs previous week)
- CTR Trend: ${metrics.trends.ctrTrend}
- ROAS Trend: ${metrics.trends.roasTrend}
- Performance Consistency: ${metrics.consistency.isStable ? 'Stable' : 'Volatile'} (${metrics.consistency.volatilityScore.toFixed(1)}% volatility)
- Week-over-Week Performance Change: ${historicalData.trends.performanceTrend > 0 ? '+' : ''}${historicalData.trends.performanceTrend.toFixed(1)}%

DETAILED ADSET ANALYSIS (${adSetHistoricalData.length} adsets):
${adSetAnalysis}

DETAILED AD ANALYSIS (${adHistoricalData.length} ads):
${adAnalysis}

PERFORMANCE HIGHLIGHTS:
Top Performing AdSets (${topAdSets.length}): ${topAdSets.map(as => as.adset_name).join(', ') || 'None'}
Underperforming AdSets (${underperformingAdSets.length}): ${underperformingAdSets.map(as => as.adset_name).join(', ') || 'None'}
Top Performing Ads (${topAds.length}): ${topAds.map(ad => ad.ad_name).join(', ') || 'None'}
Underperforming Ads (${underperformingAds.length}): ${underperformingAds.map(ad => ad.ad_name).join(', ') || 'None'}

CAMPAIGN ASSESSMENT:
- Grade: ${metrics.performanceGrade}
- Cost Efficiency: ${metrics.costEfficiency}
- Audience Reach: ${metrics.audienceReach}
- Key Issues: ${metrics.keyIssues.join(', ') || 'None'}
- Strengths: ${metrics.strengths.join(', ') || 'None'}

CRITICAL ANALYSIS REQUIREMENTS:
1. Examine individual adset and ad performance trends, not just campaign-level metrics
2. Identify which specific adsets/ads are driving campaign performance (positive or negative)
3. Consider budget allocation across adsets and their relative performance
4. Analyze creative fatigue at the ad level (declining trends in high-impression ads)
5. Evaluate targeting effectiveness at the adset level
6. Provide specific recommendations for individual adsets and ads, not just campaign-level actions

Provide a comprehensive recommendation in the following JSON format:
{
  "action": "One of: increase budget, reduce budget, increase cpc, reduce cpc, optimize targeting, pause campaign, leave as is, restructure adsets, pause underperforming ads, scale top performers",
  "reasoning": "Detailed explanation based on adset and ad analysis, including specific performance patterns observed",
  "impact": "Expected outcome considering individual adset/ad performance changes",
  "confidence": "Confidence level from 1-10 (based on data quality and performance patterns)",
  "implementation": "Step-by-step guide including specific adset/ad actions (e.g., 'Pause AdSet X', 'Increase budget for AdSet Y by 50%', 'Test new creative for underperforming Ad Z')",
  "forecast": "Predicted performance changes based on observed adset/ad trends and proposed changes",
  "specific_actions": {
    "adsets_to_scale": ["List of adset names to increase budget/bids"],
    "adsets_to_optimize": ["List of adset names needing targeting/bid optimization"],
    "adsets_to_pause": ["List of adset names to pause"],
    "ads_to_pause": ["List of ad names to pause due to fatigue/poor performance"],
    "ads_to_duplicate": ["List of top-performing ad names to duplicate and test"]
  }
}

Focus on the most impactful actions that address specific adset and ad performance patterns, not just general campaign-level adjustments.
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Meta advertising strategist focused on providing actionable, data-driven recommendations. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })

    const recommendation = JSON.parse(response.choices[0].message.content || '{}')
    
    // Validate the recommendation structure
    if (!recommendation.action || !recommendation.reasoning) {
      throw new Error('Invalid recommendation format')
    }

    return recommendation

  } catch (error) {
    console.error('Error generating AI recommendation:', error)
    
    // Fallback to rule-based recommendation if AI fails
    return generateRuleBasedRecommendation(campaign, metrics, historicalData)
  }
}

function generateRuleBasedRecommendation(campaign: any, metrics: CampaignMetrics, historicalData: HistoricalData) {
  const { spent, budget, ctr, cpc, roas, conversions, impressions } = campaign
  const { budgetUtilization, performanceGrade, trends, consistency } = metrics

  // Enhanced rule-based logic using historical trends
  // If trending down with high volatility, recommend pause or optimization
  if (trends.roasTrend === 'declining' && !consistency.isStable) {
    return {
      action: 'pause campaign',
      reasoning: 'Campaign shows declining ROAS trend with high volatility over the last 7 days, indicating systematic issues',
      impact: 'Pausing will prevent further budget waste while allowing for comprehensive optimization',
      confidence: 8,
      implementation: 'Pause campaign immediately, analyze audience performance, review ad creative fatigue, and adjust targeting before reactivating',
      forecast: 'Stop budget drain and provide opportunity for 20-30% performance improvement after optimization'
    }
  }

  // If trending up but under-spending, recommend budget increase
  if (trends.roasTrend === 'improving' && trends.spendTrend !== 'declining' && budgetUtilization < 60) {
    return {
      action: 'increase budget',
      reasoning: 'Campaign shows improving ROAS trend over 7 days with low budget utilization, indicating scalable opportunity',
      impact: 'Higher budget should generate more conversions while maintaining efficiency gains',
      confidence: 9,
      implementation: 'Increase daily budget by 40-60% while monitoring CPA and ROAS daily for next week',
      forecast: 'Expected 50-80% increase in conversions with maintained or improved efficiency based on current trend'
    }
  }

  // If stable performance but high CPC compared to average
  if (cpc > historicalData.averages.cpc * 1.2 && trends.ctrTrend !== 'improving') {
    return {
      action: 'reduce cpc',
      reasoning: 'Current CPC is 20% higher than 7-day average without improving CTR trends',
      impact: 'Lower CPC should improve cost efficiency while maintaining reach',
      confidence: 7,
      implementation: 'Reduce bid amounts by 15-20% and monitor performance for 3-5 days',
      forecast: 'Expected 15-25% improvement in cost efficiency based on historical patterns'
    }
  }

  if (ctr < 1.0 && impressions > 50000) {
    return {
      action: 'optimize targeting',
      reasoning: 'Low click-through rate despite good reach suggests targeting issues',
      impact: 'Better targeting should improve engagement and reduce wasted impressions',
      confidence: 7,
      implementation: 'Review audience demographics and interests, test narrower targeting options',
      forecast: 'Expected 25-40% improvement in CTR within two weeks'
    }
  }

  if (roas > 4.0 && budgetUtilization < 60) {
    return {
      action: 'increase budget',
      reasoning: 'Strong ROAS with low budget utilization indicates scalable opportunity',
      impact: 'Higher budget should generate more conversions at current efficiency',
      confidence: 9,
      implementation: 'Increase daily budget by 30-50% while monitoring CPA',
      forecast: 'Expected 40-60% increase in conversions with maintained efficiency'
    }
  }

  if (conversions < 5 && spent > budget * 0.8) {
    return {
      action: 'pause campaign',
      reasoning: 'Low conversion volume with high budget consumption indicates poor performance',
      impact: 'Pausing will prevent further budget waste while optimizing',
      confidence: 8,
      implementation: 'Pause campaign and review targeting, creative, and landing page',
      forecast: 'Stop budget drain and allow time for optimization'
    }
  }

  // Default recommendation
  return {
    action: 'leave as is',
    reasoning: 'Campaign performance is within acceptable ranges',
    impact: 'Continue monitoring current performance trends',
    confidence: 6,
    implementation: 'Monitor key metrics and be ready to adjust if performance changes',
    forecast: 'Maintain current performance levels'
  }
} 