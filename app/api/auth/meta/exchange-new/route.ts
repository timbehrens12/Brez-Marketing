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
        metadata: accountId ? { ad_account_id: accountId } : {},
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
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
          await metaQueue.remove(job.id)
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

    // 🎯 12-MONTH HISTORICAL SYNC: Use queue system (no timeout issues)
    console.log(`[Meta Exchange NEW] 🎯 12-MONTH HISTORICAL SYNC: Queueing background jobs`)
    
    // Queue the 12-month historical sync jobs (same as callback route)
    const { MetaQueueService } = await import('@/lib/services/metaQueueService')
    
    MetaQueueService.queueCompleteHistoricalSync(
      state, // brandId
      connectionData.id, // connectionId
      tokenData.access_token,
      accountId
    )
      .then(result => {
        console.log(`[Meta Exchange NEW] ✅ Successfully queued ${result.totalJobs} backfill jobs, estimated completion: ${result.estimatedCompletion}`)
        
        // 🚀 CRITICAL: Trigger worker to process queued jobs immediately
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'}/api/public-worker`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maxJobs: 10 })
        })
          .then(workerRes => {
            if (workerRes.ok) {
              console.log('[Meta Exchange NEW] ✅ Worker triggered successfully to process queued jobs')
            } else {
              console.warn('[Meta Exchange NEW] ⚠️ Worker trigger returned non-OK status, but jobs are queued')
            }
          })
          .catch(err => console.error('[Meta Exchange NEW] ❌ Worker trigger failed:', err))
      })
      .catch(err => {
        console.error(`[Meta Exchange NEW] ❌ Failed to queue backfill jobs:`, err)
        
        // Mark sync as failed
        supabase
          .from('platform_connections')
          .update({ sync_status: 'failed' })
          .eq('id', connectionData.id)
          .then(() => console.log('[Meta Exchange NEW] Marked sync as failed'))
      })
    
    // Return immediately - jobs will process in background via worker
    console.log(`[Meta Exchange NEW] 🎉 OAuth complete! 12-month historical sync queued and worker triggered...`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Meta Exchange NEW] Exchange error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
