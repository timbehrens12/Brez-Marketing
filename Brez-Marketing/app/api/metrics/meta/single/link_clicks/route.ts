import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Link Clicks data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Link Clicks widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    let fromDate = url.searchParams.get('from')
    let toDate = url.searchParams.get('to')
    const preset = url.searchParams.get('preset')
    const isYesterdayPreset = preset === 'yesterday'

    console.log(`LINK_CLICKS SINGLE METRIC API (from meta_campaign_daily_stats): Fetching for brand ${brandId} from ${fromDate} to ${toDate}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)

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
      console.log(`LINK_CLICKS SINGLE METRIC API: Using exact yesterday date ${fromDate}`)
    }

    // For Link Clicks, meta_campaign_daily_stats might not have a direct 'link_clicks' column.
    // We might need to use the 'clicks' column as a proxy, or this metric might not be accurately representable
    // from meta_campaign_daily_stats if it only contains generic clicks.
    // Assuming 'clicks' column for now as a placeholder for link clicks.
    const { data: dailyStats, error: dbError } = await supabase
      .from('meta_campaign_daily_stats') 
      .select('date, clicks') // Using 'clicks' as a proxy for link_clicks
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    if (dbError) {
      console.error(`LINK_CLICKS SINGLE METRIC API: Error retrieving from meta_campaign_daily_stats:`, dbError)
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
        _meta: { from: fromDate, to: toDate, records: 0, source: 'meta_campaign_daily_stats (clicks as proxy)' }
      })
    }

    const totalLinkClicks = filteredStats.reduce((sum, item) => {
      const clicksVal = parseInt(item.clicks || '0') // Using 'clicks' as proxy
      return sum + (isNaN(clicksVal) ? 0 : clicksVal)
    }, 0)

    const result = {
      value: totalLinkClicks,
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredStats.length,
        source: 'meta_campaign_daily_stats (clicks as proxy)'
      }
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('LINK_CLICKS SINGLE METRIC API: Error in endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 