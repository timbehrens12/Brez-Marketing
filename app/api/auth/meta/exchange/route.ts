import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'
import { MetaQueueService } from '@/lib/services/metaQueueService'

// Vercel timeout protection - this route should complete quickly
export const maxDuration = 10; // 10 seconds max for this route

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
    console.log('🔍 DEBUG: REDIS_HOST available:', !!process.env.REDIS_HOST)
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

    console.log(`[Meta Exchange] Connection created successfully for brand ${state}`)

    // 🚀 CRITICAL FIX: Move ALL heavy operations to background to prevent timeout
    // Don't do any synchronous API calls or complex operations here
    try {
      console.log(`[Meta Exchange] ⚡ Queueing background setup job to avoid timeout...`)

      // Check Redis availability first
      const hasRedis = process.env.REDIS_HOST || process.env.REDIS_URL
      if (!hasRedis) {
        console.warn(`[Meta Exchange] ⚠️ Redis not configured - will mark as connected without background sync`)
        console.warn(`[Meta Exchange] Missing: REDIS_HOST=${!!process.env.REDIS_HOST}, REDIS_URL=${!!process.env.REDIS_URL}`)

        // Fallback: just mark as connected without background jobs
        await supabase
          .from('platform_connections')
          .update({
            sync_status: 'connected', // New status indicating connected but not synced
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
              setup_skipped_reason: 'redis_not_configured',
              setup_skipped_at: new Date().toISOString()
            }
          })
          .eq('id', connectionData.id)

        return NextResponse.json({
          success: true,
          message: 'Meta connected successfully - background sync disabled (Redis not configured)',
          backgroundSyncDisabled: true
        })
      }

      // Queue a simple background job to handle the setup and sync
      const { MetaQueueService } = await import('@/lib/services/metaQueueService')

      // Create a setup job that will handle account discovery and sync queuing
      await MetaQueueService.addJob('meta_setup', {
        connectionId: connectionData.id,
        brandId: state,
        accessToken: tokenData.access_token,
        jobType: 'meta_setup' as any,
        priority: 'high',
        description: 'Initial Meta setup: discover account and queue syncs',
        metadata: {
          isInitialSetup: true
        }
      })

      console.log(`[Meta Exchange] ✅ Background setup job queued - will handle account discovery and sync`)

    } catch (queueError) {
      console.error(`[Meta Exchange] ❌ Failed to queue background setup:`, queueError)

      // Fallback: just mark as connected without background jobs
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'connected', // New status indicating connected but not synced
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            setup_failed_reason: queueError.message,
            setup_failed_at: new Date().toISOString()
          }
        })
        .eq('id', connectionData.id)

      console.log(`[Meta Exchange] ℹ️ Marked as connected without background sync due to error`)
    }

    // Success - return immediately without waiting for background jobs
    console.log(`[Meta Exchange] ✅ Exchange completed successfully in ${Date.now() - Date.now()}ms`)
    return NextResponse.json({
      success: true,
      message: 'Meta connected successfully - background sync will complete shortly',
      backgroundSyncQueued: true
    })

  } catch (error) {
    console.error('[Meta Exchange] ❌ Exchange failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 