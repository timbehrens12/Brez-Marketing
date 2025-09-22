import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * CHUNKED NUCLEAR SYNC: Gets data month by month to ensure complete coverage
 * This addresses the issue where Meta API truncates large date ranges
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  
  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required as query parameter' }, { status: 400 })
  }

  return await nuclearSyncChunked(brandId)
}

export async function POST(request: NextRequest) {
  const { brandId } = await request.json()
  
  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required in request body' }, { status: 400 })
  }

  return await nuclearSyncChunked(brandId)
}

async function nuclearSyncChunked(brandId: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`🔥 [Chunked Nuclear Sync] Starting MONTH-BY-MONTH sync for brand ${brandId}`)
    console.log(`🔥 [Chunked Nuclear Sync] This will get EVERY month from March to September!`)

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
        error: 'Meta connection not found or invalid',
        details: connectionError?.message 
      }, { status: 400 })
    }

    // 2. Mark sync as in progress
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    // 3. Get ad account ID
    let adAccountId = connection.metadata?.ad_account_id
    
    if (!adAccountId) {
      console.log(`🔥 [Chunked Nuclear Sync] Fetching ad account ID...`)
      
      const accountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}`
      const accountsResponse = await fetch(accountsUrl)
      const accountsData = await accountsResponse.json()
      
      if (accountsData.error || !accountsData.data?.length) {
        return NextResponse.json({ 
          error: 'Failed to get ad account',
          details: accountsData.error?.message || 'No ad accounts found'
        }, { status: 400 })
      }
      
      adAccountId = accountsData.data[0].id
      
      await supabase
        .from('platform_connections')
        .update({
          metadata: { ad_account_id: adAccountId },
          updated_at: new Date().toISOString()
        })
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')
        
      console.log(`🔥 [Chunked Nuclear Sync] Updated connection with ad account ID: ${adAccountId}`)
    }

    // 4. Get campaigns
    const campaignsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?fields=id,name,objective,status,created_time,updated_time&access_token=${connection.access_token}`
    const campaignsResponse = await fetch(campaignsUrl)
    const campaignsData = await campaignsResponse.json()

    if (campaignsData.error) {
      return NextResponse.json({ 
        error: 'Meta API error fetching campaigns',
        details: campaignsData.error.message 
      }, { status: 400 })
    }

    console.log(`🔥 [Chunked Nuclear Sync] Found ${campaignsData.data?.length || 0} campaigns`)

    // 5. CHUNKED SYNC: Process each month separately from March to September
    const chunks = [
      { name: 'March 2025', start: '2025-03-01', end: '2025-03-31' },
      { name: 'April 2025', start: '2025-04-01', end: '2025-04-30' },
      { name: 'May 2025', start: '2025-05-01', end: '2025-05-31' },
      { name: 'June 2025', start: '2025-06-01', end: '2025-06-30' },
      { name: 'July 2025', start: '2025-07-01', end: '2025-07-31' },
      { name: 'August 2025', start: '2025-08-01', end: '2025-08-31' },
      { name: 'September 2025', start: '2025-09-01', end: '2025-09-22' } // Up to today
    ]

    let totalRecordsStored = 0
    let errors = []
    let monthlyResults = []

    for (const chunk of chunks) {
      console.log(`🔥 [Chunked Nuclear Sync] Processing ${chunk.name} (${chunk.start} to ${chunk.end})`)
      
      let chunkRecords = 0
      
      for (const campaign of campaignsData.data || []) {
        try {
          console.log(`🔥 [Chunked Nuclear Sync] ${chunk.name} - Campaign ${campaign.name}`)

          // Get insights for this campaign for this specific month
          const insightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights?fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,reach,ctr,cpc,conversions,cost_per_conversion&level=ad&time_range={"since":"${chunk.start}","until":"${chunk.end}"}&time_increment=1&access_token=${connection.access_token}`
          
          const insightsResponse = await fetch(insightsUrl)
          const insightsData = await insightsResponse.json()

          if (insightsData.error) {
            console.error(`🔥 [Chunked Nuclear Sync] ${chunk.name} - Campaign ${campaign.name} error:`, insightsData.error)
            errors.push(`${chunk.name} - Campaign ${campaign.name}: ${insightsData.error.message}`)
            continue
          }

          console.log(`🔥 [Chunked Nuclear Sync] ${chunk.name} - Campaign ${campaign.name}: ${insightsData.data?.length || 0} records`)

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
                errors.push(`${chunk.name} - Failed to store insight: ${insertError.message}`)
              } else {
                totalRecordsStored++
                chunkRecords++
              }

              // Small delay to prevent rate limiting
              await new Promise(resolve => setTimeout(resolve, 50))

            } catch (recordError) {
              errors.push(`${chunk.name} - Record processing error: ${recordError}`)
            }
          }

          // Delay between campaigns to be nice to Meta API
          await new Promise(resolve => setTimeout(resolve, 200))

        } catch (campaignError) {
          console.error(`🔥 [Chunked Nuclear Sync] ${chunk.name} - Campaign ${campaign.id} error:`, campaignError)
          errors.push(`${chunk.name} - Campaign ${campaign.name}: ${campaignError}`)
        }
      }

      monthlyResults.push({
        month: chunk.name,
        records: chunkRecords,
        dateRange: `${chunk.start} to ${chunk.end}`
      })

      console.log(`🔥 [Chunked Nuclear Sync] ${chunk.name} COMPLETE: ${chunkRecords} records stored`)
      
      // Longer delay between months to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // 6. Run aggregation
    console.log(`🔥 [Chunked Nuclear Sync] Running data aggregation...`)
    
    try {
      await supabase.rpc('aggregate_meta_data', { target_brand_id: brandId })
      console.log(`🔥 [Chunked Nuclear Sync] Data aggregation completed`)
    } catch (aggError) {
      console.error(`🔥 [Chunked Nuclear Sync] Aggregation error:`, aggError)
      errors.push(`Aggregation failed: ${aggError}`)
    }

    // 7. Verify final data
    const { data: verificationData } = await supabase
      .from('meta_ad_insights')
      .select('id')
      .eq('brand_id', brandId)
      .gte('date', '2025-03-01')
      .lte('date', '2025-09-22')

    const actualRecordsStored = verificationData?.length || 0

    // 8. Update sync status
    const finalStatus = actualRecordsStored > 0 ? 'completed' : 'failed'
    
    await supabase
      .from('platform_connections')
      .update({
        sync_status: finalStatus,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    return NextResponse.json({
      success: actualRecordsStored > 0,
      message: `Chunked nuclear sync completed - Got data month by month!`,
      stats: {
        recordsAttempted: totalRecordsStored,
        recordsVerified: actualRecordsStored,
        verificationRate: totalRecordsStored > 0 ? Math.round((actualRecordsStored / totalRecordsStored) * 100) : 0,
        dateRange: { from: '2025-03-01', to: '2025-09-22' },
        campaigns: campaignsData.data?.length || 0,
        monthsProcessed: chunks.length,
        monthlyBreakdown: monthlyResults
      },
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
      recommendation: actualRecordsStored === 0 
        ? '🚨 Zero records stored - check Meta API permissions'
        : `✅ Chunked sync successful! Retrieved ${actualRecordsStored} records across ${chunks.length} months`
    })

  } catch (error) {
    console.error('🔥 [Chunked Nuclear Sync] Critical error:', error)
    
    // Mark sync as failed
    try {
      const supabase = createClient()
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('platform_type', 'meta')
        .eq('sync_status', 'in_progress')
    } catch (updateError) {
      console.error('🔥 [Chunked Nuclear Sync] Failed to update sync status:', updateError)
    }

    return NextResponse.json({
      error: 'Chunked nuclear sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
