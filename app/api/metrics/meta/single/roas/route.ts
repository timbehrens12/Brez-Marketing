import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching ROAS data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the ROAS widget
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
    console.log(`ROAS METRIC API: Fetching ROAS for brand ${brandId} from ${from} to ${to}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)
    
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
      console.log(`ROAS METRIC API: Using exact yesterday date ${fromDate}`)
    }
    
    // Query meta_ad_insights for just the data we need
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, spend, action_values')
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
      console.log(`ROAS METRIC API: Filtered to ${filteredInsights.length} records for ${fromDate}`)
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
    
    // Calculate the sums for spend and value
    let totalSpend = 0
    let totalValue = 0
    
    filteredInsights.forEach(item => {
      const spend = typeof item.spend === 'string' ? parseFloat(item.spend) : item.spend
      const actionValues = typeof item.action_values === 'string' ? parseFloat(item.action_values) : (item.action_values || 0)
      
      totalSpend += isNaN(spend) ? 0 : spend
      totalValue += isNaN(actionValues) ? 0 : actionValues
    })
    
    // Calculate ROAS (Return on Ad Spend)
    let roasValue = 0
    
    if (totalSpend > 0) {
      roasValue = totalValue / totalSpend
    }
    
    // Return the result
    const result = {
      value: parseFloat(roasValue.toFixed(2)),
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredInsights.length,
        totalSpend,
        totalActionValues: totalValue,
        dates: filteredInsights.map(item => new Date(item.date).toISOString().split('T')[0])
      }
    }
    
    console.log(`ROAS METRIC API: Returning ROAS = ${result.value}`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in ROAS metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 