import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching ROAS data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the ROAS widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    let fromDate = url.searchParams.get('from')
    let toDate = url.searchParams.get('to')
    const preset = url.searchParams.get('preset')
    const isYesterdayPreset = preset === 'yesterday'
    
    console.log(`ROAS SINGLE METRIC API (from meta_campaign_daily_stats): Fetching for brand ${brandId} from ${fromDate} to ${toDate}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)
    
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
      console.log(`ROAS SINGLE METRIC API: Using exact yesterday date ${fromDate}`)
    }
    
    // ROAS = (sum of purchase_value or equivalent conversion value) / (sum of spend)
    // We need to select spend and the relevant conversion/purchase value columns.
    // Assuming 'conversions' column in meta_campaign_daily_stats represents purchase conversion value for simplicity here.
    // A more accurate ROAS would sum specific action_values like 'purchase' from a more detailed table if 'conversions' isn't direct revenue.
    const { data: dailyStats, error: dbError } = await supabase
      .from('meta_campaign_daily_stats') 
      .select('date, spend, conversions') // Select spend and conversions (assuming conversions is revenue/value for ROAS)
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    if (dbError) {
      console.error(`ROAS SINGLE METRIC API: Error retrieving from meta_campaign_daily_stats:`, dbError)
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

    const totalSpend = filteredStats.reduce((sum, item) => {
      const spendVal = parseFloat(item.spend || '0')
      return sum + (isNaN(spendVal) ? 0 : spendVal)
    }, 0)
    
    const totalConversionValue = filteredStats.reduce((sum, item) => {
      // Assuming item.conversions from meta_campaign_daily_stats is the monetary value of conversions for ROAS.
      // If it's just a count, this calculation will be incorrect and needs adjustment based on data schema.
      const conversionVal = parseFloat(item.conversions || '0') 
      return sum + (isNaN(conversionVal) ? 0 : conversionVal)
    }, 0)

    const roasValue = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

    const result = {
      value: parseFloat(roasValue.toFixed(2)), // ROAS is typically to 2 decimal places
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredStats.length,
        source: 'meta_campaign_daily_stats'
      }
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('ROAS SINGLE METRIC API: Error in endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 