import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Meta Results data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Results widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    let fromDate = url.searchParams.get('from')
    let toDate = url.searchParams.get('to')
    const preset = url.searchParams.get('preset')
    const isYesterdayPreset = preset === 'yesterday'

    console.log(`RESULTS SINGLE METRIC API (from meta_campaign_daily_stats): Fetching for brand ${brandId} from ${fromDate} to ${toDate}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)

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
      console.log(`RESULTS SINGLE METRIC API: Using exact yesterday date ${fromDate}`)
    }

    // Assuming 'conversions' column in meta_campaign_daily_stats represents 'results' for this widget.
    // This might need adjustment if there is a more specific 'results' column or calculation.
    const { data: dailyStats, error: dbError } = await supabase
      .from('meta_campaign_daily_stats') 
      .select('date, conversions') // Assuming 'conversions' count as results
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    if (dbError) {
      console.error(`RESULTS SINGLE METRIC API: Error retrieving from meta_campaign_daily_stats:`, dbError)
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
        _meta: { from: fromDate, to: toDate, records: 0, source: 'meta_campaign_daily_stats' }
      })
    }

    const totalResults = filteredStats.reduce((sum, item) => {
      const resultsVal = parseInt(item.conversions || '0') // Assuming 'conversions' is the count of results
      return sum + (isNaN(resultsVal) ? 0 : resultsVal)
    }, 0)

    const result = {
      value: totalResults,
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredStats.length,
        source: 'meta_campaign_daily_stats'
      }
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('RESULTS SINGLE METRIC API: Error in endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 