import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Reach data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Reach widget
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
      // Select account_id and access_token needed for API call
      .select('id, account_id, access_token') 
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
    
    // Calculate total reach by summing daily reach from DB
    let totalReach = 0
    let recordsWithReach = 0
    
    insights.forEach(insight => {
      // Ensure reach is a valid number before adding
      const dailyReach = parseInt(insight.reach);
      if (!isNaN(dailyReach) && dailyReach > 0) {
        totalReach += dailyReach
        recordsWithReach++
      }
    })
    
    // Log if no records had reach data
    if (recordsWithReach === 0) {
       console.log(`REACH API WARNING: No valid reach data found in ${insights.length} records for the period.`)
    }
    
    // Return the result (summed daily reach)
    const result = {
      value: totalReach,
      _meta: {
        from,
        to,
        records: insights.length,
        source: 'database_summed' // Indicate source
      }
    }
    
    console.log(`REACH API: Returning reach = ${result.value} (source: ${result._meta.source}, summed from ${recordsWithReach} records)`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Reach metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 