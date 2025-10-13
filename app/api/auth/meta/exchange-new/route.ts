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

    // 🧨 NUCLEAR WIPE: Delete all existing Meta data (including hidden tables)
    console.log(`[Meta Exchange NEW] 🧨 NUCLEAR WIPE: Deleting all old Meta data...`)
    try {
      await Promise.all([
        supabase.from('meta_ad_insights').delete().eq('brand_id', state),
        supabase.from('meta_ad_daily_insights').delete().eq('brand_id', state), // This was missing!
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

    // 🎯 12-MONTH HISTORICAL SYNC: Trigger in background to avoid timeout
    console.log(`[Meta Exchange NEW] 🎯 12-MONTH HISTORICAL SYNC: Triggering background sync`)
    
    // Trigger the sync in the background without waiting (fire-and-forget)
    const syncPromise = (async () => {
      try {
        // Import the SAME Meta service that worked in nuclear reset
        const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
        
        // Use 12-month date range for complete historical data
        const endDate = new Date()
        const startDate = new Date()
        startDate.setFullYear(endDate.getFullYear() - 1) // 12 months back
        
        console.log(`[Meta Exchange NEW] 🎯 Background sync started: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
        
        // Call the SAME Meta service that worked perfectly in nuclear reset
        const result = await fetchMetaAdInsights(
          state, // brandId
          startDate, 
          endDate,
          false, // dryRun = false (actually sync)
          false  // skipDemographics = false (include demographics)
        )
        
        console.log(`[Meta Exchange NEW] 📊 Background sync result:`, result)
        
        if (result && result.success) {
          console.log(`[Meta Exchange NEW] ✅ BACKGROUND SYNC SUCCESS: ${result.count || 0} insights + demographics + device data`)
          
          // Mark sync as completed
          await supabase
            .from('platform_connections')
            .update({ 
              sync_status: 'completed',
              last_synced_at: new Date().toISOString() 
            })
            .eq('id', connectionData.id)
        } else {
          console.error(`[Meta Exchange NEW] ❌ Background sync failed:`, result?.error || 'Unknown error')
          
          // Mark sync as failed
          await supabase
            .from('platform_connections')
            .update({ sync_status: 'failed' })
            .eq('id', connectionData.id)
        }
      } catch (syncError) {
        console.error(`[Meta Exchange NEW] ❌ Background sync error:`, syncError)
        
        // Mark sync as failed
        await supabase
          .from('platform_connections')
          .update({ sync_status: 'failed' })
          .eq('id', connectionData.id)
      }
    })()
    
    // Don't await the sync - let it run in background
    syncPromise.catch(err => console.error('[Meta Exchange NEW] Background sync promise error:', err))
    
    // Return immediately to avoid timeout - background sync will complete asynchronously
    console.log(`[Meta Exchange NEW] 🎉 OAuth complete! 12-month historical sync running in background...`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Meta Exchange NEW] Exchange error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
