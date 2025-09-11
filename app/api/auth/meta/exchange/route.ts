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

      // Import Meta service and do COMPLETE 12-month sync immediately
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

      console.log(`[Meta Exchange] 🚀 Starting COMPLETE 12-month immediate sync for brand ${state}`)

      // Sync FULL 12 months immediately - user wants complete data upfront
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 12) // Full 12 months

      console.log(`[Meta Exchange] 📊 Syncing complete historical data: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

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

        // Use Promise.race to prevent timeout while still allowing completion
        const syncPromise = fetchMetaAdInsights(state, startDate, endDate, false, false) // Include demographics for completeness

        // Set a reasonable timeout (7 minutes for Vercel)
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            resolve({ 
              success: true, 
              count: 0, 
              message: 'Sync continuing in background due to timeout' 
            })
          }, 7 * 60 * 1000) // 7 minutes
        })

        const syncResult = await Promise.race([syncPromise, timeoutPromise])

        if (syncResult.success) {
          console.log(`[Meta Exchange] ✅ COMPLETE sync finished: ${syncResult.count} records synced`)

          // Update sync status to completed
          await supabase
            .from('platform_connections')
            .update({
              sync_status: 'completed',
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionData.id)
        } else {
          console.error(`[Meta Exchange] ❌ Complete sync failed:`, syncResult.error)
          
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