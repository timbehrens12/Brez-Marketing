import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Reach data directly
 * This endpoint uses the same ad set aggregation logic as campaigns
 * to ensure consistent reach calculation across all widgets
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
    
    // FIXED: Get reach data directly from insights (ad sets table is empty but insights exist)
    // This bypasses the missing ad sets issue and gets data directly from insights
    console.log(`REACH API: Checking insights directly for brand ${brandId}`)
    
    // FIXED: Get reach data from the correct table (meta_adsets_total_reach)
    // This is where the actual daily reach totals are stored
    console.log(`REACH API: Getting reach from meta_adsets_total_reach for ${from} to ${to}`)
    
    const { data: reachData, error: reachError } = await supabase
      .from('meta_adsets_total_reach')
      .select('total_reach, date')
      .eq('brand_id', brandId)
      .gte('date', from)
      .lte('date', to)
    
    if (reachError) {
      console.log(`Error retrieving reach data: ${JSON.stringify(reachError)}`)
      return NextResponse.json({ value: 0 })
    }
    
    if (!reachData || reachData.length === 0) {
      console.log(`No reach data found for date range ${from} to ${to}`)
      return NextResponse.json({ value: 0 })
    }
    
    // CORRECT: Sum the daily reach totals from meta_adsets_total_reach
    // This table contains the proper daily reach aggregation, so we can sum across days
    const totalReach = reachData.reduce((sum, day) => {
      return sum + Number(day.total_reach || 0);
    }, 0);
    
    console.log(`REACH API: Calculated total reach = ${totalReach} from ${reachData.length} days of data`)
    console.log(`REACH API: Date range ${from} to ${to} - daily breakdown:`, reachData.map(d => `${d.date}: ${d.total_reach}`).join(', '))
    
    return NextResponse.json({
      value: totalReach,
      _meta: {
        from,
        to,
        daysOfData: reachData.length,
        source: 'meta_adsets_total_reach'
      }
    })
    
  } catch (error) {
    console.error('Error in Reach metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}