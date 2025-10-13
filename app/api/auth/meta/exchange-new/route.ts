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

    // 🚀 QSTASH SYNC: Sync last 7 days immediately, queue 12-month backfill with QStash
    console.log(`[Meta Exchange NEW] 🚀 QSTASH SYNC: Starting immediate + queued sync`)
    
    const endDate = new Date()
    const recentStartDate = new Date()
    recentStartDate.setDate(recentStartDate.getDate() - 7)
    
    console.log(`[Meta Exchange NEW] 📅 Immediate sync: ${recentStartDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
    
    // Import services
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
    const { QStashService } = await import('@/lib/services/qstashService')
    
    // Sync last 7 days immediately (fast, under 10 seconds)
    try {
      const recentResult = await fetchMetaAdInsights(state, recentStartDate, endDate, false, false)
      console.log(`[Meta Exchange NEW] ✅ Immediate 7-day sync complete: ${recentResult.count || 0} records`)
    } catch (recentError) {
      console.error(`[Meta Exchange NEW] ❌ Immediate sync failed:`, recentError)
    }
    
    // Queue the full 12-month historical sync with QStash (serverless-friendly)
    console.log(`[Meta Exchange NEW] 📋 Queueing 12-month historical sync with QStash...`)
    
    try {
      const queueResult = await QStashService.queueMetaHistoricalBackfill(
        state,
        connectionData.id,
        tokenData.access_token,
        accountId,
        undefined // Will default to 12 months ago
      )
      
      if (queueResult.success) {
        console.log(`[Meta Exchange NEW] ✅ QStash queued ${queueResult.totalJobs} jobs, estimated: ${queueResult.estimatedMinutes} minutes`)
      } else {
        console.warn(`[Meta Exchange NEW] ⚠️ QStash queue failed - check QSTASH_TOKEN env var`)
      }
    } catch (queueError) {
      console.error(`[Meta Exchange NEW] ⚠️ Failed to queue with QStash:`, queueError)
    }
    
    const completionMetadata = {
      ...metadataWithFlag,
      full_sync_in_progress: false,
      last_full_sync_completed_at: new Date().toISOString(),
      last_full_sync_result: 'queued_qstash'
    }
    
    // Mark sync as completed (recent data done, historical queued)
    await supabase
      .from('platform_connections')
      .update({ 
        sync_status: 'completed',
        last_synced_at: new Date().toISOString(),
        metadata: completionMetadata
      })
      .eq('id', connectionData.id)
    
    return NextResponse.json({ success: true, message: 'Recent data synced, 12-month backfill queued with QStash' })

  } catch (error) {
    console.error('[Meta Exchange NEW] Exchange error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
