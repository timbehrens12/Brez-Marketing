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
    const days = parseInt(searchParams.get('days') || '7')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const platforms = searchParams.get('platforms')?.split(',') || ['meta', 'google', 'tiktok']
    const status = searchParams.get('status') || 'active'

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Get filtered campaign IDs
    let allowedCampaignIds: string[] = []
    
    if (platforms.includes('meta')) {
      let metaCampaignsQuery = supabase
        .from('meta_campaigns')
        .select('campaign_id')
        .eq('brand_id', brandId)
      
      if (status === 'active') {
        metaCampaignsQuery = metaCampaignsQuery.or('status.eq.ACTIVE,status.ilike.%ACTIVE%')
      } else if (status === 'paused') {
        metaCampaignsQuery = metaCampaignsQuery.or('status.eq.PAUSED,status.ilike.%PAUSED%')
      }
      
      const { data: metaCampaigns } = await metaCampaignsQuery
      if (metaCampaigns) {
        allowedCampaignIds = metaCampaigns.map(c => c.campaign_id)
      }
    }

    // If meta is selected but no campaigns match, return empty trends
    if (platforms.includes('meta') && allowedCampaignIds.length === 0) {
      return NextResponse.json({
        trends: { spend: { current: 0, previous: 0, change: 0, direction: 'neutral' }, revenue: { current: 0, previous: 0, change: 0, direction: 'neutral' }, roas: { current: 0, previous: 0, change: 0, direction: 'neutral' }, cac: { current: 0, previous: 0, change: 0, direction: 'neutral' } },
        dailyData: [],
        period: { days, startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] }
      })
    }

    // If meta is NOT selected, return empty (we only support Meta data for now)
    if (!platforms.includes('meta')) {
      return NextResponse.json({
        trends: { spend: { current: 0, previous: 0, change: 0, direction: 'neutral' }, revenue: { current: 0, previous: 0, change: 0, direction: 'neutral' }, roas: { current: 0, previous: 0, change: 0, direction: 'neutral' }, cac: { current: 0, previous: 0, change: 0, direction: 'neutral' } },
        dailyData: [],
        period: { days, startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] }
      })
    }

    // Calculate date range - use Monday-to-Monday weekly window
    let endDate, startDate
    if (fromDate && toDate) {
      startDate = new Date(fromDate)
      endDate = new Date(toDate)
    } else {
      // Use Monday-to-Monday window
      const { startDate: mondayStart, endDate: mondayEnd } = getMondayToMondayRange()
      startDate = new Date(mondayStart)
      endDate = new Date(mondayEnd)
      console.log(`[Trends API] Using Monday-to-Monday range: ${mondayStart} to ${mondayEnd}`)
    }
    
    // Get historical data for comparison (previous week)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    const previousStartDate = new Date(startDate.getTime() - daysDiff * 24 * 60 * 60 * 1000)

    // Current period data - filter by allowed campaigns (only query if we have Meta campaigns)
    let currentPeriod: any[] = []
    if (allowedCampaignIds.length > 0) {
      const { data } = await supabase
        .from('meta_campaign_daily_stats')
        .select('*')
        .eq('brand_id', brandId)
        .in('campaign_id', allowedCampaignIds)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
      currentPeriod = data || []
    }

    // Previous period data for comparison (only query if we have Meta campaigns)
    let previousPeriod: any[] = []
    if (allowedCampaignIds.length > 0) {
      const { data } = await supabase
        .from('meta_campaign_daily_stats')
        .select('*')
        .eq('brand_id', brandId)
        .in('campaign_id', allowedCampaignIds)
        .gte('date', previousStartDate.toISOString().split('T')[0])
        .lt('date', startDate.toISOString().split('T')[0])
      previousPeriod = data || []
    }

    // Get Shopify sales data for accurate revenue tracking
    const { data: currentShopifyData } = await supabase
      .from('shopify_sales_breakdown')
      .select('date_period, gross_sales, net_sales, total_orders')
      .eq('brand_id', brandId)
      .gte('date_period', startDate.toISOString().split('T')[0])
      .lte('date_period', endDate.toISOString().split('T')[0])

    const { data: previousShopifyData } = await supabase
      .from('shopify_sales_breakdown')
      .select('date_period, gross_sales, net_sales, total_orders')
      .eq('brand_id', brandId)
      .gte('date_period', previousStartDate.toISOString().split('T')[0])
      .lt('date_period', startDate.toISOString().split('T')[0])

    // Calculate current period totals
    const currentTotals = calculatePeriodTotals(currentPeriod || [], currentShopifyData || [])
    const previousTotals = calculatePeriodTotals(previousPeriod || [], previousShopifyData || [])

    // Calculate percentage changes
    const trends = {
      spend: {
        current: currentTotals.spend,
        previous: previousTotals.spend,
        change: calculatePercentageChange(previousTotals.spend, currentTotals.spend),
        direction: currentTotals.spend >= previousTotals.spend ? 'up' : 'down'
      },
      revenue: {
        current: currentTotals.revenue,
        previous: previousTotals.revenue,
        change: calculatePercentageChange(previousTotals.revenue, currentTotals.revenue),
        direction: currentTotals.revenue >= previousTotals.revenue ? 'up' : 'down'
      },
      roas: {
        current: currentTotals.roas,
        previous: previousTotals.roas,
        change: calculatePercentageChange(previousTotals.roas, currentTotals.roas),
        direction: currentTotals.roas >= previousTotals.roas ? 'up' : 'down'
      },
      cac: {
        current: currentTotals.cac,
        previous: previousTotals.cac,
        change: calculatePercentageChange(previousTotals.cac, currentTotals.cac),
        direction: currentTotals.cac <= previousTotals.cac ? 'up' : 'down' // Lower CAC is better
      }
    }

    // Get daily breakdown for charts
    const shopifyByDate = new Map()
    currentShopifyData?.forEach(day => {
      shopifyByDate.set(day.date_period, parseFloat(day.gross_sales) || 0)
    })

    const dailyData = (currentPeriod || []).map(day => {
      const shopifyRevenue = shopifyByDate.get(day.date)
      const metaRevenue = (day.roas || 0) * (day.spend || 0)
      
      return {
        date: day.date,
        spend: day.spend || 0,
        revenue: shopifyRevenue !== undefined ? shopifyRevenue : metaRevenue,
        roas: day.roas || 0,
        impressions: day.impressions || 0,
        clicks: day.clicks || 0,
        ctr: day.ctr || 0
      }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({ 
      trends,
      dailyData,
      period: {
        days,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    })

  } catch (error) {
    console.error('Error fetching trends:', error)
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 })
  }
}

function calculatePeriodTotals(metaData: any[], shopifyData: any[]) {
  const metaTotals = metaData.reduce((acc, day) => ({
    spend: acc.spend + (day.spend || 0),
    impressions: acc.impressions + (day.impressions || 0),
    clicks: acc.clicks + (day.clicks || 0),
    conversions: acc.conversions + (day.conversions || 0)
  }), { spend: 0, impressions: 0, clicks: 0, conversions: 0 })

  // Calculate revenue from Shopify data (more accurate) or fallback to Meta ROAS calculation
  let revenue = 0
  if (shopifyData.length > 0) {
    revenue = shopifyData.reduce((acc, day) => acc + (parseFloat(day.gross_sales) || 0), 0)
  } else {
    revenue = metaData.reduce((acc, day) => acc + ((day.roas || 0) * (day.spend || 0)), 0)
  }

  const roas = metaTotals.spend > 0 ? revenue / metaTotals.spend : 0
  const cac = metaTotals.conversions > 0 ? metaTotals.spend / metaTotals.conversions : 0

  return {
    ...metaTotals,
    revenue,
    roas,
    cac
  }
}

function calculatePercentageChange(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}
