import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Purchase Conversion Value data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Purchase Conversion Value widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    let fromDate = url.searchParams.get('from')
    let toDate = url.searchParams.get('to')
    const preset = url.searchParams.get('preset')
    const isYesterdayPreset = preset === 'yesterday'

    console.log(`PURCHASE_VALUE SINGLE METRIC API (from meta_campaign_daily_stats): Fetching for brand ${brandId} from ${fromDate} to ${toDate}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)

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
      console.log(`PURCHASE_VALUE SINGLE METRIC API: Using exact yesterday date ${fromDate}`)
    }

    // Avg Purchase Value = (Total Purchase Value) / (Total Number of Purchases/Conversions)
    // We need 'conversions' (assuming this is total purchase value) and a way to count distinct purchase actions.
    // For simplicity, if 'conversions' in meta_campaign_daily_stats is total value, and we need a count of conversion events,
    // this might require adjustment if 'conversions' is just a count.
    // Assuming 'conversions' is total value and we need to count records with conversions > 0 for number of purchase events.
    const { data: dailyStats, error: dbError } = await supabase
      .from('meta_campaign_daily_stats') 
      .select('date, conversions') // Assuming 'conversions' column stores the purchase value for that day
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    if (dbError) {
      console.error(`PURCHASE_VALUE SINGLE METRIC API: Error retrieving from meta_campaign_daily_stats:`, dbError)
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

    const totalPurchaseValue = filteredStats.reduce((sum, item) => {
      const value = parseFloat(item.conversions || '0') // Assuming 'conversions' field is the purchase value
        return sum + (isNaN(value) ? 0 : value)
      }, 0)
    
    // Count the number of entries that had conversions, approximating number of purchase events
    const numberOfPurchaseEvents = filteredStats.filter(item => parseFloat(item.conversions || '0') > 0).length;

    const avgPurchaseValue = numberOfPurchaseEvents > 0 ? totalPurchaseValue / numberOfPurchaseEvents : 0;

    const result = {
      value: parseFloat(avgPurchaseValue.toFixed(2)),
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredStats.length,
        source: 'meta_campaign_daily_stats'
      }
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('PURCHASE_VALUE SINGLE METRIC API: Error in endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 