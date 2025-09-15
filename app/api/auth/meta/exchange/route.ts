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
      // 🔧 RETRY LOGIC: Handle Meta API rate limits with exponential backoff
      let meData = null;
      let accountId = '';
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[Meta Exchange] 🔄 Fetching ad accounts (attempt ${attempt}/${maxRetries})...`);
        
        const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${tokenData.access_token}&fields=id,name,account_status`)
        meData = await meResponse.json()
        
        console.log(`[Meta Exchange] 📊 Response status: ${meResponse.status}`)
        console.log(`[Meta Exchange] 📊 Response data:`, JSON.stringify(meData, null, 2))
        
        // Check for rate limit error
        if (meData.error && meData.error.code === 80004) {
          console.log(`[Meta Exchange] ⏱️ Rate limit hit on attempt ${attempt}. Error: ${meData.error.message}`);
          
          if (attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 5000; // 10s, 20s, 40s
            console.log(`[Meta Exchange] ⏳ Waiting ${waitTime/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          } else {
            console.error(`[Meta Exchange] 🚨 Rate limit persists after ${maxRetries} attempts`);
            throw new Error(`Meta API rate limited. Please wait a few minutes and try reconnecting again. Error: ${meData.error.message}`);
          }
        }
        
        // Success - extract accountId
        accountId = meData.data?.[0]?.id || '';
        if (accountId) {
          console.log(`[Meta Exchange] ✅ Successfully got accountId: ${accountId}`);
          break;
        } else {
          console.log(`[Meta Exchange] ⚠️ No ad accounts found in response`);
          if (attempt < maxRetries) {
            console.log(`[Meta Exchange] 🔄 Retrying to get ad accounts...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        }
      }
      
      // 🚨 CRITICAL VALIDATION: Don't proceed if accountId is still empty
      if (!accountId) {
        console.error(`[Meta Exchange] 🚨 CRITICAL: No accountId found after ${maxRetries} attempts!`)
        console.error(`[Meta Exchange] 🚨 Final response:`, meData)
        
        if (meData?.error) {
          throw new Error(`Meta API error: ${meData.error.message}. Please wait a few minutes and try reconnecting.`);
        } else {
          throw new Error(`No Meta ad accounts found. Make sure your Meta account has ad accounts and the correct permissions.`);
        }
      }
      
      console.log(`[Meta Exchange] ✅ Got accountId: ${accountId}`);
      
      // Update connection record with accountId for debugging
      await supabase
        .from('platform_connections')
        .update({
          metadata: {
            accountId: accountId,
            accountName: meData.data?.[0]?.name || 'Unknown',
            accountStatus: meData.data?.[0]?.account_status || 'Unknown',
            lastUpdated: new Date().toISOString()
          }
        })
        .eq('id', connectionData.id)
      
      console.log(`[Meta Exchange] 💾 Saved accountId to connection metadata: ${accountId}`)

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
           
          // Job 2: COMPREHENSIVE Demographics sync (abandoned "smart" approach - only 10.8% coverage)
          // Use monthly chunks to ensure ALL campaign dates get demographics coverage
          console.log('[Meta Exchange] 📅 Setting up comprehensive 12-month demographics sync (monthly chunks)')
          
          const monthlyChunks = []
          const currentDate = new Date()
          
          // Create 12 monthly chunks going back in time
          for (let monthsBack = 0; monthsBack < 12; monthsBack++) {
            const chunkEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - monthsBack, currentDate.getDate())
            const chunkStartDate = new Date(chunkEndDate.getFullYear(), chunkEndDate.getMonth(), 1)
            
            // Don't include future months
            if (chunkStartDate <= currentDate) {
              monthlyChunks.push({
                startDate: chunkStartDate.toISOString().split('T')[0],
                endDate: chunkEndDate.toISOString().split('T')[0],
                monthName: chunkStartDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
              })
            }
          }
          
          console.log(`[Meta Exchange] 📊 Created ${monthlyChunks.length} monthly chunks for comprehensive coverage`)
          
          // Queue each monthly chunk (no need for complex date grouping)
          const dateChunks = monthlyChunks.map((chunk, index) => ({
            startDate: chunk.startDate,
            endDate: chunk.endDate,
            monthName: chunk.monthName,
            index: index + 1,
            total: monthlyChunks.length
          }))
             
            // Create jobs for monthly chunks to ensure comprehensive coverage
            for (let i = 0; i < dateChunks.length; i++) {
              const chunk = dateChunks[i]
              
              await MetaQueueService.addJob('historical_demographics', {
                connectionId: connectionData.id,
                brandId: state,
                accessToken: tokenData.access_token,
                accountId: accountId,
                startDate: chunk.startDate,
                endDate: chunk.endDate,
                priority: 'medium',
                description: `Demographics ${chunk.monthName} (chunk ${chunk.index}/${chunk.total})`,
                jobType: 'historical_demographics' as any,
                metadata: {
                  chunkNumber: chunk.index,
                  totalChunks: chunk.total,
                  monthName: chunk.monthName,
                  comprehensive: true
                }
              })
            }
             
             console.log(`[Meta Exchange] ✅ Queued ${dateChunks.length} comprehensive demographics chunks (monthly coverage)`)
            
            // Demographics jobs queued successfully
            
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