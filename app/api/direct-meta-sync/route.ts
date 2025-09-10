import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8'
    
    console.log(`[Direct Meta Sync] Starting direct sync for brand ${brandId}`)

    // Get the current Meta connection
    const supabase = createClient()
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('id, access_token')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .maybeSingle()

    if (connError) {
      return NextResponse.json({ error: 'Database error', details: connError.message }, { status: 500 })
    }

    if (!connection) {
      return NextResponse.json({ error: 'No active Meta connection found' }, { status: 404 })
    }

    console.log(`[Direct Meta Sync] Using connection ${connection.id}`)

    // Get account info
    const accountResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name`)
    const accountData = await accountResponse.json()
    const accountId = accountData.data?.[0]?.id

    if (!accountId) {
      return NextResponse.json({ error: 'No ad account found' }, { status: 404 })
    }

    console.log(`[Direct Meta Sync] Found account ${accountId}`)

    // Define the date ranges we know have data
    const dateRanges = [
      { start: '2025-03-21', end: '2025-04-22', label: 'March-April 2025' },
      { start: '2025-08-11', end: '2025-09-04', label: 'August-September 2025' }
    ]

    const results = []

    // Sync each date range directly
    for (const range of dateRanges) {
      try {
        console.log(`[Direct Meta Sync] Syncing ${range.label}: ${range.start} to ${range.end}`)
        
        // Fetch insights for this date range - only get fields we confirmed exist
        const insightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?access_token=${connection.access_token}&time_range={"since":"${range.start}","until":"${range.end}"}&fields=ad_id,adset_id,spend,impressions,clicks,reach,date_start&level=ad&limit=100`
        
        const insightsResponse = await fetch(insightsUrl)
        const insightsData = await insightsResponse.json()
        
        if (insightsData.error) {
          console.error(`[Direct Meta Sync] Error for ${range.label}:`, insightsData.error)
          results.push({ range: range.label, error: insightsData.error.message, success: false })
          continue
        }

        const insights = insightsData.data || []
        console.log(`[Direct Meta Sync] Got ${insights.length} insights for ${range.label}`)

        // Store insights in database
        let stored = 0
        console.log(`[Direct Meta Sync] Sample insight structure:`, insights[0])
        console.log(`[Direct Meta Sync] All insight keys:`, insights.map(i => Object.keys(i)))
        
        for (const insight of insights) {
          try {
            console.log(`[Direct Meta Sync] Processing insight:`, insight)
            
            // Log the insight data we're trying to store - match actual table structure
          const insightData = {
            brand_id: brandId,
            ad_id: insight.ad_id,
            adset_id: insight.adset_id, // Required field
            date: insight.date_start,
            spent: parseFloat(insight.spend) || 0,
            impressions: parseInt(insight.impressions) || 0,
            clicks: parseInt(insight.clicks) || 0,
            conversions: 0, // Default for now
            ctr: 0, // Calculate if needed: clicks/impressions
            cpc: 0, // Calculate if needed: spend/clicks  
            cost_per_conversion: 0, // Default for now
            reach: parseInt(insight.reach) || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            results: 0,
            cost_per_result: 0,
            page_view_count: 0,
            add_to_cart_count: 0,
            initiate_checkout_count: 0,
            add_payment_info_count: 0,
            view_content_count: 0,
            purchase_count: 0,
            lead_count: 0,
            complete_registration_count: 0,
            funnel_conversion_rate: 0,
            search_count: 0,
            add_to_wishlist_count: 0
            }
            
            console.log(`[Direct Meta Sync] Storing insight:`, insightData)
            console.log(`[Direct Meta Sync] Missing fields check:`, {
              ad_id: insight.ad_id || 'MISSING',
              adset_id: insight.adset_id || 'MISSING', 
              date_start: insight.date_start || 'MISSING',
              spend: insight.spend || 'MISSING'
            })
            
            const { error: insertError } = await supabase
              .from('meta_ad_daily_insights')
              .upsert(insightData, {
                onConflict: 'brand_id,ad_id,date'
              })

            if (insertError) {
              console.error(`[Direct Meta Sync] Insert error:`, insertError)
            } else {
              stored++
              console.log(`[Direct Meta Sync] Successfully stored insight ${stored}`)
            }
          } catch (error) {
            console.error(`[Direct Meta Sync] Failed to store insight:`, error)
          }
        }

        results.push({
          range: range.label,
          dateRange: `${range.start} to ${range.end}`,
          totalRecords: insights.length,
          storedRecords: stored,
          success: true
        })

      } catch (error) {
        console.error(`[Direct Meta Sync] Error processing ${range.label}:`, error)
        results.push({
          range: range.label,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }
    }

    console.log(`[Direct Meta Sync] Completed all ranges`)

    return NextResponse.json({
      success: true,
      brandId,
      accountId,
      connectionId: connection.id,
      results,
      message: `Direct sync completed for ${results.length} date ranges`
    })

  } catch (error) {
    console.error('[Direct Meta Sync] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to sync Meta data directly',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
