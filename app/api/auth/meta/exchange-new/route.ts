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

    // 🎯 12-MONTH HISTORICAL SYNC: Direct sync (FUCK THE QUEUE)
    console.log(`[Meta Exchange NEW] 🎯 12-MONTH HISTORICAL SYNC: Starting direct sync`)
    
    // Import the data backfill service
    const { DataBackfillService } = await import('@/lib/services/dataBackfillService')
    
    // Calculate 12-month date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setFullYear(startDate.getFullYear() - 1) // 12 months ago
    
    const dateRange = {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    }
    
    console.log(`[Meta Exchange NEW] 📅 Syncing from ${dateRange.start} to ${dateRange.end}`)
    
    // Fire-and-forget the 12-month sync (don't await - return immediately)
    (async () => {
      try {
        console.log(`[Meta Exchange NEW] 🚀 Starting background 12-month sync...`)
        
        // Fetch campaigns and daily insights for 12 months
        await DataBackfillService.fetchMetaCampaigns(state, accountId, tokenData.access_token, dateRange)
        console.log(`[Meta Exchange NEW] ✅ Campaigns synced`)
        
        await DataBackfillService.fetchMetaDailyInsights(state, accountId, tokenData.access_token, dateRange)
        console.log(`[Meta Exchange NEW] ✅ Daily insights synced`)
        
        await DataBackfillService.fetchMetaDemographicsAndDevice(state, accountId, tokenData.access_token, dateRange)
        console.log(`[Meta Exchange NEW] ✅ Demographics synced`)
        
        // Mark sync as completed
        await supabase
          .from('platform_connections')
          .update({ 
            sync_status: 'completed',
            last_synced_at: new Date().toISOString()
          })
          .eq('id', connectionData.id)
        
        console.log(`[Meta Exchange NEW] 🎉 12-month historical sync COMPLETE!`)
      } catch (error) {
        console.error(`[Meta Exchange NEW] ❌ Background sync failed:`, error)
        
        // Mark sync as failed
        await supabase
          .from('platform_connections')
          .update({ sync_status: 'failed' })
          .eq('id', connectionData.id)
      }
    })()
    
    // Return immediately - sync will continue in background
    console.log(`[Meta Exchange NEW] 🎉 OAuth complete! 12-month sync started in background...`)
    
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Meta Exchange NEW] Exchange error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
