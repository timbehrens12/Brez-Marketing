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
    
    // Get reach data from ad sets using the same logic as campaigns
    // This ensures consistent reach calculation across all widgets
    const { data: adSets, error: adSetsError } = await supabase
      .from('meta_adsets')
      .select('adset_id')
      .eq('brand_id', brandId)
      // Don't filter by status - include ALL adsets to match campaign table display
    
    if (adSetsError || !adSets || adSets.length === 0) {
      console.log(`No ad sets found for brand ${brandId}`)
      return NextResponse.json({ value: 0 })
    }
    
    // Get ad set IDs
    const adSetIds = adSets.map((adSet: any) => adSet.adset_id);
    
    // Try to get adset-level insights first
    const { data: insights, error: insightsError } = await supabase
      .from('meta_adset_daily_insights')
      .select('*')
      .in('adset_id', adSetIds)
      .gte('date', from)
      .lte('date', to)
    
    if (insightsError) {
      console.log(`Error retrieving ad set insights: ${JSON.stringify(insightsError)}`)
    }
    
    // If adset insights are missing or incomplete, fall back to ad-level data
    if (!insights || insights.length === 0) {
      console.log(`No ad set insights found for date range ${from} to ${to}, falling back to ad-level data`)
      
      // Get ad-level insights for these adsets
      const { data: adInsights, error: adInsightsError } = await supabase
        .from('meta_ad_insights')
        .select('adset_id, reach, date')
        .in('adset_id', adSetIds)
        .gte('date', from)
        .lte('date', to)
      
      if (adInsightsError || !adInsights || adInsights.length === 0) {
        console.log(`No ad-level insights found for date range ${from} to ${to}`)
        return NextResponse.json({ value: 0 })
      }
      
      // Group by adset and sum reach
      const reachByAdSet: Record<string, number> = {}
      adInsights.forEach((insight: any) => {
        if (!reachByAdSet[insight.adset_id]) {
          reachByAdSet[insight.adset_id] = 0
        }
        reachByAdSet[insight.adset_id] += Number(insight.reach || 0)
      })
      
      const totalReach = Object.values(reachByAdSet).reduce((sum, reach) => sum + reach, 0)
      
      console.log(`REACH API: Calculated reach = ${totalReach} from ad-level data (${adInsights.length} ad insights across ${Object.keys(reachByAdSet).length} adsets)`)
      
      return NextResponse.json({
        value: totalReach,
        _meta: {
          from,
          to,
          adSets: Object.keys(reachByAdSet).length,
          insightRecords: adInsights.length,
          source: 'ad_insights_fallback'
        }
      })
    }
    
    // Group adset insights by ad set and calculate reach for each ad set
    const insightsByAdSet: Record<string, any[]> = {};
    insights.forEach((insight: any) => {
      if (!insightsByAdSet[insight.adset_id]) {
        insightsByAdSet[insight.adset_id] = [];
      }
      insightsByAdSet[insight.adset_id].push(insight);
    });
    
    // Calculate total reach as sum of ad set reaches (not daily reaches)
    let totalReach = 0;
    adSets.forEach((adSet: any) => {
      const adSetInsights = insightsByAdSet[adSet.adset_id] || [];
      const adSetReach = adSetInsights.reduce((sum: number, insight: any) => sum + Number(insight.reach || 0), 0);
      totalReach += adSetReach;
    });
    
    console.log(`REACH API: Calculated reach = ${totalReach} from ${adSets.length} ad sets with ${insights.length} adset insight records`)
    
    return NextResponse.json({
      value: totalReach,
      _meta: {
        from,
        to,
        adSets: adSets.length,
        insightRecords: insights.length,
        source: 'adset_insights'
      }
    })
    
  } catch (error) {
    console.error('Error in Reach metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}