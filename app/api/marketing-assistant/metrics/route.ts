import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { getMondayToMondayRange } from '@/lib/date-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    // Use Sunday-to-Sunday weekly window (last complete week)
    const { startDate, endDate } = getMondayToMondayRange()
    const fromDate = searchParams.get('from') || startDate
    const toDate = searchParams.get('to') || endDate
    
    const platforms = searchParams.get('platforms')?.split(',') || ['meta', 'google', 'tiktok']
    const status = searchParams.get('status') || 'active'
    
    console.log(`[Metrics API] Using Sunday-to-Sunday range: ${fromDate} to ${toDate}`)

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const metrics = await aggregateMetrics(brandId, fromDate, toDate, platforms, status)
    
    // Check if there's any data
    const hasData = metrics.spend > 0 || metrics.impressions > 0 || metrics.clicks > 0
    
    return NextResponse.json({ 
      metrics,
      hasData,
      message: hasData ? null : `No campaign data found between ${fromDate} and ${toDate}. Campaigns may be paused or no ads ran during this period.`
    })

  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}

async function aggregateMetrics(brandId: string, fromDate: string, toDate: string, platforms: string[], status: string) {
  let totalSpend = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalConversions = 0
  let totalRevenue = 0

  // Get campaigns that have data in the date range (regardless of current status)
  let allowedCampaignIds: string[] = []
  
  if (platforms.includes('meta')) {
    // Query for campaigns that have actual data in the date range
    const { data: campaignsWithData } = await supabase
      .from('meta_campaign_daily_stats')
      .select('campaign_id')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    if (campaignsWithData && campaignsWithData.length > 0) {
      // Get unique campaign IDs
      allowedCampaignIds = [...new Set(campaignsWithData.map(c => c.campaign_id))]
      console.log(`[Metrics API] Found ${allowedCampaignIds.length} campaigns with data in date range`)
    } else {
      console.log(`[Metrics API] No campaigns found with data between ${fromDate} and ${toDate}`)
    }
  }

  // Fetch Meta data if included
  if (platforms.includes('meta') && allowedCampaignIds.length > 0) {
    console.log(`[Metrics API] Querying meta_campaign_daily_stats for brand ${brandId} from ${fromDate} to ${toDate}`)
    console.log(`[Metrics API] Allowed campaign IDs:`, allowedCampaignIds)
    
    const { data: metaStats, error: metaStatsError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .in('campaign_id', allowedCampaignIds)
      .gte('date', fromDate)
      .lte('date', toDate)

    if (metaStatsError) {
      console.error(`[Metrics API] Error querying stats:`, metaStatsError)
    }

    if (metaStats) {
      console.log(`[Metrics API] Found ${metaStats.length} Meta campaign daily stats records`)
      if (metaStats.length > 0) {
        console.log(`[Metrics API] Sample record:`, metaStats[0])
      }
      metaStats.forEach(stat => {
        totalSpend += parseFloat(stat.spend) || 0
        totalImpressions += parseInt(stat.impressions) || 0
        totalClicks += parseInt(stat.clicks) || 0
        totalConversions += parseInt(stat.conversions) || 0
        // Use purchase_value if available, otherwise calculate from ROAS
        totalRevenue += parseFloat(stat.purchase_value) || (parseFloat(stat.roas) * parseFloat(stat.spend)) || 0
      })
      console.log(`[Metrics API] Meta totals: spend=${totalSpend}, impressions=${totalImpressions}, clicks=${totalClicks}, conversions=${totalConversions}, revenue=${totalRevenue}`)
    } else {
      console.log(`[Metrics API] No metaStats data returned`)
    }
  } else {
    console.log(`[Metrics API] Skipping Meta query - platforms.includes('meta'): ${platforms.includes('meta')}, allowedCampaignIds.length: ${allowedCampaignIds.length}`)
  }

  // Fetch Google Ads data if included (placeholder - would need actual table)
  if (platforms.includes('google')) {
    // TODO: Implement Google Ads data aggregation
  }

  // Fetch TikTok data if included (placeholder - would need actual table)
  if (platforms.includes('tiktok')) {
    // TODO: Implement TikTok data aggregation
  }

  // Calculate derived metrics
  const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const costPerConversion = totalConversions > 0 ? totalSpend / totalConversions : 0

  return {
    spend: Math.round(totalSpend * 100) / 100,
    impressions: Math.round(totalImpressions),
    clicks: Math.round(totalClicks),
    conversions: Math.round(totalConversions),
    cpa: Math.round(cpa * 100) / 100,
    cpc: Math.round(cpc * 100) / 100,
    roas: Math.round(roas * 100) / 100,
    revenue: Math.round(totalRevenue * 100) / 100,
    ctr: Math.round(ctr * 100) / 100,
    costPerConversion: Math.round(costPerConversion * 100) / 100
  }
}
