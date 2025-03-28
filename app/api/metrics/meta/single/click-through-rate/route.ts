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
      .select('date, clicks, impressions')
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
    
    // Calculate total impressions and total clicks
    let totalImpressions = 0
    let totalClicks = 0
    
    insights.forEach(insight => {
      // Add up the impressions
      totalImpressions += parseInt(insight.impressions) || 0
      
      // Add up the clicks
      totalClicks += parseInt(insight.clicks) || 0
    })
    
    // Calculate CTR (Click-Through Rate)
    let ctr = 0
    if (totalImpressions > 0) {
      ctr = totalClicks / totalImpressions
    }
    
    // Return the result
    const result = {
      value: parseFloat((ctr * 100).toFixed(2)), // Convert to percentage and round to 2 decimal places
      _meta: {
        from,
        to,
        records: insights.length,
        totalImpressions,
        totalClicks,
        dates: [...new Set(insights.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`CTR API: Returning CTR = ${result.value}%, based on ${insights.length} records (impressions: ${totalImpressions}, clicks: ${totalClicks})`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in CTR metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 