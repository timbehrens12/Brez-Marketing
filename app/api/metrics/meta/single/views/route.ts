import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Views data directly
 * This endpoint is optimized for fetching video view metrics from Meta campaigns
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    
    // Log the request
    console.log(`META VIEWS API: Fetching view data for brand ${brandId} from ${from} to ${to}`)
    
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
    
    // Check if views column exists in the table
    const { data: columnsCheck, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'meta_ad_insights')
      .eq('column_name', 'views')
    
    if (columnsError) {
      console.error(`Error checking for views column: ${JSON.stringify(columnsError)}`)
    } else if (!columnsCheck || columnsCheck.length === 0) {
      console.warn(`The views column does not exist in meta_ad_insights table. Please run the migration script.`)
      return NextResponse.json({ 
        value: 0,
        error: 'Views column not found in database',
        _meta: {
          missingColumn: true,
          action: 'Run the SQL migration script first'
        }
      })
    }
    
    // Query meta_ad_insights for views data
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, views, campaign_id, campaign_name')
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
          records: 0,
          message: 'No data found for the specified period'
        }
      })
    }
    
    // Calculate total views
    let totalViews = 0
    let recordsWithViews = 0
    let campaignsWithViews = new Set()
    
    insights.forEach(insight => {
      if (insight.views && !isNaN(insight.views) && insight.views > 0) {
        totalViews += parseInt(insight.views.toString())
        recordsWithViews++
        
        if (insight.campaign_id) {
          campaignsWithViews.add(insight.campaign_id)
        }
      }
    })
    
    // If no data is found, add debugging log
    if (recordsWithViews === 0) {
      console.log(`META VIEWS API WARNING: No valid views data found in any of the ${insights.length} records.`)
      console.log(`This may indicate that:
      1. Your Meta campaigns don't include video ads
      2. The meta_ad_insights table hasn't been updated with the latest data
      3. You need to resync Meta data to pull fresh video view metrics`)
    } else {
      console.log(`META VIEWS API: Found ${recordsWithViews} records with views data totaling ${totalViews} views`)
      console.log(`META VIEWS API: Views data found across ${campaignsWithViews.size} different campaigns`)
    }
    
    // Return the result
    const result = {
      value: totalViews,
      _meta: {
        from,
        to,
        records: insights.length,
        recordsWithViews,
        campaignsWithViews: Array.from(campaignsWithViews),
        campaignCount: campaignsWithViews.size,
        totalViews,
        dates: [...new Set(insights.map(item => item.date))]
      }
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Meta Views endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 