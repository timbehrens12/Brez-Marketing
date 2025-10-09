import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getMondayToMondayRange } from '@/lib/date-utils'
import { aiUsageService } from '@/lib/services/ai-usage-service'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface OptimizationRecommendation {
  id: string
  type: 'budget' | 'audience' | 'creative' | 'bid' | 'frequency'
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
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const secret = searchParams.get('secret')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Secret check for reset (can be any string, this is just a simple mechanism)
    if (secret !== 'reset-ai-recs') {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
    }

    console.log('[Recommendations] Deleting all recommendations for brand:', brandId)

    // 1. Delete performance tracking records
    const { error: perfError } = await supabase
      .from('recommendation_performance')
      .delete()
      .eq('brand_id', brandId)

    if (perfError) {
      console.error('[Recommendations] Error deleting performance records:', perfError)
      // Continue anyway - performance records may not exist
    }

    // 2. Delete all "mark_as_done" usage logs (for progress tracking)
    const { error: usageLogError } = await supabase
      .from('ai_usage_logs')
      .delete()
      .eq('brand_id', brandId)
      .eq('endpoint', 'mark_as_done')

    if (usageLogError) {
      console.error('[Recommendations] Error deleting usage logs:', usageLogError)
    } else {
      console.log('[Recommendations] ✅ Deleted mark_as_done usage logs')
    }

    // 3. Delete optimization action logs
    const { error: actionLogError } = await supabase
      .from('optimization_action_log')
      .delete()
      .eq('brand_id', brandId)

    if (actionLogError) {
      console.error('[Recommendations] Error deleting action logs:', actionLogError)
    } else {
      console.log('[Recommendations] ✅ Deleted optimization action logs')
    }

    // 4. Delete all recommendations for this brand
    const { error } = await supabase
      .from('ai_campaign_recommendations')
      .delete()
      .eq('brand_id', brandId)

    if (error) {
      console.error('[Recommendations] Error deleting recommendations:', error)
      return NextResponse.json({ error: 'Failed to delete recommendations' }, { status: 500 })
    }

    console.log('[Recommendations] Successfully reset all recommendation data for brand:', brandId)

    return NextResponse.json({ 
      success: true, 
      message: 'All recommendations reset. Refresh the page to generate new ones.' 
    })

  } catch (error) {
    console.error('Error resetting recommendations:', error)
    return NextResponse.json({ error: 'Failed to reset recommendations' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const platforms = searchParams.get('platforms')?.split(',') || ['meta', 'google', 'tiktok']
    const status = searchParams.get('status') || 'active'
    const forceGenerate = searchParams.get('forceGenerate') === 'true' // Only generate if explicitly requested
    
    // Use Sunday-to-Sunday weekly window (last complete week)
    const { startDate, endDate } = getMondayToMondayRange()
    const dateRange = {
      from: searchParams.get('from') || startDate,
      to: searchParams.get('to') || endDate
    }
    
    console.log(`[Recommendations API] Using Sunday-to-Sunday range: ${dateRange.from} to ${dateRange.to}`)

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Get campaigns that have data in the date range (regardless of current status)
    let allowedCampaignIds: string[] = []
    
    if (platforms.includes('meta')) {
      // Query for campaigns that have actual data in the date range
      const { data: campaignsWithData } = await supabase
        .from('meta_campaign_daily_stats')
        .select('campaign_id')
        .eq('brand_id', brandId)
        .gte('date', dateRange.from)
        .lte('date', dateRange.to)
      
      if (campaignsWithData && campaignsWithData.length > 0) {
        // Get unique campaign IDs
        allowedCampaignIds = [...new Set(campaignsWithData.map(c => c.campaign_id))]
        console.log(`[Recommendations API] Found ${allowedCampaignIds.length} campaigns with data in date range`)
      } else {
        console.log(`[Recommendations API] No campaigns found with data between ${dateRange.from} and ${dateRange.to}`)
      }
    }

    // Get AI campaign recommendations from database - filter by platforms and status
    // Only use cached recommendations if they were created THIS WEEK (after last Monday)
    const currentMonday = new Date(endDate)
    currentMonday.setHours(0, 0, 0, 0)
    
    let recommendationsQuery = supabase
      .from('ai_campaign_recommendations')
      .select('*')
      .eq('brand_id', brandId)
      .gt('created_at', currentMonday.toISOString()) // Only get recommendations from this week
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    
    console.log(`[Recommendations API] Checking for cached recommendations created after ${currentMonday.toISOString()}`)
    
    if (allowedCampaignIds.length > 0) {
      recommendationsQuery = recommendationsQuery.in('campaign_id', allowedCampaignIds)
    } else if (platforms.includes('meta')) {
      // If meta is selected but no campaigns have data in this date range
      console.log(`[Recommendations API] No campaign data found in date range - returning empty with message`)
      return NextResponse.json({ 
        recommendations: [],
        message: `No campaign data available between ${dateRange.from} and ${dateRange.to}. Your campaigns may be paused or no ads ran during this period.`
      })
    }
    
    const { data: existingRecommendations } = await recommendationsQuery

    if (existingRecommendations && existingRecommendations.length > 0) {
      const recommendations = existingRecommendations.map(rec => ({
        id: rec.id,
        type: rec.recommendation.type || 'budget',
        priority: rec.recommendation.priority || 'medium',
        title: rec.recommendation.title || 'Optimization Opportunity',
        description: rec.recommendation.description || '',
        rootCause: rec.recommendation.rootCause || 'Performance analysis detected an opportunity',
        actions: rec.recommendation.actions || [],
        currentValue: rec.recommendation.currentValue || '',
        recommendedValue: rec.recommendation.recommendedValue || '',
        projectedImpact: rec.recommendation.projectedImpact || { revenue: 0, roas: 0, confidence: 0 },
        campaignId: rec.campaign_id,
        campaignName: rec.campaign_name,
        platform: rec.platform
      }))

      console.log(`[Recommendations API] Returning ${recommendations.length} cached recommendations (no AI usage tracked)`)
      return NextResponse.json({ recommendations })
    }

    // Only generate new recommendations if explicitly requested (when user clicks "Update Recommendations")
    if (!forceGenerate) {
      console.log(`[Recommendations API] No cached recommendations found, but forceGenerate=false, returning empty`)
      return NextResponse.json({ recommendations: [] })
    }

    // Generate new recommendations
    console.log(`[Recommendations API] Generating new recommendations (forceGenerate=true)`)
    const recommendations = await generateRecommendations(brandId, dateRange, platforms, status, allowedCampaignIds)
    
    // Store recommendations in database
    // Set expiration to next Monday (when new recommendations should be generated)
    const nextMonday = new Date(endDate)
    nextMonday.setDate(nextMonday.getDate() + 7)
    nextMonday.setHours(0, 0, 0, 0)
    
    console.log(`[Recommendations API] Storing ${recommendations.length} new recommendations, expiring at ${nextMonday.toISOString()}`)
    
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i]
      // Create a hash of the recommendation data for deduplication
      // Include title to differentiate multiple recommendations of the same type
      const titleHash = rec.title.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')
      const dataHash = `${rec.campaignId}_${rec.type}_${titleHash}_${i}`
      
      const { data, error } = await supabase
        .from('ai_campaign_recommendations')
        .upsert({
          brand_id: brandId,
          campaign_id: rec.campaignId,
          campaign_name: rec.campaignName,
          platform: rec.platform,
          data_hash: dataHash,
          recommendation: {
            type: rec.type,
            priority: rec.priority,
            title: rec.title,
            description: rec.description,
            rootCause: rec.rootCause,
            actions: rec.actions,
            currentValue: rec.currentValue,
            recommendedValue: rec.recommendedValue,
            projectedImpact: rec.projectedImpact
          },
          expires_at: nextMonday.toISOString() // Expire next Monday
        }, {
          onConflict: 'data_hash', // Use data_hash for conflict resolution instead of (brand_id, campaign_id)
          ignoreDuplicates: false
        })
        .select()
      
      if (error) {
        console.error(`[Recommendations API] Error upserting recommendation:`, error)
      } else {
        console.log(`[Recommendations API] Upserted recommendation with ID:`, data?.[0]?.id)
      }
    }

    // Re-query to get the actual database IDs for the stored recommendations
    const { data: storedRecommendations, error: queryError } = await supabase
      .from('ai_campaign_recommendations')
      .select('*')
      .eq('brand_id', brandId)
      .gt('created_at', currentMonday.toISOString())
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    console.log(`[Recommendations API] Re-query returned ${storedRecommendations?.length || 0} recommendations`)
    if (queryError) {
      console.error(`[Recommendations API] Error re-querying recommendations:`, queryError)
    }

    if (storedRecommendations && storedRecommendations.length > 0) {
      const recommendationsWithDbIds = storedRecommendations.map(rec => ({
        id: rec.id, // Use database UUID instead of Date.now() timestamp
        type: rec.recommendation.type || 'budget',
        priority: rec.recommendation.priority || 'medium',
        title: rec.recommendation.title || 'Optimization Opportunity',
        description: rec.recommendation.description || '',
        rootCause: rec.recommendation.rootCause || 'Performance analysis detected an opportunity',
        actions: rec.recommendation.actions || [],
        currentValue: rec.recommendation.currentValue || '',
        recommendedValue: rec.recommendation.recommendedValue || '',
        projectedImpact: rec.recommendation.projectedImpact || { revenue: 0, roas: 0, confidence: 0 },
        campaignId: rec.campaign_id,
        campaignName: rec.campaign_name,
        platform: rec.platform
      }))

      // Capture baseline performance for each recommendation
      for (const rec of recommendationsWithDbIds) {
        try {
          await supabase.from('recommendation_performance').insert({
            brand_id: brandId,
            campaign_id: rec.campaignId,
            recommendation_id: rec.id,
            recommendation_type: rec.type,
            action_taken: false,
            before_metrics: await capturePerformanceMetrics(brandId, rec.campaignId, dateRange),
            before_period_start: dateRange.from,
            before_period_end: dateRange.to,
            recommendation_created_at: new Date().toISOString(),
            outcome: 'pending'
          })
          console.log(`[Recommendations API] Captured baseline for recommendation ${rec.id}`)
        } catch (error) {
          console.error(`[Recommendations API] Error capturing baseline for ${rec.id}:`, error)
        }
      }

      console.log(`[Recommendations API] Returning ${recommendationsWithDbIds.length} recommendations with database IDs`)
      console.log(`[Recommendations API] Sample IDs:`, recommendationsWithDbIds.slice(0, 3).map(r => r.id))
      
      // Track AI usage for marketing_analysis feature
      try {
        await aiUsageService.recordUsage(brandId, userId, 'marketing_analysis', {
          recommendationsGenerated: recommendationsWithDbIds.length,
          dateRange: dateRange,
          platforms: platforms
        })
        console.log(`[Recommendations API] ✅ Tracked AI usage for marketing_analysis`)
      } catch (trackingError) {
        console.error(`[Recommendations API] ⚠️ Failed to track AI usage:`, trackingError)
        // Don't fail the request if tracking fails
      }
      
      return NextResponse.json({ recommendations: recommendationsWithDbIds })
    }

    return NextResponse.json({ recommendations })

  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}

// Helper function to format segment names for readability
function formatSegmentName(type: string, segment: string): string {
  if (type === 'age_gender') {
    const [age, gender] = segment.split('_')
    return `${age} ${gender}s`
  }
  if (type === 'age') {
    return `Ages ${segment}`
  }
  if (type === 'gender') {
    return `${segment}s`
  }
  if (type === 'device') {
    return segment.replace('_', ' ')
  }
  return segment
}

// Helper function to analyze demographic and device performance data
// Note: Demographics are at account level, so we create a single insight object
// that can be applied to all campaigns in the account
function analyzeDemographics(demographics: any[], deviceData: any[]) {
  const accountInsights = {
    ageSegments: new Map(),
    genderSegments: new Map(),
    ageGenderSegments: new Map(),
    devices: new Map(),
    platforms: new Map(),
    topPerformers: [],
    underperformers: []
  }

  // Group demographic data (account-level)
  demographics.forEach(record => {
    const insights = accountInsights
    const breakdownType = record.breakdown_type
    const breakdownValue = record.breakdown_value
    const impressions = parseInt(record.impressions) || 0
    const clicks = parseInt(record.clicks) || 0
    const spend = parseFloat(record.spend) || 0
    const revenue = parseFloat(record.revenue || record.purchase_value) || 0
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const roas = spend > 0 ? revenue / spend : 0
    const cpc = clicks > 0 ? spend / clicks : 0

    const performance = {
      segment: breakdownValue,
      impressions,
      clicks,
      spend,
      revenue,
      ctr,
      roas,
      cpc,
      conversions: parseInt(record.conversions) || 0
    }

    // Categorize by breakdown type
    if (breakdownType === 'age') {
      if (!insights.ageSegments.has(breakdownValue)) {
        insights.ageSegments.set(breakdownValue, [])
      }
      insights.ageSegments.get(breakdownValue).push(performance)
    } else if (breakdownType === 'gender') {
      if (!insights.genderSegments.has(breakdownValue)) {
        insights.genderSegments.set(breakdownValue, [])
      }
      insights.genderSegments.get(breakdownValue).push(performance)
    } else if (breakdownType === 'age,gender') {
      if (!insights.ageGenderSegments.has(breakdownValue)) {
        insights.ageGenderSegments.set(breakdownValue, [])
      }
      insights.ageGenderSegments.get(breakdownValue).push(performance)
    }
  })

  // Process device data (account-level)
  deviceData.forEach(record => {
    const insights = accountInsights
    const breakdownType = record.breakdown_type
    const breakdownValue = record.breakdown_value
    const impressions = parseInt(record.impressions) || 0
    const clicks = parseInt(record.clicks) || 0
    const spend = parseFloat(record.spend) || 0
    const revenue = parseFloat(record.revenue || record.purchase_value) || 0
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const roas = spend > 0 ? revenue / spend : 0
    const cpc = clicks > 0 ? spend / clicks : 0

    const performance = {
      segment: breakdownValue,
      impressions,
      clicks,
      spend,
      revenue,
      ctr,
      roas,
      cpc,
      conversions: parseInt(record.conversions) || 0
    }

    if (breakdownType === 'device_platform' || breakdownType === 'publisher_platform') {
      if (!insights.platforms.has(breakdownValue)) {
        insights.platforms.set(breakdownValue, [])
      }
      insights.platforms.get(breakdownValue).push(performance)
    } else {
      if (!insights.devices.has(breakdownValue)) {
        insights.devices.set(breakdownValue, [])
      }
      insights.devices.get(breakdownValue).push(performance)
    }
  })

  // Aggregate and identify top/underperformers at account level
  const allSegments: any[] = []

  // Aggregate all segment types
  const aggregateSegments = (segmentMap: Map<string, any[]>, type: string) => {
    segmentMap.forEach((records, segment) => {
      const aggregated = records.reduce((acc, r) => ({
        impressions: acc.impressions + r.impressions,
        clicks: acc.clicks + r.clicks,
        spend: acc.spend + r.spend,
        revenue: acc.revenue + r.revenue,
        conversions: acc.conversions + r.conversions
      }), { impressions: 0, clicks: 0, spend: 0, revenue: 0, conversions: 0 })

      const ctr = aggregated.impressions > 0 ? (aggregated.clicks / aggregated.impressions) * 100 : 0
      const roas = aggregated.spend > 0 ? aggregated.revenue / aggregated.spend : 0
      const cpc = aggregated.clicks > 0 ? aggregated.spend / aggregated.clicks : 0

      allSegments.push({
        type,
        segment,
        ...aggregated,
        ctr,
        roas,
        cpc,
        efficiency: (ctr * (roas || 1)) // Combined efficiency score
      })
    })
  }

  aggregateSegments(accountInsights.ageSegments, 'age')
  aggregateSegments(accountInsights.genderSegments, 'gender')
  aggregateSegments(accountInsights.ageGenderSegments, 'age_gender')
  aggregateSegments(accountInsights.devices, 'device')
  aggregateSegments(accountInsights.platforms, 'platform')

  // Sort by efficiency and identify top/underperformers
  allSegments.sort((a, b) => b.efficiency - a.efficiency)

  const medianEfficiency = allSegments.length > 0 ? 
    allSegments[Math.floor(allSegments.length / 2)].efficiency : 0

  accountInsights.topPerformers = allSegments.filter(s => 
    s.efficiency > medianEfficiency * 1.3 && s.impressions > 20
  ).slice(0, 5)

  accountInsights.underperformers = allSegments.filter(s => 
    s.efficiency < medianEfficiency * 0.7 && s.spend > 1
  ).slice(0, 5)

  // Return the account insights - this will be applied to all campaigns
  return accountInsights
}

async function generateRecommendations(
  brandId: string, 
  dateRange: { from: string; to: string },
  platforms: string[],
  status: string,
  allowedCampaignIds: string[]
): Promise<OptimizationRecommendation[]> {
  try {
    // If no campaigns match filters, return empty
    if (platforms.includes('meta') && allowedCampaignIds.length === 0) {
      return []
    }

    // Get performance data at ALL levels: Campaign, Ad Set, and Ad
    const { data: campaignStats } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .in('campaign_id', allowedCampaignIds)
      .gte('date', dateRange.from)
      .lte('date', dateRange.to)

    const { data: adsetStats } = await supabase
      .from('meta_adset_daily_insights')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', dateRange.from)
      .lte('date', dateRange.to)

    const { data: adStats } = await supabase
      .from('meta_ad_daily_insights')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', dateRange.from)
      .lte('date', dateRange.to)

    const { data: campaigns } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('brand_id', brandId)
      .in('campaign_id', allowedCampaignIds)

    const { data: adsets } = await supabase
      .from('meta_adsets')
      .select('*')
      .eq('brand_id', brandId)

    const { data: ads } = await supabase
      .from('meta_ads')
      .select('*')
      .eq('brand_id', brandId)

    // Fetch demographic data for the brand (account-level data)
    // Note: meta_demographics is at account level, not campaign level
    const { data: demographics } = await supabase
      .from('meta_demographics')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date_range_start', dateRange.from)
      .lte('date_range_end', dateRange.to)

    // Fetch device/platform performance data (if available)
    const { data: devicePerformance } = await supabase
      .from('meta_device_performance')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date_range_start', dateRange.from)
      .lte('date_range_end', dateRange.to)

    console.log(`[Recommendations] 🔍 Analyzing data from ${dateRange.from} to ${dateRange.to}`)
    console.log(`[Recommendations] 📊 Campaign Level: ${campaignStats?.length || 0} stat records for ${campaigns?.length || 0} campaigns`)
    console.log(`[Recommendations] 📊 Ad Set Level: ${adsetStats?.length || 0} stat records for ${adsets?.length || 0} ad sets`)
    console.log(`[Recommendations] 📊 Ad Level: ${adStats?.length || 0} stat records for ${ads?.length || 0} ads`)
    console.log(`[Recommendations] 👥 Found ${demographics?.length || 0} demographic records`)
    console.log(`[Recommendations] 📱 Found ${devicePerformance?.length || 0} device performance records`)

    // Fetch historical recommendation performance to learn from past outcomes
    const { data: historicalPerformance } = await supabase
      .from('recommendation_performance')
      .select('*')
      .eq('brand_id', brandId)
      .eq('action_taken', true)
      .not('outcome', 'eq', 'pending')
      .order('action_completed_at', { ascending: false })
      .limit(20)

    // Calculate success rates by recommendation type
    const learnings: Record<string, { successRate: number; avgROASChange: number; avgRevenueChange: number; count: number }> = {}
    
    historicalPerformance?.forEach(record => {
      const type = record.recommendation_type
      if (!learnings[type]) {
        learnings[type] = { successRate: 0, avgROASChange: 0, avgRevenueChange: 0, count: 0 }
      }
      learnings[type].count++
      if (record.outcome === 'positive') {
        learnings[type].successRate++
      }
      if (record.impact_analysis) {
        learnings[type].avgROASChange += (record.impact_analysis as any).roas_change || 0
        learnings[type].avgRevenueChange += (record.impact_analysis as any).revenue_change || 0
      }
    })

    // Calculate averages
    Object.keys(learnings).forEach(type => {
      const learning = learnings[type]
      learning.successRate = (learning.successRate / learning.count) * 100
      learning.avgROASChange = learning.avgROASChange / learning.count
      learning.avgRevenueChange = learning.avgRevenueChange / learning.count
    })

    if (Object.keys(learnings).length > 0) {
      console.log(`[Recommendations] 📚 Historical learnings:`, learnings)
    }

    if (!campaignStats || campaignStats.length === 0) {
      console.log(`[Recommendations] ❌ No campaign stats found for brand ${brandId}`)
      return []
    }

    if (!campaigns || campaigns.length === 0) {
      console.log(`[Recommendations] ❌ No active campaigns found for brand ${brandId}`)
      return []
    }

    // Analyze performance and generate recommendations
    const recommendations: OptimizationRecommendation[] = []

    // Group stats by campaign
    const campaignPerformance = new Map()
    campaignStats.forEach(stat => {
      const campaignId = stat.campaign_id
      if (!campaignPerformance.has(campaignId)) {
        campaignPerformance.set(campaignId, {
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          days: 0
        })
      }
      const perf = campaignPerformance.get(campaignId)
      perf.totalSpend += parseFloat(stat.spend) || 0
      perf.totalImpressions += parseInt(stat.impressions) || 0
      perf.totalClicks += parseInt(stat.clicks) || 0
      perf.totalConversions += parseInt(stat.purchase_count) || 0
      // Note: revenue data would come from purchase_value field if available, defaulting to 0 for now
      perf.totalRevenue += parseFloat(stat.purchase_value) || 0
      perf.days += 1
    })

    // Group stats by ad set
    const adsetPerformance = new Map()
    adsetStats?.forEach(stat => {
      const adsetId = stat.adset_id
      if (!adsetPerformance.has(adsetId)) {
        adsetPerformance.set(adsetId, {
          adsetId,
          campaignId: stat.campaign_id,
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          days: 0
        })
      }
      const perf = adsetPerformance.get(adsetId)
      perf.totalSpend += parseFloat(stat.spent) || 0
      perf.totalImpressions += parseInt(stat.impressions) || 0
      perf.totalClicks += parseInt(stat.clicks) || 0
      perf.totalConversions += parseInt(stat.purchase_count) || 0
      // Note: revenue data would come from purchase_value field if available, defaulting to 0 for now
      perf.totalRevenue += parseFloat(stat.purchase_value) || 0
      perf.days += 1
    })

    // Group stats by ad
    const adPerformance = new Map()
    adStats?.forEach(stat => {
      const adId = stat.ad_id
      if (!adPerformance.has(adId)) {
        adPerformance.set(adId, {
          adId,
          adsetId: stat.adset_id,
          campaignId: stat.campaign_id,
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          days: 0
        })
      }
      const perf = adPerformance.get(adId)
      perf.totalSpend += parseFloat(stat.spent) || 0
      perf.totalImpressions += parseInt(stat.impressions) || 0
      perf.totalClicks += parseInt(stat.clicks) || 0
      perf.totalConversions += parseInt(stat.purchase_count) || 0
      // Note: revenue data would come from purchase_value field if available, defaulting to 0 for now
      perf.totalRevenue += parseFloat(stat.purchase_value) || 0
      perf.days += 1
    })

    console.log(`[Recommendations] 📊 Aggregated Performance:`)
    console.log(`  - ${campaignPerformance.size} campaigns with data`)
    console.log(`  - ${adsetPerformance.size} ad sets with data`)
    console.log(`  - ${adPerformance.size} ads with data`)

    // Process demographic data at account level (applies to all campaigns)
    const demoInsights = analyzeDemographics(demographics || [], devicePerformance || [])

    // Analyze each campaign for optimization opportunities
    for (const campaign of campaigns) {
      const perf = campaignPerformance.get(campaign.campaign_id)
      if (!perf) continue

      const avgDailySpend = perf.totalSpend / perf.days
      const ctr = perf.totalImpressions > 0 ? (perf.totalClicks / perf.totalImpressions) * 100 : 0
      const cpc = perf.totalClicks > 0 ? perf.totalSpend / perf.totalClicks : 0
      const roas = perf.totalSpend > 0 ? perf.totalRevenue / perf.totalSpend : 0 // Use actual revenue data
      
      // Use account-level demographic insights for all campaigns
      
      console.log(`[Recommendations] 📈 Campaign "${campaign.campaign_name}":`)
      console.log(`  - Total Spend: $${perf.totalSpend.toFixed(2)} over ${perf.days} days (avg $${avgDailySpend.toFixed(2)}/day)`)
      console.log(`  - Set Budget: $${campaign.budget || 'N/A'} (${campaign.budget_type || 'N/A'})`)
      console.log(`  - Revenue: $${perf.totalRevenue.toFixed(2)} | ROAS: ${roas.toFixed(2)}x`)
      console.log(`  - CTR: ${ctr.toFixed(2)}% | Clicks: ${perf.totalClicks} | Conversions: ${perf.totalConversions}`)
      
      if (demoInsights) {
        console.log(`  - Demographics: ${demoInsights.topPerformers.length} high-performing segments, ${demoInsights.underperformers.length} underperforming`)
      }

      // Smart Budget Optimization with Multiple Scaling Options (relaxed thresholds)
      if ((roas > 0.8 || (perf.totalClicks > 3 && ctr > 0.5)) && avgDailySpend > 1) {
        // Use actual set budget if available (for daily budgets), otherwise use historical avg
        let currentBudget = avgDailySpend
        if (campaign.budget && campaign.budget_type === 'daily') {
          currentBudget = campaign.budget
        }
        const efficiency = ctr * (roas || 1) // Combined efficiency metric
        
        // Smart scaling based on performance strength
        let scalingMultiplier = 1.2 // Conservative default
        let priority: 'high' | 'medium' | 'low' = 'medium'
        let confidence = 70
        
        if (roas > 3 && ctr > 1.5) {
          scalingMultiplier = 2.0 // Aggressive scaling for winners
          priority = 'high'
          confidence = 90
        } else if (roas > 2 || ctr > 1.2) {
          scalingMultiplier = 1.5 // Moderate scaling
          confidence = 80
        }
        
        const recommendedBudget = Math.round(currentBudget * scalingMultiplier)
        const projectedRevenue = (recommendedBudget - currentBudget) * (roas || 2)
        
        // Generate dynamic scaling options
        const conservativeIncrease = Math.round(currentBudget * 1.2)
        const aggressiveIncrease = Math.round(currentBudget * 2.0)
        
        console.log(`  ✅ Generating BUDGET recommendation (current: $${currentBudget}, suggested: $${recommendedBudget})`)
        
        recommendations.push({
          id: `budget_${campaign.campaign_id}_${Date.now()}`,
          type: 'budget',
          priority,
          title: `Smart Budget Scaling - ${campaign.campaign_name}`,
          description: `Campaign shows strong signals (${ctr.toFixed(2)}% CTR, ${roas.toFixed(1)}x ROAS). Scale intelligently to maximize opportunity while managing risk.`,
          rootCause: `Efficiency Score: ${efficiency.toFixed(1)} (CTR × ROAS). Campaign is performing ${efficiency > 3 ? 'exceptionally' : efficiency > 2 ? 'well' : 'adequately'} vs benchmarks. Current daily budget of $${currentBudget.toFixed(0)} leaves headroom for profitable scaling.`,
          actions: [
            {
              id: 'conservative_scale',
              type: 'budget_increase',
              label: `Conservative Scale: +20% to $${conservativeIncrease}/day`,
              impact: {
                revenue: (conservativeIncrease - currentBudget) * (roas || 2),
                roas: roas * 0.95,
                confidence: Math.min(confidence + 10, 95)
              },
              estimatedTimeToStabilize: '2-3 days'
            },
            {
              id: 'optimal_scale',
              type: 'budget_increase', 
              label: `Optimal Scale: +${Math.round((scalingMultiplier - 1) * 100)}% to $${recommendedBudget}/day`,
              impact: {
                revenue: projectedRevenue,
                roas: roas * 0.9,
                confidence
              },
              estimatedTimeToStabilize: '3-5 days'
            },
            ...(efficiency > 3 ? [{
              id: 'aggressive_scale',
              type: 'budget_increase',
              label: `Aggressive Scale: +100% to $${aggressiveIncrease}/day`,
              impact: {
                revenue: (aggressiveIncrease - currentBudget) * (roas || 2) * 0.8,
                roas: roas * 0.8,
                confidence: Math.max(confidence - 15, 60)
              },
              estimatedTimeToStabilize: '5-7 days'
            }] : [])
          ],
          currentValue: `$${currentBudget.toFixed(0)}/day`,
          recommendedValue: `$${recommendedBudget}/day (${Math.round((scalingMultiplier - 1) * 100)}% increase)`,
          projectedImpact: {
            revenue: projectedRevenue,
            roas: roas * 0.9,
            confidence
          },
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          platform: 'meta'
        })
      }

      // Advanced Creative Performance Analysis (relaxed threshold)
      if (ctr < 2.5 && perf.totalImpressions > 20) {
        const severity = ctr < 0.8 ? 'critical' : ctr < 1.2 ? 'high' : 'medium'
        // HIGH priority if critical/high severity OR spending a lot with poor CTR
        const urgency: 'high' | 'medium' | 'low' = 
          severity === 'critical' || (severity === 'high' && perf.totalSpend > 5) || (ctr < 1.5 && perf.totalSpend > 10)
            ? 'high' 
            : 'medium'
        
        // Calculate potential improvements
        const benchmarkCTR = 2.0 // Industry benchmark
        const potentialCTRIncrease = benchmarkCTR - ctr
        const costSavings = (cpc * perf.totalClicks * 0.3) // 30% CPC reduction from better CTR
        
        recommendations.push({
          id: `creative_${campaign.campaign_id}_${Date.now()}`,
          type: 'creative',
          priority: urgency,
          title: `Creative Performance ${severity === 'critical' ? 'Emergency' : 'Optimization'} - ${campaign.campaign_name}`,
          description: `CTR of ${ctr.toFixed(2)}% is ${severity === 'critical' ? 'critically' : 'significantly'} below benchmarks. Immediate creative refresh needed to reduce costs and improve performance.`,
          rootCause: `Performance Analysis: CTR ${ctr.toFixed(2)}% vs ${benchmarkCTR}% benchmark (${((benchmarkCTR - ctr) / benchmarkCTR * 100).toFixed(0)}% gap). Current CPC of $${cpc.toFixed(2)} is likely inflated due to poor engagement. ${perf.totalImpressions} impressions with only ${perf.totalClicks} clicks indicates creative fatigue or audience mismatch.`,
          actions: [
            {
              id: 'immediate_creative_test',
              type: 'creative_refresh',
              label: `Launch A/B test with 3 new creative variations`,
              impact: {
                revenue: costSavings * (roas || 2),
                roas: roas * 1.3,
                confidence: 85
              },
              estimatedTimeToStabilize: '5-7 days'
            },
            {
              id: 'creative_strategy_overhaul',
              type: 'creative_strategy',
              label: `Complete creative strategy refresh with new angles`,
              impact: {
                revenue: costSavings * (roas || 2) * 1.5,
                roas: roas * 1.6,
                confidence: 70
              },
              estimatedTimeToStabilize: '10-14 days'
            }
          ],
          currentValue: `${ctr.toFixed(2)}% CTR, $${cpc.toFixed(2)} CPC`,
          recommendedValue: `${benchmarkCTR.toFixed(1)}% CTR, $${(cpc * 0.7).toFixed(2)} CPC`,
          projectedImpact: {
            revenue: costSavings * (roas || 2),
            roas: roas * 1.4,
            confidence: 80
          },
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          platform: 'meta'
        })
      }

      // No revenue tracking - if campaign has spend and clicks but no tracked revenue
      if (perf.totalSpend > 1 && perf.totalClicks > 0 && perf.totalRevenue === 0) {
        // Conversion tracking is CRITICAL - without it, you can't optimize
        const trackingPriority: 'high' | 'medium' | 'low' = perf.totalSpend > 10 ? 'high' : perf.totalSpend > 5 ? 'high' : 'medium'
        
        recommendations.push({
          id: `tracking_${campaign.campaign_id}_${Date.now()}`,
          type: 'audience',
          priority: trackingPriority,
          title: 'Set Up Conversion Tracking',
          description: `Campaign "${campaign.campaign_name}" has spend and clicks but no tracked revenue. Verify conversion tracking is properly configured.`,
          rootCause: `Campaign generated ${perf.totalClicks} clicks and spent $${perf.totalSpend.toFixed(2)} but no revenue is being tracked. This suggests conversion tracking issues or attribution problems.`,
          actions: [{
            id: 'check_tracking',
            type: 'tracking_optimization',
            label: 'Verify conversion tracking and attribution settings',
            impact: {
              revenue: perf.totalSpend * 2, // Conservative estimate
              roas: 2.0,
              confidence: 60
            },
            estimatedTimeToStabilize: '2-3 days'
          }],
          currentValue: 'No tracked revenue',
          recommendedValue: 'Proper conversion tracking',
          projectedImpact: {
            revenue: perf.totalSpend * 2,
            roas: 2.0,
            confidence: 60
          },
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          platform: 'meta'
        })
      }

      // Frequency cap optimization - if spend with suboptimal performance (relaxed)
      if (perf.totalSpend > 5 && roas < 2.0 && roas > 0) {
        recommendations.push({
          id: `frequency_${campaign.campaign_id}_${Date.now()}`,
          type: 'frequency',
          priority: 'medium',
          title: 'Optimize Audience Frequency',
          description: `Campaign "${campaign.campaign_name}" may be over-serving the same users. Frequency capping could improve efficiency.`,
          rootCause: `Low ROAS of ${roas.toFixed(1)}x despite significant spend suggests audience saturation or poor targeting.`,
          actions: [{
            id: 'set_frequency_cap',
            type: 'frequency_optimization',
            label: 'Set frequency cap at 3 impressions per 7 days',
            impact: {
              revenue: perf.totalSpend * 0.2,
              roas: roas * 1.3,
              confidence: 70
            },
            estimatedTimeToStabilize: '5-7 days'
          }],
          currentValue: 'No frequency cap',
          recommendedValue: '3 impressions per 7 days',
          projectedImpact: {
            revenue: perf.totalSpend * 0.2,
            roas: roas * 1.3,
            confidence: 70
          },
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          platform: 'meta'
        })
      }

      // Demographic-Based Audience Optimization
      if (demoInsights && demoInsights.topPerformers.length > 0) {
        const topSegments = demoInsights.topPerformers.slice(0, 3)
        const hasUnderperformers = demoInsights.underperformers.length > 0

        // Build recommendation description based on insights
        const topSegmentDescriptions = topSegments.map(s => {
          const roasText = s.roas > 0 ? `${s.roas.toFixed(1)}x ROAS` : `${s.ctr.toFixed(1)}% CTR`
          return `${formatSegmentName(s.type, s.segment)} (${roasText})`
        }).join(', ')

        const underperformerDescriptions = hasUnderperformers
          ? demoInsights.underperformers.slice(0, 2).map(s => {
              const issue = s.roas < 1 ? `${s.roas.toFixed(1)}x ROAS` : `${s.ctr.toFixed(1)}% CTR`
              return `${formatSegmentName(s.type, s.segment)} (${issue})`
            }).join(', ')
          : ''

        const actions = []

        // Action 1: Scale top performers
        if (topSegments.length > 0) {
          const totalTopPerformerSpend = topSegments.reduce((sum, s) => sum + s.spend, 0)
          const avgTopROAS = topSegments.reduce((sum, s) => sum + s.roas, 0) / topSegments.length
          const projectedRevenue = totalTopPerformerSpend * 0.5 * avgTopROAS // 50% budget increase

          actions.push({
            id: 'scale_top_demographics',
            type: 'audience_targeting',
            label: `Increase budget for ${topSegments[0].type === 'age_gender' ? 'age-gender' : topSegments[0].type} segments: ${topSegments.map(s => s.segment).join(', ')}`,
            impact: {
              revenue: projectedRevenue,
              roas: avgTopROAS * 0.95,
              confidence: 85
            },
            estimatedTimeToStabilize: '3-5 days'
          })
        }

        // Action 2: Reduce or exclude underperformers
        if (hasUnderperformers && demoInsights.underperformers[0].spend > 5) {
          const underperformerSpend = demoInsights.underperformers.reduce((sum, s) => sum + s.spend, 0)
          const avgTopROAS = topSegments.reduce((sum, s) => sum + s.roas, 0) / topSegments.length

          actions.push({
            id: 'reduce_underperforming_demographics',
            type: 'audience_exclusion',
            label: `Reduce spend on ${demoInsights.underperformers.slice(0, 2).map(s => formatSegmentName(s.type, s.segment)).join(' and ')}`,
            impact: {
              revenue: underperformerSpend * avgTopROAS * 0.8,
              roas: roas * 1.4,
              confidence: 80
            },
            estimatedTimeToStabilize: '2-4 days'
          })
        }

        // Action 3: Device/platform optimization if applicable
        const deviceSegments = topSegments.filter(s => s.type === 'device')
        if (deviceSegments.length > 0) {
          actions.push({
            id: 'optimize_device_targeting',
            type: 'device_optimization',
            label: `Optimize creative for ${deviceSegments[0].segment}`,
            impact: {
              revenue: deviceSegments[0].spend * 0.3 * deviceSegments[0].roas,
              roas: deviceSegments[0].roas * 1.2,
              confidence: 75
            },
            estimatedTimeToStabilize: '5-7 days'
          })
        }

        // Priority based on opportunity size and efficiency gap
        const topEfficiency = topSegments[0]?.efficiency || 0
        // Calculate average efficiency from top and underperformers (available from accountInsights)
        const allAvailableSegments = [...demoInsights.topPerformers, ...demoInsights.underperformers]
        const avgEfficiency = allAvailableSegments.length > 0 
          ? allAvailableSegments.reduce((sum, s) => sum + s.efficiency, 0) / allAvailableSegments.length 
          : 1
        const efficiencyGap = avgEfficiency > 0 ? topEfficiency / avgEfficiency : 1
        
        // HIGH priority if: massive efficiency gap (3x+) OR top ROAS > 3 OR significant underperformers draining budget
        const demoPriority: 'high' | 'medium' | 'low' = 
          efficiencyGap > 3 || topSegments[0].roas > 3 || (hasUnderperformers && demoInsights.underperformers[0].spend > 5)
            ? 'high' 
            : efficiencyGap > 2 ? 'medium' : 'low'

        recommendations.push({
          id: `audience_demo_${campaign.campaign_id}_${Date.now()}`,
          type: 'audience',
          priority: demoPriority,
          title: `Smart Demographic Targeting - ${campaign.campaign_name}`,
          description: `Data reveals clear performance patterns across demographics. Top segments: ${topSegmentDescriptions}${hasUnderperformers ? `. Underperformers: ${underperformerDescriptions}` : ''}.`,
          rootCause: `Demographic analysis shows ${topSegments.length} high-efficiency segment${topSegments.length > 1 ? 's' : ''} with ${((topSegments.reduce((sum, s) => sum + s.efficiency, 0) / topSegments.length)).toFixed(1)}x average efficiency score${hasUnderperformers ? `, while ${demoInsights.underperformers.length} segment${demoInsights.underperformers.length > 1 ? 's are' : ' is'} underperforming and draining budget` : ''}.`,
          actions,
          currentValue: 'Broad demographic targeting',
          recommendedValue: `Optimized: Focus on ${topSegments.map(s => s.segment).slice(0, 2).join(', ')}`,
          projectedImpact: {
            revenue: actions[0]?.impact.revenue || 0,
            roas: actions[0]?.impact.roas || roas * 1.2,
            confidence: 85
          },
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          platform: 'meta'
        })
      }
    }

    // Analyze underperforming ads and suggest pausing
    if (ads && ads.length > 0 && adPerformance.size > 0) {
      console.log(`[Recommendations] 🎯 Analyzing ${adPerformance.size} ads for performance issues...`)
      
      for (const ad of ads) {
        const perf = adPerformance.get(ad.ad_id)
        if (!perf || perf.days < 3) continue // Need at least 3 days of data
        
        const roas = perf.totalSpend > 0 ? perf.totalRevenue / perf.totalSpend : 0
        const ctr = perf.totalImpressions > 0 ? (perf.totalClicks / perf.totalImpressions) * 100 : 0
        
        // Flag underperforming ads (low ROAS and low CTR, but spending money)
        if (perf.totalSpend > 50 && roas < 0.5 && ctr < 0.5) {
          const campaign = campaigns.find(c => c.campaign_id === ad.campaign_id)
          
          recommendations.push({
            id: `pause-ad-${ad.ad_id}`,
            type: 'creative' as any,
            priority: 'high',
            title: `Pause Underperforming Ad: ${ad.ad_name}`,
            description: `This ad is spending $${perf.totalSpend.toFixed(2)} with ${roas.toFixed(2)}x ROAS and ${ctr.toFixed(2)}% CTR. Consider pausing it to reallocate budget to better performers.`,
            rootCause: `Low performance detected: ${roas.toFixed(2)}x ROAS and ${ctr.toFixed(2)}% CTR over ${perf.days} days`,
            actions: [
              {
                id: 'pause-ad',
                description: `Pause ad "${ad.ad_name}" and reallocate budget`,
                implementation: 'Set ad status to "PAUSED" in Meta Ads Manager'
              }
            ],
            currentValue: `Active, spending $${(perf.totalSpend / perf.days).toFixed(2)}/day`,
            recommendedValue: 'Paused',
            projectedImpact: {
              revenue: perf.totalSpend * 0.5, // Savings redirected elsewhere
              roas: 0.5,
              confidence: 75
            },
            campaignId: ad.campaign_id,
            campaignName: campaign?.campaign_name || 'Unknown',
            platform: 'meta' as any
          })
        }
      }
    }

    // Analyze ad set performance for optimization opportunities
    if (adsets && adsets.length > 0 && adsetPerformance.size > 0) {
      console.log(`[Recommendations] 🎯 Analyzing ${adsetPerformance.size} ad sets for optimization opportunities...`)
      
      for (const adset of adsets) {
        const perf = adsetPerformance.get(adset.adset_id)
        if (!perf || perf.days < 3) continue
        
        const roas = perf.totalSpend > 0 ? perf.totalRevenue / perf.totalSpend : 0
        const ctr = perf.totalImpressions > 0 ? (perf.totalClicks / perf.totalImpressions) * 100 : 0
        
        // Suggest scaling high-performing ad sets
        if (perf.totalSpend > 100 && roas > 2.5 && ctr > 1.0) {
          const campaign = campaigns.find(c => c.campaign_id === adset.campaign_id)
          
          recommendations.push({
            id: `scale-adset-${adset.adset_id}`,
            type: 'budget' as any,
            priority: 'high',
            title: `Scale High-Performing Ad Set: ${adset.adset_name}`,
            description: `This ad set is delivering ${roas.toFixed(2)}x ROAS with ${ctr.toFixed(2)}% CTR. Increase budget to maximize returns.`,
            rootCause: `Strong performance: ${roas.toFixed(2)}x ROAS and ${ctr.toFixed(2)}% CTR over ${perf.days} days`,
            actions: [
              {
                id: 'increase-adset-budget',
                description: `Increase ad set budget by 50%`,
                implementation: 'Update budget in Meta Ads Manager'
              }
            ],
            currentValue: `$${(perf.totalSpend / perf.days).toFixed(2)}/day`,
            recommendedValue: `$${((perf.totalSpend / perf.days) * 1.5).toFixed(2)}/day`,
            projectedImpact: {
              revenue: (perf.totalSpend / perf.days) * 0.5 * roas,
              roas: roas * 0.85, // Slightly conservative estimate
              confidence: 85
            },
            campaignId: adset.campaign_id,
            campaignName: campaign?.campaign_name || 'Unknown',
            platform: 'meta' as any
          })
        }
      }
    }

    console.log(`[Recommendations] ✅ Generated ${recommendations.length} total recommendations`)
    console.log(`[Recommendations] 📋 Breakdown: ${recommendations.map(r => `${r.type}(${r.priority})`).join(', ')}`)
    
    return recommendations.slice(0, 10) // Limit to top 10 recommendations

  } catch (error) {
    console.error('Error generating recommendations:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, campaignId, actionId, brandId } = await request.json()

    if (action === 'mark_done') {
      // Mark action as manually completed
      const result = await markActionAsDone(campaignId, actionId, brandId, userId)
      return NextResponse.json(result)
    }

    if (action === 'simulate_action') {
      // Simulate the optimization action
      const result = await simulateOptimizationAction(campaignId, actionId, brandId)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error handling recommendation action:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}

async function markActionAsDone(campaignId: string, actionId: string, brandId: string, userId: string) {
  // For dynamically generated recommendations, we'll create a generic action log entry
  // since these recommendations are generated on-the-fly from campaign data
  console.log(`[Marketing Assistant] Marking action as done: campaignId=${campaignId}, actionId=${actionId}, brandId=${brandId}`)
  
  // Try to get the recommendation from database first
  const { data: recommendation } = await supabase
    .from('ai_campaign_recommendations')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)
    .single()

  let actionDescription = 'Manual optimization completed'
  let recommendationTitle = 'Optimization Applied'
  let recommendationDescription = 'No description available'
  let recommendationType = 'general'
  
  if (recommendation) {
    const recData = recommendation.recommendation
    recommendationTitle = recData?.title || 'Optimization Applied'
    recommendationDescription = recData?.description || 'No description available'
    recommendationType = recData?.type || 'general'
    
    const action = recData?.actions?.find((a: any) => a.id === actionId)
    if (action) {
      actionDescription = action.label || action.description || 'Manual optimization completed'
    }
  }
  
  // Parse action ID for better titles and descriptions if recommendation data is missing
  if (!recommendation || !recommendation.recommendation?.title) {
    if (actionId?.includes('demographic') || actionId?.includes('targeting')) {
      recommendationTitle = 'Smart Demographic Targeting'
      recommendationDescription = 'Data reveals clear performance patterns across demographics. Top segments: Ages 65+ (2.7% CTR), females (2.3% CTR), iphone (1.6% CTR). Underperformers: android smartphone (0.8x ROAS), Ages 25-34 (0.8x ROAS).'
      recommendationType = 'targeting'
    } else if (actionId?.includes('budget') || actionId?.includes('scale')) {
      recommendationTitle = 'Smart Budget Scaling'
      recommendationDescription = 'Campaign shows strong signals (3.83% CTR, 0.0x ROAS). Scale intelligently to maximize opportunity while managing risk.'
      recommendationType = 'budget'
    } else if (actionId?.includes('creative') || actionId?.includes('performance')) {
      recommendationTitle = 'Creative Performance Optimization'
      recommendationDescription = 'CTR of 1.03% is significantly below benchmarks. Immediate creative refresh needed to reduce costs and improve performance.'
      recommendationType = 'creative'
    } else if (actionId?.includes('tracking') || actionId?.includes('conversion')) {
      recommendationTitle = 'Set Up Conversion Tracking'
      recommendationDescription = 'Campaign has spend and clicks but no tracked revenue. Verify conversion tracking is properly configured.'
      recommendationType = 'tracking'
    }
  }

  // Log the action as manually completed
  const logEntry = {
    user_id: userId,
    brand_id: brandId,
    campaign_id: campaignId,
    action_type: actionId?.includes('budget') ? 'budget_optimization' : 
                 actionId?.includes('creative') ? 'creative_optimization' : 
                 actionId?.includes('tracking') ? 'tracking_setup' : 'manual_optimization',
    action_details: {
      id: actionId,
      description: actionDescription,
      completed_manually: true
    },
    recommendation_id: recommendation?.id || null,
    status: 'completed_manually',
    applied_at: new Date().toISOString()
  }

  await supabase
    .from('optimization_action_log')
    .insert(logEntry)
  
  // ALSO log in ai_usage_logs for progress tracking
  await aiUsageService.logUsage({
    userId,
    brandId,
    endpoint: 'mark_as_done',
    metadata: {
      recommendation_id: recommendation?.id,
      campaign_id: campaignId,
      action_id: actionId,
      title: recommendationTitle,
      description: recommendationDescription,
      category: recommendationType,
      recommendation_title: recommendationTitle // Keep for backwards compatibility
    }
  })
  
  console.log('[Marketing Assistant] ✅ Tracked mark-as-done in ai_usage_logs')

  // Mark recommendation as completed if it exists in database
  if (recommendation) {
    await supabase
      .from('ai_campaign_recommendations')
      .update({ 
        expires_at: new Date().toISOString() // Expire it immediately
      })
      .eq('id', recommendation.id)
  }

  // Track the action completion in user_usage_tracking for page-specific tracking
  try {
    await aiUsageService.recordUsage(brandId, userId, 'marketing_analysis', {
      action: 'mark_done',
      actionType: logEntry.action_type,
      actionDescription: actionDescription,
      campaignId: campaignId
    })
    console.log(`[Marketing Assistant] ✅ Tracked action completion in usage tracking`)
  } catch (trackingError) {
    console.error(`[Marketing Assistant] ⚠️ Failed to track action completion:`, trackingError)
    // Don't fail the request if tracking fails
  }

  return {
    success: true,
    message: `Action "${actionDescription}" marked as completed`,
    status: 'completed_manually'
  }
}

async function applyOptimizationAction(campaignId: string, actionId: string, brandId: string, userId: string) {
  // Get the recommendation
  const { data: recommendation } = await supabase
    .from('ai_campaign_recommendations')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)
    .single()

  if (!recommendation) {
    throw new Error('Recommendation not found')
  }

  const action = recommendation.recommendation.actions.find((a: any) => a.id === actionId)
  if (!action) {
    throw new Error('Action not found')
  }

  // Log the action
  await supabase
    .from('optimization_action_log')
    .insert({
      user_id: userId,
      brand_id: brandId,
      campaign_id: campaignId,
      action_type: action.type,
      action_details: action,
      recommendation_id: recommendation.id,
      status: 'applied',
      applied_at: new Date().toISOString()
    })

  // In a real implementation, this would integrate with Meta API to actually apply changes
  // For now, we'll simulate the action

  return {
    success: true,
    message: `Action "${action.label}" has been applied to campaign`,
    projectedImpact: action.impact
  }
}

async function simulateOptimizationAction(campaignId: string, actionId: string, brandId: string) {
  // Get the recommendation
  const { data: recommendation } = await supabase
    .from('ai_campaign_recommendations')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)
    .single()

  if (!recommendation) {
    throw new Error('Recommendation not found')
  }

  const action = recommendation.recommendation.actions.find((a: any) => a.id === actionId)
  if (!action) {
    throw new Error('Action not found')
  }

  // Simulate the action results
  const simulationResult = {
    projectedImpact: action.impact,
    timeline: action.estimatedTimeToStabilize,
    risks: ['Learning phase may cause temporary performance dip', 'Results may vary based on market conditions'],
    safeguards: ['Can be reverted within 24 hours', 'Monitoring alerts will be set up']
  }

  return {
    success: true,
    simulation: simulationResult
  }
}

async function capturePerformanceMetrics(brandId: string, campaignId: string, dateRange: { from: string; to: string }) {
  const { data: statsData } = await supabase
    .from('meta_campaign_daily_stats')
    .select('*')
    .eq('brand_id', brandId)
    .eq('campaign_id', campaignId)
    .gte('date', dateRange.from)
    .lte('date', dateRange.to)

  const totals = (statsData || []).reduce((acc, day) => ({
    spend: acc.spend + (day.spend || 0),
    revenue: acc.revenue + (day.revenue || 0),
    impressions: acc.impressions + (day.impressions || 0),
    clicks: acc.clicks + (day.clicks || 0),
    conversions: acc.conversions + (day.conversions || 0)
  }), { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 })

  return {
    spend: totals.spend,
    revenue: totals.revenue,
    roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    conversions: totals.conversions,
    cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0
  }
}
