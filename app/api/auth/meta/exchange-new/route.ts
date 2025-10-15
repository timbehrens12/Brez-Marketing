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

    console.log(`[Meta Exchange NEW] Starting OAuth for brand ${state}`)

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

    const nowIso = new Date().toISOString()

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
        metadata: {
          ad_account_id: accountId,
          full_sync_in_progress: false,
          backfill_started_at: nowIso
        },
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

    // 🧨 NUCLEAR WIPE: Delete all existing Meta data
    console.log(`[Meta Exchange NEW] 🧨 Deleting old Meta data...`)
    try {
      await Promise.all([
        supabase.from('meta_ad_insights').delete().eq('brand_id', state),
        supabase.from('meta_adset_daily_insights').delete().eq('brand_id', state),
        supabase.from('meta_adsets').delete().eq('brand_id', state),
        supabase.from('meta_campaigns').delete().eq('brand_id', state),
        supabase.from('meta_demographics').delete().eq('brand_id', state),
        supabase.from('meta_device_performance').delete().eq('brand_id', state),
        supabase.from('meta_campaign_daily_stats').delete().eq('brand_id', state)
      ])
      console.log(`[Meta Exchange NEW] ✅ Old Meta data deleted`)
    } catch (nukeError) {
      console.warn(`[Meta Exchange NEW] ⚠️ Delete failed:`, nukeError)
    }

    // ✅ Perform simple 30-day sync directly (no worker needed)
    console.log(`[Meta Exchange NEW] 📊 Starting 30-day backfill...`)
    
    // Calculate date range (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    console.log(`[Meta Exchange NEW] Date range: ${startDateStr} to ${endDateStr}`)

    // Import services for direct sync
    const { fetchMetaCampaignBudgets, fetchMetaAdSets, fetchMetaAdInsights } = await import('@/lib/services/meta-service')

    try {
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
          const adsetsResult = await fetchMetaAdSets(state, campaign.campaign_id, true, startDate, endDate)
          if (adsetsResult.success) {
            totalAdsets += adsetsResult.adSets?.length || 0
          }
          // Small delay between campaigns
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      console.log(`[Meta Exchange NEW] ✅ Adsets: ${totalAdsets}`)

      // 3. Fetch 30-day ad-level insights and demographics
      console.log(`[Meta Exchange NEW] 📈 Fetching insights and demographics...`)
      const insightsResult = await fetchMetaAdInsights(state, startDate, endDate, true, false)
      console.log(`[Meta Exchange NEW] ✅ Insights: ${insightsResult.count || 0}`)

      // Update connection as completed
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'completed',
          last_synced_at: new Date().toISOString(),
          metadata: {
            ad_account_id: accountId,
            full_sync_in_progress: false,
            last_full_sync_completed_at: new Date().toISOString(),
            last_full_sync_result: `success_30_days: ${campaignCount} campaigns, ${totalAdsets} adsets, ${insightsResult.count || 0} insights`
          }
        })
        .eq('id', connectionData.id)

      console.log(`[Meta Exchange NEW] 🎉 Backfill complete!`)

    } catch (syncError) {
      console.error(`[Meta Exchange NEW] Sync error:`, syncError)
      // Mark as failed but keep the connection
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'error',
          metadata: {
            ad_account_id: accountId,
            error: String(syncError)
          }
        })
        .eq('id', connectionData.id)
    }

    return NextResponse.json({ success: true, message: 'Meta connected and synced' })

  } catch (error) {
    console.error('[Meta Exchange NEW] Exchange error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
