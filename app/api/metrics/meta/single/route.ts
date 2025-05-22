import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching single metric data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for a single widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const requestedMetric = url.searchParams.get('metric') || 'adSpend'
    const preset = url.searchParams.get('preset')
    
    // Map frontend metric names to database column names
    const metricColumnMap: { [key: string]: string } = {
      'adSpend': 'spend',
      'impressions': 'impressions',
      'clicks': 'clicks',
      'conversions': 'conversions', // Assuming 'conversions' is a column
      'roas': 'roas',             // Assuming 'roas' is a column
      'ctr': 'ctr',               // Assuming 'ctr' is a column
      'cpc': 'cpc',               // Assuming 'cpc' is a column
      'costPerResult': 'cost_per_conversion', // Assuming 'cost_per_conversion'
      'purchaseValue': 'purchase_value', // Assuming 'purchase_value'
      'linkClicks': 'inline_link_clicks' // Assuming 'inline_link_clicks'
      // Add other mappings as necessary
    };

    const metric = metricColumnMap[requestedMetric] || 'spend'; // Default to 'spend' if mapping not found
    
    // Define a type for our insight items
    type InsightItem = {
      date: string | Date;
      [key: string]: any; // Allows for dynamic metric key
    };
    
    // Check if this is a yesterday preset
    const isYesterdayPreset = preset === 'yesterday'
    
    // Log the request
    console.log(`SINGLE METRIC API: Fetching ${requestedMetric} (column: ${metric}) for brand ${brandId} from ${from} to ${to}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)
    
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
      return NextResponse.json({ value: 0, growth: 0 })
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
      console.log(`SINGLE METRIC API: Using exact yesterday date ${fromDate}`)
    }
    
    // Query meta_ad_insights for just the data we need
    // This is a much more focused query than the full metrics endpoint
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select(`date, ${metric}`)
      .eq('connection_id', connection.id)
      .gte('date', fromDate)
      .lte('date', toDate)
      .returns<InsightItem[]>() // Add return type for Supabase query
    
    if (error) {
      console.log(`Error retrieving Meta insights: ${JSON.stringify(error)}`)
      return NextResponse.json({ error: 'Error retrieving data from meta_ad_insights' }, { status: 500 })
    }
    
    // Filter to ensure exact date match for yesterday
    let filteredInsights: InsightItem[] = insights || []
    
    if (isYesterdayPreset) {
      filteredInsights = filteredInsights.filter((item: InsightItem) => {
        const dateStr = new Date(item.date).toISOString().split('T')[0]
        return dateStr === fromDate
      })
      console.log(`SINGLE METRIC API: Filtered to ${filteredInsights.length} records from meta_ad_insights for ${fromDate}`)
    }
    
    // Calculate the sum for the requested metric from meta_ad_insights
    let totalValue = filteredInsights.reduce((sum, item: InsightItem) => {
      const valueString = item[metric] as string | number;
      const value = typeof valueString === 'string' ? parseFloat(valueString) : valueString;
      return sum + (isNaN(value) ? 0 : value)
    }, 0)

    let dataSource = 'meta_ad_insights';

    // If no data or zero value from meta_ad_insights, try meta_campaign_daily_stats
    if (totalValue === 0) {
      console.log(`Zero value for ${metric} from meta_ad_insights for ${fromDate} to ${toDate}. Trying meta_campaign_daily_stats.`);
      
      const { data: dailyStats, error: dailyStatsError } = await supabase
        .from('meta_campaign_daily_stats')
        .select(`date, ${metric}`) // Assuming the metric column name is the same
        .eq('brand_id', brandId)   // meta_campaign_daily_stats uses brand_id
        .gte('date', fromDate)
        .lte('date', toDate)
        .returns<InsightItem[]>()

      if (dailyStatsError) {
        console.log(`Error retrieving from meta_campaign_daily_stats: ${JSON.stringify(dailyStatsError)}`)
        // Don't return error, just proceed with potentially zero value from meta_ad_insights
      } else if (dailyStats && dailyStats.length > 0) {
        let filteredDailyStats = dailyStats;
        if (isYesterdayPreset) {
          filteredDailyStats = dailyStats.filter((item: InsightItem) => {
            const dateStr = new Date(item.date).toISOString().split('T')[0]
            return dateStr === fromDate
          });
        }
        
        if (filteredDailyStats.length > 0) {
          totalValue = filteredDailyStats.reduce((sum, item: InsightItem) => {
            const valueString = item[metric] as string | number;
            const value = typeof valueString === 'string' ? parseFloat(valueString) : valueString;
            return sum + (isNaN(value) ? 0 : value)
          }, 0);
          dataSource = 'meta_campaign_daily_stats';
          console.log(`SINGLE METRIC API: Fetched ${totalValue} for ${metric} from meta_campaign_daily_stats for ${fromDate} to ${toDate}. Records: ${filteredDailyStats.length}`);
        } else {
          console.log(`SINGLE METRIC API: No records found in meta_campaign_daily_stats for ${metric} for ${fromDate} to ${toDate} after filtering.`);
        }
      } else {
        console.log(`SINGLE METRIC API: No records found in meta_campaign_daily_stats for ${metric} for ${fromDate} to ${toDate}.`);
      }
    }
    
    // If still no data after checking both sources (or if initial data was non-zero), return the calculated value
    if (totalValue === 0 && dataSource === 'meta_ad_insights' && (!filteredInsights || filteredInsights.length === 0)) {
      console.log(`No data found for period ${fromDate} to ${toDate} for metric ${metric} from meta_ad_insights and meta_campaign_daily_stats also yielded zero or no data (or was not queried if initial value was non-zero).`)
      return NextResponse.json({ 
        value: 0, 
        growth: 0,
        _meta: {
          from: fromDate,
          to: toDate,
          records: 0
        }
      })
    }
    
    // Return the results without growth data
    const result = {
      value: parseFloat(totalValue.toFixed(2)),
      _meta: {
        from: fromDate,
        to: toDate,
        records: dataSource === 'meta_ad_insights' ? (filteredInsights || []).length : totalValue > 0 ? 1 : 0, // Approximation for records from daily_stats
        dates: dataSource === 'meta_ad_insights' ? (filteredInsights || []).map((item: InsightItem) => new Date(item.date).toISOString().split('T')[0]) : [fromDate],
        source: dataSource
      }
    }
    
    console.log(`SINGLE METRIC API: Returning ${requestedMetric} = ${result.value} (from ${dataSource})`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in single metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 