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
        sync_status: 'in_progress'
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

      // Import Meta service and do immediate sync of last 30 days
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

      console.log(`[Meta Exchange] Starting immediate sync of last 30 days for brand ${state}`)

      // Sync last 30 days immediately (within Vercel timeout limits)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)

      const immediateResult = await fetchMetaAdInsights(state, startDate, endDate, false, true) // Skip demographics for speed

      if (immediateResult.success) {
        console.log(`[Meta Exchange] ✅ Immediate sync completed: ${immediateResult.count} records`)

        // Queue historical backfill for remaining data (in background)
        const { MetaQueueService } = await import('@/lib/services/metaQueueService')

        // Queue only historical data (11 months) in chunks
        const historicalStartDate = new Date()
        historicalStartDate.setMonth(historicalStartDate.getMonth() - 12)
        const historicalEndDate = new Date(startDate) // Start from where immediate sync ended

        await MetaQueueService.addHistoricalBackfillJobs(
          state,
          connectionData.id,
          tokenData.access_token,
          accountId,
          historicalStartDate.toISOString().split('T')[0] // Account creation date
        )

        console.log(`[Meta Exchange] Queued historical backfill for remaining 11 months`)
      } else {
        console.error(`[Meta Exchange] ❌ Immediate sync failed:`, immediateResult.error)
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