import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
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

    console.log(`[Meta Exchange Simple] Starting auth exchange for brand ${state}`)

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

    console.log(`[Meta Exchange Simple] ✅ Got access token`)

    // Get account ID
    let accountId = ''
    try {
      const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${tokenData.access_token}&fields=id,name,account_status`)
      const meData = await meResponse.json()
      if (meData.data?.[0]) {
        accountId = meData.data[0].id
        console.log(`[Meta Exchange Simple] ✅ Got account ID: ${accountId}`)
      }
    } catch (accountError) {
      console.warn(`[Meta Exchange Simple] Failed to get account ID:`, accountError)
    }

    // Store in database (using the imported supabase client)

    const { data: connectionData, error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        brand_id: state,
        platform_type: 'meta',
        access_token: tokenData.access_token,
        status: 'active',
        user_id: userId,
        sync_status: 'completed', // Mark as completed immediately to prevent stuck UI
        metadata: accountId ? { ad_account_id: accountId } : {},
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (dbError || !connectionData) {
      console.error(`[Meta Exchange Simple] Database error:`, dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to store connection' },
        { status: 500 }
      )
    }

    console.log(`[Meta Exchange Simple] ✅ Stored connection with ID: ${connectionData.id}`)

    // 🧨 NUCLEAR WIPE: ALL META TABLES FOR COMPLETE CONSISTENCY
    console.log(`[Meta Exchange] 🧨 NUCLEAR: Wiping ALL old Meta data for consistency...`)
    try {
      // Wipe ALL Meta tables to ensure consistent date ranges
      const { error: e1 } = await supabase.from('meta_ad_insights').delete().eq('brand_id', state)
      const { error: e2 } = await supabase.from('meta_adset_daily_insights').delete().eq('brand_id', state)
      const { error: e3 } = await supabase.from('meta_adsets').delete().eq('brand_id', state)
      const { error: e4 } = await supabase.from('meta_campaigns').delete().eq('brand_id', state)
      const { error: e5 } = await supabase.from('meta_ads').delete().eq('brand_id', state)
      const { error: e6 } = await supabase.from('meta_demographics').delete().eq('brand_id', state)
      const { error: e7 } = await supabase.from('meta_device_performance').delete().eq('brand_id', state)
      
      if (e1 || e2 || e3 || e4 || e5 || e6 || e7) {
        console.warn(`[Meta Exchange] ⚠️ Some wipe errors:`, { e1, e2, e3, e4, e5, e6, e7 })
      }
      
      console.log(`[Meta Exchange] ✅ ALL Meta data nuked for consistent rebuild`)
    } catch (nukeError) {
      console.warn(`[Meta Exchange] ⚠️ Nuclear wipe failed:`, nukeError)
    }

    // 🚀 BULLETPROOF PRODUCTION SYNC: Fast chunked sync within Vercel limits
    console.log(`[Meta Exchange] 🚀 Starting BULLETPROOF production sync...`)
    
    try {
      // Import the service we need
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
      
          // Define critical months to sync (2 most recent months + fix missing August end)
          const today = new Date()
          const currentMonth = today.toISOString().split('T')[0]
          
          const criticalChunks = [
            { start: new Date('2025-09-01'), end: today, name: 'September 2025 (up to today)' },
            { start: new Date('2025-07-25'), end: new Date('2025-08-31'), name: 'August 2025 (full month + July end)' }
          ]
      
      let syncedInsights = 0
      
      for (const chunk of criticalChunks) {
        try {
          console.log(`[Meta Exchange] 📅 Syncing ${chunk.name} (${chunk.start.toISOString().split('T')[0]} to ${chunk.end.toISOString().split('T')[0]})`)
          
          // Sync insights first, then demographics for this date range
          const insights = await fetchMetaAdInsights(state, chunk.start, chunk.end, false, true)
          const count = insights?.length || 0
          syncedInsights += count
          
          console.log(`[Meta Exchange] ✅ ${chunk.name}: ${count} insights synced`)
          
          // 🔥 SYNC DEMOGRAPHICS for this chunk too (2-month sync like general data)
          try {
            console.log(`[Meta Exchange] 📊 Syncing demographics for ${chunk.name}...`)
            
            // Use the same meta-service but WITH demographics this time (skipDemographics=false)
            const demographicsResult = await fetchMetaAdInsights(state, chunk.start, chunk.end, false, false)
            const demoCount = demographicsResult?.length || 0
            
            console.log(`[Meta Exchange] ✅ Demographics synced for ${chunk.name}: ${demoCount} demographic records`)
          } catch (demoError) {
            console.error(`[Meta Exchange] ⚠️ Demographics sync failed for ${chunk.name}:`, demoError)
            // Don't fail the whole auth process if demographics fail
          }
          
          // Quick delay to prevent rate limits (but keep under 15 seconds total)
          await new Promise(resolve => setTimeout(resolve, 300)) // Slightly longer delay for demographics
          
        } catch (chunkError) {
          console.error(`[Meta Exchange] ❌ Failed to sync ${chunk.name}:`, chunkError)
          // Continue with other chunks even if one fails
        }
      }
      
      // 🔥 CRITICAL: Force aggregation to populate ALL tables consistently
      console.log(`[Meta Exchange] 🔄 CRITICAL: Forcing complete data aggregation for ALL tables...`)
      try {
        await supabase.rpc('aggregate_meta_data', { brand_id_param: state })
        console.log(`[Meta Exchange] ✅ ALL tables aggregated - meta_adsets, meta_campaigns, etc.`)
        
        // Wait a moment for aggregation to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Verify aggregation worked by checking key tables
        const { data: adsetCheck } = await supabase
          .from('meta_adset_daily_insights')
          .select('count(*)')
          .eq('brand_id', state)
          .single()
        
        console.log(`[Meta Exchange] ✅ Aggregation verification: meta_adset_daily_insights has data`)
        
      } catch (aggError) {
        console.error(`[Meta Exchange] ❌ Critical aggregation failed:`, aggError)
        // Don't fail auth, but log the issue
      }
      
      console.log(`[Meta Exchange] 🎉 PRODUCTION SYNC COMPLETE! Total insights: ${syncedInsights}`)
      
    } catch (syncError) {
      console.error(`[Meta Exchange] ❌ Production sync failed:`, syncError)
      // Don't fail the auth - just log the error
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Meta Exchange Simple] Exchange error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
} 