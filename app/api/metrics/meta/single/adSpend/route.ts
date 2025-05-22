import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    let fromDate = url.searchParams.get('from')
    let toDate = url.searchParams.get('to')
    const preset = url.searchParams.get('preset')
    const isYesterdayPreset = preset === 'yesterday'

    console.log(`ADSPEND SINGLE METRIC API: Fetching for brand ${brandId} from ${fromDate} to ${toDate}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)

    if (!brandId || !fromDate || !toDate) {
      return NextResponse.json({ error: 'Brand ID and date range are required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ value: 0 , _meta: { error: 'No active Meta connection found or db error'} })
    }
    
    if (isYesterdayPreset) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      fromDate = yesterday.toISOString().split('T')[0]
      toDate = fromDate 
      console.log(`ADSPEND SINGLE METRIC API: Using exact yesterday date ${fromDate}`)
    }

    const { data: insights, error: dbError } = await supabase
      .from('meta_ad_insights')
      .select('date, spend')
      .eq('connection_id', connection.id)
      .gte('date', fromDate)
      .lte('date', toDate)

    if (dbError) {
      console.error(`ADSPEND SINGLE METRIC API: Error retrieving Meta insights:`, dbError)
      return NextResponse.json({ error: 'Error retrieving data' , _meta: { dbError: dbError.message } }, { status: 500 })
    }

    let filteredInsights = insights || []
    if (isYesterdayPreset) {
      filteredInsights = filteredInsights.filter(item => {
        const dateStr = new Date(item.date).toISOString().split('T')[0]
        return dateStr === fromDate
      })
    }

    if (!filteredInsights || filteredInsights.length === 0) {
      return NextResponse.json({ 
        value: 0, 
        _meta: { from: fromDate, to: toDate, records: 0 }
      })
    }

    const totalSpend = filteredInsights.reduce((sum, item) => {
      const spendVal = parseFloat(item.spend || '0')
      return sum + (isNaN(spendVal) ? 0 : spendVal)
    }, 0)

    const result = {
      value: parseFloat(totalSpend.toFixed(2)),
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredInsights.length,
      }
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('ADSPEND SINGLE METRIC API: Error in endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 