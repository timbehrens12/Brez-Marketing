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

      // PHASE 1: Fast sync of last 30 days (immediate within timeout limits)
      const endDate = new Date()
      const fastStartDate = new Date()
      fastStartDate.setDate(fastStartDate.getDate() - 30) // Last 30 days only

      console.log(`[Meta Exchange] ⚡ PHASE 1: Fast sync of last 30 days: ${fastStartDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

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

        // Fast sync - just 30 days to avoid timeout
        const fastSyncResult = await fetchMetaAdInsights(state, fastStartDate, endDate, false, true) // Skip demographics for speed

        if (fastSyncResult.success) {
          console.log(`[Meta Exchange] ✅ PHASE 1 completed: ${fastSyncResult.count} records in last 30 days`)

          // PHASE 2: Queue background sync for FULL 12 months (replaces the 30 days)
          console.log(`[Meta Exchange] 🔄 PHASE 2: Queueing COMPLETE 12-month background sync`)

          const fullStartDate = new Date()
          fullStartDate.setMonth(fullStartDate.getMonth() - 12) // Full 12 months

          const { MetaQueueService } = await import('@/lib/services/metaQueueService')

          try {
            // 🔄 QUEUE COMPLETE HISTORICAL SYNC (not just recent sync!)
            console.log(`[Meta Exchange] 🔄 Calling MetaQueueService.queueCompleteHistoricalSync`)

            // Check Redis availability first
            const hasRedis = process.env.REDIS_HOST || process.env.REDIS_URL
            console.log(`[Meta Exchange] Redis available: ${!!hasRedis} (REDIS_HOST: ${!!process.env.REDIS_HOST}, REDIS_URL: ${!!process.env.REDIS_URL})`)

            const queueResult = await MetaQueueService.queueCompleteHistoricalSync(
              state,
              connectionData.id,
              tokenData.access_token,
              accountId,
              undefined // No account creation date available
            )

            if (queueResult.success) {
              console.log(`[Meta Exchange] ✅ QueUED COMPLETE HISTORICAL SYNC:`, queueResult)
              // Keep status as 'syncing' - background worker will update to 'completed'
            } else {
              console.log(`[Meta Exchange] ⚠️ Historical sync not queued:`, queueResult.estimatedCompletion)
              // Update to completed since we have 30 days of data but no background sync
              await supabase
                .from('platform_connections')
                .update({
                  sync_status: 'completed',
                  updated_at: new Date().toISOString()
                })
                .eq('id', connectionData.id)
            }
          } catch (queueError) {
            console.error(`[Meta Exchange] ❌ Failed to queue background jobs:`, queueError)
            // Update to completed anyway since we have 30 days of data
            await supabase
              .from('platform_connections')
              .update({
                sync_status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', connectionData.id)
          }
        } else {
          console.error(`[Meta Exchange] ❌ Phase 1 failed:`, fastSyncResult.error)
          
          // Update sync status to failed
          await supabase
            .from('platform_connections')
            .update({
              sync_status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionData.id)
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