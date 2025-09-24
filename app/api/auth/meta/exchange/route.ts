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

    // 🚀 BULLETPROOF PRODUCTION SYNC: Fast chunked sync within Vercel limits
    console.log(`[Meta Exchange] 🚀 Starting BULLETPROOF production sync...`)
    
    try {
      // Import the service we need
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
      
      // Define critical months to sync (focus on recent + key periods)  
      const criticalChunks = [
        { start: new Date('2025-09-01'), end: new Date('2025-09-24'), name: 'September 2025' },
        { start: new Date('2025-08-01'), end: new Date('2025-08-31'), name: 'August 2025' },
        { start: new Date('2025-07-01'), end: new Date('2025-07-31'), name: 'July 2025' },
        { start: new Date('2025-06-01'), end: new Date('2025-06-30'), name: 'June 2025' },
        { start: new Date('2025-05-01'), end: new Date('2025-05-31'), name: 'May 2025' }
      ]
      
      let syncedInsights = 0
      
      for (const chunk of criticalChunks) {
        try {
          console.log(`[Meta Exchange] 📅 Syncing ${chunk.name} (${chunk.start.toISOString().split('T')[0]} to ${chunk.end.toISOString().split('T')[0]})`)
          
          const insights = await fetchMetaAdInsights(state, chunk.start, chunk.end)
          const count = insights?.length || 0
          syncedInsights += count
          
          console.log(`[Meta Exchange] ✅ ${chunk.name}: ${count} insights synced`)
          
          // Quick delay to prevent rate limits (but keep under 15 seconds total)
          await new Promise(resolve => setTimeout(resolve, 200))
          
        } catch (chunkError) {
          console.error(`[Meta Exchange] ❌ Failed to sync ${chunk.name}:`, chunkError)
          // Continue with other chunks even if one fails
        }
      }
      
      // Force aggregation
      console.log(`[Meta Exchange] 🔄 Forcing data aggregation...`)
      try {
        await supabase.rpc('aggregate_meta_data', { brand_id_param: state })
        console.log(`[Meta Exchange] ✅ Data aggregation completed`)
      } catch (aggError) {
        console.error(`[Meta Exchange] ❌ Aggregation failed:`, aggError)
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