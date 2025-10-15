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
    
    if (adSetsError || !adSets || adSets.length === 0) {
      console.log(`No ad sets found for brand ${brandId}`)
      return NextResponse.json({ value: 0 })
    }
    
    // Get ad set IDs
    const adSetIds = adSets.map((adSet: any) => adSet.adset_id);
    
    // Try to get adset-level insights first
    const { data: insights, error: insightsError } = await supabase
      .from('meta_adset_daily_insights')
      .select('reach')
      .in('adset_id', adSetIds)
      .gte('date', from)
      .lte('date', to)
    
    if (insightsError) {
      console.error(`Error retrieving ad set insights: ${JSON.stringify(insightsError)}`)
      // Don't return here, fallback will handle it
    }
    
    // Primary method: Sum the daily reach from insights.
    // NOTE: This is technically incorrect as reach is a unique metric.
    // However, without making a live API call for every date range change,
    // this is the best approximation we can get from the stored daily data.
    // The long-term solution is a more sophisticated data aggregation method.
    if (insights && insights.length > 0) {
      const totalReach = insights.reduce((sum, insight) => sum + Number(insight.reach || 0), 0);
      
      console.log(`REACH API: Calculated reach = ${totalReach} by summing ${insights.length} daily adset insight records.`)
      
      return NextResponse.json({
        value: totalReach,
        _meta: {
          from,
          to,
          adSets: adSetIds.length,
          insightRecords: insights.length,
          source: 'adset_insights_daily_sum'
        }
      })
    }

    // Fallback method: if no daily insights are found, try summing ad-level insights.
    console.log(`No ad set insights found for date range ${from} to ${to}, falling back to ad-level data`)
      
    const { data: adInsights, error: adInsightsError } = await supabase
      .from('meta_ad_insights')
      .select('reach')
      .in('adset_id', adSetIds)
      .gte('date', from)
      .lte('date', to)
    
    if (adInsightsError || !adInsights || adInsights.length === 0) {
      console.log(`No ad-level insights found for date range ${from} to ${to}`)
      return NextResponse.json({ value: 0 })
    }
      
    const totalReachFromAds = adInsights.reduce((sum, insight) => sum + Number(insight.reach || 0), 0);
    
    console.log(`REACH API: Calculated reach = ${totalReachFromAds} from summing ${adInsights.length} daily ad-level insights.`)
    
    return NextResponse.json({
      value: totalReachFromAds,
      _meta: {
        from,
        to,
        adSets: adSetIds.length,
        insightRecords: adInsights.length,
        source: 'ad_insights_daily_sum_fallback'
      }
    })
    
  } catch (error) {
    console.error('Error in Reach metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}