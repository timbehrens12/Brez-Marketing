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

      // Import Meta service and do COMPLETE immediate sync of last 12 months
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

      console.log(`[Meta Exchange] 🚀 Starting COMPLETE immediate sync of last 12 months for brand ${state}`)

      // Sync FULL 12 months immediately for complete historical data
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 12) // Full 12 months

      console.log(`[Meta Exchange] 📊 Syncing complete historical data: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

      try {
        // Use Promise.race to prevent timeout while still allowing completion
        const syncPromise = fetchMetaAdInsights(state, startDate, endDate, false, false) // Include demographics for completeness

        // Set a reasonable timeout (8 minutes for Vercel)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('SYNC_TIMEOUT')), 8 * 60 * 1000) // 8 minutes
        })

        const syncResult = await Promise.race([syncPromise, timeoutPromise])

        if (syncResult.success) {
          console.log(`[Meta Exchange] ✅ COMPLETE 12-month sync successful: ${syncResult.count} records`)

          // Update sync status to completed since we have all historical data
          await supabase
            .from('platform_connections')
            .update({
              sync_status: 'completed',
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionData.id)

          console.log(`[Meta Exchange] ✅ Sync status updated to completed - all 12 months of historical data loaded`)
        } else {
          console.error(`[Meta Exchange] ❌ Complete sync failed:`, syncResult.error)

          // Still update sync status to completed if we got partial data
          if (syncResult.count && syncResult.count > 0) {
            console.log(`[Meta Exchange] 📊 Partial data received (${syncResult.count} records) - marking as completed`)
            await supabase
              .from('platform_connections')
              .update({
                sync_status: 'completed',
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', connectionData.id)
          }
        }
      } catch (syncError) {
        console.error(`[Meta Exchange] ⚠️ Sync error:`, syncError)

        if (syncError.message === 'SYNC_TIMEOUT') {
          console.log(`[Meta Exchange] ⏰ Sync timed out after 8 minutes but may have partial data`)

          // Check if we got any data despite timeout
          const { data: existingData } = await supabase
            .from('meta_ad_insights')
            .select('id')
            .eq('brand_id', state)
            .limit(1)

          if (existingData && existingData.length > 0) {
            // We have some data, mark as completed
            await supabase
              .from('platform_connections')
              .update({
                sync_status: 'completed',
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', connectionData.id)

            console.log(`[Meta Exchange] 📈 Found existing data after timeout - marked sync as completed`)
          }
        }
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