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

    // Fetch comprehensive campaign data from database
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

    // Fetch 30-day historical data for comprehensive analysis
    const historicalData = await fetchCampaignHistoricalData(supabase, campaignId, brandId, 30)
    const adSetHistoricalData = await fetchAdSetHistoricalData(supabase, campaignId, brandId, 30)
    const adHistoricalData = await fetchAdHistoricalData(supabase, campaignId, brandId, 30)
    
    // Fetch seasonal patterns and competitor benchmarks
    const seasonalData = await fetchSeasonalPatterns(supabase, brandId)
    const benchmarkData = await fetchIndustryBenchmarks(supabase, campaign.objective)
    
    // Calculate comprehensive metrics with extended historical context
    const metrics = calculateAdvancedCampaignMetrics(
      campaignData, 
      adSets || [], 
      ads || [], 
      historicalData,
      seasonalData,
      benchmarkData
    )
    
    // Generate AI recommendation with comprehensive analysis
    const recommendation = await generateAdvancedAIRecommendation(
      campaign, 
      metrics, 
      adSets || [], 
      ads || [], 
      historicalData,
      adSetHistoricalData,
      adHistoricalData,
      seasonalData,
      benchmarkData
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

interface AdvancedCampaignMetrics {
  performanceGrade: string
  budgetUtilization: number
  costEfficiency: string
  audienceReach: string
  conversionRate: number
  benchmarkComparison: {
    ctr: string
    cpc: string
    roas: string
    industry_percentile: number
  }
  keyIssues: string[]
  strengths: string[]
  trends: {
    spendTrend: string
    ctrTrend: string
    roasTrend: string
    weekOverWeekChange: number
    monthOverMonthChange: number
    seasonalPerformance: string
  }
  consistency: {
    isStable: boolean
    volatilityScore: number
  }
  creativeFatigue: {
    detected: boolean
    affectedAds: string[]
    fatigueScore: number
  }
  audienceAnalysis: {
    saturation: number
    overlap: number
    expansion_potential: string
  }
  competitorInsights: {
    relative_performance: string
    market_share_trend: string
    opportunity_areas: string[]
  }
}

interface HistoricalData {
  dailyMetrics: any[]
  trends: {
    spendTrend: number
    ctrTrend: number
    roasTrend: number
    performanceTrend: number
    weekOverWeekChange: number
    monthOverMonthChange: number
  }
  patterns: {
    bestPerformingDays: string[]
    worstPerformingDays: string[]
    timeOfDayOptimal: string
    seasonalFactors: any
  }
  stability: {
    isConsistent: boolean
    volatilityIndex: number
  }
}

interface SeasonalData {
  currentSeasonMultiplier: number
  upcomingTrends: string[]
  historicalPatterns: any[]
  holidayImpacts: any[]
}

interface BenchmarkData {
  industry_ctr: number
  industry_cpc: number
  industry_roas: number
  top_performer_threshold: number
}

interface AdSetPerformance {
  adset_id: string
  adset_name: string
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  roas: number
  budget: number
  historical: {
    trend: string
    weekOverWeekChange: number
    monthOverMonthChange: number
    consistency: number
    fatigue_detected: boolean
  }
}

interface AdPerformance {
  ad_id: string
  ad_name: string
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  roas: number
  historical: {
    trend: string
    weekOverWeekChange: number
    monthOverMonthChange: number
    impression_frequency: number
    fatigue_score: number
  }
}

async function fetchCampaignHistoricalData(supabase: any, campaignId: string, brandId: string, days: number = 30): Promise<HistoricalData> {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
  
  const { data: historicalData, error } = await supabase
    .from('meta_insights_daily')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error || !historicalData || historicalData.length === 0) {
    return {
      dailyMetrics: [],
      trends: {
        spendTrend: 0,
        ctrTrend: 0,
        roasTrend: 0,
        performanceTrend: 0,
        weekOverWeekChange: 0,
        monthOverMonthChange: 0
      },
      patterns: {
        bestPerformingDays: [],
        worstPerformingDays: [],
        timeOfDayOptimal: 'unknown',
        seasonalFactors: {}
      },
      stability: {
        isConsistent: false,
        volatilityIndex: 0
      }
    }
  }

  // Calculate trends and patterns
  const recentWeek = historicalData.slice(-7)
  const previousWeek = historicalData.slice(-14, -7)
  const recentMonth = historicalData.slice(-30)
  const previousMonth = historicalData.slice(-60, -30)

  const calculateAverage = (data: any[], field: string) => 
    data.reduce((sum, item) => sum + (item[field] || 0), 0) / data.length

  const recentSpend = calculateAverage(recentWeek, 'spend')
  const previousSpend = calculateAverage(previousWeek, 'spend')
  const spendTrend = previousSpend > 0 ? ((recentSpend - previousSpend) / previousSpend) * 100 : 0

  const recentCtr = calculateAverage(recentWeek, 'ctr')
  const previousCtr = calculateAverage(previousWeek, 'ctr')
  const ctrTrend = previousCtr > 0 ? ((recentCtr - previousCtr) / previousCtr) * 100 : 0

  const recentRoas = calculateAverage(recentWeek, 'roas')
  const previousRoas = calculateAverage(previousWeek, 'roas')
  const roasTrend = previousRoas > 0 ? ((recentRoas - previousRoas) / previousRoas) * 100 : 0

  // Calculate volatility
  const roasValues = historicalData.map((d: any) => d.roas || 0)
  const avgRoas = roasValues.reduce((sum: number, val: number) => sum + val, 0) / roasValues.length
  const variance = roasValues.reduce((sum: number, val: number) => sum + Math.pow(val - avgRoas, 2), 0) / roasValues.length
  const volatilityIndex = Math.sqrt(variance) / avgRoas * 100

  // Identify best/worst performing days
  const dayPerformance = historicalData.map((d: any) => ({
    day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' }),
    roas: d.roas || 0
  }))
  
  const avgByDay = dayPerformance.reduce((acc: Record<string, number[]>, curr: any) => {
    acc[curr.day] = acc[curr.day] || []
    acc[curr.day].push(curr.roas)
    return acc
  }, {} as Record<string, number[]>)

  const dayAverages = Object.entries(avgByDay).map(([day, values]) => ({
    day,
    avgRoas: (values as number[]).reduce((sum: number, val: number) => sum + val, 0) / values.length
  })).sort((a, b) => b.avgRoas - a.avgRoas)

  return {
    dailyMetrics: historicalData,
    trends: {
      spendTrend,
      ctrTrend,
      roasTrend,
      performanceTrend: (spendTrend + ctrTrend + roasTrend) / 3,
      weekOverWeekChange: spendTrend,
      monthOverMonthChange: recentMonth.length > 0 && previousMonth.length > 0 
        ? ((calculateAverage(recentMonth, 'roas') - calculateAverage(previousMonth, 'roas')) / calculateAverage(previousMonth, 'roas')) * 100 
        : 0
    },
    patterns: {
      bestPerformingDays: dayAverages.slice(0, 2).map(d => d.day),
      worstPerformingDays: dayAverages.slice(-2).map(d => d.day),
      timeOfDayOptimal: 'afternoon', // This would be calculated from hourly data if available
      seasonalFactors: {}
    },
    stability: {
      isConsistent: volatilityIndex < 25,
      volatilityIndex
    }
  }
}

async function fetchAdSetHistoricalData(supabase: any, campaignId: string, brandId: string, days: number = 30): Promise<AdSetPerformance[]> {
  // Fetch adset historical data
  const { data: adSets, error } = await supabase
    .from('meta_adsets')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)

  if (error || !adSets) return []

  const performanceData: AdSetPerformance[] = []

  for (const adSet of adSets) {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
    
    const { data: historical } = await supabase
      .from('meta_insights_daily')
      .select('*')
      .eq('adset_id', adSet.adset_id)
      .eq('brand_id', brandId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (historical && historical.length > 0) {
      const recentWeek = historical.slice(-7)
      const previousWeek = historical.slice(-14, -7)
      
      const calculateAverage = (data: any[], field: string) => 
        data.reduce((sum, item) => sum + (item[field] || 0), 0) / data.length

      const recentPerformance = calculateAverage(recentWeek, 'roas')
      const previousPerformance = calculateAverage(previousWeek, 'roas')
      const weekOverWeekChange = previousPerformance > 0 ? ((recentPerformance - previousPerformance) / previousPerformance) * 100 : 0

      // Detect fatigue - declining performance over time
      const performances = historical.map(h => h.roas || 0)
      const firstHalf = performances.slice(0, Math.floor(performances.length / 2))
      const secondHalf = performances.slice(Math.floor(performances.length / 2))
      const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
      const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
      const fatigue_detected = firstHalfAvg > 0 && secondHalfAvg < firstHalfAvg * 0.8

      performanceData.push({
        adset_id: adSet.adset_id,
        adset_name: adSet.adset_name,
        spent: adSet.spent || 0,
        impressions: adSet.impressions || 0,
        clicks: adSet.clicks || 0,
        conversions: adSet.conversions || 0,
        ctr: adSet.ctr || 0,
        cpc: adSet.cpc || 0,
        roas: adSet.roas || 0,
        budget: adSet.daily_budget || adSet.lifetime_budget || 0,
        historical: {
          trend: weekOverWeekChange > 10 ? 'improving' : weekOverWeekChange < -10 ? 'declining' : 'stable',
          weekOverWeekChange,
          monthOverMonthChange: 0, // Would calculate similarly
          consistency: historical.length > 7 ? Math.abs(weekOverWeekChange) < 20 ? 1 : 0 : 0,
          fatigue_detected
        }
      })
    }
  }

  return performanceData
}

async function fetchAdHistoricalData(supabase: any, campaignId: string, brandId: string, days: number = 30): Promise<AdPerformance[]> {
  // Similar to adset data but for individual ads
  const { data: ads, error } = await supabase
    .from('meta_ads')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)

  if (error || !ads) return []

  const performanceData: AdPerformance[] = []

  for (const ad of ads) {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
    
    const { data: historical } = await supabase
      .from('meta_insights_daily')
      .select('*')
      .eq('ad_id', ad.ad_id)
      .eq('brand_id', brandId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (historical && historical.length > 0) {
      const recentWeek = historical.slice(-7)
      const previousWeek = historical.slice(-14, -7)
      
      const calculateAverage = (data: any[], field: string) => 
        data.reduce((sum, item) => sum + (item[field] || 0), 0) / data.length

      const recentPerformance = calculateAverage(recentWeek, 'roas')
      const previousPerformance = calculateAverage(previousWeek, 'roas')
      const weekOverWeekChange = previousPerformance > 0 ? ((recentPerformance - previousPerformance) / previousPerformance) * 100 : 0

      // Calculate frequency and fatigue
      const totalImpressions = historical.reduce((sum, h) => sum + (h.impressions || 0), 0)
      const totalReach = historical.reduce((sum, h) => sum + (h.reach || 0), 0)
      const avgFrequency = totalReach > 0 ? totalImpressions / totalReach : 0
      const fatigueScore = avgFrequency > 3 ? Math.min(100, (avgFrequency - 3) * 25) : 0

      performanceData.push({
        ad_id: ad.ad_id,
        ad_name: ad.ad_name,
        spent: ad.spent || 0,
        impressions: ad.impressions || 0,
        clicks: ad.clicks || 0,
        conversions: ad.conversions || 0,
        ctr: ad.ctr || 0,
        cpc: ad.cpc || 0,
        roas: ad.roas || 0,
        historical: {
          trend: weekOverWeekChange > 10 ? 'improving' : weekOverWeekChange < -10 ? 'declining' : 'stable',
          weekOverWeekChange,
          monthOverMonthChange: 0,
          impression_frequency: avgFrequency,
          fatigue_score: fatigueScore
        }
      })
    }
  }

  return performanceData
}

async function fetchSeasonalPatterns(supabase: any, brandId: string): Promise<SeasonalData> {
  // This would fetch seasonal data for the brand/industry
  // For now, return mock data - you'd implement this based on your historical data
  return {
    currentSeasonMultiplier: 1.2, // 20% boost for current season
    upcomingTrends: ['holiday_shopping', 'end_of_year_sales'],
    historicalPatterns: [],
    holidayImpacts: []
  }
}

async function fetchIndustryBenchmarks(supabase: any, objective: string): Promise<BenchmarkData> {
  // This would fetch industry benchmarks based on campaign objective
  // For now, return standard e-commerce benchmarks
  return {
    industry_ctr: 1.85,
    industry_cpc: 0.97,
    industry_roas: 4.2,
    top_performer_threshold: 90 // 90th percentile
  }
}

function calculateAdvancedCampaignMetrics(
  campaignData: any, 
  adSets: any[], 
  ads: any[], 
  historicalData: HistoricalData,
  seasonalData: SeasonalData,
  benchmarkData: BenchmarkData
): AdvancedCampaignMetrics {
  
  const budget = campaignData.budget || 0
  const spent = campaignData.spent || 0
  const budgetUtilization = budget > 0 ? (spent / budget) * 100 : 0
  
  const ctr = campaignData.ctr || 0
  const cpc = campaignData.cpc || 0
  const roas = campaignData.roas || 0
  const conversions = campaignData.conversions || 0
  const clicks = campaignData.clicks || 0
  
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0
  
  // Performance grade calculation
  let gradePoints = 0
  if (ctr >= benchmarkData.industry_ctr * 1.2) gradePoints += 25
  else if (ctr >= benchmarkData.industry_ctr) gradePoints += 15
  else if (ctr >= benchmarkData.industry_ctr * 0.8) gradePoints += 10
  
  if (roas >= benchmarkData.industry_roas * 1.5) gradePoints += 35
  else if (roas >= benchmarkData.industry_roas) gradePoints += 25
  else if (roas >= benchmarkData.industry_roas * 0.7) gradePoints += 15
  
  if (cpc <= benchmarkData.industry_cpc * 0.8) gradePoints += 20
  else if (cpc <= benchmarkData.industry_cpc) gradePoints += 15
  else if (cpc <= benchmarkData.industry_cpc * 1.2) gradePoints += 10
  
  if (historicalData.stability.isConsistent) gradePoints += 20
  else gradePoints += 10
  
  const performanceGrade = gradePoints >= 90 ? 'A+' : gradePoints >= 80 ? 'A' : gradePoints >= 70 ? 'B' : gradePoints >= 60 ? 'C' : gradePoints >= 50 ? 'D' : 'F'
  
  // Industry percentile calculation
  let industryPercentile = 50 // Default to 50th percentile
  if (roas >= benchmarkData.industry_roas * 1.5) industryPercentile = 95
  else if (roas >= benchmarkData.industry_roas * 1.2) industryPercentile = 80
  else if (roas >= benchmarkData.industry_roas) industryPercentile = 65
  else if (roas >= benchmarkData.industry_roas * 0.8) industryPercentile = 40
  else industryPercentile = 20
  
  // Creative fatigue analysis
  const fatigueDetected = ads.some(ad => {
    // Logic to detect fatigue based on frequency and declining performance
    return false // Simplified for now
  })
  
  const affectedAds = ads.filter(ad => {
    // Logic to identify fatigued ads
    return false // Simplified for now
  }).map(ad => ad.ad_name)
  
  return {
    performanceGrade,
    budgetUtilization,
    costEfficiency: roas > benchmarkData.industry_roas ? 'excellent' : roas > benchmarkData.industry_roas * 0.8 ? 'good' : 'needs_improvement',
    audienceReach: 'expanding', // Would calculate based on reach data
    conversionRate,
    benchmarkComparison: {
      ctr: ctr > benchmarkData.industry_ctr ? 'above_average' : 'below_average',
      cpc: cpc < benchmarkData.industry_cpc ? 'above_average' : 'below_average',
      roas: roas > benchmarkData.industry_roas ? 'above_average' : 'below_average',
      industry_percentile: industryPercentile
    },
    keyIssues: [],
    strengths: [],
    trends: {
      spendTrend: historicalData.trends.spendTrend > 0 ? 'increasing' : 'decreasing',
      ctrTrend: historicalData.trends.ctrTrend > 0 ? 'improving' : 'declining',
      roasTrend: historicalData.trends.roasTrend > 0 ? 'improving' : 'declining',
      weekOverWeekChange: historicalData.trends.weekOverWeekChange,
      monthOverMonthChange: historicalData.trends.monthOverMonthChange,
      seasonalPerformance: seasonalData.currentSeasonMultiplier > 1 ? 'benefiting_from_season' : 'seasonal_headwinds'
    },
    consistency: {
      isStable: historicalData.stability.isConsistent,
      volatilityScore: historicalData.stability.volatilityIndex
    },
    creativeFatigue: {
      detected: fatigueDetected,
      affectedAds,
      fatigueScore: 0 // Calculate based on frequency and performance decline
    },
    audienceAnalysis: {
      saturation: 25, // Percentage of audience saturation
      overlap: 15, // Percentage overlap between adsets
      expansion_potential: 'high' // High, medium, low potential for audience expansion
    },
    competitorInsights: {
      relative_performance: 'above_average',
      market_share_trend: 'growing',
      opportunity_areas: ['mobile_optimization', 'video_creative', 'lookalike_audiences']
    }
  }
}

async function generateAdvancedAIRecommendation(
  campaign: any, 
  metrics: AdvancedCampaignMetrics, 
  adSets: any[], 
  ads: any[], 
  historicalData: HistoricalData,
  adSetHistoricalData: AdSetPerformance[], 
  adHistoricalData: AdPerformance[],
  seasonalData: SeasonalData,
  benchmarkData: BenchmarkData
) {

  // Prepare comprehensive analysis for AI
  const topAdSets = adSetHistoricalData.filter(as => as.historical.trend === 'improving' && as.roas > 2.0)
  const underperformingAdSets = adSetHistoricalData.filter(as => as.historical.trend === 'declining' || as.roas < 1.0)
  const topAds = adHistoricalData.filter(ad => ad.historical.trend === 'improving' && ad.roas > 2.0)
  const underperformingAds = adHistoricalData.filter(ad => ad.historical.trend === 'declining' || ad.roas < 1.0)
  const fatiguedAds = adHistoricalData.filter(ad => ad.historical.fatigue_score > 50)

  const adSetAnalysis = adSetHistoricalData.map(as => 
    `${as.adset_name}: ROAS ${as.roas.toFixed(2)}x, Trend: ${as.historical.trend} (${as.historical.weekOverWeekChange > 0 ? '+' : ''}${as.historical.weekOverWeekChange.toFixed(1)}%), Budget: $${as.budget}, ${as.historical.fatigue_detected ? 'FATIGUE DETECTED' : 'Healthy'}`
  ).join('\n')

  const adAnalysis = adHistoricalData.map(ad => 
    `${ad.ad_name}: ROAS ${ad.roas.toFixed(2)}x, Trend: ${ad.historical.trend} (${ad.historical.weekOverWeekChange > 0 ? '+' : ''}${ad.historical.weekOverWeekChange.toFixed(1)}%), Frequency: ${ad.historical.impression_frequency.toFixed(1)}, Fatigue Score: ${ad.historical.fatigue_score.toFixed(0)}%`
  ).join('\n')

  const prompt = `
You are an expert Meta advertising strategist with 10+ years of experience optimizing campaigns for maximum ROAS. Analyze this comprehensive campaign data including 30-day historical trends, seasonal patterns, industry benchmarks, and creative fatigue analysis.

CAMPAIGN OVERVIEW:
Campaign: ${campaign.campaign_name}
Objective: ${campaign.objective}
Status: ${campaign.status}
Budget: $${campaign.budget} (${campaign.budget_type})
Spent: $${campaign.spent}
Budget Utilization: ${metrics.budgetUtilization.toFixed(1)}%
Performance Grade: ${metrics.performanceGrade}
Industry Percentile: ${metrics.benchmarkComparison.industry_percentile}th

CURRENT PERFORMANCE VS INDUSTRY BENCHMARKS:
- CTR: ${campaign.ctr?.toFixed(2) || 0}% (Industry: ${benchmarkData.industry_ctr}%) - ${metrics.benchmarkComparison.ctr}
- CPC: $${campaign.cpc?.toFixed(2) || 0} (Industry: $${benchmarkData.industry_cpc}) - ${metrics.benchmarkComparison.cpc}
- ROAS: ${campaign.roas?.toFixed(2) || 0}x (Industry: ${benchmarkData.industry_roas}x) - ${metrics.benchmarkComparison.roas}
- Conversions: ${campaign.conversions || 0}
- Conversion Rate: ${metrics.conversionRate.toFixed(2)}%

30-DAY HISTORICAL ANALYSIS:
- Spend Trend: ${metrics.trends.spendTrend} (${historicalData.trends.spendTrend > 0 ? '+' : ''}${historicalData.trends.spendTrend.toFixed(1)}%)
- CTR Trend: ${metrics.trends.ctrTrend} (${historicalData.trends.ctrTrend > 0 ? '+' : ''}${historicalData.trends.ctrTrend.toFixed(1)}%)
- ROAS Trend: ${metrics.trends.roasTrend} (${historicalData.trends.roasTrend > 0 ? '+' : ''}${historicalData.trends.roasTrend.toFixed(1)}%)
- Month-over-Month Change: ${historicalData.trends.monthOverMonthChange > 0 ? '+' : ''}${historicalData.trends.monthOverMonthChange.toFixed(1)}%
- Performance Stability: ${metrics.consistency.isStable ? 'Stable' : 'Volatile'} (${metrics.consistency.volatilityScore.toFixed(1)}% volatility)
- Best Performing Days: ${historicalData.patterns.bestPerformingDays.join(', ')}
- Worst Performing Days: ${historicalData.patterns.worstPerformingDays.join(', ')}

SEASONAL & MARKET INSIGHTS:
- Current Season Impact: ${seasonalData.currentSeasonMultiplier > 1 ? 'Positive' : 'Negative'} (${((seasonalData.currentSeasonMultiplier - 1) * 100).toFixed(0)}% impact)
- Upcoming Trends: ${seasonalData.upcomingTrends.join(', ')}
- Market Position: ${metrics.competitorInsights.relative_performance}
- Market Share Trend: ${metrics.competitorInsights.market_share_trend}
- Opportunity Areas: ${metrics.competitorInsights.opportunity_areas.join(', ')}

AUDIENCE ANALYSIS:
- Audience Saturation: ${metrics.audienceAnalysis.saturation}%
- AdSet Overlap: ${metrics.audienceAnalysis.overlap}%
- Expansion Potential: ${metrics.audienceAnalysis.expansion_potential}

CREATIVE FATIGUE ANALYSIS:
- Fatigue Detected: ${metrics.creativeFatigue.detected ? 'YES' : 'NO'}
- Affected Ads: ${metrics.creativeFatigue.affectedAds.length}
- High Fatigue Ads (50%+ fatigue): ${fatiguedAds.map(ad => ad.ad_name).join(', ') || 'None'}

DETAILED ADSET PERFORMANCE (${adSetHistoricalData.length} adsets):
${adSetAnalysis}

DETAILED AD PERFORMANCE (${adHistoricalData.length} ads):
${adAnalysis}

PERFORMANCE HIGHLIGHTS:
Top Performing AdSets (${topAdSets.length}): ${topAdSets.map(as => `${as.adset_name} (${as.roas.toFixed(2)}x ROAS)`).join(', ') || 'None'}
Underperforming AdSets (${underperformingAdSets.length}): ${underperformingAdSets.map(as => `${as.adset_name} (${as.roas.toFixed(2)}x ROAS)`).join(', ') || 'None'}
Top Performing Ads (${topAds.length}): ${topAds.map(ad => `${ad.ad_name} (${ad.roas.toFixed(2)}x ROAS)`).join(', ') || 'None'}
Underperforming Ads (${underperformingAds.length}): ${underperformingAds.map(ad => `${ad.ad_name} (${ad.roas.toFixed(2)}x ROAS)`).join(', ') || 'None'}

EXPANDED RECOMMENDATION TYPES - Choose the MOST appropriate action:

BUDGET & BIDDING ACTIONS:
- "aggressive_scale" - Rapidly increase budget for top performers (50-100% increase)
- "conservative_scale" - Gradually increase budget (20-30% increase)
- "smart_budget_reallocation" - Move budget from poor to top performers
- "bid_optimization" - Adjust bidding strategy for better efficiency
- "dayparting_optimization" - Optimize ad scheduling based on performance times
- "seasonal_budget_boost" - Increase budget for seasonal opportunities

TARGETING & AUDIENCE ACTIONS:
- "audience_expansion" - Expand to lookalike/interest audiences
- "audience_refinement" - Narrow targeting for better quality
- "lookalike_creation" - Create new lookalike audiences from converters
- "interest_layering" - Add interest layers to improve targeting
- "demographic_optimization" - Optimize age/gender targeting
- "geographic_expansion" - Expand to new profitable locations
- "exclude_converters" - Exclude existing customers for acquisition campaigns

CREATIVE & AD ACTIONS:
- "creative_refresh" - Replace fatigued ads with new creatives
- "video_creative_test" - Test video ads for better engagement
- "ugc_creative_test" - Test user-generated content
- "dynamic_product_ads" - Implement dynamic product catalogs
- "carousel_optimization" - Optimize carousel ad formats
- "creative_fatigue_rotation" - Implement automatic creative rotation

CAMPAIGN STRUCTURE ACTIONS:
- "campaign_restructure" - Complete campaign restructuring
- "adset_consolidation" - Combine similar performing adsets
- "adset_segmentation" - Split adsets for better optimization
- "objective_optimization" - Change campaign objective for better performance
- "conversion_window_adjustment" - Adjust attribution windows
- "placement_optimization" - Optimize ad placements

ADVANCED OPTIMIZATION ACTIONS:
- "algorithmic_bidding_switch" - Switch to automated bidding strategies
- "conversion_optimization" - Implement conversion tracking optimization
- "value_optimization" - Switch to value-based optimization
- "retention_campaign_launch" - Launch retention campaigns for existing customers
- "cross_platform_expansion" - Expand to Instagram/other placements
- "competitor_targeting" - Target competitor audiences

DEFENSIVE ACTIONS:
- "pause_underperformers" - Pause poor performing elements
- "budget_reduction" - Reduce budget for declining performance
- "complete_pause" - Pause entire campaign
- "diagnostic_mode" - Reduce spend while investigating issues

Provide your recommendation in this JSON format:
{
  "action": "Choose ONE most appropriate action from the expanded list above",
  "priority": "critical|high|medium|low - How urgent is this action",
  "reasoning": "Comprehensive 3-4 sentence explanation based on data analysis, historical trends, seasonal factors, and benchmark comparisons",
  "impact": "Detailed expected outcome with specific metric improvements (e.g., 'Expect 25-35% ROAS improvement within 7-10 days')",
  "confidence": "1-10 confidence level based on data quality and historical patterns",
  "implementation": "Detailed step-by-step guide with specific instructions, timelines, and monitoring points",
  "forecast": "7-day, 14-day, and 30-day performance predictions with specific metrics",
  "timeline": "immediate|1-3_days|1_week|2_weeks - How quickly to implement",
  "risk_level": "low|medium|high - Risk level of this recommendation",
  "monitoring_plan": "What metrics to watch and how often to check performance",
  "rollback_plan": "What to do if the recommendation doesn't work as expected",
  "seasonal_considerations": "How seasonal trends impact this recommendation",
  "specific_actions": {
    "adsets_to_scale": ["List of specific adset names with recommended budget increases"],
    "adsets_to_optimize": ["List of adsets needing targeting/bid adjustments"],
    "adsets_to_pause": ["List of adsets to pause with reasons"],
    "ads_to_pause": ["List of ads to pause due to fatigue/poor performance"],
    "ads_to_duplicate": ["List of top-performing ads to duplicate"],
    "new_audiences_to_test": ["Specific new audience segments to create"],
    "creative_actions": ["Specific creative changes needed"],
    "budget_adjustments": ["Specific budget changes with amounts"]
  },
  "success_metrics": {
    "primary": "Main metric to track success (e.g., ROAS improvement)",
    "secondary": ["Additional metrics to monitor"],
    "targets": {
      "7_day": "Specific targets for 7 days",
      "14_day": "Specific targets for 14 days", 
      "30_day": "Specific targets for 30 days"
    }
  },
  "tutorial": {
    "title": "Step-by-step tutorial title",
    "steps": ["Detailed step 1", "Detailed step 2", "etc."],
    "tips": ["Pro tip 1", "Pro tip 2", "etc."],
    "common_mistakes": ["What to avoid 1", "What to avoid 2", "etc."]
  }
}

Focus on the single most impactful action based on the comprehensive data analysis. Be specific with numbers, timelines, and actionable steps.
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Meta advertising strategist with deep expertise in campaign optimization, creative strategy, and performance marketing. Always provide actionable, data-driven recommendations with specific implementation steps. Respond only with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
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
    return generateAdvancedRuleBasedRecommendation(campaign, metrics, historicalData)
  }
}

function generateAdvancedRuleBasedRecommendation(campaign: any, metrics: AdvancedCampaignMetrics, historicalData: HistoricalData) {
  // Enhanced fallback logic with more sophisticated recommendations
  const roas = campaign.roas || 0
  const ctr = campaign.ctr || 0
  const budgetUtilization = metrics.budgetUtilization
  const trend = historicalData.trends.roasTrend

  // Determine action based on multiple factors
  let action = 'leave_as_is'
  let priority = 'medium'
  let reasoning = 'Campaign performance is stable and meeting targets.'
  
  if (roas < 1.5 && trend < -10) {
    action = 'pause_underperformers'
    priority = 'critical'
    reasoning = 'Campaign ROAS is below breakeven and declining. Immediate action required to prevent further losses.'
  } else if (roas > 4.0 && trend > 15 && budgetUtilization > 80) {
    action = 'aggressive_scale'
    priority = 'high'
    reasoning = 'Excellent ROAS with strong upward trend and high budget utilization indicates opportunity for aggressive scaling.'
  } else if (roas > 2.5 && trend > 5) {
    action = 'conservative_scale'
    priority = 'medium'
    reasoning = 'Good ROAS with positive trend suggests conservative scaling opportunity.'
  } else if (ctr < 1.0 && metrics.creativeFatigue.detected) {
    action = 'creative_refresh'
    priority = 'high'
    reasoning = 'Low CTR and detected creative fatigue indicate need for fresh creative assets.'
  }

  return {
    action,
    priority,
    reasoning,
    impact: 'Performance improvement expected based on historical patterns.',
    confidence: 6,
    implementation: 'Monitor campaign performance closely and adjust based on results.',
    forecast: 'Gradual improvement expected over 7-14 days.',
    timeline: '1-3_days',
    risk_level: 'low',
    monitoring_plan: 'Check ROAS and CTR daily for first week.',
    rollback_plan: 'Revert changes if performance declines by more than 20%.',
    seasonal_considerations: 'Monitor for seasonal impacts on performance.',
    specific_actions: {
      adsets_to_scale: [],
      adsets_to_optimize: [],
      adsets_to_pause: [],
      ads_to_pause: [],
      ads_to_duplicate: [],
      new_audiences_to_test: [],
      creative_actions: [],
      budget_adjustments: []
    },
    success_metrics: {
      primary: 'ROAS improvement',
      secondary: ['CTR improvement', 'Cost reduction'],
      targets: {
        '7_day': 'Stable performance',
        '14_day': '10% improvement',
        '30_day': '20% improvement'
      }
    },
    tutorial: {
      title: 'Basic Campaign Optimization',
      steps: ['Monitor performance', 'Make gradual adjustments', 'Track results'],
      tips: ['Start small', 'Be patient', 'Test systematically'],
      common_mistakes: ['Making too many changes at once', 'Not monitoring results', 'Panicking over short-term fluctuations']
    }
  }
} 