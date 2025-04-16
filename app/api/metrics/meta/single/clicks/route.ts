import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Meta Clicks data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Clicks widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    
    // Log the request
    console.log(`META CLICKS API: Fetching for brand ${brandId} from ${from} to ${to}`)
    
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
    
    // Helper function to try to find cached metrics if rate limited
    const getRecentCachedData = async (connectionId: string) => {
      console.log(`META CLICKS API: Trying to find recent cached data for connection ${connectionId}`)
      
      // Get most recent 14 days of data
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 14) // Last 14 days
      
      const { data: cachedData } = await supabase
        .from('meta_ad_insights')
        .select('date, clicks')
        .eq('connection_id', connectionId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
      
      if (cachedData && cachedData.length > 0) {
        console.log(`META CLICKS API: Found ${cachedData.length} cached records`)
        return cachedData
      }
      
      return null
    }
    
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
    
    // Parse date range
    const fromDate = from
    const toDate = to
    
    // Query meta_ad_insights for this time period
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, clicks')
      .eq('connection_id', connection.id)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    if (error) {
      console.log(`Error retrieving Meta insights: ${JSON.stringify(error)}`)
      
      // If there's an error, try to get cached data
      const cachedData = await getRecentCachedData(connection.id)
      if (cachedData) {
        // Calculate total clicks from cached data
        const totalClicks = cachedData.reduce((sum, insight) => {
          return sum + (insight.clicks || 0)
        }, 0)
        
        // Return the cached result
        const result = {
          value: Math.round(totalClicks),
          _meta: {
            from: fromDate,
            to: toDate,
            records: cachedData.length,
            cached: true,
            dates: [...new Set(cachedData.map(item => item.date))]
          }
        }
        
        console.log(`META CLICKS API: Returning cached value = ${result.value} (using ${cachedData.length} records)`)
        return NextResponse.json(result)
      }
      
      return NextResponse.json({ error: 'Error retrieving data' }, { status: 500 })
    }
    
    // If no data, return zeros
    if (!insights || insights.length === 0) {
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
    
    // Filter out any records outside the requested date range
    const filteredInsights = insights.filter(insight => {
      const insightDate = new Date(insight.date).toISOString().split('T')[0]
      return insightDate >= fromDate && insightDate <= toDate
    })
    
    // Calculate total clicks
    const totalClicks = filteredInsights.reduce((sum, insight) => {
      return sum + (insight.clicks || 0)
    }, 0)
    
    // Return the result
    const result = {
      value: Math.round(totalClicks), // Round to nearest integer for clicks
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredInsights.length,
        dates: filteredInsights.map(item => new Date(item.date).toISOString().split('T')[0])
      }
    }
    
    console.log(`CLICKS METRIC API: Returning Clicks = ${result.value}`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Clicks metric endpoint:', error)
    
    // Try to gracefully handle errors
    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      value: 0, // Still provide a valid value that the UI can handle
      _meta: {
        error: true,
        message: errorMessage
      }
    }, { status: 200 }) // Return 200 so the UI can still handle it gracefully
  }
} 