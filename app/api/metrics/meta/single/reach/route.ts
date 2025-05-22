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
    const preset = url.searchParams.get('preset')
    
    // Check if this is a yesterday preset
    const isYesterdayPreset = preset === 'yesterday'
    
    // Log the request
    console.log(`REACH API: Fetching for brand ${brandId} from ${from} to ${to}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)
    
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
    
    // Special handling for yesterday preset to ensure exact date
    let fromDate = from
    let toDate = to
    
    if (isYesterdayPreset) {
      // Use exactly yesterday's date
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      fromDate = yesterday.toISOString().split('T')[0]
      toDate = fromDate // Force same day
      console.log(`REACH API: Using exact yesterday date ${fromDate}`)
    }
    
    // UPDATED: Query meta_campaign_daily_stats for reach data
    // This table has deduplicated reach values that are more accurate 
    const { data: campaignStats, error: statsError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('date, reach')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    if (statsError) {
      console.log(`Error retrieving campaign stats: ${JSON.stringify(statsError)}`)
      
      // Fallback to meta_ad_insights if campaign stats are not available
      const { data: insights, error } = await supabase
        .from('meta_ad_insights')
        .select('date, reach')
        .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    if (error) {
      console.log(`Error retrieving Meta insights: ${JSON.stringify(error)}`)
      return NextResponse.json({ error: 'Error retrieving data' }, { status: 500 })
    }
    
    // Filter to ensure exact date match for yesterday
    let filteredInsights = insights || []
    
    if (isYesterdayPreset) {
      filteredInsights = filteredInsights.filter(item => {
        const dateStr = new Date(item.date).toISOString().split('T')[0]
        return dateStr === fromDate
      })
      console.log(`REACH API (FALLBACK): Filtered to ${filteredInsights.length} records for ${fromDate}`)
    }
    
    // If no data, return zeros
    if (!filteredInsights || filteredInsights.length === 0) {
      console.log(`No data found for period ${fromDate} to ${toDate}`)
      return NextResponse.json({ 
        value: 0,
        _meta: {
          from: fromDate,
          to: toDate,
            records: 0,
            source: 'fallback_insights'
        }
      })
    }
    
    // Calculate total reach
    let totalReach = 0
    let recordsWithReach = 0
    
    filteredInsights.forEach(insight => {
      if (insight.reach && !isNaN(insight.reach) && insight.reach > 0) {
        totalReach += parseInt(insight.reach)
        recordsWithReach++
      }
    })
    
      // Return the result with fallback source indication
      const result = {
        value: totalReach,
        _meta: {
          from: fromDate,
          to: toDate,
          records: filteredInsights.length,
          recordsWithReach,
          source: 'fallback_insights',
          dates: [...new Set(filteredInsights.map(item => new Date(item.date).toISOString().split('T')[0]))]
        }
      }
      
      console.log(`REACH API (FALLBACK): Returning reach = ${result.value}, based on ${filteredInsights.length} records`)
      
      return NextResponse.json(result)
    }
    
    // Filter to ensure exact date match for yesterday
    let filteredCampaignStats = campaignStats || []
    
    if (isYesterdayPreset) {
      filteredCampaignStats = filteredCampaignStats.filter(item => {
        const dateStr = new Date(item.date).toISOString().split('T')[0]
        return dateStr === fromDate
      })
      console.log(`REACH API: Filtered to ${filteredCampaignStats.length} records for ${fromDate}`)
    }
    
    // If no campaign stats data, return zeros
    if (!filteredCampaignStats || filteredCampaignStats.length === 0) {
      console.log(`No campaign stats found for period ${fromDate} to ${toDate}`)
      return NextResponse.json({ 
        value: 0,
        _meta: {
          from: fromDate,
          to: toDate,
          records: 0,
          source: 'campaign_stats'
        }
      })
    }
    
    // Calculate total reach from campaign stats
    let totalReach = 0
    let recordsWithReach = 0
    
    filteredCampaignStats.forEach(stat => {
      if (stat.reach && !isNaN(stat.reach) && stat.reach > 0) {
        totalReach += parseInt(stat.reach)
        recordsWithReach++
      }
    })
    
    // Return the result
    const result = {
      value: totalReach,
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredCampaignStats.length,
        recordsWithReach,
        source: 'campaign_stats',
        dates: [...new Set(filteredCampaignStats.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`REACH API: Returning reach = ${result.value}, based on ${filteredCampaignStats.length} campaign stats records`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Reach metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 