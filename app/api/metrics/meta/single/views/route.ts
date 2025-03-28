import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Specialized API endpoint for fetching Views data directly
 * This endpoint is optimized for speed and simplicity, fetching only
 * what's needed for the Views widget
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    
    // Log the request
    console.log(`VIEWS API: Fetching for brand ${brandId} from ${from} to ${to}`)
    
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
    
    // Query meta_ad_insights for views data and include actions array for fallback
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('date, views, actions')
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
    
    // Calculate total views with fallback to actions array
    let totalViews = 0;
    let recordsWithViews = 0;
    let videoActionsFound = 0;
    
    insights.forEach(insight => {
      let recordViews = 0;
      
      // First check views column
      if (insight.views && !isNaN(insight.views) && insight.views > 0) {
        recordViews += parseInt(insight.views);
        recordsWithViews++;
      } 
      // If no views found, try to extract from actions array as fallback
      else if (Array.isArray(insight.actions) && insight.actions.length > 0) {
        insight.actions.forEach((action: any) => {
          if (action && action.action_type && 
              (action.action_type.includes('video') || 
               action.action_type.includes('view')) && 
              action.value && !isNaN(action.value)) {
            const actionViews = parseInt(action.value);
            recordViews += actionViews;
            videoActionsFound++;
            console.log(`Found ${actionViews} views in action type "${action.action_type}" for date ${insight.date}`);
          }
        });
      }
      
      totalViews += recordViews;
    });
    
    // If no views data is found in views column, but found in actions, log it
    if (recordsWithViews === 0 && videoActionsFound > 0) {
      console.log(`VIEWS API NOTICE: No data found in 'views' column, but found ${videoActionsFound} video-related actions in the actions array. This indicates that the data exists but hasn't been properly stored in the views column. Consider resyncing Meta data.`);
    }
    
    // If no views data is found anywhere, add debugging log
    if (recordsWithViews === 0 && videoActionsFound === 0) {
      console.log(`VIEWS API WARNING: No views data found in any of the ${insights.length} records. This may indicate that:
      1. The Meta API is not returning video views data
      2. The meta_ad_insights table hasn't been updated with the latest data that includes views
      3. There are no video ads in your Meta campaigns
      4. You may need to resync Meta data`);
    }
    
    // Return the result
    const result = {
      value: totalViews,
      _meta: {
        from,
        to,
        records: insights.length,
        recordsWithViews,
        videoActionsFound,
        dates: [...new Set(insights.map(item => new Date(item.date).toISOString().split('T')[0]))]
      }
    }
    
    console.log(`VIEWS API: Returning views = ${result.value}, based on ${insights.length} records (views data found in ${recordsWithViews} records, video actions found in ${videoActionsFound} records)`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Views metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 