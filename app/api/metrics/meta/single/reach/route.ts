import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Reach data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Reach widget
 * 
 * NOTE: This also serves as a fallback for the views endpoint if the views column doesn't exist yet
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    
    // Log the request
    console.log(`REACH API: Fetching for brand ${brandId} from ${from} to ${to}`)
    
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
    
    // Query meta_ad_insights for reach data
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, reach')
      .eq('connection_id', connection.id)
      .gte('date', from)
      .lte('date', to)
    
    if (error) {
      console.log(`Error retrieving Meta insights: ${JSON.stringify(error)}`)
      return NextResponse.json({ error: 'Error retrieving data' }, { status: 500 })
    }
    
    // If no data, return zeros
    if (!insights || insights.length === 0) {
      console.log(`No data found for period ${from} to ${to}`)
      return NextResponse.json({ 
        value: 0,
        _meta: {
          from,
          to,
          records: 0
        }
      })
    }
    
    // Calculate total reach
    let totalReach = 0
    let recordsWithReach = 0
    
    // Debug: Show raw values
    const debugValues = insights.slice(0, 5).map(insight => ({
      date: insight.date,
      reach: insight.reach
    }));
    console.log(`REACH API DEBUG: Raw reach values from first 5 records:`, JSON.stringify(debugValues));
    
    insights.forEach(insight => {
      if (insight.reach && !isNaN(insight.reach) && insight.reach > 0) {
        totalReach += parseInt(insight.reach)
        recordsWithReach++
      }
    })
    
    // If no reach data is found, add debugging log
    if (recordsWithReach === 0) {
      console.log(`REACH API WARNING: No reach data found in any of the ${insights.length} records. This may indicate that:
      1. The Meta API is not returning reach data
      2. The meta_ad_insights table hasn't been updated with the latest data that includes reach
      3. You may need to resync Meta data`)
    }
    
    // Return the result
    const result = {
      value: totalReach,
      _meta: {
        from,
        to,
        records: insights.length,
        recordsWithReach,
        dates: [...new Set(insights.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`REACH API: Returning reach = ${result.value}, based on ${insights.length} records (reach data found in ${recordsWithReach} records)`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Reach metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 