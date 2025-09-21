import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Reach data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Reach widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    
    // Log the request
    console.log(`REACH API: Fetching for brand ${brandId} from ${from} to ${to}`)
    
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
    
    // UPDATED: Query meta_ad_daily_insights for reach data
    // This table has deduplicated reach values that are more accurate 
    const { data: campaignStats, error: statsError } = await supabase
      .from('meta_ad_daily_insights')
      .select('date, reach')
      .eq('brand_id', brandId)
      .gte('date', from)
      .lte('date', to)
    
    if (statsError) {
      console.log(`Error retrieving campaign stats: ${JSON.stringify(statsError)}`)
      
      // Fallback to meta_ad_insights if campaign stats are not available
      const { data: insights, error } = await supabase
        .from('meta_ad_insights')
        .select('date, reach')
        .eq('brand_id', brandId)
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
            records: 0,
            source: 'fallback_insights'
        }
      })
    }
    
    // CRITICAL FIX: Reach should NOT be summed (avoid double-counting)
    // For multi-day periods, use the maximum single-day reach
    let maxReach = 0
    let recordsWithReach = 0
    
    insights.forEach(insight => {
      const reachValue = parseInt(insight.reach);
      if (!isNaN(reachValue) && reachValue >= 0) {
        maxReach = Math.max(maxReach, reachValue);
        recordsWithReach++;
      }
    })
    
      // Return the result with fallback source indication
      const result = {
        value: maxReach,
        _meta: {
          from,
          to,
          records: insights.length,
          recordsWithReach,
          source: 'fallback_insights',
          dates: [...new Set(insights.map(item => new Date(item.date).toISOString().split('T')[0]))]
        }
      }
      
      console.log(`REACH API (FALLBACK): Returning max reach = ${result.value}, based on ${insights.length} records (using max instead of sum)`)
      
      return NextResponse.json(result)
    }
    
    // If no campaign stats data, return zeros
    if (!campaignStats || campaignStats.length === 0) {
      console.log(`No campaign stats found for period ${from} to ${to}`)
      return NextResponse.json({ 
        value: 0,
        _meta: {
          from,
          to,
          records: 0,
          source: 'campaign_stats'
        }
      })
    }
    
    // CRITICAL FIX: Reach should NOT be summed (avoid double-counting)
    // For multi-day periods, use the maximum single-day reach as it represents
    // the highest unique reach achieved on any given day
    let maxReach = 0
    let recordsWithReach = 0
    
    campaignStats.forEach(stat => {
      const reachValue = parseInt(stat.reach);
      if (!isNaN(reachValue) && reachValue >= 0) {
        maxReach = Math.max(maxReach, reachValue);
        recordsWithReach++;
      }
    })
    
    // Return the result
    const result = {
      value: maxReach,
      _meta: {
        from,
        to,
        records: campaignStats.length,
        recordsWithReach,
        source: 'campaign_stats',
        dates: [...new Set(campaignStats.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`REACH API: Returning max reach = ${result.value}, based on ${campaignStats.length} campaign stats records (using max instead of sum)`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Reach metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 