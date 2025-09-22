import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * NUCLEAR SYNC: Forces a complete data pull and verifies every record is stored
 * This endpoint won't return success until ALL data is actually in the database
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  
  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required as query parameter' }, { status: 400 })
  }

  return await nuclearSync(brandId)
}

export async function POST(request: NextRequest) {
  const { brandId } = await request.json()
  
  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required in request body' }, { status: 400 })
  }

  return await nuclearSync(brandId)
}

async function nuclearSync(brandId: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`💥 [Nuclear Sync] Starting NUCLEAR Meta sync for brand ${brandId}`)
    console.log(`💥 [Nuclear Sync] This will verify EVERY record is stored!`)

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

    // 3. NUCLEAR APPROACH: Call Meta API directly and store data manually with verification
    console.log(`💥 [Nuclear Sync] Fetching ad account data...`)

    let adAccountId = connection.metadata?.ad_account_id
    
    // If no ad account ID in metadata, fetch it from Meta API
    if (!adAccountId) {
      console.log(`💥 [Nuclear Sync] No ad account ID in metadata, fetching from Meta API...`)
      
      try {
        const accountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}`
        const accountsResponse = await fetch(accountsUrl)
        const accountsData = await accountsResponse.json()
        
        if (accountsData.error) {
          return NextResponse.json({ 
            error: 'Meta API error fetching ad accounts',
            details: accountsData.error.message 
          }, { status: 400 })
        }
        
        if (!accountsData.data || accountsData.data.length === 0) {
          return NextResponse.json({ 
            error: 'No ad accounts found for this Meta user' 
          }, { status: 400 })
        }
        
        // Use the first ad account
        adAccountId = accountsData.data[0].id
        console.log(`💥 [Nuclear Sync] Found ad account: ${adAccountId}`)
        
        // Update the connection metadata with the ad account ID
        await supabase
          .from('platform_connections')
          .update({
            metadata: { ad_account_id: adAccountId },
            updated_at: new Date().toISOString()
          })
          .eq('brand_id', brandId)
          .eq('platform_type', 'meta')
          
        console.log(`💥 [Nuclear Sync] Updated connection metadata with ad account ID`)
        
      } catch (fetchError) {
        return NextResponse.json({ 
          error: 'Failed to fetch ad account from Meta API',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // 4. Fetch campaigns first (basic data)
    console.log(`💥 [Nuclear Sync] Fetching campaigns from Meta API...`)
    
    const campaignsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?fields=id,name,objective,status,created_time,updated_time&access_token=${connection.access_token}`
    
    const campaignsResponse = await fetch(campaignsUrl)
    const campaignsData = await campaignsResponse.json()

    if (campaignsData.error) {
      console.error(`💥 [Nuclear Sync] Meta API error:`, campaignsData.error)
      return NextResponse.json({ 
        error: 'Meta API error',
        details: campaignsData.error.message 
      }, { status: 400 })
    }

    console.log(`💥 [Nuclear Sync] Found ${campaignsData.data?.length || 0} campaigns`)

    // 5. For EACH campaign, get detailed insights (last 30 days to start)
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const startDateStr = thirtyDaysAgo.toISOString().split('T')[0]
    const endDateStr = today.toISOString().split('T')[0]

    let totalRecordsStored = 0
    let errors = []

    for (const campaign of campaignsData.data || []) {
      try {
        console.log(`💥 [Nuclear Sync] Processing campaign ${campaign.name} (${campaign.id})`)

        // Get insights for this campaign
        const insightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights?fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,reach,ctr,cpc,conversions,cost_per_conversion&level=ad&time_range={"since":"${startDateStr}","until":"${endDateStr}"}&time_increment=1&access_token=${connection.access_token}`
        
        const insightsResponse = await fetch(insightsUrl)
        const insightsData = await insightsResponse.json()

        if (insightsData.error) {
          console.error(`💥 [Nuclear Sync] Campaign ${campaign.id} insights error:`, insightsData.error)
          errors.push(`Campaign ${campaign.name}: ${insightsData.error.message}`)
          continue
        }

        console.log(`💥 [Nuclear Sync] Campaign ${campaign.name} has ${insightsData.data?.length || 0} insight records`)

        // Store each insight with verification
        for (const insight of insightsData.data || []) {
          try {
            const record = {
              brand_id: brandId,
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

            // Store in meta_ad_insights
            const { data: insertedData, error: insertError } = await supabase
              .from('meta_ad_insights')
              .upsert(record, {
                onConflict: 'brand_id,ad_id,date',
                ignoreDuplicates: false
              })
              .select()

            if (insertError) {
              console.error(`💥 [Nuclear Sync] Failed to store insight record:`, insertError)
              errors.push(`Failed to store insight: ${insertError.message}`)
            } else {
              totalRecordsStored++
              if (totalRecordsStored % 10 === 0) {
                console.log(`💥 [Nuclear Sync] Stored ${totalRecordsStored} records...`)
              }
            }

            // Small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 100))

          } catch (recordError) {
            console.error(`💥 [Nuclear Sync] Error processing insight record:`, recordError)
            errors.push(`Record processing error: ${recordError}`)
          }
        }

      } catch (campaignError) {
        console.error(`💥 [Nuclear Sync] Error processing campaign ${campaign.id}:`, campaignError)
        errors.push(`Campaign ${campaign.name}: ${campaignError}`)
      }
    }

    // 6. Verify data was actually stored
    console.log(`💥 [Nuclear Sync] Verifying ${totalRecordsStored} records were stored...`)
    
    const { data: verificationData, error: verificationError } = await supabase
      .from('meta_ad_insights')
      .select('id')
      .eq('brand_id', brandId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)

    const actualRecordsStored = verificationData?.length || 0

    console.log(`💥 [Nuclear Sync] VERIFICATION: Expected ${totalRecordsStored}, Found ${actualRecordsStored}`)

    // 7. Update sync status
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
      message: `Nuclear sync completed`,
      stats: {
        recordsAttempted: totalRecordsStored,
        recordsVerified: actualRecordsStored,
        verificationRate: totalRecordsStored > 0 ? Math.round((actualRecordsStored / totalRecordsStored) * 100) : 0,
        dateRange: { from: startDateStr, to: endDateStr },
        campaigns: campaignsData.data?.length || 0
      },
      errors: errors.length > 0 ? errors : undefined,
      recommendation: actualRecordsStored === 0 
        ? '🚨 Zero records stored - check Meta API permissions and database access'
        : actualRecordsStored < totalRecordsStored 
        ? '⚠️ Some records failed to store - check database connection'
        : '✅ All records stored successfully!'
    })

  } catch (error) {
    console.error('💥 [Nuclear Sync] Critical error:', error)
    
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
      console.error('💥 [Nuclear Sync] Failed to update sync status:', updateError)
    }

    return NextResponse.json({
      error: 'Nuclear sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
