import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Purchase Conversion Value data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Purchase Conversion Value widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    
    // Log the request
    console.log(`PURCHASE CONVERSION VALUE API: Fetching for brand ${brandId} from ${from} to ${to}`)
    
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
    
    // Query meta_ad_insights for purchase_conversion_value and action_values data as fallback
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, purchase_conversion_value, action_values')
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
    
    // Filter out records with null or undefined purchase_conversion_value
    const validInsightsWithStoredValues = insights.filter(item => 
      item.purchase_conversion_value !== null && 
      item.purchase_conversion_value !== undefined &&
      parseFloat(item.purchase_conversion_value) > 0
    )
    
    let totalValue = 0
    let dataSource = 'database'
    
    // Check if we have valid stored purchase_conversion_value
    if (validInsightsWithStoredValues.length > 0) {
      // Calculate the sum of purchase_conversion_value
      totalValue = validInsightsWithStoredValues.reduce((sum, item) => {
        const value = typeof item.purchase_conversion_value === 'string' 
          ? parseFloat(item.purchase_conversion_value) 
          : item.purchase_conversion_value
        return sum + (isNaN(value) ? 0 : value)
      }, 0)
    } else {
      // Fallback: Calculate from action_values JSON
      dataSource = 'calculated'
      
      insights.forEach(insight => {
        if (insight.action_values && Array.isArray(insight.action_values)) {
          insight.action_values.forEach((actionValue: any) => {
            if (
              actionValue.action_type === 'purchase' || 
              actionValue.action_type === 'offsite_conversion.fb_pixel_purchase'
            ) {
              const value = parseFloat(actionValue.value) || 0
              totalValue += value
            }
          })
        }
      })
    }
    
    // If no valid records or total is 0, return zero
    if (totalValue === 0) {
      return NextResponse.json({
        value: 0,
        _meta: {
          from,
          to,
          records: 0,
          hasValidData: false
        }
      })
    }
    
    // Calculate the average based on valid records count
    const recordCount = validInsightsWithStoredValues.length > 0 
      ? validInsightsWithStoredValues.length 
      : insights.length
    
    const averageValue = totalValue / recordCount
    
    // Return the result
    const result = {
      value: parseFloat(averageValue.toFixed(2)),
      _meta: {
        from,
        to,
        records: recordCount,
        totalValue: parseFloat(totalValue.toFixed(2)),
        source: dataSource,
        dates: [...new Set(insights.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`PURCHASE CONVERSION VALUE API: Returning avg value = ${result.value}, based on ${recordCount} records (source: ${dataSource})`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Purchase Conversion Value metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 