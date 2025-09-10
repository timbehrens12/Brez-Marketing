import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Click-Through Rate (CTR) data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the CTR widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    let fromDate = url.searchParams.get('from')
    let toDate = url.searchParams.get('to')
    const preset = url.searchParams.get('preset')
    const isYesterdayPreset = preset === 'yesterday'

    console.log(`CTR SINGLE METRIC API (from meta_ad_daily_insights): Fetching for brand ${brandId} from ${fromDate} to ${toDate}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)

    if (!brandId || !fromDate || !toDate) {
      return NextResponse.json({ error: 'Brand ID and date range are required' }, { status: 400 })
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    if (isYesterdayPreset) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      fromDate = yesterday.toISOString().split('T')[0]
      toDate = fromDate 
      console.log(`CTR SINGLE METRIC API: Using exact yesterday date ${fromDate}`)
    }

    // CTR = (Clicks / Impressions) * 100
    const { data: dailyStats, error: dbError } = await supabase
      .from('meta_ad_daily_insights') 
      .select('date, clicks, impressions') // Need clicks and impressions
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    if (dbError) {
      console.error(`CTR SINGLE METRIC API: Error retrieving from meta_ad_daily_insights:`, dbError)
      return NextResponse.json({ error: 'Error retrieving data' , _meta: { dbError: dbError.message } }, { status: 500 })
    }
    
    let filteredStats = dailyStats || []
    if (isYesterdayPreset) { 
      filteredStats = filteredStats.filter(item => {
        const dateStr = new Date(item.date).toISOString().split('T')[0]
        return dateStr === fromDate
      })
    }
    
    if (!filteredStats || filteredStats.length === 0) {
      return NextResponse.json({ 
        value: 0,
        _meta: { from: fromDate, to: toDate, records: 0, source: 'meta_ad_daily_insights' }
      })
    }

    const totalClicks = filteredStats.reduce((sum, item) => {
      const clicksVal = parseInt(item.clicks || '0')
      return sum + (isNaN(clicksVal) ? 0 : clicksVal)
    }, 0)

    const totalImpressions = filteredStats.reduce((sum, item) => {
      const impressionsVal = parseInt(item.impressions || '0')
      return sum + (isNaN(impressionsVal) ? 0 : impressionsVal)
    }, 0)
    
    const ctrValue = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    const result = {
      value: parseFloat(ctrValue.toFixed(2)), // CTR is a percentage, typically to 2 decimal places
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredStats.length,
        source: 'meta_ad_daily_insights'
      }
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('CTR SINGLE METRIC API: Error in endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 