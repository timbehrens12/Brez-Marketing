import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Meta Results data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Results widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    
    // Log the request
    console.log(`META RESULTS API: Fetching for brand ${brandId} from ${from} to ${to}`)
    
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
    
    // Query meta_ad_insights including the results column and actions array for fallback
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, results, actions')
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
    
    // Try to use the stored results first
    let hasStoredResults = insights.some(insight => insight.results > 0)
    let totalResults = 0
    
    if (hasStoredResults) {
      // Sum up the stored results values
      totalResults = insights.reduce((sum, insight) => sum + (insight.results || 0), 0)
    } else {
      // Fallback: Calculate "results" from the actions array
      // In Meta, "results" typically refers to the primary objective of the campaign
      // Common action_types for results include: 'purchase', 'lead', 'offsite_conversion', etc.
      insights.forEach(insight => {
        if (insight.actions && Array.isArray(insight.actions)) {
          insight.actions.forEach((action: any) => {
            if (
              action.action_type === 'purchase' || 
              action.action_type === 'offsite_conversion.fb_pixel_purchase' ||
              action.action_type === 'omni_purchase' ||
              action.action_type === 'lead' ||
              action.action_type === 'offsite_conversion.fb_pixel_lead' ||
              action.action_type === 'complete_registration'
            ) {
              const value = parseFloat(action.value) || 0
              totalResults += value
            }
          })
        }
      })
    }
    
    // Return the result
    const result = {
      value: parseFloat(totalResults.toFixed(2)),
      _meta: {
        from,
        to,
        records: insights.length,
        source: hasStoredResults ? 'database' : 'calculated',
        dates: [...new Set(insights.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`META RESULTS API: Returning results = ${result.value}, based on ${insights.length} records (source: ${hasStoredResults ? 'database' : 'calculated'})`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Meta Results metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 