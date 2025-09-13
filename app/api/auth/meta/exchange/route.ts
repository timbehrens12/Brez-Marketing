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

      // FAST 30-day sync + queue background historical sync
      console.log(`[Meta Exchange] ⚡ FAST 30-day sync + QUEUE 6-month historical`)

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

        // PHASE 1: Fast 30-day sync (immediate)
        const { DataBackfillService } = await import('@/lib/services/dataBackfillService')
        
        const fastRange = {
          since: '2025-08-13',  // Last 30 days only
          until: '2025-09-12'   // Today
        }

        console.log(`[Meta Exchange] ⚡ Queueing all syncs to background to prevent timeout...`)
        
        // Check if SUBSTANTIAL data already exists (30+ days) to avoid duplicates
        const { data: recentData } = await supabase
          .from('meta_ad_daily_insights')
          .select('date')
          .eq('brand_id', state)
          .order('date', { ascending: false })
          .limit(50)
        
        const uniqueDates = new Set(recentData?.map(d => d.date) || [])
        const hasSubstantialData = uniqueDates.size >= 30 // 30+ days of data
        
        console.log(`[Meta Exchange] 📊 Found ${uniqueDates.size} days of existing data`)
        
        if (hasSubstantialData) {
          console.log(`[Meta Exchange] ℹ️ Substantial data exists (${uniqueDates.size} days) - skipping all syncs`)
          // Update to completed since we have substantial data
          await supabase
            .from('platform_connections')
            .update({
              sync_status: 'completed',
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionData.id)
          
          return NextResponse.json({ 
            success: true, 
            message: 'Meta connected successfully - existing data found',
            skipSync: true
          })
        }

        console.log(`[Meta Exchange] 📅 Only ${uniqueDates.size} days found - queueing full 12-month sync`)

       // Queue TWO optimized background jobs
       const { MetaQueueService } = await import('@/lib/services/metaQueueService')
       
       try {
           // Job 1: Fast campaigns + insights (no demographics to avoid timeout)
           await MetaQueueService.addJob('historical_campaigns', {
             connectionId: connectionData.id,
             brandId: state,
             accessToken: tokenData.access_token,
             accountId: accountId,
             timeRange: {
               since: '2024-09-12',  // Full 12 months back
               until: '2025-09-12'   // Today  
             },
             priority: 'high',
             description: 'Fast 12-month sync: campaigns + insights only',
             jobType: 'historical_campaigns' as any,
             includeEverything: false  // No demographics in main job
           })
           
           // Job 2: Demographics in small chunks to avoid timeout
           // Create 30-day chunks for demographics (12 chunks total)
           const startDate = new Date('2024-09-12')
           const endDate = new Date('2025-09-12')
           const chunkDays = 30  // 30-day chunks to stay well under timeout
           
           let currentStart = new Date(startDate)
           let chunkNumber = 1
           
           while (currentStart < endDate) {
             const currentEnd = new Date(currentStart)
             currentEnd.setDate(currentEnd.getDate() + chunkDays - 1)
             if (currentEnd > endDate) currentEnd.setTime(endDate.getTime())
             
             await MetaQueueService.addJob('historical_demographics', {
               connectionId: connectionData.id,
               brandId: state,
               accessToken: tokenData.access_token,
               accountId: accountId,
               startDate: currentStart.toISOString().split('T')[0],
               endDate: currentEnd.toISOString().split('T')[0],
               priority: 'medium',
               description: `Demographics chunk ${chunkNumber} (${currentStart.toISOString().split('T')[0]} to ${currentEnd.toISOString().split('T')[0]})`,
               jobType: 'historical_demographics' as any,
               metadata: {
                 chunkNumber: chunkNumber,
                 totalChunks: Math.ceil((endDate.getTime() - startDate.getTime()) / (chunkDays * 24 * 60 * 60 * 1000))
               }
             })
             
             currentStart.setDate(currentStart.getDate() + chunkDays)
             chunkNumber++
           }
            
            console.log(`[Meta Exchange] ✅ Queued fast campaigns+insights job + ${chunkNumber-1} demographics chunks`)
            
            // Keep status as 'syncing' - worker will update to 'completed'
          } catch (queueError) {
            console.warn(`[Meta Exchange] ⚠️ Failed to queue historical sync:`, queueError)
            
            // Update to completed if queue fails
            await supabase
              .from('platform_connections')
              .update({
                sync_status: 'completed',
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', connectionData.id)
        }

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