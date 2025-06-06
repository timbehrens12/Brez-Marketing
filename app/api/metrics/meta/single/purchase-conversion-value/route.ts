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

    console.log(`PURCHASE_VALUE SINGLE METRIC API (from meta_ad_insights): Fetching for brand ${brandId} from ${fromDate} to ${toDate}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)

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

    // Return total purchase conversion value from meta_ad_insights
    // This endpoint returns the sum of all purchase conversion values in the date range
    const { data: dailyStats, error: dbError } = await supabase
      .from('meta_ad_insights') 
      .select('date, purchase_conversion_value')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    if (dbError) {
      console.error(`PURCHASE_VALUE SINGLE METRIC API: Error retrieving from meta_ad_insights:`, dbError)
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
        _meta: { from: fromDate, to: toDate, records: 0, source: 'meta_ad_insights' }
      })
    }

    const totalPurchaseValue = filteredStats.reduce((sum, item) => {
      const value = parseFloat(item.purchase_conversion_value || '0')
        return sum + (isNaN(value) ? 0 : value)
      }, 0)
    
    // For this endpoint, return the total purchase conversion value, not average
    // The widget is expecting total purchase conversion value, not average per event

    const result = {
      value: parseFloat(totalPurchaseValue.toFixed(2)),
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredStats.length,
          source: 'meta_ad_insights'
      }
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('PURCHASE_VALUE SINGLE METRIC API: Error in endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 