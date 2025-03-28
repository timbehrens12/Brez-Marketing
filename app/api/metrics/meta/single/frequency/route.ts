import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Frequency data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Frequency widget
 * 
 * Frequency is calculated as: impressions / reach
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    
    // Log the request
    console.log(`FREQUENCY API: Fetching for brand ${brandId} from ${from} to ${to}`)
    
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
    
    // Query meta_ad_insights for impressions and reach data
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, impressions, reach')
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
    
    // Calculate total impressions and reach
    let totalImpressions = 0
    let totalReach = 0
    let recordsWithData = 0
    
    insights.forEach(insight => {
      if (insight.impressions && insight.reach && 
          !isNaN(insight.impressions) && !isNaN(insight.reach) && 
          insight.impressions > 0 && insight.reach > 0) {
        totalImpressions += parseInt(insight.impressions)
        totalReach += parseInt(insight.reach)
        recordsWithData++
      }
    })
    
    // Calculate frequency (impressions/reach)
    let frequency = totalReach > 0 ? totalImpressions / totalReach : 0
    
    // If no data is found, add debugging log
    if (recordsWithData === 0) {
      console.log(`FREQUENCY API WARNING: No valid impressions/reach data found in any of the ${insights.length} records. This may indicate that:
      1. The Meta API is not returning required data
      2. The meta_ad_insights table hasn't been updated with the latest data
      3. You may need to resync Meta data`)
    }
    
    // Return the result, rounded to 2 decimal places
    const result = {
      value: parseFloat(frequency.toFixed(2)),
      _meta: {
        from,
        to,
        records: insights.length,
        recordsWithData,
        totalImpressions,
        totalReach,
        dates: [...new Set(insights.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`FREQUENCY API: Returning frequency = ${result.value}, based on ${insights.length} records (${recordsWithData} with data). Impressions: ${totalImpressions}, Reach: ${totalReach}`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Frequency metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 