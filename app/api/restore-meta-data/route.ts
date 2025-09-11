import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8'
    
    // Get the Meta connection
    const supabase = createClient()
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('id, access_token, metadata')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .maybeSingle()

    if (connError || !connection) {
      return NextResponse.json({ 
        error: 'No active Meta connection found',
        details: connError?.message 
      }, { status: 404 })
    }

    const accessToken = connection.access_token
    const accountId = connection.metadata?.ad_account_id

    if (!accessToken || !accountId) {
      return NextResponse.json({ 
        error: 'Missing access token or account ID',
        connection: connection.id 
      }, { status: 400 })
    }

    console.log(`[Restore Meta Data] Using connection ${connection.id} for account ${accountId}`)

    // Restore historical data for key date ranges
    const dateRanges = [
      { name: 'March 2025', since: '2025-03-21', until: '2025-03-22' },
      { name: 'April 2025', since: '2025-04-22', until: '2025-04-22' },
      { name: 'August 2025', since: '2025-08-11', until: '2025-08-11' }
    ]

    const results = []

    for (const range of dateRanges) {
      try {
        const metaUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?access_token=${accessToken}&time_range={"since":"${range.since}","until":"${range.until}"}&fields=ad_id,adset_id,spend,impressions,clicks,reach,date_start&level=ad&limit=1000`
        
        console.log(`[Restore] Fetching ${range.name}: ${range.since} to ${range.until}`)
        
        const metaResponse = await fetch(metaUrl)
        const metaData = await metaResponse.json()
        
        if (metaData.error) {
          results.push({
            range: range.name,
            error: metaData.error.message,
            success: false
          })
          continue
        }

        const insights = metaData.data || []
        console.log(`[Restore] Found ${insights.length} insights for ${range.name}`)

        let storedCount = 0
        
        for (const insight of insights) {
          const insertData = {
            brand_id: brandId,
            ad_id: insight.ad_id,
            adset_id: insight.adset_id,
            date: insight.date_start,
            spent: parseFloat(insight.spend || '0'),
            impressions: parseInt(insight.impressions || '0'),
            clicks: parseInt(insight.clicks || '0'),
            reach: parseInt(insight.reach || '0'),
            conversions: 0,
            ctr: 0,
            cpc: 0,
            cost_per_conversion: 0,
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

          const { error: insertError } = await supabase
            .from('meta_ad_daily_insights')
            .upsert(insertData, {
              onConflict: 'ad_id,date',
              ignoreDuplicates: false
            })

          if (!insertError) {
            storedCount++
          }
        }

        results.push({
          range: range.name,
          dateRange: `${range.since} to ${range.until}`,
          totalRecords: insights.length,
          storedRecords: storedCount,
          success: true
        })

      } catch (error) {
        results.push({
          range: range.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }
    }

    return NextResponse.json({
      success: true,
      brandId,
      accountId,
      connectionId: connection.id,
      results,
      message: `Restored Meta data for ${results.length} date ranges`
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
