import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Cost Per Click data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Cost Per Click widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const preset = url.searchParams.get('preset')
    
    // Check if this is a yesterday preset
    const isYesterdayPreset = preset === 'yesterday'
    
    // Log the request
    console.log(`COST PER CLICK API: Fetching for brand ${brandId} from ${from} to ${to}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)
    
    // Validate required parameters
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }
    
    if (!from || !to) {
      return NextResponse.json({ error: 'Date range is required' }, { status: 400 })
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()
    
    if (connectionError) {
      console.log(`Error retrieving Meta connection: ${JSON.stringify(connectionError)}`)
      return NextResponse.json({ error: 'Error retrieving Meta connection' }, { status: 500 })
    }
    
    if (!connection) {
      console.log(`No active Meta connection found for brand ${brandId}`)
      return NextResponse.json({ value: 0 })
    }
    
    // Special handling for yesterday preset to ensure exact date
    let fromDate = from
    let toDate = to
    
    if (isYesterdayPreset) {
      // Use exactly yesterday's date
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      fromDate = yesterday.toISOString().split('T')[0]
      toDate = fromDate // Force same day
      console.log(`COST PER CLICK API: Using exact yesterday date ${fromDate}`)
    }
    
    // Query meta_ad_insights for clicks and spend
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, clicks, spend, cost_per_click')
      .eq('connection_id', connection.id)
      .gte('date', fromDate)
      .lte('date', toDate)
    
        if (error) {
      console.log(`Error retrieving Meta insights: ${JSON.stringify(error)}`)
      return NextResponse.json({ error: 'Error retrieving data' }, { status: 500 })
    }

    // Filter to ensure exact date match for yesterday
    let filteredInsights = insights || []
    
    if (isYesterdayPreset) {
      filteredInsights = filteredInsights.filter(item => {
        const dateStr = new Date(item.date).toISOString().split('T')[0]
        return dateStr === fromDate
      })
      console.log(`COST PER CLICK API: Filtered to ${filteredInsights.length} records for ${fromDate}`)
    }

    // If no data, return zeros
    if (!filteredInsights || filteredInsights.length === 0) {
      console.log(`No data found for period ${fromDate} to ${toDate}`)
      return NextResponse.json({ 
        value: 0,
        _meta: {
          from: fromDate,
          to: toDate,
          records: 0
        }
      })
    }
    
    // ** ALWAYS calculate CPC based on total spend and total clicks for the period **
    let totalSpend = 0
    let totalClicks = 0
    
    filteredInsights.forEach(insight => {
      totalSpend += parseFloat(insight.spend) || 0
      totalClicks += parseInt(insight.clicks) || 0
    })
    
    const calculatedCPC = totalClicks > 0 ? totalSpend / totalClicks : 0
    
    // Return the result
    const result = {
      value: parseFloat(calculatedCPC.toFixed(2)),
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredInsights.length,
        source: 'calculated', // Always calculated now
        totalSpend: totalSpend.toFixed(2), // Add debug info
        totalClicks: totalClicks, // Add debug info
        dates: [...new Set(filteredInsights.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`COST PER CLICK API: Returning CPC = ${result.value}, based on ${filteredInsights.length} records (source: ${result._meta.source})`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Cost Per Click metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 