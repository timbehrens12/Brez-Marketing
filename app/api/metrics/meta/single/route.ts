import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching single metric data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for a single widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const metric = url.searchParams.get('metric') || 'adSpend'
    const preset = url.searchParams.get('preset')
    
    // Check if this is a yesterday preset
    const isYesterdayPreset = preset === 'yesterday'
    
    // Log the request
    console.log(`SINGLE METRIC API (from meta_ad_daily_insights): Fetching ${metric} for brand ${brandId} from ${from} to ${to}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)
    
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
      return NextResponse.json({ value: 0, growth: 0 })
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
      console.log(`SINGLE METRIC API: Using exact yesterday date ${fromDate}`)
    }
    
    // 🔧 FIXED: Use meta_ad_daily_insights for complete data (includes all adsets)
    // This matches other widgets and ensures total consistency
    const { data: insights, error } = await supabase
      .from('meta_ad_daily_insights')
      .select('date, spent')
      .eq('brand_id', brandId)
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
      console.log(`SINGLE METRIC API: Filtered to ${filteredInsights.length} records for ${fromDate}`)
    }
    
    // If no data, return zeros
    if (!filteredInsights || filteredInsights.length === 0) {
      console.log(`No data found for period ${fromDate} to ${toDate}`)
      return NextResponse.json({ 
        value: 0, 
        growth: 0,
        _meta: {
          from: fromDate,
          to: toDate,
          records: 0
        }
      })
    }
    
    // Calculate the sum for ad spend (using 'spent' field from meta_ad_daily_insights)
    const totalSpend = filteredInsights.reduce((sum, item) => {
      const spend = typeof item.spent === 'string' ? parseFloat(item.spent) : item.spent
      return sum + (isNaN(spend) ? 0 : spend)
    }, 0)
    
    // Return the results without growth data
    const result = {
      value: parseFloat(totalSpend.toFixed(2)),
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredInsights.length,
        dates: filteredInsights.map(item => new Date(item.date).toISOString().split('T')[0])
      }
    }
    
    console.log(`SINGLE METRIC API: Returning ${metric} = ${result.value}`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in single metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 