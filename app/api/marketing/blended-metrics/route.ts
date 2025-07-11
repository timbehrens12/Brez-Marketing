import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface BlendedMetrics {
  totalSpend: number
  totalSpendGrowth: number
  totalImpressions: number
  totalImpressionsGrowth: number
  totalClicks: number
  totalClicksGrowth: number
  totalConversions: number
  totalConversionsGrowth: number
  blendedRoas: number
  blendedRoasGrowth: number
  blendedCtr: number
  blendedCtrGrowth: number
  blendedCpc: number
  blendedCpcGrowth: number
  blendedCostPerResult: number
  blendedCostPerResultGrowth: number
  reach: number
  reachGrowth: number
  platforms: {
    meta?: PlatformMetrics
    google?: PlatformMetrics
    tiktok?: PlatformMetrics
  }
  dailyData: DailyBlendedData[]
}

export interface PlatformMetrics {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  roas: number
  ctr: number
  cpc: number
  costPerResult: number
  reach: number
  active: boolean
}

export interface DailyBlendedData {
  date: string
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  blendedRoas: number
  blendedCtr: number
  blendedCpc: number
  platforms: {
    meta?: DailyPlatformData
    google?: DailyPlatformData
    tiktok?: DailyPlatformData
  }
}

export interface DailyPlatformData {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  roas: number
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const preset = url.searchParams.get('preset')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Handle date range
    let fromDate: string
    let toDate: string

    if (preset === 'yesterday') {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      fromDate = yesterday.toISOString().split('T')[0]
      toDate = fromDate
    } else if (from && to) {
      fromDate = new Date(from).toISOString().split('T')[0]
      toDate = new Date(to).toISOString().split('T')[0]
    } else {
      // Default: last 30 days
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      fromDate = startDate.toISOString().split('T')[0]
      toDate = endDate.toISOString().split('T')[0]
    }

    console.log(`[Blended Metrics] Fetching data for brand ${brandId} from ${fromDate} to ${toDate}`)

    const supabase = createClient()

    // Initialize blended metrics
    const blendedMetrics: BlendedMetrics = {
      totalSpend: 0,
      totalSpendGrowth: 0,
      totalImpressions: 0,
      totalImpressionsGrowth: 0,
      totalClicks: 0,
      totalClicksGrowth: 0,
      totalConversions: 0,
      totalConversionsGrowth: 0,
      blendedRoas: 0,
      blendedRoasGrowth: 0,
      blendedCtr: 0,
      blendedCtrGrowth: 0,
      blendedCpc: 0,
      blendedCpcGrowth: 0,
      blendedCostPerResult: 0,
      blendedCostPerResultGrowth: 0,
      reach: 0,
      reachGrowth: 0,
      platforms: {},
      dailyData: []
    }

    // Fetch Meta data
    const { data: metaData, error: metaError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('date, spend, impressions, clicks, conversions, reach, ctr, cpc, cost_per_conversion, roas')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true })

    if (metaError) {
      console.error('[Blended Metrics] Error fetching Meta data:', metaError)
    }

    // Process Meta data
    if (metaData && metaData.length > 0) {
      const metaMetrics = processMetaPlatformData(metaData)
      blendedMetrics.platforms.meta = metaMetrics
      
      // Add to totals
      blendedMetrics.totalSpend += metaMetrics.spend
      blendedMetrics.totalImpressions += metaMetrics.impressions
      blendedMetrics.totalClicks += metaMetrics.clicks
      blendedMetrics.totalConversions += metaMetrics.conversions
      blendedMetrics.reach += metaMetrics.reach

      console.log(`[Blended Metrics] Meta data: spend=${metaMetrics.spend}, impressions=${metaMetrics.impressions}`)
    }

    // TODO: Add Google Ads data when implemented
    // const googleData = await fetchGoogleAdsData(brandId, fromDate, toDate)
    // if (googleData) {
    //   blendedMetrics.platforms.google = googleData
    //   blendedMetrics.totalSpend += googleData.spend
    //   // ... add other metrics
    // }

    // TODO: Add TikTok Ads data when implemented  
    // const tiktokData = await fetchTikTokAdsData(brandId, fromDate, toDate)
    // if (tiktokData) {
    //   blendedMetrics.platforms.tiktok = tiktokData
    //   blendedMetrics.totalSpend += tiktokData.spend
    //   // ... add other metrics
    // }

    // Calculate blended metrics
    calculateBlendedMetrics(blendedMetrics)

    // Calculate growth metrics (compare with previous period)
    await calculateGrowthMetrics(blendedMetrics, brandId, fromDate, toDate, supabase)

    // Generate daily blended data
    blendedMetrics.dailyData = generateDailyBlendedData(metaData || [])

    console.log(`[Blended Metrics] Final blended metrics: spend=${blendedMetrics.totalSpend}, roas=${blendedMetrics.blendedRoas}`)

    return NextResponse.json(blendedMetrics)

  } catch (error) {
    console.error('[Blended Metrics] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch blended metrics' }, { status: 500 })
  }
}

function processMetaPlatformData(metaData: any[]): PlatformMetrics {
  const totals = metaData.reduce((acc, day) => ({
    spend: acc.spend + (parseFloat(day.spend) || 0),
    impressions: acc.impressions + (parseInt(day.impressions) || 0),
    clicks: acc.clicks + (parseInt(day.clicks) || 0),
    conversions: acc.conversions + (parseInt(day.conversions) || 0),
    reach: acc.reach + (parseInt(day.reach) || 0)
  }), { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 })

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0
  const costPerResult = totals.conversions > 0 ? totals.spend / totals.conversions : 0
  const roas = totals.spend > 0 ? (totals.conversions * 50) / totals.spend : 0 // Assuming $50 average order value

  return {
    spend: totals.spend,
    impressions: totals.impressions,
    clicks: totals.clicks,
    conversions: totals.conversions,
    roas,
    ctr,
    cpc,
    costPerResult,
    reach: totals.reach,
    active: true
  }
}

function calculateBlendedMetrics(metrics: BlendedMetrics) {
  // Calculate blended metrics across all platforms
  metrics.blendedCtr = metrics.totalImpressions > 0 ? (metrics.totalClicks / metrics.totalImpressions) * 100 : 0
  metrics.blendedCpc = metrics.totalClicks > 0 ? metrics.totalSpend / metrics.totalClicks : 0
  metrics.blendedCostPerResult = metrics.totalConversions > 0 ? metrics.totalSpend / metrics.totalConversions : 0
  metrics.blendedRoas = metrics.totalSpend > 0 ? (metrics.totalConversions * 50) / metrics.totalSpend : 0 // Assuming $50 AOV
}

async function calculateGrowthMetrics(
  metrics: BlendedMetrics, 
  brandId: string, 
  fromDate: string, 
  toDate: string, 
  supabase: any
) {
  // Calculate previous period dates
  const currentStart = new Date(fromDate)
  const currentEnd = new Date(toDate)
  const periodLength = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  const previousEnd = new Date(currentStart)
  previousEnd.setDate(previousEnd.getDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - periodLength + 1)

  const prevFromDate = previousStart.toISOString().split('T')[0]
  const prevToDate = previousEnd.toISOString().split('T')[0]

  // Fetch previous period Meta data
  const { data: prevMetaData } = await supabase
    .from('meta_campaign_daily_stats')
    .select('spend, impressions, clicks, conversions, reach')
    .eq('brand_id', brandId)
    .gte('date', prevFromDate)
    .lte('date', prevToDate)

  if (prevMetaData && prevMetaData.length > 0) {
    const prevTotals = prevMetaData.reduce((acc: any, day: any) => ({
      spend: acc.spend + (parseFloat(day.spend) || 0),
      impressions: acc.impressions + (parseInt(day.impressions) || 0),
      clicks: acc.clicks + (parseInt(day.clicks) || 0),
      conversions: acc.conversions + (parseInt(day.conversions) || 0),
      reach: acc.reach + (parseInt(day.reach) || 0)
    }), { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 })

    // Calculate growth percentages
    metrics.totalSpendGrowth = calculateGrowthPercentage(metrics.totalSpend, prevTotals.spend)
    metrics.totalImpressionsGrowth = calculateGrowthPercentage(metrics.totalImpressions, prevTotals.impressions)
    metrics.totalClicksGrowth = calculateGrowthPercentage(metrics.totalClicks, prevTotals.clicks)
    metrics.totalConversionsGrowth = calculateGrowthPercentage(metrics.totalConversions, prevTotals.conversions)
    metrics.reachGrowth = calculateGrowthPercentage(metrics.reach, prevTotals.reach)

    const prevCtr = prevTotals.impressions > 0 ? (prevTotals.clicks / prevTotals.impressions) * 100 : 0
    const prevCpc = prevTotals.clicks > 0 ? prevTotals.spend / prevTotals.clicks : 0
    const prevRoas = prevTotals.spend > 0 ? (prevTotals.conversions * 50) / prevTotals.spend : 0

    metrics.blendedCtrGrowth = calculateGrowthPercentage(metrics.blendedCtr, prevCtr)
    metrics.blendedCpcGrowth = calculateGrowthPercentage(metrics.blendedCpc, prevCpc)
    metrics.blendedRoasGrowth = calculateGrowthPercentage(metrics.blendedRoas, prevRoas)
  }
}

function calculateGrowthPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function generateDailyBlendedData(metaData: any[]): DailyBlendedData[] {
  return metaData.map(day => ({
    date: day.date,
    totalSpend: parseFloat(day.spend) || 0,
    totalImpressions: parseInt(day.impressions) || 0,
    totalClicks: parseInt(day.clicks) || 0,
    totalConversions: parseInt(day.conversions) || 0,
    blendedRoas: parseFloat(day.roas) || 0,
    blendedCtr: parseFloat(day.ctr) || 0,
    blendedCpc: parseFloat(day.cpc) || 0,
    platforms: {
      meta: {
        spend: parseFloat(day.spend) || 0,
        impressions: parseInt(day.impressions) || 0,
        clicks: parseInt(day.clicks) || 0,
        conversions: parseInt(day.conversions) || 0,
        roas: parseFloat(day.roas) || 0
      }
    }
  }))
} 