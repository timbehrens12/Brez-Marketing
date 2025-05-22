import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Click-Through Rate (CTR) data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the CTR widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    
    // Log the request
    console.log(`CTR API: Fetching for brand ${brandId} from ${from} to ${to}`)
    
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
    
    // Query meta_ad_insights for clicks and impressions
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, clicks, impressions, click_through_rate')
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
    
    // Calculate average click through rate from stored values
    // --- Start Edit: Always calculate from totals ---
    // let totalCTR = 0
    // let validRecords = 0
    
    // insights.forEach(insight => {
    //   if (insight.click_through_rate != null && insight.click_through_rate > 0) {
    //     totalCTR += parseFloat(insight.click_through_rate.toString())
    //     validRecords++
    //   }
    // })
    
    // // Average CTR across all records
    // let avgRawCTR = 0 // Renamed to indicate raw ratio
    // if (validRecords > 0) {
    //   // Divide by 100 if using pre-calculated percentage from DB
    //   avgRawCTR = (totalCTR / validRecords) / 100 
    // } else {
      // Fallback calculation if no stored CTR values found
      // This handles the case where data exists but was imported before we added the trigger
      
      // Always calculate using total clicks and impressions for the period
      let totalImpressions = 0
      let totalClicks = 0
      
      insights.forEach(insight => {
        totalImpressions += parseInt(insight.impressions) || 0
        totalClicks += parseInt(insight.clicks) || 0
      })
      
      let avgRawCTR = 0 // Initialize CTR
      if (totalImpressions > 0) {
        // Use the raw ratio directly
        avgRawCTR = (totalClicks / totalImpressions)
      }
    // }
    // --- End Edit ---
    
    // Return the result
    const result = {
      value: avgRawCTR, // Return the raw ratio
      _meta: {
        from,
        to,
        records: insights.length,
        source: 'calculated', // Source is always calculated now
        dates: [...new Set(insights.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`CTR API: Returning CTR = ${result.value}, based on ${insights.length} records (source: calculated)`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in CTR metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 