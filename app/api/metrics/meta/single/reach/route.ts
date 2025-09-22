import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Reach data directly
 * This endpoint uses the same ad set aggregation logic as campaigns
 * to ensure consistent reach calculation across all widgets
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
    
    // FIXED: Get reach data directly from insights (ad sets table is empty but insights exist)
    // This bypasses the missing ad sets issue and gets data directly from insights
    console.log(`REACH API: Checking insights directly for brand ${brandId}`)
    
    // Get insights directly for the date range
    const { data: insights, error: insightsError } = await supabase
      .from('meta_adset_daily_insights')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', from)
      .lte('date', to)
    
    if (insightsError) {
      console.log(`Error retrieving ad set insights: ${JSON.stringify(insightsError)}`)
      return NextResponse.json({ value: 0 })
    }
    
    if (!insights || insights.length === 0) {
      console.log(`No ad set insights found for date range ${from} to ${to}`)
      return NextResponse.json({ value: 0 })
    }
    
    // Group insights by ad set and calculate reach for each ad set
    const insightsByAdSet: Record<string, any[]> = {};
    insights.forEach((insight: any) => {
      if (!insightsByAdSet[insight.adset_id]) {
        insightsByAdSet[insight.adset_id] = [];
      }
      insightsByAdSet[insight.adset_id].push(insight);
    });
    
    // Calculate total reach properly - reach is NOT additive across days
    // For multi-day periods, we need to take the maximum reach per ad set
    // or sum only unique reach values, not daily totals
    let totalReach = 0;
    Object.keys(insightsByAdSet).forEach((adSetId) => {
      const adSetInsights = insightsByAdSet[adSetId] || [];
      if (adSetInsights.length > 0) {
        // For single day: use the reach value directly
        // For multiple days: use the maximum reach (closest to period reach)
        // This prevents inflated reach numbers from daily summation
        const adSetReach = Math.max(...adSetInsights.map((insight: any) => Number(insight.reach || 0)));
        console.log(`REACH API: Ad set ${adSetId} max reach: ${adSetReach}`)
        totalReach += adSetReach;
      }
    });
    
    console.log(`REACH API: Calculated reach = ${totalReach} from ${Object.keys(insightsByAdSet).length} ad sets with ${insights.length} insight records`)
    
    return NextResponse.json({
      value: totalReach,
      _meta: {
        from,
        to,
        adSets: Object.keys(insightsByAdSet).length,
        insightRecords: insights.length,
        source: 'adset_insights_direct'
      }
    })
    
  } catch (error) {
    console.error('Error in Reach metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}