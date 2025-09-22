import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DIRECT MONTH SYNC: Bypasses queue system, syncs one month at a time
 * For when background queue gets stuck
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, month } = await request.json()
    
    if (!brandId || !month) {
      return NextResponse.json({ error: 'Brand ID and month required' }, { status: 400 })
    }

    console.log(`🎯 [Direct Sync] Starting ${month} sync for brand ${brandId}`)

    const supabase = createClient()

    // 1. Get Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()

    if (connectionError || !connection?.access_token) {
      return NextResponse.json({ 
        error: 'Meta connection not found or invalid'
      }, { status: 400 })
    }

    const adAccountId = connection.metadata?.ad_account_id
    if (!adAccountId) {
      return NextResponse.json({ 
        error: 'Ad account ID not found'
      }, { status: 400 })
    }

    // 2. Define month date ranges
    const months: Record<string, {start: string, end: string}> = {
      'June': { start: '2025-06-01', end: '2025-06-30' },
      'July': { start: '2025-07-01', end: '2025-07-31' },
      'August': { start: '2025-08-01', end: '2025-08-31' },
      'September': { start: '2025-09-01', end: '2025-09-22' }
    }

    const monthRange = months[month]
    if (!monthRange) {
      return NextResponse.json({ 
        error: `Invalid month: ${month}. Use: June, July, August, or September`
      }, { status: 400 })
    }

    // 3. Get campaigns
    const campaignsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?fields=id,name&access_token=${connection.access_token}`
    const campaignsResponse = await fetch(campaignsUrl)
    const campaignsData = await campaignsResponse.json()

    if (campaignsData.error) {
      return NextResponse.json({ 
        error: 'Meta API error',
        details: campaignsData.error.message 
      }, { status: 400 })
    }

    console.log(`🎯 [Direct Sync] Found ${campaignsData.data?.length || 0} campaigns for ${month}`)

    // 4. Sync data for this specific month
    let recordsStored = 0
    let errors = []

    for (const campaign of campaignsData.data || []) {
      try {
        console.log(`🎯 [Direct Sync] ${month} - Processing campaign ${campaign.name}`)

        const insightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights?fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,reach,ctr,cpc,conversions,cost_per_conversion&level=ad&time_range={"since":"${monthRange.start}","until":"${monthRange.end}"}&time_increment=1&access_token=${connection.access_token}`
        
        const insightsResponse = await fetch(insightsUrl)
        const insightsData = await insightsResponse.json()

        if (insightsData.error) {
          console.error(`🎯 [Direct Sync] ${month} - Campaign ${campaign.name} error:`, insightsData.error)
          errors.push(`Campaign ${campaign.name}: ${insightsData.error.message}`)
          continue
        }

        console.log(`🎯 [Direct Sync] ${month} - Campaign ${campaign.name}: ${insightsData.data?.length || 0} records`)

        // Store each insight
        for (const insight of insightsData.data || []) {
          try {
            const record = {
              brand_id: brandId,
              connection_id: connection.id,
              account_id: adAccountId,
              campaign_id: insight.campaign_id,
              campaign_name: insight.campaign_name,
              adset_id: insight.adset_id || 'unknown',
              adset_name: insight.adset_name || 'Unknown Ad Set',
              ad_id: insight.ad_id || 'unknown',
              ad_name: insight.ad_name || 'Unknown Ad',
              date: insight.date_start,
              impressions: parseInt(insight.impressions || 0),
              clicks: parseInt(insight.clicks || 0),
              spend: parseFloat(insight.spend || 0),
              reach: parseInt(insight.reach || 0),
              ctr: parseFloat(insight.ctr || 0),
              cpc: parseFloat(insight.cpc || 0),
              conversions: parseInt(insight.conversions || 0),
              cost_per_conversion: parseFloat(insight.cost_per_conversion || 0)
            }

            const { error: insertError } = await supabase
              .from('meta_ad_insights')
              .upsert(record, {
                onConflict: 'brand_id,ad_id,date',
                ignoreDuplicates: false
              })

            if (insertError) {
              errors.push(`Failed to store insight: ${insertError.message}`)
            } else {
              recordsStored++
            }

            // Small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 100))

          } catch (recordError) {
            errors.push(`Record processing error: ${recordError}`)
          }
        }

        // Delay between campaigns
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (campaignError) {
        console.error(`🎯 [Direct Sync] ${month} - Campaign ${campaign.id} error:`, campaignError)
        errors.push(`Campaign ${campaign.name}: ${campaignError}`)
      }
    }

    // 5. Run aggregation if we got data
    if (recordsStored > 0) {
      try {
        await supabase.rpc('aggregate_meta_data', { target_brand_id: brandId })
        console.log(`🎯 [Direct Sync] ${month} - Aggregation completed`)
      } catch (aggError) {
        console.error(`🎯 [Direct Sync] ${month} - Aggregation error:`, aggError)
        errors.push(`Aggregation failed: ${aggError}`)
      }
    }

    // 6. Verify data was stored
    const { data: verificationData } = await supabase
      .from('meta_ad_insights')
      .select('id')
      .eq('brand_id', brandId)
      .gte('date', monthRange.start)
      .lte('date', monthRange.end)

    const actualRecordsStored = verificationData?.length || 0

    return NextResponse.json({
      success: actualRecordsStored > 0,
      message: `Direct ${month} sync completed`,
      stats: {
        month: month,
        dateRange: monthRange,
        recordsAttempted: recordsStored,
        recordsVerified: actualRecordsStored,
        campaigns: campaignsData.data?.length || 0
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      recommendation: actualRecordsStored === 0 ? 
        `⚠️ No ${month} data found - may not have had ad activity this month` :
        `✅ ${month} sync successful! Got ${actualRecordsStored} records`
    })

  } catch (error) {
    console.error(`🎯 [Direct Sync] Error:`, error)
    
    return NextResponse.json({
      error: 'Direct sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
