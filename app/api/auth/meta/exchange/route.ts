import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'
import { MetaQueueService } from '@/lib/services/metaQueueService'

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

    // Exchange code for token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.append('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.append('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.append('code', code)
    tokenUrl.searchParams.append('redirect_uri', 'https://www.brezmarketingdashboard.com/settings/meta-callback')

    console.log('🔍 DEBUG: META_APP_ID available:', !!process.env.META_APP_ID)
    console.log('🔍 DEBUG: META_APP_SECRET available:', !!process.env.META_APP_SECRET)
    console.log('🔍 DEBUG: REDIS_URL available:', !!process.env.REDIS_URL)
    console.log('🔍 DEBUG: NEXT_PUBLIC_SUPABASE_URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('🔍 DEBUG: SUPABASE_SERVICE_ROLE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    console.log('Exchanging code for token with URL:', tokenUrl.toString())

    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

    console.log('🔍 DEBUG: Token response status:', tokenResponse.status)
    console.log('🔍 DEBUG: Token response data keys:', tokenData ? Object.keys(tokenData) : 'null')

    if (!tokenData.access_token) {
      console.error('Token exchange failed:', tokenData)
      return NextResponse.json(
        { success: false, error: 'Failed to get access token' },
        { status: 400 }
      )
    }

    console.log('Got access token, storing in database')

    // Store in database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: connectionData, error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        brand_id: state,
        platform_type: 'meta',
        access_token: tokenData.access_token,
        status: 'active',
        user_id: userId,
        sync_status: 'in_progress',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (dbError || !connectionData) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to store token' },
        { status: 500 }
      )
    }

    console.log(`[Meta Exchange] Connection created successfully, doing immediate sync for brand ${state}`)

    // Get Meta account ID and do immediate sync
    try {
      const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${tokenData.access_token}&fields=id,name,account_status`)
      const meData = await meResponse.json()
      const accountId = meData.data?.[0]?.id || ''

      // Import Meta service and do IMMEDIATE 30-day sync + queue background for 12 months
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

      console.log(`[Meta Exchange] 🚀 Starting FAST 30-day immediate sync + background 12-month queue for brand ${state}`)

      // DIRECT 12-MONTH SYNC WITH DAILY BREAKDOWN
      console.log(`[Meta Exchange] 🚀 DIRECT 12-MONTH SYNC: March 1, 2025 to Sept 12, 2025`)

      try {
        // Update sync status to syncing
        await supabase
          .from('platform_connections')
          .update({
            sync_status: 'syncing',
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionData.id)

        // Import our backfill service with daily breakdown support
        const { DataBackfillService } = await import('@/lib/services/dataBackfillService')

        const dateRange = {
          since: '2025-03-01',  // Your 6 months of data
          until: '2025-09-12'   // Today
        }

        // Sync campaigns with 6-month totals
        console.log(`[Meta Exchange] 📊 Syncing campaigns...`)
        await DataBackfillService.fetchMetaCampaigns(state, accountId, tokenData.access_token, dateRange)

        // Sync daily insights with DAILY BREAKDOWN
        console.log(`[Meta Exchange] 📈 Syncing daily insights with time_increment=1...`)
        await DataBackfillService.fetchMetaDailyInsights(state, accountId, tokenData.access_token, dateRange)

        console.log(`[Meta Exchange] ✅ COMPLETE 12-MONTH SYNC FINISHED!`)

        // Update sync status to completed
        await supabase
          .from('platform_connections')
          .update({
            sync_status: 'completed',
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionData.id)

      } catch (syncError) {
        console.error(`[Meta Exchange] ❌ 12-month sync failed:`, syncError)
        
        // Update sync status to failed
        await supabase
          .from('platform_connections')
          .update({
            sync_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionData.id)
      }

    } catch (error) {
      console.error('[Meta Exchange] OAuth exchange failed:', error)
      return NextResponse.json(
        { success: false, error: 'Sync failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Exchange error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
} 