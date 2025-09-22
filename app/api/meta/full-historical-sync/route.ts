import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PRODUCTION FULL HISTORICAL SYNC: This should be the default after Meta auth
 * Performs a complete 12-month sync using the proven nuclear method
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`🚀 [Full Historical Sync] Starting complete 12-month Meta sync for brand ${brandId}`)
    console.log(`🚀 [Full Historical Sync] This is what should happen after Meta authentication`)

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

    // 3. Clear existing data for a fresh start (optional but recommended)
    console.log(`🚀 [Full Historical Sync] Clearing existing Meta data for fresh sync...`)
    
    const tablesToClear = [
      'meta_ad_insights',
      'meta_adset_daily_insights', 
      'meta_adsets',
      'meta_campaigns',
      'meta_ads'
    ]

    for (const table of tablesToClear) {
      try {
        await supabase
          .from(table)
          .delete()
          .eq('brand_id', brandId)
        console.log(`🚀 [Full Historical Sync] Cleared ${table}`)
      } catch (clearError) {
        console.log(`⚠️ [Full Historical Sync] Could not clear ${table}:`, clearError)
      }
    }

    // 4. Get or fetch ad account ID
    let adAccountId = connection.metadata?.ad_account_id
    
    if (!adAccountId) {
      console.log(`🚀 [Full Historical Sync] Fetching ad account ID from Meta API...`)
      
      const accountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}`
      const accountsResponse = await fetch(accountsUrl)
      const accountsData = await accountsResponse.json()
      
      if (accountsData.error || !accountsData.data?.length) {
        return NextResponse.json({ 
          error: 'Failed to get ad account from Meta API',
          details: accountsData.error?.message || 'No ad accounts found'
        }, { status: 400 })
      }
      
      adAccountId = accountsData.data[0].id
      
      // Update connection metadata
      await supabase
        .from('platform_connections')
        .update({
          metadata: { ad_account_id: adAccountId },
          updated_at: new Date().toISOString()
        })
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')
        
      console.log(`🚀 [Full Historical Sync] Updated connection with ad account ID: ${adAccountId}`)
    }

    // 5. Fetch campaigns
    const campaignsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?fields=id,name,objective,status,created_time,updated_time&access_token=${connection.access_token}`
    const campaignsResponse = await fetch(campaignsUrl)
    const campaignsData = await campaignsResponse.json()

    if (campaignsData.error) {
      return NextResponse.json({ 
        error: 'Meta API error fetching campaigns',
        details: campaignsData.error.message 
      }, { status: 400 })
    }

    console.log(`🚀 [Full Historical Sync] Found ${campaignsData.data?.length || 0} campaigns`)

    // 6. FULL 12-MONTH DATA SYNC (March 21, 2025 - Today)
    const today = new Date()
    const accountStartDate = new Date('2025-03-21')
    const startDateStr = accountStartDate.toISOString().split('T')[0]
    const endDateStr = today.toISOString().split('T')[0]
    const totalDays = Math.ceil((today.getTime() - accountStartDate.getTime()) / (1000 * 60 * 60 * 24))
    
    console.log(`🚀 [Full Historical Sync] Syncing FULL PERIOD: ${startDateStr} to ${endDateStr} (${totalDays} days)`)

    let totalRecordsStored = 0
    let errors = []

    // Process each campaign with chunked date ranges for reliability
    for (const campaign of campaignsData.data || []) {
      try {
        console.log(`🚀 [Full Historical Sync] Processing campaign: ${campaign.name}`)

        // Break the 12-month period into 30-day chunks to prevent timeouts
        const chunkSize = 30 // days
        let currentDate = new Date(accountStartDate)
        
        while (currentDate < today) {
          const chunkEndDate = new Date(currentDate)
          chunkEndDate.setDate(chunkEndDate.getDate() + chunkSize - 1)
          
          if (chunkEndDate > today) {
            chunkEndDate.setTime(today.getTime())
          }
          
          const chunkStartStr = currentDate.toISOString().split('T')[0]
          const chunkEndStr = chunkEndDate.toISOString().split('T')[0]
          
          console.log(`🚀 [Full Historical Sync] Chunk: ${chunkStartStr} to ${chunkEndStr}`)

          // Fetch insights for this chunk
          const insightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights?fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,reach,ctr,cpc,conversions,cost_per_conversion&level=ad&time_range={"since":"${chunkStartStr}","until":"${chunkEndStr}"}&time_increment=1&access_token=${connection.access_token}`
          
          const insightsResponse = await fetch(insightsUrl)
          const insightsData = await insightsResponse.json()

          if (insightsData.error) {
            console.error(`🚀 [Full Historical Sync] Campaign ${campaign.name} chunk error:`, insightsData.error)
            errors.push(`Campaign ${campaign.name} (${chunkStartStr}-${chunkEndStr}): ${insightsData.error.message}`)
            
            // Continue with next chunk even if this one fails
            currentDate.setDate(currentDate.getDate() + chunkSize)
            continue
          }

          // Store each insight record
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
                totalRecordsStored++
                if (totalRecordsStored % 50 === 0) {
                  console.log(`🚀 [Full Historical Sync] Stored ${totalRecordsStored} records...`)
                }
              }

              // Small delay to prevent rate limiting
              await new Promise(resolve => setTimeout(resolve, 50))

            } catch (recordError) {
              errors.push(`Record processing error: ${recordError}`)
            }
          }

          // Move to next chunk
          currentDate.setDate(currentDate.getDate() + chunkSize)
          
          // Delay between chunks to be nice to Meta API
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (campaignError) {
        console.error(`🚀 [Full Historical Sync] Error processing campaign ${campaign.id}:`, campaignError)
        errors.push(`Campaign ${campaign.name}: ${campaignError}`)
      }
    }

    // 7. Run aggregation to populate adset tables
    console.log(`🚀 [Full Historical Sync] Running data aggregation...`)
    
    try {
      await supabase.rpc('aggregate_meta_data', { target_brand_id: brandId })
      console.log(`🚀 [Full Historical Sync] Data aggregation completed`)
    } catch (aggError) {
      console.error(`🚀 [Full Historical Sync] Aggregation error:`, aggError)
      errors.push(`Aggregation failed: ${aggError}`)
    }

    // 8. Verify final data
    const { data: verificationData } = await supabase
      .from('meta_ad_insights')
      .select('id')
      .eq('brand_id', brandId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)

    const actualRecordsStored = verificationData?.length || 0

    // 9. Update sync status
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
      message: `Full 12-month historical sync completed`,
      stats: {
        recordsAttempted: totalRecordsStored,
        recordsVerified: actualRecordsStored,
        verificationRate: totalRecordsStored > 0 ? Math.round((actualRecordsStored / totalRecordsStored) * 100) : 0,
        dateRange: { from: startDateStr, to: endDateStr },
        totalDays: totalDays,
        campaigns: campaignsData.data?.length || 0
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit error display
      recommendation: actualRecordsStored === 0 
        ? '🚨 Zero records stored - check Meta API permissions'
        : actualRecordsStored < totalRecordsStored 
        ? '⚠️ Some records failed to store - check logs'
        : '✅ Complete historical sync successful!'
    })

  } catch (error) {
    console.error('🚀 [Full Historical Sync] Critical error:', error)
    
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
      console.error('🚀 [Full Historical Sync] Failed to update sync status:', updateError)
    }

    return NextResponse.json({
      error: 'Full historical sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}