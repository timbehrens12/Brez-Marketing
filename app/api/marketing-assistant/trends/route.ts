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
    const days = parseInt(searchParams.get('days') || '7')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
    
    // Get historical data for comparison
    const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000)

    // Current period data
    const { data: currentPeriod } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])

    // Previous period data for comparison
    const { data: previousPeriod } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', previousStartDate.toISOString().split('T')[0])
      .lt('date', startDate.toISOString().split('T')[0])

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
