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
      .eq('status', 'ACTIVE')
    
    if (adSetsError || !adSets || adSets.length === 0) {
      console.log(`No active ad sets found for brand ${brandId}`)
      return NextResponse.json({ value: 0 })
    }
    
    // Get ad set IDs
    const adSetIds = adSets.map((adSet: any) => adSet.adset_id);
    
    // Get insights for these ad sets in the date range
    let insights: any[] | null = null
    let insightsError: any = null
    try {
      const res = await supabase
        .from('meta_adset_daily_insights')
        .select('*')
        .in('adset_id', adSetIds)
        .gte('date', from)
        .lte('date', to)
      insights = res.data
      insightsError = res.error
    } catch (e) {
      insights = null
      insightsError = e
    }
    
    if (insightsError) {
      console.log(`Error retrieving ad set insights: ${JSON.stringify(insightsError)}`)
      return NextResponse.json({ value: 0 })
    }
    
    if (!insights || insights.length === 0) {
      console.log(`No ad set insights found for date range ${from} to ${to} in meta_adset_daily_insights, falling back to meta_ad_daily_insights`)
      // Fallback to ad-level daily insights aggregated by adset via join on ad_id -> meta_ads
      const { data: adLevelInsights, error: adLevelError } = await supabase
        .from('meta_ad_daily_insights')
        .select('ad_id, reach, date')
        .eq('brand_id', brandId)
        .gte('date', from)
        .lte('date', to)
        .limit(2000)
      if (!adLevelError && adLevelInsights && adLevelInsights.length > 0) {
        // Sum reach across ads as a conservative fallback
        const fallbackReach = adLevelInsights.reduce((sum: number, i: any) => sum + Number(i.reach || 0), 0)
        return NextResponse.json({
          value: fallbackReach,
          _meta: { from, to, source: 'meta_ad_daily_insights_fallback', records: adLevelInsights.length }
        })
      }
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
    
    // Calculate total reach as sum of ad set reaches (not daily reaches)
    let totalReach = 0;
    adSets.forEach((adSet: any) => {
      const adSetInsights = insightsByAdSet[adSet.adset_id] || [];
      const adSetReach = adSetInsights.reduce((sum: number, insight: any) => sum + Number(insight.reach || 0), 0);
      totalReach += adSetReach;
    });
    
    console.log(`REACH API: Calculated reach = ${totalReach} from ${adSets.length} ad sets with ${insights.length} insight records`)
    
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