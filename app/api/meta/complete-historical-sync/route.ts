import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8'
    
    console.log(`[Complete Historical Sync] Starting comprehensive 12-month sync for brand ${brandId}`)

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

    console.log(`[Complete Historical Sync] Using connection ${connection.id} for account ${accountId}`)

    // Clear existing data first to avoid duplicates
    console.log(`[Complete Historical Sync] Clearing existing Meta data...`)
    const { error: clearError } = await supabase
      .from('meta_ad_daily_insights')
      .delete()
      .eq('brand_id', brandId)

    if (clearError) {
      console.error(`[Complete Historical Sync] Error clearing data:`, clearError)
    } else {
      console.log(`[Complete Historical Sync] Existing data cleared successfully`)
    }

    // Generate comprehensive date ranges for the last 12 months
    const today = new Date()
    const dateRanges = []
    
    // Go back 12 months, month by month for comprehensive coverage
    for (let monthsBack = 12; monthsBack >= 0; monthsBack--) {
      const startDate = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1)
      const endDate = new Date(today.getFullYear(), today.getMonth() - monthsBack + 1, 0)
      
      // Only include dates up to today
      if (endDate <= today) {
        dateRanges.push({
          name: `${startDate.toLocaleString('default', { month: 'long' })} ${startDate.getFullYear()}`,
          since: startDate.toISOString().split('T')[0],
          until: endDate.toISOString().split('T')[0]
        })
      }
    }

    console.log(`[Complete Historical Sync] Will sync ${dateRanges.length} month ranges:`, 
      dateRanges.map(r => `${r.name} (${r.since} to ${r.until})`))

    const results = []
    let totalRecordsSynced = 0

    for (const range of dateRanges) {
      try {
        console.log(`[Complete Historical Sync] Syncing ${range.name}: ${range.since} to ${range.until}`)
        
        // Fetch ALL campaigns, ad sets, and ads for this date range
        const metaUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?access_token=${accessToken}&time_range={"since":"${range.since}","until":"${range.until}"}&fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,date_start,actions,action_values&level=ad&limit=1000&breakdowns=[]`
        
        console.log(`[Complete Historical Sync] Fetching: ${metaUrl.substring(0, 100)}...`)
        
        const metaResponse = await fetch(metaUrl)
        const metaData = await metaResponse.json()
        
        if (metaData.error) {
          console.error(`[Complete Historical Sync] Meta API error for ${range.name}:`, metaData.error)
          results.push({
            range: range.name,
            error: metaData.error.message,
            success: false
          })
          continue
        }

        const insights = metaData.data || []
        console.log(`[Complete Historical Sync] Found ${insights.length} insights for ${range.name}`)

        let storedCount = 0
        
        for (const insight of insights) {
          // Process actions for conversions
          let conversions = 0
          if (insight.actions && Array.isArray(insight.actions)) {
            insight.actions.forEach((action: any) => {
              if (action.action_type === 'purchase' || 
                  action.action_type === 'offsite_conversion.fb_pixel_purchase' ||
                  action.action_type === 'omni_purchase') {
                conversions += parseFloat(action.value || '0')
              }
            })
          }

          // Calculate CTR and CPC
          const impressions = parseInt(insight.impressions || '0')
          const clicks = parseInt(insight.clicks || '0')
          const spend = parseFloat(insight.spend || '0')
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
          const cpc = clicks > 0 ? spend / clicks : 0

          const insertData = {
            brand_id: brandId,
            campaign_id: insight.campaign_id,
            campaign_name: insight.campaign_name,
            adset_id: insight.adset_id,
            adset_name: insight.adset_name,
            ad_id: insight.ad_id,
            ad_name: insight.ad_name,
            date: insight.date_start,
            spent: spend,
            impressions: impressions,
            clicks: clicks,
            reach: parseInt(insight.reach || '0'),
            conversions: conversions,
            ctr: ctr,
            cpc: cpc,
            cost_per_conversion: conversions > 0 ? spend / conversions : 0,
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
            add_to_wishlist_count: 0,
            actions: insight.actions || [],
            action_values: insight.action_values || []
          }

          const { error: insertError } = await supabase
            .from('meta_ad_daily_insights')
            .insert(insertData)

          if (!insertError) {
            storedCount++
            totalRecordsSynced++
          } else {
            console.error(`[Complete Historical Sync] Insert error:`, insertError)
          }
        }

        results.push({
          range: range.name,
          dateRange: `${range.since} to ${range.until}`,
          totalRecords: insights.length,
          storedRecords: storedCount,
          success: true
        })

        console.log(`[Complete Historical Sync] ${range.name}: Stored ${storedCount}/${insights.length} records`)

        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`[Complete Historical Sync] Error syncing ${range.name}:`, error)
        results.push({
          range: range.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }
    }

    // Verify total data synced
    const { data: finalData, error: finalError } = await supabase
      .from('meta_ad_daily_insights')
      .select('COUNT(*), SUM(spent)')
      .eq('brand_id', brandId)
      .single()

    console.log(`[Complete Historical Sync] COMPLETED! Total records synced: ${totalRecordsSynced}`)
    console.log(`[Complete Historical Sync] Final database totals:`, finalData)

    return NextResponse.json({
      success: true,
      brandId,
      accountId,
      connectionId: connection.id,
      totalRecordsSynced,
      finalDatabaseTotals: finalData,
      results,
      message: `Complete historical sync finished! Synced ${totalRecordsSynced} records across ${results.length} month periods`
    })
  } catch (error) {
    console.error(`[Complete Historical Sync] Fatal error:`, error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
