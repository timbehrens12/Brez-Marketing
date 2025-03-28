import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Frequency data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Frequency widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    
    // Log the request
    console.log(`FREQUENCY API: Fetching for brand ${brandId} from ${from} to ${to}`)
    
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
    
    // Query meta_ad_insights for frequency data
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, impressions, reach, frequency, actions')
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
    
    // Check if we have frequency data stored in the database
    const validStoredFrequencies = insights.filter(i => i.frequency && i.frequency > 0)
    
    if (validStoredFrequencies.length > 0) {
      // Calculate average frequency from stored values
      const totalFrequency = validStoredFrequencies.reduce((sum, insight) => {
        return sum + (insight.frequency || 0)
      }, 0)
      
      const avgFrequency = totalFrequency / validStoredFrequencies.length
      
      // Return the result
      const result = {
        value: parseFloat(avgFrequency.toFixed(2)),
        _meta: {
          from,
          to,
          records: validStoredFrequencies.length,
          source: 'database',
          dates: [...new Set(insights.map(item => new Date(item.date).toISOString().split('T')[0]))]
        }
      }
      
      console.log(`FREQUENCY API: Returning frequency = ${result.value}, based on ${validStoredFrequencies.length} records (source: database)`)
      
      return NextResponse.json(result)
    } else {
      // Fallback: Calculate frequency from impressions and reach
      let totalImpressions = 0
      let totalReach = 0
      
      // First, try to use stored reach values if available
      insights.forEach(insight => {
        totalImpressions += insight.impressions || 0
        if (insight.reach && insight.reach > 0) {
          totalReach += insight.reach
        } else {
          // Try to find reach in the actions array
          if (insight.actions && Array.isArray(insight.actions)) {
            insight.actions.forEach((action: any) => {
              if (action.action_type === 'reach') {
                totalReach += parseInt(action.value) || 0
              }
            })
          }
        }
      })
      
      // Calculate frequency (impressions / reach)
      let frequency = 0
      if (totalReach > 0) {
        frequency = totalImpressions / totalReach
      }
      
      // Return the result
      const result = {
        value: parseFloat(frequency.toFixed(2)),
        _meta: {
          from,
          to,
          records: insights.length,
          source: 'calculated',
          totalImpressions,
          totalReach,
          dates: [...new Set(insights.map(item => new Date(item.date).toISOString().split('T')[0]))]
        }
      }
      
      console.log(`FREQUENCY API: Returning frequency = ${result.value}, based on ${insights.length} records (calculated from impressions: ${totalImpressions}, reach: ${totalReach})`)
      
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Error in Frequency metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 