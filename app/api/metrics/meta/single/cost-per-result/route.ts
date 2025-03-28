import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Cost Per Result data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Cost Per Result widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    
    // Log the request
    console.log(`COST PER RESULT API: Fetching for brand ${brandId} from ${from} to ${to}`)
    
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
    
    // Query meta_ad_insights including the actions array, spend, and cost_per_result
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, actions, spend, results, cost_per_result')
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
    
    // Get average cost per result from stored values
    let totalCPR = 0
    let validRecords = 0
    
    insights.forEach(insight => {
      if (insight.cost_per_result != null && insight.cost_per_result > 0) {
        totalCPR += parseFloat(insight.cost_per_result.toString())
        validRecords++
      }
    })
    
    // Calculate average cost per result
    let avgCPR = 0
    if (validRecords > 0) {
      avgCPR = totalCPR / validRecords
    } else {
      // Fallback calculation if no stored CPR values found
      // This handles the case where data exists but was imported before we added the trigger
      let totalSpend = 0
      let totalResults = 0
      
      insights.forEach(insight => {
        // Add up the spend
        totalSpend += parseFloat(insight.spend) || 0
        
        // Use stored results value if available, otherwise calculate from actions
        if (insight.results > 0) {
          totalResults += insight.results
        } else {
          // Calculate results from actions array
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
        }
      })
      
      if (totalResults > 0) {
        avgCPR = totalSpend / totalResults
      }
    }
    
    // Return the result
    const result = {
      value: parseFloat(avgCPR.toFixed(2)),
      _meta: {
        from,
        to,
        records: insights.length,
        source: validRecords > 0 ? 'database' : 'calculated',
        dates: [...new Set(insights.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`COST PER RESULT API: Returning CPR = ${result.value}, based on ${insights.length} records (source: ${validRecords > 0 ? 'database' : 'calculated'})`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Cost Per Result metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 