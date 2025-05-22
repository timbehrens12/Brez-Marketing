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
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const preset = url.searchParams.get('preset')
    
    // Check if this is a yesterday preset
    const isYesterdayPreset = preset === 'yesterday'
    
    // Log the request
    console.log(`LINK CLICKS API: Fetching for brand ${brandId} from ${from} to ${to}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)
    
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
      console.log(`LINK CLICKS API: Using exact yesterday date ${fromDate}`)
    }
    
    // Query meta_ad_insights for link_clicks data
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, link_clicks')
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
      console.log(`LINK CLICKS API: Filtered to ${filteredInsights.length} records for ${fromDate}`)
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
    
    // Calculate total link clicks
    let totalLinkClicks = 0
    let recordsWithLinkClicks = 0
    
    filteredInsights.forEach(insight => {
      if (insight.link_clicks && !isNaN(insight.link_clicks) && insight.link_clicks > 0) {
        totalLinkClicks += parseInt(insight.link_clicks)
        recordsWithLinkClicks++
      }
    })
    
    // If no link clicks data is found, add debugging log
    if (recordsWithLinkClicks === 0) {
      console.log(`LINK CLICKS API WARNING: No link clicks data found in any of the ${filteredInsights.length} records. This may indicate that:
      1. The Meta API is not returning link_clicks data
      2. The meta_ad_insights table hasn't been updated with the latest data that includes link_clicks
      3. You may need to resync Meta data`)
    }
    
    // Return the result
    const result = {
      value: totalLinkClicks,
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredInsights.length,
        recordsWithLinkClicks,
        dates: [...new Set(filteredInsights.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`LINK CLICKS API: Returning link_clicks = ${result.value}, based on ${filteredInsights.length} records (link_clicks data found in ${recordsWithLinkClicks} records)`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Link Clicks metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 