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
    
    // Log the request
    console.log(`COST PER CLICK API: Fetching for brand ${brandId} from ${from} to ${to}`)
    
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
    
    // Query meta_ad_insights for clicks and spend
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, clicks, spend, cost_per_click')
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
    
    // Get average CPC from stored values
    let totalCPC = 0
    let validRecords = 0
    
    insights.forEach(insight => {
      if (insight.cost_per_click != null && insight.cost_per_click > 0) {
        totalCPC += parseFloat(insight.cost_per_click.toString())
        validRecords++
      }
    })
    
    // Calculate average CPC
    let avgCPC = 0
    if (validRecords > 0) {
      avgCPC = totalCPC / validRecords
    } else {
      // Fallback calculation if no stored CPC values found
      // This handles the case where data exists but was imported before we added the trigger
      let totalSpend = 0
      let totalClicks = 0
      
      insights.forEach(insight => {
        totalSpend += parseFloat(insight.spend) || 0
        totalClicks += parseInt(insight.clicks) || 0
      })
      
      if (totalClicks > 0) {
        avgCPC = totalSpend / totalClicks
      }
    }
    
    // Return the result
    const result = {
      value: parseFloat(avgCPC.toFixed(2)),
      _meta: {
        from,
        to,
        records: insights.length,
        source: validRecords > 0 ? 'database' : 'calculated',
        dates: [...new Set(insights.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`COST PER CLICK API: Returning CPC = ${result.value}, based on ${insights.length} records (source: ${validRecords > 0 ? 'database' : 'calculated'})`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Cost Per Click metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 