import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

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
    const fromDate = searchParams.get('from') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const toDate = searchParams.get('to') || new Date().toISOString().split('T')[0]
    const platforms = searchParams.get('platforms')?.split(',') || ['meta']

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const metrics = await aggregateMetrics(brandId, fromDate, toDate, platforms)
    
    return NextResponse.json({ metrics })

  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}

async function aggregateMetrics(brandId: string, fromDate: string, toDate: string, platforms: string[]) {
  let totalSpend = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalConversions = 0
  let totalRevenue = 0

  // Fetch Meta data if included
  if (platforms.includes('meta')) {
    const { data: metaStats } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)

    if (metaStats) {
      metaStats.forEach(stat => {
        totalSpend += stat.spend || 0
        totalImpressions += stat.impressions || 0
        totalClicks += stat.clicks || 0
        totalConversions += stat.conversions || 0
        // Calculate revenue from ROAS * spend
        totalRevenue += (stat.roas || 0) * (stat.spend || 0)
      })
    }
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
