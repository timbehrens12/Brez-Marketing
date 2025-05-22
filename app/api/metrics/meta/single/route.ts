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
    const metric = url.searchParams.get('metric') || 'adSpend'
    const preset = url.searchParams.get('preset')
    
    // Check if this is a yesterday preset
    const isYesterdayPreset = preset === 'yesterday'
    
    // Log the request
    console.log(`SINGLE METRIC API: Fetching ${metric} for brand ${brandId} from ${from} to ${to}${isYesterdayPreset ? ' (yesterday preset)' : ''}`)
    
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
    
    // Determine the correct column to select and sum based on the metric parameter
    let metricColumn = 'spend'; // Default to spend
    if (metric === 'impressions') metricColumn = 'impressions';
    else if (metric === 'clicks') metricColumn = 'clicks';
    else if (metric === 'conversions') metricColumn = 'conversions'; // Assuming 'conversions' is a direct column
    else if (metric === 'reach') metricColumn = 'reach';
    else if (metric === 'link_clicks') metricColumn = 'link_clicks'; // Assuming 'inline_link_clicks' is stored as 'link_clicks' in DB
    // For ROAS, value is more complex, might need spend and action_values or purchase_conversion_value
    // For CTR, CPC, CostPerResult, these are calculated metrics, not direct sums from a single column here.
    // This endpoint is primarily for sum-able metrics.

    let selectString = `date, ${metricColumn}`;
    if (metric === 'roas') {
      // ROAS needs spend and a value column (e.g., purchase_conversion_value or sum of action_values)
      // Assuming a column like 'purchase_value' or similar might exist or action_values are used.
      // This needs to align with how ROAS is calculated elsewhere or what data is available.
      // For simplicity here, let's assume we might have a direct 'purchase_value' or need 'action_values'.
      // If using 'actions', it gets more complex to sum in SQL directly here for a generic endpoint.
      selectString = 'date, spend, actions, action_values'; // Fetch necessary fields for ROAS
    }
    
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select(selectString)
      .eq('connection_id', connection.id)
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
        const dateStr = new Date((item as any).date).toISOString().split('T')[0]
        return dateStr === fromDate
      })
      console.log(`SINGLE METRIC API: Filtered to ${filteredInsights.length} records for ${fromDate}`)
    }
    
    // If no data, return zeros
    if (!filteredInsights || filteredInsights.length === 0) {
      console.log(`No data found for period ${fromDate} to ${toDate}`)
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
    
    // Calculate the sum for the requested metric
    let totalValue = 0;
    if (metric === 'roas') {
      let totalSpendForRoas = 0;
      let totalPurchaseValue = 0;
      filteredInsights.forEach(item => {
        totalSpendForRoas += Number((item as any).spend || 0);
        // Simplified ROAS: sum up action_values array if present, specifically looking for purchase values.
        // This logic should mirror how ROAS is calculated elsewhere for consistency.
        if ((item as any).actions && Array.isArray((item as any).actions)) {
          (item as any).actions.forEach((action: any) => {
            if (action.action_type && (action.action_type.includes('purchase') || action.action_type.includes('offsite_conversion'))) {
              totalPurchaseValue += Number(action.value || 0);
            }
          });
        }
      });
      totalValue = totalSpendForRoas > 0 ? totalPurchaseValue / totalSpendForRoas : 0;
    } else {
      totalValue = filteredInsights.reduce((sum, item) => {
        const val = (item as any)[metricColumn];
        const numVal = typeof val === 'string' ? parseFloat(val) : Number(val);
        return sum + (isNaN(numVal) ? 0 : numVal);
      }, 0);
    }
        
    const resultValue = (metric === 'roas' || metric === 'ctr' || metric === 'cpc') 
                        ? parseFloat(totalValue.toFixed(2)) 
                        : Math.round(totalValue);

    const result = {
      value: resultValue,
      _meta: {
        from: fromDate,
        to: toDate,
        records: filteredInsights.length,
        dates: filteredInsights.map(item => new Date((item as any).date).toISOString().split('T')[0])
      }
    }
    
    console.log(`SINGLE METRIC API: Returning ${metric} = ${result.value}`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in single metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 