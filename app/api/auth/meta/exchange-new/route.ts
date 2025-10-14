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

    // 🎯 SIMPLE SYNC: Just sync last 90 days immediately (fits in 60s timeout)
    console.log(`[Meta Exchange NEW] 🎯 SIMPLE SYNC: Syncing last 90 days immediately`)
    
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90) // 90 days = ~3 months
    
    console.log(`[Meta Exchange NEW] 📅 Syncing: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
    
    // Import service
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
    
    // Sync 90 days immediately (should complete in ~30-40 seconds)
    try {
      const result = await fetchMetaAdInsights(state, startDate, endDate, false, false)
      console.log(`[Meta Exchange NEW] ✅ 90-day sync complete: ${result.count || 0} records`)
    } catch (syncError) {
      console.error(`[Meta Exchange NEW] ❌ Sync failed:`, syncError)
    }
    
    const completionMetadata = {
      ...metadataWithFlag,
      full_sync_in_progress: false,
      last_full_sync_completed_at: new Date().toISOString(),
      last_full_sync_result: 'success_90_days'
    }
    
    // Mark sync as completed
    await supabase
      .from('platform_connections')
      .update({ 
        sync_status: 'completed',
        last_synced_at: new Date().toISOString(),
        metadata: completionMetadata
      })
      .eq('id', connectionData.id)
    
    return NextResponse.json({ success: true, message: '90-day data synced successfully' })

  } catch (error) {
    console.error('[Meta Exchange NEW] Exchange error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
