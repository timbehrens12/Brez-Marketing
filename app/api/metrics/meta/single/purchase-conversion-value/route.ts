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
    
    // Query meta_ad_insights for purchase_conversion_value data
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, purchase_conversion_value')
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
    const validInsights = insights.filter(item => 
      item.purchase_conversion_value !== null && 
      item.purchase_conversion_value !== undefined
    )
    
    // If no valid records, return zero
    if (validInsights.length === 0) {
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
    
    // Calculate the sum of purchase_conversion_value
    const totalValue = validInsights.reduce((sum, item) => {
      const value = typeof item.purchase_conversion_value === 'string' 
        ? parseFloat(item.purchase_conversion_value) 
        : item.purchase_conversion_value
      return sum + (isNaN(value) ? 0 : value)
    }, 0)
    
    // Calculate the average
    const averageValue = totalValue / validInsights.length
    
    // Return the result
    const result = {
      value: parseFloat(averageValue.toFixed(2)),
      _meta: {
        from,
        to,
        records: validInsights.length,
        totalValue: parseFloat(totalValue.toFixed(2)),
        dates: validInsights.map(item => new Date(item.date).toISOString().split('T')[0])
      }
    }
    
    console.log(`PURCHASE CONVERSION VALUE API: Returning avg value = ${result.value}, based on ${validInsights.length} records`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Purchase Conversion Value metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 