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

    console.log('Exchanging code for token with URL:', tokenUrl.toString())
    
    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

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

      // Import Meta service and do HYBRID sync approach
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

      console.log(`[Meta Exchange] 🚀 Starting HYBRID sync approach for brand ${state}`)

      // PHASE 1: Fast sync of last 30 days (immediate)
      console.log(`[Meta Exchange] ⚡ PHASE 1: Fast sync of last 30 days`)
      const endDate = new Date()
      const fastStartDate = new Date()
      fastStartDate.setDate(fastStartDate.getDate() - 30)

      try {
        const fastSyncResult = await fetchMetaAdInsights(state, fastStartDate, endDate, false, true) // Skip demographics for speed

        if (fastSyncResult.success) {
          console.log(`[Meta Exchange] ✅ Phase 1 completed: ${fastSyncResult.count} records in last 30 days`)

          // Update sync status to syncing (we're starting background work)
          await supabase
            .from('platform_connections')
            .update({
              sync_status: 'syncing',
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionData.id)
        } else {
          console.error(`[Meta Exchange] ❌ Phase 1 failed:`, fastSyncResult.error)
          // Continue anyway - we'll queue background work
        }

        // PHASE 2: Queue background sync for remaining 11 months
        console.log(`[Meta Exchange] 🔄 PHASE 2: Queueing background sync for remaining 11 months`)

        const historicalStartDate = new Date()
        historicalStartDate.setMonth(historicalStartDate.getMonth() - 12)

        const { MetaQueueService } = await import('@/lib/services/metaQueueService')

        try {
          await MetaQueueService.addHistoricalBackfillJobs(
            state,
            connectionData.id,
            tokenData.access_token,
            accountId,
            historicalStartDate.toISOString().split('T')[0]
          )

          console.log(`[Meta Exchange] ✅ Queued historical backfill for remaining 11 months`)
        } catch (queueError) {
          console.error(`[Meta Exchange] ❌ Failed to queue historical jobs:`, queueError)
          // Don't fail the response - user still has immediate data
        }

      } catch (syncError) {
        console.error(`[Meta Exchange] ⚠️ Sync error in phase 1:`, syncError)
        // Continue with background queuing even if fast sync failed
      }

    } catch (error) {
      console.error('[Meta Exchange] Immediate sync failed:', error)
      // Don't fail the response, just log the error
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