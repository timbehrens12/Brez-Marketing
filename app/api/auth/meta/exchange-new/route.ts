import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { code, state } = await request.json()
    
    if (!code || !state) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    console.log(`[Meta Exchange NEW] 🚨 FIXED AUTH: Starting for brand ${state}`)

    // Exchange code for token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.append('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.append('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.append('code', code)
    tokenUrl.searchParams.append('redirect_uri', 'https://www.brezmarketingdashboard.com/settings/meta-callback')

    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return NextResponse.json(
        { success: false, error: 'Failed to get access token' },
        { status: 400 }
      )
    }

    console.log(`[Meta Exchange NEW] ✅ Got access token`)

    // Get account ID
    let accountId = ''
    try {
      const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${tokenData.access_token}&fields=id,name,account_status`)
      const meData = await meResponse.json()
      if (meData.data?.[0]) {
        accountId = meData.data[0].id
        console.log(`[Meta Exchange NEW] ✅ Got account ID: ${accountId}`)
      }
    } catch (accountError) {
      console.warn(`[Meta Exchange NEW] Failed to get account ID:`, accountError)
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Load existing metadata so we don't overwrite other fields
    const { data: existingConnection } = await supabase
      .from('platform_connections')
      .select('id, metadata')
      .eq('brand_id', state)
      .eq('platform_type', 'meta')
      .single()

    const nowIso = new Date().toISOString()

    const existingMetadata = existingConnection?.metadata || {}

    const metadataWithFlag = {
      ...existingMetadata,
      ad_account_id: accountId || existingMetadata?.ad_account_id,
      full_sync_in_progress: true,
      last_full_sync_started_at: nowIso
    }

    // Store connection in database
    const { data: connectionData, error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        brand_id: state,
        platform_type: 'meta',
        access_token: tokenData.access_token,
        status: 'active',
        user_id: userId,
        sync_status: 'in_progress',
        metadata: metadataWithFlag,
        connected_at: nowIso,
        updated_at: nowIso,
        last_synced_at: nowIso
      })
      .select('id')
      .single()

    if (dbError || !connectionData) {
      console.error(`[Meta Exchange NEW] Database error:`, dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to store connection' },
        { status: 500 }
      )
    }

    console.log(`[Meta Exchange NEW] ✅ Stored connection with ID: ${connectionData.id}`)

    // 🧹 QUEUE CLEANUP: Remove any orphaned jobs from previous connection
    console.log(`[Meta Exchange NEW] 🧹 Cleaning up orphaned queue jobs...`)
    try {
      const { metaQueue } = await import('@/lib/services/metaQueueService')
      
      const waiting = await metaQueue.getWaiting()
      const active = await metaQueue.getActive()
      let cleanedCount = 0
      
      // Remove jobs for this brand that reference old connection IDs
      for (const job of [...waiting, ...active]) {
        if (job.data?.brandId === state && job.data?.connectionId !== connectionData.id) {
          await job.remove()
          console.log(`[Meta Exchange NEW] Removed orphaned job ${job.id} with old connection ${job.data.connectionId}`)
          cleanedCount++
        }
      }
      
      console.log(`[Meta Exchange NEW] ✅ Cleaned up ${cleanedCount} orphaned queue jobs`)
    } catch (cleanupError) {
      console.warn(`[Meta Exchange NEW] ⚠️ Queue cleanup failed:`, cleanupError)
    }

    // 🧨 NUCLEAR WIPE: Delete all existing Meta data (including hidden tables)
    console.log(`[Meta Exchange NEW] 🧨 NUCLEAR WIPE: Deleting all old Meta data...`)
    try {
      await Promise.all([
        supabase.from('meta_ad_insights').delete().eq('brand_id', state),
        supabase.from('meta_ad_daily_insights').delete().eq('brand_id', state),
        supabase.from('meta_adset_daily_insights').delete().eq('brand_id', state),
        supabase.from('meta_adsets').delete().eq('brand_id', state),
        supabase.from('meta_campaigns').delete().eq('brand_id', state),
        supabase.from('meta_ads').delete().eq('brand_id', state),
        supabase.from('meta_demographics').delete().eq('brand_id', state),
        supabase.from('meta_device_performance').delete().eq('brand_id', state),
        supabase.from('meta_campaign_daily_stats').delete().eq('brand_id', state)
      ])
      console.log(`[Meta Exchange NEW] ✅ All Meta data wiped (including hidden tables)`)
    } catch (nukeError) {
      console.warn(`[Meta Exchange NEW] ⚠️ Nuclear wipe failed:`, nukeError)
    }

    // 🎯 FIRE-AND-FORGET SYNC: Start 90-day sync in background, return immediately
    console.log(`[Meta Exchange NEW] 🚀 Starting background sync for 90 days of data...`)
    
    // Immediately mark as syncing (but clear the flag so spinner stops)
    await supabase
      .from('platform_connections')
      .update({ 
        sync_status: 'in_progress',
        last_synced_at: new Date().toISOString(),
        metadata: {
          ...metadataWithFlag,
          full_sync_in_progress: false, // Clear flag immediately so UI stops spinning
          background_sync_started_at: new Date().toISOString()
        }
      })
      .eq('id', connectionData.id)
    
    // Start background sync (fire-and-forget)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90) // 90 days = ~3 months
    
    // Don't await - let it run in background
    ;(async () => {
      try {
        console.log(`[Meta Exchange NEW] 📅 Background sync: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
        
        const { fetchMetaAdInsights, fetchMetaCampaignBudgets, fetchMetaAdSets } = await import('@/lib/services/meta-service')
        
        // 1. Fetch campaigns
        console.log(`[Meta Exchange NEW] 📋 Fetching campaigns...`)
        const campaignsResult = await fetchMetaCampaignBudgets(state, true)
        const campaignCount = campaignsResult.budgets?.length || 0
        console.log(`[Meta Exchange NEW] ✅ Campaigns: ${campaignCount}`)
        
        // 2. Fetch adsets for each campaign
        console.log(`[Meta Exchange NEW] 📊 Fetching adsets...`)
        let totalAdsets = 0
        if (campaignsResult.success && campaignsResult.budgets) {
          for (const campaign of campaignsResult.budgets) {
            try {
              const adsetsResult = await fetchMetaAdSets(state, campaign.campaign_id, true)
              if (adsetsResult.success) {
                totalAdsets += adsetsResult.adsets?.length || 0
              }
            } catch (adsetError) {
              console.warn(`[Meta Exchange NEW] Adset fetch failed for campaign ${campaign.campaign_id}:`, adsetError)
            }
          }
        }
        console.log(`[Meta Exchange NEW] ✅ Adsets: ${totalAdsets}`)
        
        // 3. Fetch insights + demographics
        console.log(`[Meta Exchange NEW] 📈 Fetching insights & demographics...`)
        const insightsResult = await fetchMetaAdInsights(state, startDate, endDate, false, false)
        console.log(`[Meta Exchange NEW] ✅ Insights: ${insightsResult.count || 0}`)
        
        // Mark as completed
        await supabase
          .from('platform_connections')
          .update({ 
            sync_status: 'completed',
            last_synced_at: new Date().toISOString(),
            metadata: {
              ...metadataWithFlag,
              full_sync_in_progress: false,
              last_full_sync_completed_at: new Date().toISOString(),
              last_full_sync_result: `success_90_days: ${campaignCount} campaigns, ${totalAdsets} adsets, ${insightsResult.count || 0} insights`
            }
          })
          .eq('id', connectionData.id)
        
        console.log(`[Meta Exchange NEW] 🎉 Background sync COMPLETE`)
      } catch (bgError) {
        console.error(`[Meta Exchange NEW] ❌ Background sync failed:`, bgError)
        // Mark as failed
        await supabase
          .from('platform_connections')
          .update({ 
            sync_status: 'error',
            metadata: {
              ...metadataWithFlag,
              full_sync_in_progress: false,
              last_sync_error: bgError instanceof Error ? bgError.message : String(bgError)
            }
          })
          .eq('id', connectionData.id)
      }
    })()
    
    // Return immediately so OAuth completes and user gets redirected
    console.log(`[Meta Exchange NEW] ✅ OAuth complete - background sync running`)
    return NextResponse.json({ success: true, message: 'Meta connected - syncing data in background' })

  } catch (error) {
    console.error('[Meta Exchange NEW] Exchange error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
