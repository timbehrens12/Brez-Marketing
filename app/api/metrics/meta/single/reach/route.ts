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
      // Select account_id and access_token needed for API call
      .select('id, account_id, access_token') 
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
    
    // --- Fetch Total Reach Directly from Meta API ---
    let apiTotalReach = 0;
    try {
      // Ensure we have the ad account ID (remove 'act_' prefix if present for the API call)
      const adAccountId = connection.account_id?.replace('act_', '');
      if (adAccountId && connection.access_token) {
        const reachUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=reach&time_range={'since':'${from}','until':'${to}'}&level=account&access_token=${connection.access_token}`;
        console.log(`[Reach API] Fetching total reach from Meta URL: ${reachUrl.substring(0, 150)}...`);
        
        const reachResponse = await fetch(reachUrl);
        if (reachResponse.ok) {
          const reachData = await reachResponse.json();
          if (reachData.data && reachData.data.length > 0 && reachData.data[0].reach) {
            apiTotalReach = parseInt(reachData.data[0].reach, 10);
            console.log(`[Reach API] Fetched total reach from Meta API: ${apiTotalReach}`);
          } else {
            console.log('[Reach API] No reach data found in Meta API response.', reachData);
          }
        } else {
          console.error(`[Reach API] Failed to fetch total reach from Meta: ${reachResponse.status} ${reachResponse.statusText}`, await reachResponse.text());
        }
      } else {
        console.warn('[Reach API] Cannot fetch total reach: Missing ad_account_id or access_token in connection.');
      }
    } catch (reachError) {
      console.error('[Reach API] Error fetching total reach from Meta:', reachError);
    }
    // --- End Fetch Total Reach ---
    
    // Return the result fetched directly from the API
    // We no longer need to query or sum from the database for this specific widget
    const result = {
      value: apiTotalReach, // Use the value directly from the API
      _meta: {
        from,
        to,
        source: 'meta_api' // Indicate the source
      }
    }
    
    console.log(`REACH API: Returning reach = ${result.value} (source: ${result._meta.source})`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in Reach metric endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 